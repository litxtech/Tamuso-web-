const fs = require('fs');
const text = fs.readFileSync('.cache/fw-oneline.sql', 'utf8');
const lines = text.split('\n');
let buf = [];
let size = 0;
let n = 1;
let quote = false;
function flush() {
  const body = buf.join('\n').trim();
  if (body) {
    fs.writeFileSync('.cache/fw-c' + n + '.sql', body);
    console.log(n, body.length);
    n += 1;
  }
  buf = [];
  size = 0;
}
for (const line of lines) {
  const toggles = (line.match(/\$\$|\$fw\$/g) || []).length;
  if (toggles % 2 === 1) quote = !quote;
  buf.push(line);
  size += line.length + 1;
  if (!quote && size > 8500 && /;\s*$/.test(line)) flush();
}
flush();
