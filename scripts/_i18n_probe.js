const fs = require('fs');
const path = 'src/i18n/locales/en.ts';
const src = fs.readFileSync(path, 'utf8');
// crude extract of string leaves: key: 'value' or key: "value"
const leaves = [];
const re = /^\s{2,}([a-zA-Z0-9_]+):\s*'((?:\\'|[^'])*)'/gm;
let m;
while ((m = re.exec(src))) {
  leaves.push({ key: m[1], value: m[2], index: m.index });
}
console.log('leaf-ish count', leaves.length);
console.log('sample', leaves.slice(0,5));
const namespaces = [...src.matchAll(/^  ([a-zA-Z0-9_]+):\s*\{/gm)].map(x=>x[1]);
console.log('namespaces', namespaces.length, namespaces.slice(0,20));
