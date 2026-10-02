#!/usr/bin/env node
/**
 * Find likely user-visible hardcoded strings (TR/EN) outside t()/i18n.
 * Heuristic — comments excluded.
 */
import fs from 'node:fs';
import path from 'node:path';

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === 'admin' || e.name === 'node_modules') continue;
      walk(p, a);
    } else if (e.name.endsWith('.tsx')) a.push(p);
  }
  return a;
}

const TR = /[ÇĞİÖŞÜçğıöşü]/
const UI_HINT =
  /\b(Alert\.alert|title:\s*|subtitle:\s*|placeholder=\{?|accessibilityLabel=|accessibilityHint=|children:\s*|message:\s*|label:\s*|baslik:\s*|alt:\s*|eyebrow:\s*)/;

const files = walk('app');
const findings = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
    // string literals with Turkish chars
    const re = /(['"`])([^'"`\\]*(?:\\.[^'"`\\]*)*)\1/g;
    let m;
    while ((m = re.exec(line))) {
      const s = m[2];
      if (s.length < 3 || s.length > 120) continue;
      if (!TR.test(s)) continue;
      // skip import paths / identifiers-ish
      if (/^[\w./@-]+$/.test(s)) continue;
      if (/useCeviri|locales|i18n/.test(line) && line.includes('import')) continue;
      // likely UI if nearby context or Alert
      const ctx = lines.slice(Math.max(0, i - 2), i + 3).join('\n');
      const nearT = /\bt\(|i18n\.t\(/.test(line);
      if (nearT) continue;
      hits.push({ line: i + 1, s: s.slice(0, 80), alert: /Alert\.alert/.test(ctx) });
    }
  }
  if (hits.length) {
    findings.push({
      f: f.replace(/\\/g, '/'),
      n: hits.length,
      samples: hits.slice(0, 8),
    });
  }
}

findings.sort((a, b) => b.n - a.n);
console.log('Files with TR string literals not on same line as t():', findings.length);
for (const r of findings.slice(0, 35)) {
  console.log(`\n${r.n}\t${r.f}`);
  for (const h of r.samples) {
    console.log(`  L${h.line}${h.alert ? ' ALERT' : ''}: ${h.s}`);
  }
}
