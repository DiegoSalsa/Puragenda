"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
type State={kind:"LEGACY_PLUS";enabled:boolean;demo:boolean;contractHash:string;professionalTotal:number;billingCycle:"MONTHLY"|"ANNUAL";
 baseCycleAmount:number;upgradeCycleAmount:number;total:number;amountDue:number;periodEnd:string;firstChargeAt:string;mode:"EXTENSION"|"COMBINED";
 manual:boolean;trial:boolean;nextAmount:number;plusActive:boolean;cancellationAt:string|null;operation:{id:string;status:string;checkoutUrl:string|null}|null};
const money=(v:number)=>`$${v.toLocaleString("es-CL")} CLP`;
const date=(v:string)=>new Date(v).toLocaleDateString("es-CL",{timeZone:"America/Santiago"});
export function LegacyPlusSubscriptionPanel(){
 const router=useRouter(),key=useRef<string|null>(null),returned=useRef(false);
 const [state,setState]=useState<State|null>(null),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[cancelling,setCancelling]=useState(false);
 const load=useCallback(async()=>{const r=await fetch("/api/dashboard/subscription/billing",{cache:"no-store"});if(!r.ok)throw new Error("load");return await r.json() as State;},[]);
 useEffect(()=>{let active=true;void load().then(async v=>{
  if(!active)return;
  setState(v);
  if(!returned.current&&new URLSearchParams(window.location.search).has("billing_return")&&v.operation&&v.enabled){returned.current=true;
   await fetch("/api/dashboard/subscription/billing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"RECONCILE",operationId:v.operation.id})});if(active){setState(await load());router.refresh();}}
 }).catch(()=>{if(active)setMessage("No se pudo consultar tu suscripción. Vuelve a cargar la página.");});return()=>{active=false;};},[load,router]);
 async function pay(cancel=false){
  if(!state||busy)return;setBusy(true);setMessage("");key.current??=crypto.randomUUID();
  try{
   const body=cancel?{action:"CANCEL",accepted:true}:state.operation?{action:"RECONCILE",operationId:state.operation.id}:{action:"UPGRADE",accepted:true,idempotencyKey:key.current,expectedContractHash:state.contractHash};
   const r=await fetch("/api/dashboard/subscription/billing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),result=await r.json();
   if(!r.ok){setMessage(result.error==="LEGACY_PLUS_CONTRACT_CHANGED"?"Tu contrato cambió. Revisa el resumen actualizado y confirma nuevamente.":result.error==="LEGACY_PLUS_WEBSITE_BILLING_REVIEW"?"Tu sitio tiene un cobro independiente vigente. Debemos conciliarlo para que no pagues el sitio dos veces.":"No se pudo confirmar el resultado. Comprueba el estado antes de volver a pagar.");setState(await load());setAccepted(false);return;}
   if(result.checkoutUrl){const url=new URL(result.checkoutUrl);if(url.protocol!=="https:"||!["www.mercadopago.cl","sandbox.mercadopago.cl"].includes(url.hostname))throw new Error("url");window.location.assign(url.href);return;}
   setMessage(result.status==="CANCELLED"?"La renovación de Puragenda+ está cancelada. Tu Puragenda se conserva.":result.status==="APPLIED"?"Pago confirmado. Puragenda+ está activo.":result.status==="PAID"?"Pago recibido. Estamos confirmando la renovación de tu suscripción.":"Estamos verificando el resultado con Mercado Pago. No inicies otro pago.");setCancelling(false);setState(await load());router.refresh();
  }catch{setMessage("No se pudo confirmar el resultado. Usa «Comprobar estado» antes de volver a pagar.");}finally{setBusy(false);}
 }
 if(!state)return <p role="status" className="mt-4 text-sm">{message||"Consultando tu suscripción…"}</p>;
 const cycle=state.billingCycle==="ANNUAL"?"año":"mes";
 return <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
  <p>Tu Puragenda actual: {money(state.baseCycleAmount)}/{cycle}{state.manual?", por transferencia bancaria":""}. Sus condiciones y beneficios se conservan.</p>
  {state.plusActive?<p className="font-semibold">Puragenda+ está {state.trial?"en prueba":"activo"}.</p>:state.mode==="EXTENSION"?<>
   <p className="text-lg font-bold">Pago inicial estimado: {money(state.amountDue)}</p>
   <p>Corresponde únicamente a la ampliación a Puragenda+ por el tiempo restante hasta el {date(state.periodEnd)}. El importe definitivo se muestra en Mercado Pago antes de pagar.</p>
  </>:<p>Primer cobro: {money(state.amountDue)}{state.trial?` desde el ${date(state.firstChargeAt)}, al terminar tu prueba actual`:" al completar el pago"}.</p>}
  <p>{state.cancellationAt?"Tu plan Puragenda continúa por":"Próxima renovación de Puragenda+:"} {money(state.nextAmount)}/{cycle}, IVA incluido{state.manual?", manteniendo el pago por transferencia":""}.{!state.cancellationAt&&` Precio sin beneficios temporales: ${money(state.total)}/${cycle}.`}</p>
  {state.cancellationAt&&<p role="status">Puragenda+ no se renovará. Conservas el acceso pagado hasta el {date(state.cancellationAt)}.</p>}
  {state.demo&&<p role="status">La demo permite revisar el plan. No crea pagos ni contrataciones reales.</p>}
  {!state.enabled&&!state.demo&&<p role="status">Los pagos están deshabilitados en este entorno de revisión.</p>}
  {state.operation&&<p role="status">{state.operation.status==="AWAITING_PAYMENT"?"Pago pendiente de confirmación en Mercado Pago.":state.operation.status==="PAID"?"Pago recibido; renovación en conciliación.":"Operación en verificación. No inicies un segundo pago."}</p>}
  {!state.plusActive&&!state.operation&&<label className="flex items-start gap-2"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} disabled={!state.enabled||busy} className="mt-1"/><span>Acepto el cambio a Puragenda+, el importe indicado y {state.manual?"las futuras renovaciones por transferencia":"las renovaciones de mi contrato con los beneficios que sigan vigentes"}. Mi suscripción actual no se modifica si no confirmo el pago.</span></label>}
  {(!state.plusActive||state.operation)&&<button type="button" disabled={busy||!state.enabled||(!state.operation&&!accepted)} onClick={()=>void pay()} className="rounded-xl border-2 border-black bg-[#E9D8FF] px-4 py-3 font-bold disabled:opacity-50">{busy?"Confirmando…":state.operation?state.operation.checkoutUrl?"Continuar en Mercado Pago":"Comprobar estado":"Continuar al pago de Puragenda+"}</button>}
  {state.plusActive&&!state.cancellationAt&&<button type="button" disabled={busy||!state.enabled} onClick={()=>setCancelling(true)} className="block underline">Cancelar la renovación de Puragenda+</button>}
  {cancelling&&<div className="space-y-2 rounded-xl border border-border p-3"><p>Conservas el acceso pagado a Puragenda+ hasta que termine el período. Tu Puragenda y sus condiciones originales continúan vigentes.</p><button type="button" disabled={busy} onClick={()=>void pay(true)} className="mr-3 font-bold underline">Confirmar cancelación de Puragenda+</button><button type="button" onClick={()=>setCancelling(false)} className="underline">Volver</button></div>}
  <p role="status" aria-live="polite">{message}</p>
 </div>;
}
