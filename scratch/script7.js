const fs = require('fs');
let svg = fs.readFileSync('public/logos/logoPuragendaSVG.svg', 'utf8');

svg = svg.replace(/<path class=\"[^\"]*\" d=\"/g, '<path d=\"');

let pathIndex = 0;
svg = svg.replace(/<path d=\"/g, () => {
  let className = (pathIndex === 9 || pathIndex === 10) ? 'p-text' : 'p-icon';
  pathIndex++;
  return '<path class=\"' + className + '\" d=\"';
});

fs.writeFileSync('public/logos/logoPuragendaSVG.svg', svg);
console.log('SVG updated with index 9 and 10 as p-text.');
