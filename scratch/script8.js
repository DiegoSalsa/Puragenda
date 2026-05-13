const fs = require('fs');
let svg = fs.readFileSync('public/logos/logoPuragendaSVG.svg', 'utf8');

// wrap in a nice html file
let html = '<html><body style="background: white;"><svg width="100%" height="100%" viewBox="0 0 1659 948">';
let pathIndex = 0;

// Remove classes
svg = svg.replace(/<path class=\"[^\"]*\" d=\"([^\"]+)\"/g, '<path d=\"$1\"');

let regex = /<path d=\"([^\"]+)\"/g;
let match;
let colors = ['red','blue','green','yellow','orange','cyan','magenta','pink','lime','teal','purple','brown','navy','maroon','olive','gray'];

// Extract the <g transform="..."> to put around the paths
let gMatch = svg.match(/<g transform=\"[^\"]+\"/);
if (gMatch) {
  html += gMatch[0] + ' fill="none" stroke="none">';
} else {
  html += '<g transform="translate(0,948) scale(0.1,-0.1)">';
}

while ((match = regex.exec(svg)) !== null) {
  let d = match[1];
  let color = colors[pathIndex % colors.length];
  html += '<path fill=\"' + color + '\" d=\"' + d + '\" />';
  
  let mMatch = d.match(/M\s*(-?\d+)\s+(-?\d+)/);
  if (mMatch) {
     let x = parseInt(mMatch[1]);
     let y = parseInt(mMatch[2]);
     // Add a small text label, scaled because of the transform
     html += '<text x=\"' + x + '\" y=\"' + y + '\" fill=\"black\" font-size=\"400\" font-family=\"Arial\" transform=\"scale(1,-1)\">' + pathIndex + '</text>';
  }
  pathIndex++;
}

html += '</g></svg></body></html>';
fs.writeFileSync('public/test.html', html);
console.log('test.html generated in public dir');
