import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import http from 'node:http';
const base = 'http://127.0.0.1:3005';
const client = new pg.Client({connectionString:'postgresql://websiteqa@127.0.0.1:55439/websiteqa'});
await client.connect();
const reports=[];
let restoreSite, restorePrice, restoreC, restoreStaff;
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
 const responseC=await call('/','c');const htmlC=await responseC.text();
 check('tenant C service gallery without demo',responseC.status===200&&htmlC.includes('id="trabajos"')&&htmlC.includes('website-qa-c/service.webp')&&!htmlC.includes('/websites/bella/'));
 const cServices=(await client.query('SELECT id,"imageUrl" FROM "Service" WHERE "businessId"=$1',['website-qa-c'])).rows;restoreC=cServices;
 await client.query('UPDATE "Service" SET "imageUrl"=NULL WHERE "businessId"=$1',['website-qa-c']);
 const noGallery=await call('/','c');check('tenant C hides Portfolio without manual or service photos',!(await noGallery.text()).includes('id="trabajos"'));
 for(const service of cServices)await client.query('UPDATE "Service" SET "imageUrl"=$1 WHERE id=$2',[service.imageUrl,service.id]);
 const privatePreview=await call('/website-preview');check('preview requires authentication',privatePreview.status===307||privatePreview.status===302||privatePreview.status===401||privatePreview.status===404);
 const upload=await call('/api/website/media','a',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=qa'},body:'--qa--'});check('unauthenticated media upload denied',upload.status===401||upload.status===403);
 const badMediaOrigin=await call('/api/website/media','a',{method:'POST',headers:{origin:'https://evil.test'},body:'invalid'});check('cross-origin media mutation denied',badMediaOrigin.status===403);
 const staffRecord=(await client.query('SELECT id,name FROM "Staff" WHERE "businessId"=$1 AND "isActive"=true LIMIT 1',['website-qa-a'])).rows[0];restoreStaff=staffRecord;
 await client.query('UPDATE "Staff" SET name=$1 WHERE id=$2',['Profesional actualizada QA',staffRecord.id]);
 check('canonical staff update reflects on website',(await(await call('/')).text()).includes('Profesional actualizada QA'));
 await client.query('UPDATE "Staff" SET name=$1 WHERE id=$2',[staffRecord.name,staffRecord.id]);
 const siteA=(await client.query('SELECT id FROM "BusinessWebsite" WHERE "businessId"=$1',['website-qa-a'])).rows[0];
 const domainId='qa-domain-'+randomUUID();
 try {
   await client.query('INSERT INTO "WebsiteDomain" (id,"websiteId",hostname,status,"verificationToken","tenantVerifiedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())',[domainId,siteA.id,'tenant-a.qa-example.cl','ACTIVE','puragenda-verify=local-only']);
   const custom=await new Promise((resolve,reject)=>{const req=http.request(base+'/',{headers:{host:'tenant-a.qa-example.cl'}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});
   check('active custom hostname resolves exclusively to A',custom.status===200&&custom.body.includes('ESTÉTICA')&&!custom.body.includes('BEAUTY ATELIER'));
   let duplicateDenied=false;try{await client.query('INSERT INTO "WebsiteDomain" (id,"websiteId",hostname,"verificationToken","updatedAt") VALUES ($1,$2,$3,$4,NOW())',['qa-duplicate-'+randomUUID(),siteA.id,'tenant-a.qa-example.cl','other']);}catch(error){duplicateDenied=error.code==='23505';}check('database globally rejects duplicate hostname',duplicateDenied);
   await client.query('UPDATE "WebsiteDomain" SET "tenantVerifiedAt"=NULL WHERE id=$1',[domainId]);
   const unproven=await new Promise((resolve,reject)=>{const req=http.request(base+'/',{headers:{host:'tenant-a.qa-example.cl'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});check('legacy ACTIVE without tenant proof does not route',unproven===404);
 } finally {await client.query('DELETE FROM "WebsiteDomain" WHERE id=$1',[domainId]);}
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
 const rowSecurity=await client.query(`SELECT relname,relrowsecurity FROM pg_class WHERE relname=ANY($1)`,[['BusinessWebsite','WebsiteAddon','WebsiteDomain','DomainRequest','WebsiteBillingEvent','WebsiteMedia']]);
 check('RLS enabled on all website tables',rowSecurity.rows.length===6&&rowSecurity.rows.every(row=>row.relrowsecurity));
 const role='websiteqa_browser_'+randomUUID().replaceAll('-','');
 await client.query('BEGIN');
 try {
  await client.query(`CREATE ROLE "${role}" NOLOGIN`);
  await client.query(`GRANT SELECT ON "BusinessWebsite","WebsiteAddon","WebsiteDomain","DomainRequest","WebsiteBillingEvent","WebsiteMedia" TO "${role}"`);
  await client.query(`SET LOCAL ROLE "${role}"`);
  const hidden=await client.query('SELECT count(*)::int AS count FROM "BusinessWebsite"');
  const hiddenMedia=await client.query('SELECT count(*)::int AS count FROM "WebsiteMedia"');
  check('browser role cannot read tenant assets even with SELECT grant',hiddenMedia.rows[0].count===0);
  check('browser role cannot read drafts even with SELECT grant',hidden.rows[0].count===0);
 } finally { await client.query('RESET ROLE');await client.query('ROLLBACK'); }
 const before=(await client.query('SELECT price FROM "Service" WHERE id=$1',[input.serviceId])).rows[0].price;restorePrice={id:input.serviceId,price:before};
 await client.query('UPDATE "Service" SET price=23456 WHERE id=$1',[input.serviceId]);
 const dynamic=await call('/');const dynamicHtml=await dynamic.text(); check('canonical service update reflects on website',dynamicHtml.includes('23456'));
 await client.query('UPDATE "Service" SET price=$1 WHERE id=$2',[before,input.serviceId]);
 console.log(JSON.stringify({database:'local websiteqa only',reports},null,2));
} finally {
 if(restoreSite) await client.query('UPDATE "BusinessWebsite" SET "draftConfig"=$1,status=$2 WHERE id=$3',[restoreSite.draftConfig,restoreSite.status,restoreSite.id]);
 if(restoreC)for(const service of restoreC)await client.query('UPDATE "Service" SET "imageUrl"=$1 WHERE id=$2',[service.imageUrl,service.id]);
 if(restoreStaff)await client.query('UPDATE "Staff" SET name=$1 WHERE id=$2',[restoreStaff.name,restoreStaff.id]);
 if(restorePrice) await client.query('UPDATE "Service" SET price=$1 WHERE id=$2',[restorePrice.price,restorePrice.id]);
 await client.end();
}
