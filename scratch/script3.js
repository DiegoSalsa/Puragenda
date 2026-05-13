const fs = require('fs');
let svg = fs.readFileSync('public/logos/logoPuragendaSVG.svg', 'utf8');
let regex = /<path d=\"([^\"]+)\"/g;
let match;
while ((match = regex.exec(svg)) !== null) {
  let d = match[1];
  let mCount = (d.match(/M/g) || []).length + (d.match(/m/g) || []).length;
  console.log('Path has ' + mCount + ' subpaths');
}
