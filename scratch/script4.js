const fs = require('fs');
let svg = fs.readFileSync('public/logos/logoPuragendaSVG.svg', 'utf8');

let pathIndex = 0;
svg = svg.replace(/<path d=\"/g, () => {
  let className = (pathIndex === 9) ? 'p-text' : 'p-icon';
  pathIndex++;
  return '<path class=\"' + className + '\" d=\"';
});

// Remove fill="#000000" from the <g>
svg = svg.replace('fill="#000000"', '');

// Insert style tag
let style = `<style>
  .p-icon { fill: #7C3AED; }
  .p-text { fill: #1A1E24; }
  @media (prefers-color-scheme: dark) {
    .p-text { fill: #FFFFFF; }
  }
</style>`;

svg = svg.replace('<g transform', style + '\n<g transform');

fs.writeFileSync('public/logos/logoPuragendaSVG.svg', svg);
console.log('SVG updated.');
