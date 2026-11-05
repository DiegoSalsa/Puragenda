import {NextRequest,NextResponse} from "next/server";
import {handleLegacyPlusWebhook} from "@/server/commercial-billing/legacy-plus";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 if(Number(request.headers.get("content-length"))>32768)return new NextResponse(null,{status:413});
 const raw=await request.text();if(raw.length>32768)return new NextResponse(null,{status:413});
 try{await handleLegacyPlusWebhook(raw,request.headers,request.nextUrl.searchParams.get("data.id"));return NextResponse.json({received:true});}
 catch(error){return NextResponse.json({received:false},{status:error instanceof Error&&error.message==="V2_INVALID_WEBHOOK_SIGNATURE"?401:503});}
}
