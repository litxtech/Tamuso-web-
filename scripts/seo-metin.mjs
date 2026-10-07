/**
 * Herkese açık sayfaların gerçek metnini kaynak dosyalardan okur.
 * Yeni cümle üretmez.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function oku(rel) {
  return fs.readFileSync(path.join(kok, rel), 'utf8');
}

function kacis(deger) {
  return String(deger)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function govdeSabiti(ad) {
  const src = oku('src/moduller/politikalar/icerik/PolitikaMetinleri.ts');
  const m = src.match(new RegExp(`const ${ad} = \`([\\s\\S]*?)\`;\\r?\\n`));
  if (!m || m[1].trim().length < 800) {
    throw new Error(`politika metni okunamadı: ${ad}`);
  }
  return m[1].trim();
}

function toplulukGovde() {
  const src = oku('src/i18n/locales/tr.ts');
  const m = src.match(/communityGovde:\s*"((?:\\.|[^"\\])*)"/);
  if (!m) throw new Error('topluluk metni okunamadı');
  const metin = JSON.parse(`"${m[1]}"`).trim();
  if (metin.length < 800) throw new Error('topluluk metni kısa');
  return metin;
}

function trBlogu() {
  const src = oku('src/moduller/web-tanitim/tanitimMetin.ts');
  const a = src.indexOf('const TR: TanitimMetin = {');
  const b = src.indexOf('\nconst EN:', a);
  if (a < 0 || b < 0) throw new Error('tanıtım metni bulunamadı');
  return { src, tr: src.slice(a, b) };
}

function alan(blok, anahtar) {
  const m = blok.match(new RegExp(`${anahtar}:\\s*'((?:\\\\'|[^'])*)'`));
  if (!m) throw new Error(`alan yok: ${anahtar}`);
  return m[1].replace(/\\'/g, "'");
}

function dizi(blok, anahtar) {
  const m = blok.match(new RegExp(`${anahtar}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!m) throw new Error(`liste yok: ${anahtar}`);
  return [...m[1].matchAll(/'((?:\\'|[^'])*)'/g)].map((x) => x[1].replace(/\\'/g, "'"));
}

function ozellikler(src) {
  const a = src.indexOf('const OZELLIK_TR');
  const b = src.indexOf('const TR:', a);
  const dilim = src.slice(a, b);
  const liste = [...dilim.matchAll(/baslik:\s*'([^']+)',\s*metin:\s*'([^']+)'/g)].map(
    (x) => ({ baslik: x[1], metin: x[2] }),
  );
  if (liste.length < 8) throw new Error('özellik listesi okunamadı');
  return liste;
}

const BAGLANTILAR = [
  ['/', 'Ana sayfa'],
  ['/blog', 'Blog'],
  ['/tanitim/ozellikler', 'Özellikler'],
  ['/tanitim/coinler', 'Coinler'],
  ['/tanitim/meyve', 'Meyve oyunu'],
  ['/tanitim/hakkinda', 'Hakkında'],
  ['/tanitim/yatirim', 'Yatırım'],
  ['/tanitim/isbirligi', 'İşbirliği'],
  ['/politika', 'Politikalar'],
  ['/politika/tos', 'Kullanım şartları'],
  ['/politika/privacy', 'Gizlilik'],
  ['/politika/community_rules', 'Topluluk kuralları'],
  ['/politika/child_safety', 'Çocuk güvenliği'],
];

function nav(aktif) {
  const linkler = BAGLANTILAR.filter(([yol]) => yol !== aktif)
    .map(([yol, ad]) => `<a href="${yol}">${kacis(ad)}</a>`)
    .join(' · ');
  return `<nav>${linkler}</nav>`;
}

function maddeListesi(maddeler) {
  return `<ul>${maddeler.map((m) => `<li>${kacis(m)}</li>`).join('')}</ul>`;
}

function yasal(baslik, metin) {
  return `<article><h1>${kacis(baslik)}</h1><pre>${kacis(metin)}</pre></article>`;
}

/** @returns {string} main içine girecek HTML */
export function sayfaIcerigi(yol) {
  const { src, tr } = trBlogu();
  if (yol === '/politika/tos') return yasal('Kullanım Şartları', govdeSabiti('GOVDE_TOS'));
  if (yol === '/politika/privacy') return yasal('Gizlilik Politikası', govdeSabiti('GOVDE_PRIVACY'));
  if (yol === '/politika/child_safety') {
    return yasal('Çocuk Koruma Politikası', govdeSabiti('GOVDE_CHILD_SAFETY'));
  }
  if (yol === '/politika/community_rules') {
    return yasal('Topluluk Kuralları', toplulukGovde());
  }
  if (yol === '/politika') {
    return `<article><h1>${kacis(alan(tr, 'politikaBaslik'))}</h1><p>${kacis(alan(tr, 'politikaAlt'))}</p><ul><li><a href="/politika/tos">Kullanım şartları</a>. Platform kuralları ve sorumluluklar.</li><li><a href="/politika/privacy">Gizlilik politikası</a>. Kişisel verilerin işlenmesi.</li><li><a href="/politika/community_rules">Topluluk kuralları</a>. Kullanıcı içeriği, bildirme ve engelleme.</li><li><a href="/politika/child_safety">Çocuk koruma politikası</a>. Platform 18 yaş ve üzeri içindir.</li></ul>${nav(yol)}</article>`;
  }
  if (yol === '/tanitim/ozellikler') {
    const liste = ozellikler(src)
      .map((o) => `<li><strong>${kacis(o.baslik)}</strong> ${kacis(o.metin)}</li>`)
      .join('');
    return `<article><h1>${kacis(alan(tr, 'ozelliklerBaslik'))}</h1><p>${kacis(alan(tr, 'ozelliklerAlt'))}</p><ul>${liste}</ul>${nav(yol)}</article>`;
  }
  if (yol === '/tanitim/coinler') {
    return `<article><h1>${kacis(alan(tr, 'coinBaslik'))}</h1><p>${kacis(alan(tr, 'coinAlt'))}</p>${maddeListesi(dizi(tr, 'coinMaddeler'))}${nav(yol)}</article>`;
  }
  if (yol === '/tanitim/meyve') {
    return `<article><h1>${kacis(alan(tr, 'meyveBaslik'))}</h1><p>${kacis(alan(tr, 'meyveAlt'))}</p>${maddeListesi(dizi(tr, 'meyveMaddeler'))}${nav(yol)}</article>`;
  }
  if (yol === '/tanitim/hakkinda') {
    return `<article><h1>${kacis(alan(tr, 'hakkindaBaslik'))}</h1><p>${kacis(alan(tr, 'hakkindaGovde'))}</p>${maddeListesi(dizi(tr, 'hakkindaMaddeler'))}<h2>${kacis(alan(tr, 'vizyonBaslik'))}</h2><p>${kacis(alan(tr, 'vizyonGovde'))}</p>${maddeListesi(dizi(tr, 'vizyonMaddeler'))}${nav(yol)}</article>`;
  }
  if (yol === '/tanitim/yatirim') {
    return `<article><h1>${kacis(alan(tr, 'yatirimBaslik'))}</h1><p>${kacis(alan(tr, 'yatirimGovde'))}</p>${maddeListesi(dizi(tr, 'yatirimMaddeler'))}<p><a href="mailto:support@litxtech.com">${kacis(alan(tr, 'mailYaz'))}</a></p>${nav(yol)}</article>`;
  }
  if (yol === '/tanitim/isbirligi') {
    return `<article><h1>${kacis(alan(tr, 'isbirligiBaslik'))}</h1><p>${kacis(alan(tr, 'isbirligiGovde'))}</p>${maddeListesi(dizi(tr, 'isbirligiMaddeler'))}<p><a href="mailto:support@litxtech.com">${kacis(alan(tr, 'mailYaz'))}</a></p>${nav(yol)}</article>`;
  }
  if (yol === '/tanitim') {
    return `<article><h1>Tamuso tanıtım</h1><p>${kacis(alan(tr, 'heroAlt'))}</p><p>Bu sayfa bölümlerin listesidir. Ana sayfa aynı ürünün girişidir.</p>${nav(yol)}</article>`;
  }
  if (yol === '/') {
    const sahneler = ['sahneGorusme', 'sahneCanli', 'sahneMesaj', 'sahneKesfet']
      .map((k) => `<li><strong>${kacis(alan(tr, k))}</strong> ${kacis(alan(tr, `${k}Alt`))}</li>`)
      .join('');
    return `<article><h1>${kacis(alan(tr, 'heroBaslik'))}</h1><p>${kacis(alan(tr, 'heroAlt'))}</p><ul>${sahneler}</ul>${nav(yol)}</article>`;
  }
  throw new Error(`içerik yok: ${yol}`);
}
