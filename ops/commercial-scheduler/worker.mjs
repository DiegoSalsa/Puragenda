const targets=new Set([
  "https://www.puragenda.cl/api/cron/puragenda-next",
  "https://next-staging.puragenda.cl/api/cron/puragenda-next",
]);
/** No public HTTP handler, response bodies, customer data or credentials in logs. */
export async function invokeCommercialWorker(env,fetcher=fetch,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))) {
  if(env.SCHEDULER_ENABLED!=="1")return {disabled:true};
  if(!targets.has(env.PURAGENDA_WORKER_URL)||(env.COMMERCIAL_WORKER_SECRET??"").length<32)throw new Error("SCHEDULER_CONFIGURATION_REQUIRED");
  for(let attempt=0;attempt<2;attempt++){
    let response;
    try{response=await fetcher(env.PURAGENDA_WORKER_URL,{method:"GET",headers:{Authorization:`Bearer ${env.COMMERCIAL_WORKER_SECRET}`},redirect:"manual",signal:AbortSignal.timeout(25000)});}catch{/* Retry one uncertain transport outcome; the application lease is authoritative. */}
    const status=response?.status;
    await response?.body?.cancel();
    if(status&&status>=200&&status<300)return {ok:true,attempts:attempt+1};
    if(status&&status<500&&status!==429)break;
    if(attempt===0)await pause(1000);
  }
  throw new Error("PURAGENDA_SCHEDULER_FAILED");
}
const scheduler={async scheduled(_controller,env){const result=await invokeCommercialWorker(env);console.log(JSON.stringify({scheduler:"PURAGENDA_NEXT",...result}));}};
export default scheduler;
