const fs = require('fs');
let svg = fs.readFileSync('public/logos/logoPuragendaSVG.svg', 'utf8');
let regex = /<path class=\"([^\"]*)\" d=\"([^\"]+)\"/g;
let match;
let index = 0;
while ((match = regex.exec(svg)) !== null) {
  console.log('Path ' + index + ' has class ' + match[1] + ' and starts with ' + match[2].substring(0, 15));
  index++;
}
