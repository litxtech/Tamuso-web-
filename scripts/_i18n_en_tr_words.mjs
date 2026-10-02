#!/usr/bin/env node
/** Find EN values that look like leftover Turkish words (no diacritics). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function extractTs(file, name) {
  const src = fs.readFileSync(file, 'utf8');
  const marker = `export const ${name}`;
  const start = src.indexOf(marker);
  const objStart = src.indexOf('{', start);
  let i = objStart;
  let depth = 0;
  let inS = null;
  let esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inS) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === inS) inS = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inS = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        return Function(`"use strict"; return (${src.slice(objStart, i + 1)})`)();
      }
    }
  }
}

function leaves(o, p = '', a = []) {
  for (const [k, v] of Object.entries(o || {})) {
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, q, a);
    else a.push([q, String(v ?? '')]);
  }
  return a;
}

const TR_WORDS =
  /\b(Durum|Oda|Odalar|Mesaj|Mesajlar|Cuzdan|Cüzdan|Ayarlar|Kaydet|Iptal|İptal|Gonder|Gönder|Yukle|Yükle|Silindi|Basarili|Başarılı|Hata|Lutfen|Lütfen|Hosgeldin|Hoşgeldin|Takip|Takipci|Takipçi|Canli|Canlı|Yayin|Yayın|Oyun|Bahis|Bakiye|Vazgec|Vazgeç|Geri don|Geri dön|Kullanici|Kullanıcı|Misafir|Sifre|Şifre|Eposta|E-posta|Bildirim|Guvenlik|Güvenlik|Ajans|Sehir|Şehir|Ulke|Ülke|Profil|Duzenle|Düzenle)\b/i;

const en = leaves(
  extractTs(path.join(ROOT, 'src/i18n/locales/en.ts'), 'en'),
);
const tr = Object.fromEntries(
  leaves(extractTs(path.join(ROOT, 'src/i18n/locales/tr.ts'), 'tr')),
);

const hits = [];
for (const [k, v] of en) {
  if (v === tr[k]) continue; // already counted as cognate/same
  if (TR_WORDS.test(v) && /[A-Za-z]/.test(v)) {
    hits.push({ k, v });
  }
}
console.log('EN values with Turkish-looking words (diff from TR):', hits.length);
for (const x of hits.slice(0, 40)) console.log(`  ${x.k}: ${JSON.stringify(x.v).slice(0, 100)}`);
