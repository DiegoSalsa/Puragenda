import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import http from 'node:http';
const base = 'http://127.0.0.1:3005';
const client = new pg.Client({connectionString:'postgresql://websiteqa@127.0.0.1:55439/websiteqa'});
await client.connect();
const reports=[];
let restoreSite, restorePrice;
function check(name, value) { assert.ok(value,name); reports.push({name,result:'PASS'}); }
async function call(path, tenant='a', init={}) {
 const host=`bella-${tenant}.localhost:3005`;
 return new Promise((resolve,reject)=>{
  const request=http.request(base+path,{method:init.method||'GET',headers:{host,origin:`http://${host}`,...init.headers}},response=>{
   const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:response.statusCode,headers:response.headers})));
  });request.on('error',reject);if(init.body)request.write(init.body);request.end();
 });
}
try {
 for (const tenant of ['a','b']) {
  const response=await call('/',tenant); const html=await response.text();
  check(`public tenant ${tenant}`,response.status===200 && html.includes(tenant==='a'?'ESTÉTICA':'BEAUTY ATELIER'));
  check(`no private API key ${tenant}`,!html.includes(`website-qa-${tenant}-local-only-key`));
 }
 const spoof=await fetch(base+'/sites/bella-a.localhost'); check('direct cross-host path denied',spoof.status===404);
 const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
 const input={serviceId:'website-qa-a-permanente',locationId:'website-qa-a-location',staffId:'any',optionIds:[],date};
 const query=new URLSearchParams({...input,optionIds:''});
 const available=await call(`/api/website/availability?${query}`); const slots=await available.json();
 check('canonical availability',available.status===200&&slots.slots?.length>0);
 const bad=await call(`/api/website/availability?${query}`,'b'); check('other tenant service denied',bad.status===400||bad.status===404);
 const slot=slots.slots[0];
 const body={...input,staffId:slot.staffId||'',startTime:slot.startTime,customerName:'Cliente QA local',customerEmail:`website-qa-${randomUUID()}@example.test`,customerPhone:'+56911112222'};
 const key=randomUUID();
 const options={method:'POST',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)};
 const booked=await call('/api/website/book','a',options); const result=await booked.json();
 check('canonical booking',booked.ok&&!!result.id);
 const replay=await call('/api/website/book','a',options); const replayResult=await replay.json();
 check('idempotent replay',replay.ok&&replayResult.id===result.id);
 const appointments=await client.query('SELECT "businessId", "serviceId" FROM "Appointment" WHERE id=$1',[result.id]);
 check('appointment isolated to tenant A',appointments.rows.length===1&&appointments.rows[0].businessId==='website-qa-a');
 const foreign=await call('/api/website/book','b',{...options,headers:{...options.headers,'idempotency-key':randomUUID()}}); check('cross-tenant booking denied',foreign.status===400);
 const crossOrigin=await call('/api/website/book','a',{...options,headers:{...options.headers,origin:'https://evil.example'}}); check('cross-origin mutation denied',crossOrigin.status===403);
 const tampered=await call('/api/website/book','a',{...options,body:JSON.stringify({...body,price:1})});check('client commercial values rejected',tampered.status===400);
 const collision=await call('/api/website/book','a',{...options,headers:{...options.headers,'idempotency-key':randomUUID()}});check('slot collision rejected by canonical writer',collision.status===409);
 const record=(await client.query('SELECT * FROM "BusinessWebsite" WHERE "businessId"=$1',['website-qa-a'])).rows[0];restoreSite=record;
 await client.query('UPDATE "BusinessWebsite" SET "draftConfig"="draftConfig" || $1::jsonb WHERE id=$2',[JSON.stringify({headline:'BORRADOR PRIVADO QA'}),record.id]);
 const published=await call('/'); check('draft never leaks publicly',!(await published.text()).includes('BORRADOR PRIVADO QA'));
 await client.query('UPDATE "BusinessWebsite" SET "draftConfig"=$1 WHERE id=$2',[record.draftConfig,record.id]);
 await client.query('UPDATE "BusinessWebsite" SET status=$1 WHERE id=$2',['SUSPENDED',record.id]);
 const suspended=await call('/');check('suspension denies public website',suspended.status===404);
 await client.query('UPDATE "BusinessWebsite" SET status=$1 WHERE id=$2',[record.status,record.id]);
 const rowSecurity=await client.query(`SELECT relname,relrowsecurity FROM pg_class WHERE relname=ANY($1)`,[['BusinessWebsite','WebsiteAddon','WebsiteDomain','DomainRequest','WebsiteBillingEvent']]);
 check('RLS enabled on all website tables',rowSecurity.rows.length===5&&rowSecurity.rows.every(row=>row.relrowsecurity));
 const role='websiteqa_browser_'+randomUUID().replaceAll('-','');
 await client.query('BEGIN');
 try {
  await client.query(`CREATE ROLE "${role}" NOLOGIN`);
  await client.query(`GRANT SELECT ON "BusinessWebsite","WebsiteAddon","WebsiteDomain","DomainRequest","WebsiteBillingEvent" TO "${role}"`);
  await client.query(`SET LOCAL ROLE "${role}"`);
  const hidden=await client.query('SELECT count(*)::int AS count FROM "BusinessWebsite"');
  check('browser role cannot read drafts even with SELECT grant',hidden.rows[0].count===0);
 } finally { await client.query('RESET ROLE');await client.query('ROLLBACK'); }
 const before=(await client.query('SELECT price FROM "Service" WHERE id=$1',[input.serviceId])).rows[0].price;restorePrice={id:input.serviceId,price:before};
 await client.query('UPDATE "Service" SET price=23456 WHERE id=$1',[input.serviceId]);
 const dynamic=await call('/');const dynamicHtml=await dynamic.text(); check('canonical service update reflects on website',dynamicHtml.includes('23456'));
 await client.query('UPDATE "Service" SET price=$1 WHERE id=$2',[before,input.serviceId]);
 console.log(JSON.stringify({database:'local websiteqa only',reports},null,2));
} finally {
 if(restoreSite) await client.query('UPDATE "BusinessWebsite" SET "draftConfig"=$1,status=$2 WHERE id=$3',[restoreSite.draftConfig,restoreSite.status,restoreSite.id]);
 if(restorePrice) await client.query('UPDATE "Service" SET price=$1 WHERE id=$2',[restorePrice.price,restorePrice.id]);
 await client.end();
}
