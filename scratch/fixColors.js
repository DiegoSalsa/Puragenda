const fs = require('fs');
let svg = fs.readFileSync('public/logos/logoPuragendaSVG.svg', 'utf8');

// Strip all existing classes from paths so we start clean
svg = svg.replace(/<path class=\"[^\"]*\" d=\"/g, '<path d=\"');

let pathIndex = 0;
svg = svg.replace(/<path d=\"/g, () => {
  // Index 15 is the "u", Index 9 is the "r"
  let className = (pathIndex === 15 || pathIndex === 9) ? 'p-text' : 'p-icon';
  pathIndex++;
  return '<path class=\"' + className + '\" d=\"';
});

fs.writeFileSync('public/logos/logoPuragendaSVG.svg', svg);
console.log('Fixed: Index 15 (u) and Index 9 (r) set to p-text (black).');
