/** Kural tabanlı SEO önerisi. Harici API yok. Yeni sayfa kendiliğinden açılmaz. */

export const SEO_HEDEF_SAYFALAR = [
  { yol: '/', ad: 'Ana sayfa', title: 'Tamuso — Görüntülü sohbet, canlı yayın ve arkadaş bul', description: 'Tamuso ile görüntülü görüş, canlı yayın aç, mesajlaş ve yeni arkadaşlar bul. Ses odaları, coin ve meyve oyunu aynı uygulamada. 18 yaş ve üzeri.', h1: 'Tamuso', konular: ['tamuso', 'sohbet', 'arkadaş', 'görüntülü'] },
  { yol: '/tanitim', ad: 'Tanıtım', title: 'Tamuso | Canlı yayın, görüntülü sohbet ve mesajlaşma', description: 'Tamuso tanıtımı: görüntülü görüşme, canlı yayın, mesajlaşma ve arkadaş bulma. Uygulamanın açık sayfası.', h1: 'Tamuso tanıtım', konular: ['tanıtım', 'canlı yayın', 'mesajlaşma'] },
  { yol: '/tanitim/ozellikler', ad: 'Özellikler', title: 'Tamuso özellikleri | Yayın, mesaj, ses odası ve oyunlar', description: 'Görüntülü görüşme, canlı yayın, PK, ses odaları, hikaye, keşfet, coin ve meyve çarkı. Tamuso özelliklerinin listesi.', h1: 'Tamuso özellikleri', konular: ['sesli oda', 'ses odası', 'sesli sohbet', 'özellik', 'canlı yayın'] },
  { yol: '/tanitim/coinler', ad: 'Coinler', title: 'Tamuso coin | Uygulama içi bakiye', description: 'Coin, Tamuso içindeki bakiyedir. Hediye, görüntülü görüşme ve oyunlarda kullanılır. Güncel tutar uygulama içinde görünür.', h1: 'Tamuso coin', konular: ['coin', 'coins', 'hediye', 'bakiye'] },
  { yol: '/tanitim/meyve', ad: 'Meyve oyunu', title: 'Tamuso meyve oyunu | Fruit Wheel', description: 'Fruit Wheel, sekiz meyveli canlı çarktır. Tur saati ve sonuç sunucuda belirlenir. Bu oyun bir kazanç garantisi değildir.', h1: 'Meyve oyunu', konular: ['meyve', 'fruit', 'oyun'] },
  { yol: '/tanitim/hakkinda', ad: 'Hakkında', title: 'Tamuso hakkında | Vizyon ve gelecek', description: 'Tamuso; görüntülü sohbet, canlı yayın, ses odaları ve oyunları bir arada sunan sosyal uygulamadır. Vizyon ve sonraki özellikler.', h1: 'Tamuso hakkında', konular: ['hakkında', 'vizyon'] },
  { yol: '/tanitim/isbirligi', ad: 'İşbirliği', title: 'Tamuso işbirliği | Ajans ve marka', description: 'Ajanslar, yayıncılar ve markalar Tamuso ile çalışabilir. İşbirliği için support@litxtech.com adresine yazın.', h1: 'İşbirliği', konular: ['işbirliği', 'ajans', 'marka'] },
  { yol: '/blog', ad: 'Blog', title: 'Blog | Tamuso', description: 'Canlı yayın, ses odaları, hikâye ve Tamuso’nun sosyal özelliklerine dair güncel içerikler.', h1: 'Blog', konular: ['blog', 'yazı', 'rehber'] },
  { yol: '/cities', ad: 'Şehirler', title: 'Şehirler | Tamuso', description: 'Tamuso’daki şehirler. Şehir sayfasında o şehirdeki herkese açık profiller, paylaşımlar ve ses odaları yer alır.', h1: 'Şehirler', konular: ['şehir', 'sehir', 'istanbul', 'ankara'] },
  { yol: '/countries', ad: 'Ülkeler', title: 'Ülkeler | Tamuso', description: 'Tamuso’daki ülkeler. Her ülke sayfasında o ülkenin şehirleri, herkese açık profilleri ve ses odaları listelenir.', h1: 'Ülkeler', konular: ['ülke', 'ulke', 'türkiye'] },
  { yol: '/voices', ad: 'Ses odaları', title: 'Ses odaları | Tamuso', description: 'Tamuso’da şu an herkese açık canlı ses odaları. Kilitli, gizli ve örnek odalar listelenmez.', h1: 'Ses odaları', konular: ['sesli oda', 'ses odası', 'sesli sohbet', 'ses odaları'] },
  { yol: '/people', ad: 'Kişiler', title: 'İnsanlar | Tamuso', description: 'Herkese açık Tamuso profilleri.', h1: 'İnsanlar', konular: ['profil', 'kişi', 'arkadaş', 'sosyal'] },
  { yol: '/discover', ad: 'Keşfet', title: 'Keşfet | Tamuso', description: 'Tamuso’daki herkese açık şehirler, paylaşımlar ve konular.', h1: 'Keşfet', konular: ['keşfet', 'kesfet', 'sosyal'] },
] as const;

export type SeoAlan = 'title' | 'description' | 'h1' | 'h2' | 'intro' | 'faq' | 'link';

export type SeoOneri = {
  hedefYol: string;
  alan: SeoAlan;
  onceki: string;
  onerilen: string;
  uyari: string;
  yeniSayfa: boolean;
};

export type SeoSinif = {
  ifade: string;
  dil: 'tr' | 'en';
  kategori: 'marka' | 'canli' | 'ses' | 'hediye' | 'sosyal' | 'genel';
  niyet: 'navigasyon' | 'bilgi' | 'islem';
  yazimUyarisi: string;
};

const YAZIM: Record<string, string> = { tanuso: 'tamuso' };

export function metinTemiz(ham: string): string {
  let t = String(ham ?? '').normalize('NFKC');
  t = t.toLocaleLowerCase('tr-TR');
  t = t.replace(/https?:\/\/\S+/gi, ' ');
  t = t.replace(/<[^>]*>/g, ' ');
  t = t.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export function htmlSoy(ham: string, enFazla: number): string {
  const temiz = String(ham ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return [...temiz].slice(0, enFazla).join('').trim();
}

export function kelimeleriAyikla(ham: string): string[] {
  const gorulen = new Set<string>();
  const cikti: string[] = [];
  for (const parca of String(ham ?? '').split(/[,;\n]+/)) {
    const temiz = metinTemiz(parca);
    if ([...temiz].length < 2 || [...temiz].length > 80) continue;
    if (gorulen.has(temiz)) continue;
    gorulen.add(temiz);
    cikti.push(temiz);
  }
  return cikti;
}

export function dilAlgila(ifade: string): 'tr' | 'en' {
  if (/[çğıöşü]/i.test(ifade)) return 'tr';
  const ing = ['live', 'voice', 'room', 'chat', 'coin', 'coins', 'gift', 'people', 'discover'];
  const parca = ifade.split(' ');
  if (parca.every((p) => ing.includes(p))) return 'en';
  return 'tr';
}

export function siniflandir(ifade: string): SeoSinif {
  const k = metinTemiz(ifade);
  const yazim = YAZIM[k] ? `"${k}" yazımı "${YAZIM[k]}" markasına bağlanır. Ayrı sayfa açılmaz.` : '';
  let kategori: SeoSinif['kategori'] = 'genel';
  if (/(tamuso|tanuso)/.test(k)) kategori = 'marka';
  else if (/(coin|coins|hediye|bakiye)/.test(k)) kategori = 'hediye';
  else if (/(sesli|ses oda|sesli sohbet)/.test(k)) kategori = 'ses';
  else if (/(canlı yayın|canli yayin|yayın)/.test(k)) kategori = 'canli';
  else if (/(keşfet|kesfet|arkadaş|profil|sosyal)/.test(k)) kategori = 'sosyal';
  const niyet: SeoSinif['niyet'] = kategori === 'marka' ? 'navigasyon' : kategori === 'hediye' ? 'islem' : 'bilgi';
  return { ifade: k, dil: dilAlgila(k), kategori, niyet, yazimUyarisi: yazim };
}

function karakter(metin: string): number {
  return [...metin].length;
}

export function kes(metin: string, sinir: number): string {
  const dizi = [...metin.trim()];
  if (dizi.length <= sinir) return dizi.join('');
  const dilim = dizi.slice(0, sinir).join('');
  const bosluk = dilim.lastIndexOf(' ');
  const govde = (bosluk > sinir * 0.6 ? dilim.slice(0, bosluk) : dilim).trim();
  return govde;
}

function ilkHarf(ifade: string): string {
  const [harf, ...kalan] = [...ifade];
  if (!harf) return ifade;
  return harf.toLocaleUpperCase('tr-TR') + kalan.join('');
}

function puanla(ifade: string, sinif: SeoSinif): { yol: string; puan: number }[] {
  const anahtar = YAZIM[ifade] ?? ifade;
  return SEO_HEDEF_SAYFALAR.map((sayfa) => {
    let puan = 0;
    for (const konu of sayfa.konular) {
      if (anahtar === konu) puan += 6;
      else if (anahtar.includes(konu) || konu.includes(anahtar)) puan += 3;
    }
    if (sinif.kategori === 'marka' && sayfa.yol === '/') puan += 4;
    if (sinif.kategori === 'ses' && (sayfa.yol === '/voices' || sayfa.yol === '/tanitim/ozellikler')) puan += 3;
    if (sinif.kategori === 'canli' && sayfa.yol === '/tanitim') puan += 3;
    if (sinif.kategori === 'hediye' && sayfa.yol === '/tanitim/coinler') puan += 4;
    if (sinif.kategori === 'sosyal' && (sayfa.yol === '/people' || sayfa.yol === '/discover')) puan += 3;
    return { yol: sayfa.yol, puan };
  }).sort((a, b) => b.puan - a.puan);
}

function baslikOner(mevcut: string, ifade: string, yazim: boolean): string {
  if (yazim || mevcut.toLocaleLowerCase('tr-TR').includes(ifade)) return kes(mevcut, 60);
  const dogal = `${ilkHarf(ifade)} | Tamuso`;
  if (karakter(dogal) >= 18 && karakter(dogal) <= 60) return dogal;
  return kes(mevcut, 60);
}

function aciklamaOner(mevcut: string, ifade: string, yazim: boolean): string {
  if (yazim) return kes(mevcut, 160);
  const kucuk = mevcut.toLocaleLowerCase('tr-TR');
  if (kucuk.includes(ifade) && karakter(mevcut) >= 140 && karakter(mevcut) <= 160) return mevcut;
  const govde = mevcut.replace(/\s+$/g, '').replace(/\.+$/g, '');
  const cumle = `${govde}. ${ilkHarf(ifade)} arayan kişi bu sayfada Tamuso’daki ilgili bölümü görür.`;
  const kesik = kes(cumle, 160);
  if (karakter(kesik) >= 120) return kesik;
  return kes(`${kesik} Ayrıntı uygulama içinde günceldir.`, 160);
}

export function kelimeAnaliz(ham: string, hedefYol?: string): { sinif: SeoSinif; oneriler: SeoOneri[]; alternatif: string[] } {
  const sinif = siniflandir(ham);
  const yazim = Boolean(sinif.yazimUyarisi);
  const sirali = puanla(sinif.ifade, sinif).filter((s) => s.puan > 0);
  const secilenYol = hedefYol && SEO_HEDEF_SAYFALAR.some((s) => s.yol === hedefYol)
    ? hedefYol
    : sirali[0]?.yol ?? '';
  const alternatif = sirali.filter((s) => s.yol !== secilenYol).slice(0, 2).map((s) => s.yol);
  const sayfa = SEO_HEDEF_SAYFALAR.find((s) => s.yol === secilenYol);
  const uyariParca = [
    sinif.yazimUyarisi,
    alternatif.length ? `Aynı kelime şu sayfalara da uyar, yarışan sayfa açılmaz: ${alternatif.join(', ')}` : '',
  ].filter(Boolean);
  if (!sayfa) {
    return {
      sinif,
      alternatif,
      oneriler: [{
        hedefYol: '',
        alan: 'intro',
        onceki: '',
        onerilen: `${ilkHarf(sinif.ifade)} için ayrı bir sayfa önerilir. Metin, ziyaretçiye bu konunun Tamuso’da nerede durduğunu anlatmalıdır. Onay olmadan sayfa yayınlanmaz.`,
        uyari: 'Hedef sayfa yok. Yeni sayfa taslak olarak durur.',
        yeniSayfa: true,
      }],
    };
  }
  const uyari = uyariParca.join(' ');
  const baslik = baslikOner(sayfa.title, sinif.ifade, yazim);
  const aciklama = aciklamaOner(sayfa.description, sinif.ifade, yazim);
  const h1 = yazim ? sayfa.h1 : (sayfa.h1.toLocaleLowerCase('tr-TR').includes(sinif.ifade) ? sayfa.h1 : sayfa.h1);
  const oneriler: SeoOneri[] = [
    { hedefYol: sayfa.yol, alan: 'title', onceki: sayfa.title, onerilen: baslik, uyari, yeniSayfa: false },
    { hedefYol: sayfa.yol, alan: 'description', onceki: sayfa.description, onerilen: aciklama, uyari, yeniSayfa: false },
    { hedefYol: sayfa.yol, alan: 'h1', onceki: sayfa.h1, onerilen: h1, uyari, yeniSayfa: false },
    {
      hedefYol: sayfa.yol,
      alan: 'h2',
      onceki: '',
      onerilen: yazim ? '' : `${ilkHarf(sinif.ifade)} Tamuso’da`,
      uyari,
      yeniSayfa: false,
    },
    {
      hedefYol: sayfa.yol,
      alan: 'intro',
      onceki: '',
      onerilen: yazim
        ? 'Aramada görülen yazım, Tamuso markasına aittir. Sayfa metni doğru yazımı kullanır.'
        : `${ilkHarf(sinif.ifade)}, bu sayfanın anlattığı Tamuso bölümüdür. Ayrıntı ve güncel durum uygulama içinde görülür.`,
      uyari,
      yeniSayfa: false,
    },
    {
      hedefYol: sayfa.yol,
      alan: 'faq',
      onceki: '',
      onerilen: sinif.niyet === 'bilgi' && !yazim
        ? `${ilkHarf(sinif.ifade)} nedir? ${sayfa.description}`
        : '',
      uyari,
      yeniSayfa: false,
    },
    {
      hedefYol: sayfa.yol,
      alan: 'link',
      onceki: sayfa.ad,
      onerilen: yazim ? 'Tamuso' : sayfa.ad,
      uyari,
      yeniSayfa: false,
    },
  ].filter((o) => o.onerilen.trim().length > 0);
  return { sinif, oneriler, alternatif };
}

export function baslikOlcusu(metin: string): 'kisa' | 'hedef' | 'uzun' {
  const n = karakter(metin);
  if (n < 50) return 'kisa';
  if (n <= 60) return 'hedef';
  return 'uzun';
}

export function aciklamaOlcusu(metin: string): 'kisa' | 'hedef' | 'uzun' {
  const n = karakter(metin);
  if (n < 140) return 'kisa';
  if (n <= 160) return 'hedef';
  return 'uzun';
}
