import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const get = (path, host) => new Promise((resolve, reject) => {
  http.get('http://127.0.0.1:3006' + path, { headers: { host } }, response => {
    let body = ''; response.on('data', chunk => body += chunk);
    response.on('end', () => resolve(body));
  }).on('error', reject);
});
const reports = [];
for (const [tenant, template] of [['soccerbarber', 'matchday'], ['bella-a', 'bella']]) {
  const host = tenant + '.localhost:3006', html = await get('/', host);
  const paths = [...new Set([...html.matchAll(/<(?:link|script)[^>]+(?:href|src)="([^"]+\.(?:css|js))"/g)].map(match => match[1]))];
  let code = '', cssBytes = 0, jsBytes = 0;
  for (const path of paths) {
    const asset = await get(path, host); code += asset;
    if (path.endsWith('.css')) cssBytes += Buffer.byteLength(asset); else jsBytes += Buffer.byteLength(asset);
  }
  const report = { template, title: html.match(/<title>(.*?)<\/title>/)?.[1], paths, cssBytes, jsBytes,
    fonts: { oswald: code.includes('Oswald'), manrope: code.includes('Manrope'), bricolage: code.includes('Bricolage'), dmSans: code.includes('DM Sans') },
    matchdayCSS: code.includes('--md-paper'), bellaCSS: code.includes('--bella-display') };
  reports.push(report);
}
fs.writeFileSync('docs/websites/qa-matchday/production-assets.json', JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
const [matchday, bella] = reports;
assert.ok(matchday.matchdayCSS && !matchday.bellaCSS && matchday.fonts.oswald && matchday.fonts.manrope && !matchday.fonts.bricolage && !matchday.fonts.dmSans, 'Matchday isolates CSS and fonts');
assert.ok(bella.bellaCSS && !bella.matchdayCSS && bella.fonts.bricolage && bella.fonts.dmSans && !bella.fonts.oswald && !bella.fonts.manrope, 'Bella isolates CSS and fonts');
