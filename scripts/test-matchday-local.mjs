import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
const db=new pg.Client({connectionString:'postgresql://websiteqa@127.0.0.1:55439/websiteqa'});
await db.connect();
const reports=[];
const check=(name,value)=>{assert.ok(value,name);reports.push({name,result:'PASS'});};
function call(tenant,path,init={}) {return new Promise((resolve,reject)=>{const host=`${tenant}.localhost:3005`;const req=http.request('http://127.0.0.1:3005'+path,{method:init.method||'GET',headers:{host,origin:`http://${host}`,...init.headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);if(init.body)req.write(init.body);req.end();});}
try {
  for(const [tenant,name] of [['soccerbarber','SoccerBarber'],['distrito','Distrito Barber']]) {
    const response=await call(tenant,'/'),html=await response.text();check(`public Matchday ${tenant}`,response.ok&&html.includes(name)&&html.includes('id="staff"'));
    check(`no private key ${tenant}`,!html.includes(`website-qa-${tenant}-local-only-key`));
    check(`no Bella demo media ${tenant}`,!html.includes('/websites/bella/'));
    const foreign=tenant==='soccerbarber'?'Distrito Barber':'SoccerBarber';check(`tenant content isolation ${tenant}`,!html.includes(foreign));
  }
  // Repeated runs retain their QA bookings. Compare schedules on an unoccupied day.
  const date=new Date(Date.now()+2*86400000);
  for(let attempt=0;attempt<20;attempt++,date.setUTCDate(date.getUTCDate()+1)) {
    if(date.getUTCDay()===0) continue;
    const occupied=await db.query(`SELECT 1 FROM "Appointment" WHERE "businessId"=$1 AND ("startTime" AT TIME ZONE 'America/Santiago')::date=$2::date LIMIT 1`,['website-qa-soccerbarber',date.toISOString().slice(0,10)]);
    if(!occupied.rows.length) break;
    if(attempt===19) throw new Error('No unoccupied local QA date available');
  }
  const dateKey=date.toISOString().slice(0,10),query=new URLSearchParams({serviceId:'soccerbarber-corte',locationId:'soccerbarber-location',staffId:'soccerbarber-staff-1',optionIds:'',date:dateKey});
  const available=await call('soccerbarber','/api/website/availability?'+query), slots=await available.json();check('canonical availability',available.ok&&slots.slots.length>0);
  query.set('staffId','soccerbarber-staff-2');const afternoon=await(await call('soccerbarber','/api/website/availability?'+query)).json();check('staff schedule changes availability',afternoon.slots.length>0&&slots.slots.some(slot=>!afternoon.slots.some(other=>other.startTime===slot.startTime)));
  query.set('serviceId','soccerbarber-fade');const wrongStaff=await call('soccerbarber','/api/website/availability?'+query);check('staff service restriction enforced',wrongStaff.status===400||wrongStaff.status===404);
  query.set('serviceId','soccerbarber-corte');query.set('staffId','soccerbarber-staff-1');const foreign=await call('distrito','/api/website/availability?'+query);check('cross-tenant availability denied',foreign.status===400||foreign.status===404);
  const slot=slots.slots[0],key=randomUUID();const body={serviceId:'soccerbarber-corte',locationId:'soccerbarber-location',staffId:slot.staffId,optionIds:[],date:dateKey,startTime:slot.startTime,customerName:'Cliente QA Matchday',customerEmail:`qa-${randomUUID()}@example.test`,customerPhone:'+56911112222'};
  const init={method:'POST',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)};
  const booking=await call('soccerbarber','/api/website/book',init),result=await booking.json();check('canonical writer creates appointment',booking.ok&&!!result.id);
  const row=(await db.query('SELECT "businessId","staffId","serviceId" FROM "Appointment" WHERE id=$1',[result.id])).rows[0];check('appointment belongs to selected tenant and staff',row?.businessId==='website-qa-soccerbarber'&&row.staffId===slot.staffId&&row.serviceId===body.serviceId);
  const replay=await call('soccerbarber','/api/website/book',init);check('idempotent replay',replay.ok&&(await replay.json()).id===result.id);
  const collision=await call('soccerbarber','/api/website/book',{...init,headers:{...init.headers,'idempotency-key':randomUUID()}});check('canonical collision lock',collision.status===409);
  const cross=await call('distrito','/api/website/book',{...init,headers:{...init.headers,'idempotency-key':randomUUID()}});check('cross-tenant writer denied',cross.status===400);
  const origin=await call('soccerbarber','/api/website/book',{...init,headers:{...init.headers,origin:'https://foreign.example'}});check('cross-origin write denied',origin.status===403);
  const tampered=await call('soccerbarber','/api/website/book',{...init,body:JSON.stringify({...body,price:1})});check('client price rejected',tampered.status===400);
  const site=(await db.query('SELECT * FROM "BusinessWebsite" WHERE "businessId"=$1',['website-qa-soccerbarber'])).rows[0];
  try {
    await db.query('UPDATE "BusinessWebsite" SET "templateKey"=$1,"draftConfig"=$2 WHERE id=$3',['bella',{...site.draftConfig,headline:'PRIVATE DRAFT'},site.id]);
    const published=await call('soccerbarber','/');const html=await published.text();check('published identity stays Matchday while draft changes',published.ok&&html.includes('id="staff"')&&!html.includes('PRIVATE DRAFT'));
  } finally {await db.query('UPDATE "BusinessWebsite" SET "templateKey"=$1,"draftConfig"=$2 WHERE id=$3',[site.templateKey,site.draftConfig,site.id]);}
  const summary={environment:'isolated local websiteqa',appointmentId:result.id,reports};fs.mkdirSync('docs/websites/qa-matchday',{recursive:true});fs.writeFileSync('docs/websites/qa-matchday/http-tests.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
} finally {await db.end();}
