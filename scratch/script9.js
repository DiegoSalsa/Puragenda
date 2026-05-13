const fs = require('fs');
let svg = fs.readFileSync('public/logos/logoPuragendaSVG.svg', 'utf8');
let regex = /<path class=\"([^\"]*)\" d=\"/g;
let match;
let index = 0;
while ((match = regex.exec(svg)) !== null) {
  if (index === 8 || index === 9 || index === 10) {
      console.log('Index ' + index + ' class: ' + match[1]);
  }
  index++;
}
