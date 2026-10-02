#!/usr/bin/env node
/**
 * Scan app/ + src/moduller for user-visible hardcoded TR/EN
 * (string literals with Turkish letters not passed via t()/i18n.t on same statement).
 */
import fs from 'node:fs';
import path from 'node:path';

function walk(d, a = []) {
  if (!fs.existsSync(d)) return a;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'admin', '.git'].includes(e.name)) continue;
      walk(p, a);
    } else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) a.push(p);
  }
  return a;
}

const TR = /[ÇĞİÖŞÜçğıöşü]/;
const files = [...walk('app'), ...walk('src/moduller'), ...walk('src/components')];
const findings = [];

for (const f of files) {
  if (/[/\\]admin[/\\]/.test(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  // strip block comments
  const cleaned = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const hits = [];
  // Alert.alert("Hard", ...) or Alert.alert('Hard'
  const alertRe = /Alert\.alert\(\s*(['"`])([^'"`]+)\1/g;
  let m;
  while ((m = alertRe.exec(cleaned))) {
    if (TR.test(m[2]) && !/\$\{|t\(/.test(m[2])) {
      hits.push({ kind: 'alert', s: m[2].slice(0, 70) });
    }
  }
  // JSX text nodes: >Türkçe<
  const jsxRe = />([^<{\n][^<]*[ÇĞİÖŞÜçğıöşü][^<]*)</g;
  while ((m = jsxRe.exec(cleaned))) {
    const s = m[1].trim();
    if (s.length >= 2) hits.push({ kind: 'jsx', s: s.slice(0, 70) });
  }
  // title="..." / placeholder="..." with TR
  const propRe =
    /\b(?:title|subtitle|placeholder|accessibilityLabel|accessibilityHint|label|message|headerTitle|headerBackTitle)=\{?\s*(['"`])([^'"`]*[ÇĞİÖŞÜçğıöşü][^'"`]*)\1/g;
  while ((m = propRe.exec(cleaned))) {
    hits.push({ kind: 'prop', s: m[2].slice(0, 70) });
  }
  // Object literals often used as UI: baslik: "..."
  const objRe =
    /\b(?:baslik|alt|title|subtitle|eyebrow|label|body|message|heading|cta|btn|button|empty|error|hint)\s*:\s*(['"`])([^'"`]*[ÇĞİÖŞÜçğıöşü][^'"`]*)\1/gi;
  while ((m = objRe.exec(cleaned))) {
    // skip if looks like Turkish comments in keys only
    hits.push({ kind: 'obj', s: `${m[0].slice(0, 90)}` });
  }

  if (hits.length) {
    findings.push({
      f: f.replace(/\\/g, '/'),
      n: hits.length,
      samples: hits.slice(0, 10),
    });
  }
}

findings.sort((a, b) => b.n - a.n);
console.log('Files with likely hardcoded TR UI:', findings.length);
let total = 0;
for (const r of findings.slice(0, 40)) {
  total += r.n;
  console.log(`\n${r.n}\t${r.f}`);
  for (const h of r.samples) console.log(`  [${h.kind}] ${h.s}`);
}
console.log('\nShown files hit sum:', total);
