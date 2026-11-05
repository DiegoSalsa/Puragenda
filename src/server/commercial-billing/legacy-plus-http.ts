import {NextRequest, NextResponse} from "next/server";
import {z} from "zod";
import {getApiSessionUser} from "@/server/auth/user-session";
import {getBusinessForUser} from "@/server/services/business.service";
import {isDemoAccountEmail} from "@/server/auth/demo-session";
import {requireSameOrigin} from "@/server/security/same-origin";
import {prisma} from "@/server/db/prisma";
import {isRegistrationV2Contract, getCommercialPlanAccess} from "@/server/services/commercial-plan-access";
import {createMpV2Provider} from "./mercadopago-v2-provider";
import {legacyPlusTerms} from "@/core/legacy-plus";
import {calculateNextBillingPreview} from "@/server/services/subscription-billing.service";
import {readLegacyPlusBusiness, legacyPlusOffer, prepareLegacyPlusCheckout, executeLegacyPlusCheckout, reconcileLegacyPlusOperation, legacyPlusOperationView, cancelLegacyPlus} from "./legacy-plus";

const command=z.discriminatedUnion("action",[
  z.object({action:z.literal("UPGRADE"),accepted:z.literal(true),idempotencyKey:z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/),expectedContractHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  z.object({action:z.literal("RECONCILE"),operationId:z.string().min(1).max(150)}).strict(),
  z.object({action:z.literal("CANCEL"),accepted:z.literal(true)}).strict(),
]);
async function context(request:NextRequest){
 const user=await getApiSessionUser(request);if(!user)return {response:NextResponse.json({error:"UNAUTHENTICATED"},{status:401})};
 const identity=await getBusinessForUser(user.id);if(!identity||identity.ownerId!==user.id)return {response:NextResponse.json({error:"OWNER_REQUIRED"},{status:403})};
 const business=await readLegacyPlusBusiness(identity.id);
 if(isRegistrationV2Contract(business.commercialSubscription)||["PURAGENDA","PURAGENDA_PLUS"].includes(business.subscription?.plan??""))return null;
 return {user,business};
}
function errorResponse(error:unknown){
 const value=error instanceof Error?error.message:"LEGACY_PLUS_FAILED";
 const safe=/^(LEGACY_PLUS_[A-Z_]+|OWNER_REQUIRED|COMMERCIAL_MIGRATION_OPEN)$/.test(value)?value:"LEGACY_PLUS_FAILED";
 return NextResponse.json({error:safe},{status:/DISABLED|CONFIGURATION/.test(value)?503:409});
}
export async function legacyPlusDashboardState(request:NextRequest){
 const owner=await context(request);if(!owner)return null;if(owner.response)return owner.response;
 try{
  let provider;try{provider=createMpV2Provider();}catch{/* Preview remains read-only when payments are disabled. */}
  const demo=isDemoAccountEmail(owner.user.email);
  const offer=await legacyPlusOffer(owner.business,owner.user.id,demo?undefined:provider);
  const access=await getCommercialPlanAccess(owner.business.id);
  const terms=legacyPlusTerms(owner.business.commercialSubscription?.termsSnapshot);
  const operation=await prisma.commercialBillingOperation.findFirst({where:{businessId:owner.business.id,quoteSnapshot:{path:["origin"],equals:"legacy_plus_checkout"},
    ...(provider?{environment:provider.config.environment}:{}),status:{in:["PREPARED","EXECUTING","UNKNOWN","AWAITING_PAYMENT","PAID"]}},orderBy:{createdAt:"desc"}});
  return NextResponse.json({...offer,enabled:!!provider&&!demo,demo,plusActive:access.snapshot?.planCode==="PURAGENDA_PLUS",cancellationAt:terms?.cancelAt??null,
    nextAmount:terms?.cancelAt?calculateNextBillingPreview(owner.business.subscription!).amountDue:offer.nextAmount,
    operation:operation?{id:operation.id,status:operation.status,checkoutUrl:provider?legacyPlusOperationView(operation,provider).checkoutUrl:null}:null},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return errorResponse(error);}
}
export async function handleLegacyPlusCommand(request:NextRequest){
 const origin=requireSameOrigin(request);if(origin)return origin;
 const owner=await context(request);if(!owner)return null;if(owner.response)return owner.response;
 if(isDemoAccountEmail(owner.user.email))return NextResponse.json({error:"LEGACY_PLUS_DEMO_READ_ONLY"},{status:403});
 const parsed=command.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"LEGACY_PLUS_INVALID_COMMAND"},{status:400});
 try{
  const provider=createMpV2Provider(),input=parsed.data;
  if(input.action==="CANCEL")return NextResponse.json(await cancelLegacyPlus(owner.business.id,owner.user.id,provider));
  if(input.action==="RECONCILE")return NextResponse.json(await reconcileLegacyPlusOperation(owner.business.id,input.operationId,provider));
  const operation=await prepareLegacyPlusCheckout({businessId:owner.business.id,actorId:owner.user.id,idempotencyKey:input.idempotencyKey,expectedContractHash:input.expectedContractHash},provider);
  return NextResponse.json(await executeLegacyPlusCheckout(owner.business.id,operation.id,owner.user.email,provider));
 }catch(error){return errorResponse(error);}
}
