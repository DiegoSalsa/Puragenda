import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import {spawn} from "node:child_process";
import {pathToFileURL} from "node:url";
const root=process.cwd(),state=JSON.parse(fs.readFileSync("scratch/next-staging/current.json","utf8")),target=path.resolve(state.target);
if(!target.startsWith(path.resolve(root,"scratch/next-staging")+path.sep))throw Error("LOCAL_STAGING_PATH_REQUIRED");
const saved=JSON.parse(fs.readFileSync(path.join(target,"staging-runtime.private.json"),"utf8"));
if(new URL(saved.DATABASE_URL).hostname!=="127.0.0.1"||!new URL(saved.DATABASE_URL).pathname.startsWith("/puragenda_commercial_test_rc"))throw Error("LOCAL_STAGING_DATABASE_REQUIRED");
const allowed=new Set(["PATH","SYSTEMROOT","WINDIR","TEMP","TMP","APPDATA","LOCALAPPDATA","USERPROFILE","COMSPEC","PATHEXT","PROGRAMFILES","PROGRAMFILES(X86)","HTTP_PROXY","HTTPS_PROXY","NO_PROXY","NODE_EXTRA_CA_CERTS"]);
const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>allowed.has(k.toUpperCase()))),...saved};
env.NODE_OPTIONS=`--import=${pathToFileURL(path.join(target,"scripts/next-staging-network-guard.mjs")).href}`;
const log=fs.openSync(path.join(target,"next-server.log"),"a");
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--webpack","--hostname","127.0.0.1","--port","3128"],{cwd:target,env,stdio:["ignore",log,log],windowsHide:true});
const server=https.createServer({key:fs.readFileSync(path.join(target,"localhost.key")),cert:fs.readFileSync(path.join(target,"localhost.crt"))},(req,res)=>{
 const upstream=http.request({hostname:"127.0.0.1",port:3128,path:req.url,method:req.method,headers:{...req.headers,host:"127.0.0.1:3128","x-forwarded-proto":"https"}},response=>{res.writeHead(response.statusCode??502,response.headers);response.pipe(res);});
 upstream.on("error",()=>{res.writeHead(502);res.end("Local staging unavailable");});req.pipe(upstream);
});
server.listen(3448,"127.0.0.1",()=>console.log(JSON.stringify({running:true,pid:process.pid,nextPid:child.pid,httpOrigin:state.httpOrigin,httpsOrigin:state.httpsOrigin,localCertificate:"Trust explicitly in test clients; no system trust changes",outboundProvidersBlocked:true})));
function stop(){server.close();child.kill("SIGTERM");}
process.once("SIGINT",stop);process.once("SIGTERM",stop);child.once("exit",()=>server.close());
