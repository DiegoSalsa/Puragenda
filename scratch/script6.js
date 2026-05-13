const fs = require('fs');
let svg = fs.readFileSync('public/logos/logoPuragendaSVG.svg', 'utf8');
let paths = [];
let regex = /<path class=\"([^\"]*)\" d=\"([^\"]+)\"/g;
let match;
let index = 0;
while ((match = regex.exec(svg)) !== null) {
  let d = match[2];
  let nums = d.match(/-?\d+/g);
  if (!nums) { index++; continue; }
  
  let x = 0, y = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  let tokens = d.match(/[a-zA-Z]|(-?\d+)/g);
  let cmd = '';
  for(let i=0; i<tokens.length; i++) {
     let t = tokens[i];
     if(/[a-zA-Z]/.test(t)) { cmd = t; } else {
       if (cmd === 'M') { x = parseInt(t); y = parseInt(tokens[++i]); cmd = 'L'; }
       else if (cmd === 'c') { i += 4; x += parseInt(tokens[++i]); y += parseInt(tokens[++i]); }
       else if (cmd === 'l') { x += parseInt(t); y += parseInt(tokens[++i]); }
       else if (cmd === 'L') { x = parseInt(t); y = parseInt(tokens[++i]); }
       if (x < minX) minX = x; if (x > maxX) maxX = x;
       if (y < minY) minY = y; if (y > maxY) maxY = y;
     }
  }
  paths.push({ index: index, minX, maxX, width: maxX - minX });
  index++;
}
paths.sort((a,b) => a.minX - b.minX);
console.log(paths.map(p => 'index: ' + p.index + ' minX: ' + p.minX + ' maxX: ' + p.maxX + ' width: ' + p.width).join('\n'));
