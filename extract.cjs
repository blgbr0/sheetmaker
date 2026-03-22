const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n').map(l => l.replace('\r', ''));
const slices = [
  lines.slice(3, 10),
  lines.slice(11, 12),
  lines.slice(13, 54),
  lines.slice(55, 96),
  lines.slice(97, 104),
  lines.slice(105, 110),
  lines.slice(111, 118),
  lines.slice(119, 126)
];
const out = slices.map(s => s.join('\n')).join('\n\n') + '\n';
fs.mkdirSync('src/composables', { recursive: true });
fs.writeFileSync('src/composables/constants.js', out.replace(/^const /gm, 'export const '));
console.log('Extracted constants');
