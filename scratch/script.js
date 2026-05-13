const fs = require('fs');
let svg = fs.readFileSync('public/logos/logoPuragendaSVG.svg', 'utf8');
let paths = [];
let regex = /<path d=\"([^\"]+)\"/g;
let match;
while ((match = regex.exec(svg)) !== null) {
  let d = match[1];
  let mMatch = d.match(/M\s*(-?\d+)/);
  let minX = mMatch ? parseInt(mMatch[1]) : 0;
  paths.push({ index: paths.length, minX, d });
}
paths.sort((a,b) => a.minX - b.minX);
console.log(paths.map(p => 'Path ' + p.index + ': minX = ' + p.minX));
