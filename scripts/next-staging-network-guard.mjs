import { createRequire, syncBuiltinESMExports } from "node:module";
export function stagingHostAllowed(value) {
  try { const u=new URL(value);return (["http:","https:"].includes(u.protocol)&&["localhost","127.0.0.1","[::1]"].includes(u.hostname)) || (process.env.NEXT_ISOLATED_BUILD_FONTS==="1" && u.protocol==="https:" && ["fonts.googleapis.com","fonts.gstatic.com"].includes(u.hostname)); }
  catch { return false; }
}
if(process.env.NEXT_STAGING_NETWORK_GUARD==="1") {
  const originalFetch=globalThis.fetch;
  globalThis.fetch=(input,options)=>{
    const url=typeof input==="string"||input instanceof URL?String(input):input.url;
    if(!stagingHostAllowed(url))return Promise.reject(new Error("NEXT_STAGING_EXTERNAL_IO_BLOCKED"));
    return originalFetch(input,options);
  };
  const require=createRequire(import.meta.url);
  for(const [name,scheme]of[["node:http","http:"],["node:https","https:"]]) {
    const mod=require(name);
    for(const method of["request","get"]) {
      const original=mod[method];
      mod[method]=function(input,...args){
        const url=typeof input==="string"||input instanceof URL?String(input):`${input.protocol??scheme}//${input.hostname??input.host??"localhost"}${input.port?":"+input.port:""}/`;
        if(!stagingHostAllowed(url))throw new Error("NEXT_STAGING_EXTERNAL_IO_BLOCKED");
        return original.call(this,input,...args);
      };
    }
  }
  syncBuiltinESMExports();
}
