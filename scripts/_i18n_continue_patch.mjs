#!/usr/bin/env node
/**
 * Continue i18n sequence: PT/FR leftovers + FIL deep chrome overlays.
 * node scripts/_i18n_continue_patch.mjs
 */
import fs from 'node:fs';

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
      if (depth === 0) return Function(`return (${src.slice(objStart, i + 1)})`)();
    }
  }
  throw new Error(`parse ${file}`);
}

function deepSet(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function deepGet(obj, path) {
  return path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), obj);
}

function leaves(o, p = '', a = []) {
  for (const [k, v] of Object.entries(o || {})) {
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, q, a);
    else a.push([q, String(v ?? '')]);
  }
  return a;
}

function writeJson(path, obj) {
  const tmp = path + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, path);
}

// ---------- PT ----------
{
  let pt = fs.readFileSync('src/i18n/locales/pt.ts', 'utf8');
  const pairs = [
    ['pip: "Picture-in-picture (PiP)"', 'pip: "Tela flutuante (PiP)"'],
    ['aiStudio: "AI Music Studio"', 'aiStudio: "Estúdio de Música IA"'],
    ['menuAiMuzik: "AI Music Studio"', 'menuAiMuzik: "Estúdio de Música IA"'],
    ['\\nStatus: {{status}}"', '\\nSituação: {{status}}"'],
    ['duzenKoduGecersiz: "Invalid layout code"', 'duzenKoduGecersiz: "Código de layout inválido"'],
    ['temaKoduGecersiz: "Invalid theme code"', 'temaKoduGecersiz: "Código de tema inválido"'],
    [
      'gorunumDuzeniAlt: "Microphone stage arrangement design"',
      'gorunumDuzeniAlt: "Design da disposição do palco de microfones"',
    ],
    ['gorunumDuzeni: "Stage layout"', 'gorunumDuzeni: "Layout do palco"'],
    [
      'tumunuGorAlt: "30 estilos",\n    temaSayisi: "{{n}} designs"',
      'tumunuGorAlt: "30 estilos",\n    temaSayisi: "{{n}} visuais"',
    ],
    ['duzenSayisi: "{{n}} layouts"', 'duzenSayisi: "{{n}} disposições"'],
    ['temaSayisi: "{{n}} designs"', 'temaSayisi: "{{n}} visuais"'],
  ];
  for (const [from, to] of pairs) {
    if (!pt.includes(from)) console.warn('PT miss:', JSON.stringify(from).slice(0, 70));
    else pt = pt.split(from).join(to);
  }
  fs.writeFileSync('src/i18n/locales/pt.ts', pt);
  console.log('PT done');
}

// ---------- FR ----------
{
  const fr = JSON.parse(fs.readFileSync('src/i18n/locales/fr.json', 'utf8'));
  fr.sesOda.duzenKoduGecersiz = 'Code de disposition invalide';
  fr.sesOda.temaKoduGecersiz = 'Code de thème invalide';
  fr.sesOda.gorunumDuzeniAlt = 'Design de la disposition de la scène micro';
  fr.sesOda.gorunumDuzeni = 'Disposition de scène';
  if (fr.gorunum) fr.gorunum.temaSayisi = '{{n}} thèmes';
  if (fr.odaTema) fr.odaTema.temaSayisi = '{{n}} thèmes';
  if (fr.odaDuzen) fr.odaDuzen.duzenSayisi = '{{n}} dispositions';
  writeJson('src/i18n/locales/fr.json', fr);
  console.log('FR done');
}

// ---------- FIL ----------
{
  const en = extractTs('src/i18n/locales/en.ts', 'en');
  const fil = JSON.parse(fs.readFileSync('src/i18n/locales/fil.json', 'utf8'));
  const enLeaves = Object.fromEntries(leaves(en));

  const overlay = {
    'ortak.iptal': 'Kanselahin',
    'ortak.kaydet': 'I-save',
    'ortak.sil': 'Tanggalin',
    'ortak.duzenle': 'I-edit',
    'ortak.kapat': 'Isara',
    'ortak.tamam': 'OK',
    'ortak.evet': 'Oo',
    'ortak.hayir': 'Hindi',
    'ortak.geri': 'Bumalik',
    'ortak.devam': 'Magpatuloy',
    'ortak.ara': 'Maghanap',
    'ortak.yukle': 'I-upload',
    'ortak.yenile': 'I-refresh',
    'ortak.paylas': 'Ibahagi',
    'ortak.kopyala': 'Kopyahin',
    'ortak.gonder': 'Ipadala',
    'ortak.olustur': 'Gumawa',
    'ortak.ekle': 'Idagdag',
    'ortak.kaldir': 'Alisin',
    'ortak.onayla': 'Kumpirmahin',
    'ortak.reddet': 'Tanggihan',
    'ortak.hata': 'Error',
    'ortak.basarili': 'Tapos na',
    'ortak.yukleniyor': 'Naglo-load…',
    'ortak.kaydediliyor': 'Sine-save…',
    'ortak.bos': 'Wala pa',
    'ortak.tekrarDene': 'Subukan ulit',
    'ortak.anladim': 'Naintindihan',
    'ortak.gerekli': 'Kailangan',
    'ortak.istegeBagli': 'Opsyonal',
    'ortak.dahaFazla': 'Higit pa',
    'ortak.tumunuGor': 'Tingnan lahat',
    'ortak.kopyalandi': 'Nakopya',
    'ortak.kaydedildi': 'Na-save',
    'ortak.birHataOlustu': 'May nangyaring mali',
    'ortak.baglantiHatasi': 'May error sa koneksyon',

    'sekmeler.ana': 'Home',
    'sekmeler.anaSayfa': 'Home',
    'sekmeler.durum': 'Status',
    'sekmeler.olustur': 'Gumawa',
    'sekmeler.mesaj': 'Chat',
    'sekmeler.mesajlar': 'Mga mensahe',
    'sekmeler.profil': 'Profile',
    'sekmeler.odalar': 'Mga kwarto',
    'sekmeler.cuzdan': 'Wallet',
    'sekmeler.cihazlar': 'Mga device',

    'gorunum.baslik': 'Hitsura',
    'gorunum.alt': 'Pumili ng modernong premium na hitsura para sa buong app.',
    'gorunum.aktif': 'Aktibo: {{tema}}',
    'gorunum.tumunuGor': 'Lahat ng disenyo',
    'gorunum.tumunuGorAlt': '30 hitsura',
    'gorunum.temaSayisi': '{{n}} disenyo',
    'gorunum.kategoriHepsi': 'Lahat',
    'gorunum.kategoriKlasik': 'Klasiko',
    'gorunum.kategoriGece': 'Gabi',
    'gorunum.kategoriDoga': 'Kalikasan',
    'gorunum.kategoriAcik': 'Maliwanag',
    'gorunum.koyu': 'Madilim',
    'gorunum.acik': 'Maliwanag',

    'canliYayin.simdiCanli': 'Ngayon naka-live',
    'canliYayin.hepsi': 'Lahat',
    'canliYayin.takip': 'Sinusundan',
    'canliYayin.placeholder': 'Pamagat ng live…',
    'canliYayin.izleyenler': 'Manonood',
    'canliYayin.izleyenAciklama': 'Nanood ngayon',
    'canliYayin.izleyenYok': 'Wala pang manonood',
    'canliYayin.a11yIzleyenler': 'Ipakita ang manonood',
    'canliYayin.sure': 'Tagal',
    'canliYayin.katSohbet': 'Chat',

    'anaSayfa.populer': 'Sikat',
    'anaSayfa.tumunuGor': 'Tingnan lahat',

    'sesOda.duzenKoduGecersiz': 'Di-wastong layout code',
    'sesOda.temaKoduGecersiz': 'Di-wastong theme code',
    'sesOda.gorunumDuzeniAlt': 'Disenyo ng ayos ng microphone stage',
    'sesOda.gorunumDuzeni': 'Ayos ng entablado',
    'sesOda.yonetici': 'Admin',

    'mesajV2.sharedPost': 'Ibinahaging post',
    'mesajV2.you': 'Ikaw',
    'mesajV2.doubleTapToReply': 'I-double tap para sumagot',
    'mesajV2.tapToRecord': 'I-tap para mag-record',
    'mesajV2.mediaCount': '{{n}} item',
    'mesajV2.mediaRemove': 'Alisin',
    'mesajV2.mediaAddMore': 'Magdagdag',
    'mesajV2.sendN': 'Ipadala ang {{n}}',
    'mesajV2.voicePreviewHint': 'Pakinggan · kumpirmahin · ipadala',
    'mesajV2.voiceTooShort': 'Masyadong maikli ang recording',
    'mesajV2.reply': 'Sagot',
    'mesajV2.send': 'Ipadala',
    'mesajV2.delete': 'Tanggalin',
    'mesajV2.copy': 'Kopyahin',
    'mesajV2.edit': 'I-edit',
    'mesajV2.save': 'I-save',
    'mesajV2.cancel': 'Kanselahin',

    'gorusme.sesli': 'Boses',
    'gorusme.goruntulu': 'Video',
    'gorusme.kabul': 'Tanggapin',
    'gorusme.reddet': 'Tanggihan',

    'hediye.sekmePopuler': 'Sikat',
    'hediye.gonder': 'Ipadala',

    'ayarlar.baslik': 'Mga setting',
    'ayarlar.gorunum': 'Hitsura',
    'ayarlar.bildirimler': 'Mga notification',
    'ayarlar.dil': 'Wika',
  };

  let overlayN = 0;
  for (const [k, v] of Object.entries(overlay)) {
    deepSet(fil, k, v);
    overlayN++;
  }

  const phraseMap = [
    [/^Loading…?$/i, 'Naglo-load…'],
    [/^Save$/i, 'I-save'],
    [/^Cancel$/i, 'Kanselahin'],
    [/^Delete$/i, 'Tanggalin'],
    [/^Edit$/i, 'I-edit'],
    [/^Send$/i, 'Ipadala'],
    [/^Share$/i, 'Ibahagi'],
    [/^Search$/i, 'Maghanap'],
    [/^Back$/i, 'Bumalik'],
    [/^Close$/i, 'Isara'],
    [/^Continue$/i, 'Magpatuloy'],
    [/^Confirm$/i, 'Kumpirmahin'],
    [/^Retry$/i, 'Subukan ulit'],
    [/^Success$/i, 'Tagumpay'],
    [/^Popular$/i, 'Sikat'],
    [/^All$/i, 'Lahat'],
    [/^Settings$/i, 'Mga setting'],
    [/^Notifications$/i, 'Mga notification'],
    [/^Language$/i, 'Wika'],
    [/^Appearance$/i, 'Hitsura'],
    [/^Messages$/i, 'Mga mensahe'],
    [/^Rooms$/i, 'Mga kwarto'],
    [/^Create$/i, 'Gumawa'],
    [/^Follow$/i, 'Sundan'],
    [/^Following$/i, 'Sinusundan'],
    [/^Followers$/i, 'Mga follower'],
    [/^Block$/i, 'I-block'],
    [/^Report$/i, 'I-report'],
    [/^Invite$/i, 'Imbitahan'],
    [/^Accept$/i, 'Tanggapin'],
    [/^Decline$/i, 'Tanggihan'],
    [/^Remove$/i, 'Alisin'],
    [/^Add$/i, 'Idagdag'],
    [/^Upload$/i, 'I-upload'],
    [/^Refresh$/i, 'I-refresh'],
    [/^See all$/i, 'Tingnan lahat'],
    [/^View all$/i, 'Tingnan lahat'],
    [/^No results$/i, 'Walang resulta'],
    [/^Try again$/i, 'Subukan ulit'],
    [/^Something went wrong$/i, 'May nangyaring mali'],
    [/^Connection error$/i, 'May error sa koneksyon'],
    [/^Required$/i, 'Kailangan'],
    [/^Optional$/i, 'Opsyonal'],
    [/^Copied$/i, 'Nakopya'],
    [/^Saved$/i, 'Na-save'],
    [/^Deleted$/i, 'Natanggal'],
    [/^Audio$/i, 'Audio'],
    [/^Total$/i, 'Kabuuan'],
    [/^Admin$/i, 'Admin'],
    [/^Chat$/i, 'Chat'],
  ];

  let phraseN = 0;
  for (const [key, enVal] of Object.entries(enLeaves)) {
    const cur = deepGet(fil, key);
    if (cur !== enVal) continue;
    for (const [re, filVal] of phraseMap) {
      if (re.test(enVal.trim())) {
        deepSet(fil, key, filVal);
        phraseN++;
        break;
      }
    }
  }

  // Translate remaining canliYayin EN copies using ES as meaning guide → write FIL lines
  // by applying a second overlay built from EN keys still equal after phrase pass.
  const canliStill = [];
  for (const [k, v] of Object.entries(en.canliYayin || {})) {
    if (deepGet(fil, `canliYayin.${k}`) === v) canliStill.push(k);
  }

  writeJson('src/i18n/locales/fil.json', fil);
  console.log('FIL done', { overlayN, phraseN, canliStillEn: canliStill.length });
}
