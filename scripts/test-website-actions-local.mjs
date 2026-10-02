import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';
import http from 'node:http';

// Signed fixture sessions are valid only for this launcher's isolated QA secret.
const secret = 'local-website-qa-auth-secret-isolated-2026';
const base = 'http://127.0.0.1:3005';
const origin = 'http://localhost:3005';
const db = new pg.Client({ connectionString: 'postgresql://websiteqa@127.0.0.1:55439/websiteqa' });
await db.connect();
const reports = [];
const sites = (await db.query('SELECT * FROM "BusinessWebsite" WHERE "businessId"=ANY($1)', [['website-qa-a', 'website-qa-b']])).rows;
const site = key => sites.find(row => row.businessId === `website-qa-${key}`);
let mediaId;
const hostname = `audit-${randomUUID()}.example.cl`;
function check(name, result) { assert.ok(result, name); reports.push({ name, result: 'PASS' }); }
async function session(key) {
  const user = (await db.query('SELECT id,email,name,role,"tokenVersion","isSuperAdmin" FROM "User" WHERE id=$1', [`website-qa-${key}-owner`])).rows[0];
  const payload = Buffer.from(JSON.stringify({ ...user, v: 3, exp: Math.floor(Date.now()/1000)+600 })).toString('base64url');
  return `puragenda_session=${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
const cookies = { a: await session('a'), b: await session('b') };
async function call(path, key, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(base + path, { method: options.method || 'GET', headers: { host: 'localhost:3005', origin, cookie: cookies[key], ...options.headers } }, res => {
      const chunks=[];res.on('data', chunk => chunks.push(chunk));res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString(), headers: res.headers }));
    }); req.on('error', reject);if(options.body)req.write(options.body);req.end();
  });
}
async function action(name, args, key='a', extraHeaders={}) {
  const manifest = JSON.parse(fs.readFileSync('.next-websites-qa/dev/server/server-reference-manifest.json','utf8'));
  const id = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === name && entry.filename?.endsWith('website.actions.ts'))?.[0];
  assert.ok(id, `Compiled action ${name} must be available`);
  const response = await call('/dashboard/website', key, { method:'POST', headers:{'next-action':id,'content-type':'text/plain;charset=UTF-8',...extraHeaders},body:JSON.stringify(args) });
  // Inspect the action result, not unrelated error props in the revalidated RSC tree.
  const rootLine = response.text.split('\n').find(line => line.startsWith('0:'));
  const reference = rootLine && JSON.parse(rootLine.slice(2)).a;
  if (typeof reference === 'string' && reference.startsWith('$@')) {
    const prefix = reference.slice(2) + ':';
    const resultLine = response.text.split('\n').filter(line => line.startsWith(prefix)).at(-1);
    assert.ok(resultLine, 'Server action must return a verifiable result');
    response.text = resultLine.slice(prefix.length);
  }
  return response;
}
try {
  await call('/dashboard/website','a');
  const previewA=await call('/website-preview','a');const previewB=await call('/website-preview','b');
  check('authenticated preview A scoped to A', previewA.status===200&&previewA.text.includes('BELLA'));
  check('authenticated preview B scoped to B', previewB.status===200&&previewB.text.includes('BEAUTY ATELIER'));
  check('preview noindex and revalidation (Next dev)',previewA.text.includes('noindex')&&/(no-store|no-cache)/.test(String(previewA.headers['cache-control'])));
  check('preview prevents cross-origin embedding',String(previewA.headers['content-security-policy']).includes("frame-ancestors 'self'"));
  const form=new FormData();form.set('image',new Blob([fs.readFileSync('public/website-media-qa/website-qa-c/service.webp')],{type:'image/webp'}),'local-qa.webp');form.set('usage','hero');
  const encoded=new Request(origin+'/api/website/media',{method:'POST',body:form});
  const uploaded=await call('/api/website/media','a',{method:'POST',headers:{'content-type':encoded.headers.get('content-type')},body:Buffer.from(await encoded.arrayBuffer())});
  const asset=JSON.parse(uploaded.text).asset;mediaId=asset?.id;
  check('authenticated image upload A uses local provider',uploaded.status===200&&asset.secureUrl.startsWith('/website-media-qa/website-qa-a/'));
  const foreignConfig={...site('b').draftConfig,heroImage:asset.secureUrl,mediaAssets:[asset]};
  check('HTTP save cannot use asset A from tenant B',(await action('saveWebsiteDraft',[foreignConfig,site('b').revision,site('b').subdomain],'b')).text.includes('no pertenece'));
  check('HTTP delete cannot remove asset A from tenant B',(await action('removeWebsiteImage',[asset.id],'b')).text.includes('Imagen no encontrada'));
  const ownConfig={...site('a').draftConfig,heroImage:asset.secureUrl,mediaAssets:[asset]};
  const saved=await action('saveWebsiteDraft',[ownConfig,site('a').revision,site('a').subdomain]);
  check('HTTP save accepts owned upload',!saved.text.includes('"error"')&&saved.text.includes('revision'));
  check('HTTP delete protects draft asset',(await action('removeWebsiteImage',[asset.id])).text.includes('sigue en tu borrador'));
  await action('publishWebsite',[site('a').revision+1]);
  await db.query('UPDATE "BusinessWebsite" SET "draftConfig"=$1 WHERE id=$2',[site('a').draftConfig,site('a').id]);
  check('HTTP delete protects published asset',(await action('removeWebsiteImage',[asset.id])).text.includes('sitio publicado'));
  const created=await action('connectWebsiteDomain',[hostname]);
  const domain=(await db.query('SELECT * FROM "WebsiteDomain" WHERE hostname=$1',[hostname])).rows[0];
  check('HTTP domain A reserves unique tenant TXT without provider writes',!!domain&&domain.websiteId===site('a').id&&domain.provider==='pending'&&domain.verificationToken.startsWith('puragenda-verify=')&&!created.text.includes('"error"'));
  check('HTTP tenant B cannot reserve hostname A',(await action('connectWebsiteDomain',[hostname],'b')).text.includes('ocupado'));
  check('HTTP tenant B cannot verify domain A',(await action('checkWebsiteDomain',[domain.id],'b')).text.includes('Dominio no encontrado'));
  check('HTTP tenant B cannot disconnect domain A',(await action('disconnectWebsiteDomain',[domain.id],'b')).text.includes('Dominio no encontrado'));
  await db.query('UPDATE "WebsiteDomain" SET status=$1,"tenantVerifiedAt"=NOW() WHERE id=$2',['ACTIVE',domain.id]);
  check('HTTP tenant B cannot make active domain A primary',(await action('setPrimaryWebsiteDomain',[domain.id],'b')).text.includes('Dominio no activo'));
  check('HTTP tenant A can select its proven active primary',!(await action('setPrimaryWebsiteDomain',[domain.id])).text.includes('"error"'));
  check('HTTP actions reject cross-origin mutations',(await action('suspendWebsite',[],'a',{origin:'https://evil.test'})).status>=400);
  const finalDomain=(await db.query('SELECT "websiteId","isPrimary" FROM "WebsiteDomain" WHERE id=$1',[domain.id])).rows[0];
  check('foreign domain operations preserve tenant A association',finalDomain.websiteId===site('a').id&&finalDomain.isPrimary===true);
  console.log(JSON.stringify({database:'local websiteqa only',reports},null,2));
} finally {
  for(const row of sites)await db.query('UPDATE "BusinessWebsite" SET "draftConfig"=$1,"publishedConfig"=$2,revision=$3,"publishedRevision"=$4,status=$5,"publishedAt"=$6 WHERE id=$7',[row.draftConfig,row.publishedConfig,row.revision,row.publishedRevision,row.status,row.publishedAt,row.id]);
  await db.query('DELETE FROM "WebsiteDomain" WHERE hostname=$1',[hostname]);
  if(mediaId) {
    const asset=(await db.query('DELETE FROM "WebsiteMedia" WHERE id=$1 AND provider=$2 RETURNING "secureUrl"',[mediaId,'local'])).rows[0];
    if(asset?.secureUrl.startsWith('/website-media-qa/website-qa-a/'))fs.rmSync('public'+asset.secureUrl,{force:true});
  }
  await db.end();
}
