// Reference photography exists exclusively in ignored local QA storage.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const ledger=JSON.parse(await fs.readFile('docs/websites/matchday-media-sources.json','utf8'));
await fs.mkdir('public/website-media-qa/matchday',{recursive:true});
for(const photo of ledger) {
  const html=await(await fetch(photo.source)).text();
  const match=html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
  if(!match)throw new Error('Source photo unavailable: '+photo.source);
  const url=new URL(match[1].replaceAll('&amp;','&'));url.searchParams.set('w','1500');url.searchParams.set('q','85');url.searchParams.delete('h');
  const response=await fetch(url);if(!response.ok)throw new Error('Photo download failed: '+response.status);
  await sharp(Buffer.from(await response.arrayBuffer())).resize({width:1500,withoutEnlargement:true}).webp({quality:86}).toFile('public'+photo.local);
}
console.log('Matchday QA photographs prepared locally; no tenant default images.');
