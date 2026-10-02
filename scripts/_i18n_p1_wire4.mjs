import fs from 'fs';

function ensureImport(src, line) {
  if (src.includes('i18n/useCeviri')) return src;
  const lines = src.split('\n');
  let last = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i]) || /^} from /.test(lines[i])) last = i;
  }
  lines.splice(last + 1, 0, line);
  return lines.join('\n');
}

function ensureHookAfterProps(src, exportSig) {
  const idx = src.indexOf(exportSig);
  if (idx < 0) return src;
  const propsEnd = src.indexOf(') {', idx);
  if (propsEnd < 0) return src;
  if (src.slice(propsEnd + 3, propsEnd + 80).includes('useCeviri')) return src;
  return src.slice(0, propsEnd + 3) + '\n  const { t } = useCeviri();' + src.slice(propsEnd + 3);
}

function patch(file, fn) {
  if (!fs.existsSync(file)) {
    console.warn('missing', file);
    return;
  }
  let src = fs.readFileSync(file, 'utf8');
  src = fn(src);
  fs.writeFileSync(file, src, 'utf8');
  console.log('ok', file);
}

patch('src/moduller/gorusme/bilesenler/GorusmeMiniBaloncuk.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  // find main component
  const m = src.match(/export function \w+\(/);
  if (m) src = ensureHookAfterProps(src, m[0]);
  src = src.replace(/>Görüşme</g, ">{t('gorusme.gorusme')}<");
  src = src.replace(/'Görüşme'/g, "t('gorusme.gorusme')");
  return src;
});

patch('src/moduller/gorusme/bilesenler/GorusmeVideoSahne.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  const m = src.match(/export function \w+\(/);
  if (m) src = ensureHookAfterProps(src, m[0]);
  src = src.replace(/>Kamera bağlanıyor…</g, ">{t('gorusme.kameraBaglaniyor')}<");
  src = src.replace(/>Demo görüntü</g, ">{t('gorusme.demoGoruntu')}<");
  src = src.replace(/>Karşı taraf bekleniyor…</g, ">{t('gorusme.karsiBekleniyor')}<");
  src = src.replace(/>Kapalı</g, ">{t('gorusme.kapali')}<");
  return src;
});

// GorusmeOturumYoneticisi - non-react; use i18n.t directly
patch('src/moduller/gorusme/oturum/GorusmeOturumYoneticisi.ts', (src) => {
  if (!src.includes("from '../../../i18n")) {
    src = `import i18n from '../../../i18n';\n` + src;
  }
  const pairs = [
    ["'Coin bakiyen azalıyor'", "i18n.t('gorusme.coinAzaliyor')"],
    ["'Bağlandı'", "i18n.t('gorusme.baglandi')"],
    ["'Çalıyor…'", "i18n.t('gorusme.caliyor')"],
    ["'Bağlanıyor…'", "i18n.t('gorusme.baglaniyor')"],
    ["'Bağlanılamadı'", "i18n.t('gorusme.baglanilamadi')"],
    ["'Demo — ses/görüntü yok'", "i18n.t('gorusme.demoSesYok')"],
    ["'Açılamadı'", "i18n.t('gorusme.acilamadi')"],
  ];
  for (const [a, b] of pairs) src = src.split(a).join(b);
  return src;
});

patch('src/moduller/ses-odalari/bilesenler/AktifSesOdasiMiniBar.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  const m = src.match(/export function \w+\(/) || src.match(/function \w+\(/);
  if (m) src = ensureHookAfterProps(src, m[0]);
  src = src.replace(/'Yönetim bu ses odasını kapattı\.'/g, "t('sesOda.yonetimKapatti')");
  src = src.replace(
    /'Sesli odadan ayrılmak istiyor musun\? Ses kapanır\.'/g,
    "t('sesOda.ayrilSoru')",
  );
  src = src.replace(/text: 'Çık'/g, "text: t('sesOda.cik')");
  src = src.replace(/accessibilityLabel="Odadan çık"/g, "accessibilityLabel={t('sesOda.odadanCik')}");
  src = src.replace(/>Odadan çık</g, ">{t('sesOda.odadanCik')}<");
  return src;
});

patch('src/moduller/ses-odalari/bilesenler/AktifSesOdasiPipKart.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  const m = src.match(/export function \w+\(/) || src.match(/function \w+\(/);
  if (m) src = ensureHookAfterProps(src, m[0]);
  src = src.replace(/accessibilityLabel="Odadan çık"/g, "accessibilityLabel={t('sesOda.odadanCik')}");
  src = src.replace(/>Ses odası</g, ">{t('sesOda.sesOdasi')}<");
  src = src.replace(/'Ses odası'/g, "t('sesOda.sesOdasi')");
  return src;
});

patch('src/moduller/ses-odalari/bilesenler/MikrofonIstekPaneli.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  const m = src.match(/export function \w+\(/) || src.match(/function \w+\(/);
  if (m) src = ensureHookAfterProps(src, m[0]);
  src = src.replace(/'Yanıtlanamadı'/g, "t('sesOda.yanitlanamadi')");
  src = src.replace(/>İlk boş koltuk</g, ">{t('sesOda.ilkBosKoltuk')}<");
  src = src.replace(/'İlk boş koltuk'/g, "t('sesOda.ilkBosKoltuk')");
  src = src.replace(
    /`\$\{ad\} isteğini reddet`/g,
    "t('sesOda.istegiReddet', { ad })",
  );
  src = src.replace(
    /`\$\{ad\} isteğini onayla`/g,
    "t('sesOda.istegiOnayla', { ad })",
  );
  return src;
});

// wallet CEKIM + PDF
patch('app/(tabs)/wallet.tsx', (src) => {
  src = src.replace(
    /\$\{CEKIM_ODEME_BILGISI\}/g,
    "${t('cuzdanXExtra.odemeBilgisi', { gun: CEKIM_ODEME_IS_GUNU })}",
  );
  // also need import CEKIM_ODEME_IS_GUNU if only BILGISI imported
  if (!src.includes('CEKIM_ODEME_IS_GUNU')) {
    src = src.replace(
      /CEKIM_ODEME_BILGISI/g,
      (m, offset) => {
        // only in import - check
        return m;
      },
    );
    src = src.replace(
      /\{ CEKIM_ODEME_BILGISI \}/,
      '{ CEKIM_ODEME_BILGISI, CEKIM_ODEME_IS_GUNU }',
    );
    src = src.replace(
      /CEKIM_ODEME_BILGISI(,|\s|\})/,
      (match, g1, offset) => {
        const before = src.slice(Math.max(0, offset - 80), offset);
        if (before.includes('import') || before.includes('{')) {
          return `CEKIM_ODEME_BILGISI, CEKIM_ODEME_IS_GUNU${g1}`;
        }
        return match;
      },
    );
  }
  src = src.replace(
    /label=\{belgeBusy \? t\('cuzdanX\.hazirlaniyor'\) : 'PDF \/ Excel'\}/,
    "label={belgeBusy ? t('cuzdanX.hazirlaniyor') : t('cuzdanXExtra.pdfExcel')}",
  );
  return src;
});

// durum components
const durumFiles = [
  ['src/moduller/durum/bilesenler/DurumCaptionAcilir.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/>Devamını gör</g, ">{t('durumX.devaminiGor')}<");
    src = src.replace(/>Daha az göster</g, ">{t('durumX.dahaAzGoster')}<");
    return src;
  }],
  ['src/moduller/durum/bilesenler/DurumEtkilesimCubugu.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(
      /accessibilityLabel=\{[^}]*Beğeniyi kaldır[^}]*\}/g,
      "accessibilityLabel={liked ? t('durumX.begeniyiKaldir') : t('durumX.begen')}",
    );
    // simpler replacements
    src = src.replace(/'Beğeniyi kaldır'/g, "t('durumX.begeniyiKaldir')");
    src = src.replace(/'Beğen'/g, "t('durumX.begen')");
    src = src.replace(
      /`Hediye gönder, \$\{giftCount\} hediye`/g,
      "t('durumX.hediyeGonderSayi', { count: giftCount })",
    );
    src = src.replace(/'Hediye gönder'/g, "t('durumX.hediyeGonder')");
    src = src.replace(
      /`\$\{viewCount\} görüntülenme`/g,
      "t('durumX.goruntulenme', { count: viewCount })",
    );
    src = src.replace(/>Paylaş</g, ">{t('durumX.paylas')}<");
    src = src.replace(/'Paylaş'/g, "t('durumX.paylas')");
    return src;
  }],
  ['src/moduller/durum/bilesenler/DurumKart.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/) || src.match(/function DurumKart/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/'Gönderi detayı'/g, "t('durumX.gonderiDetayi')");
    src = src.replace(/'Profili aç'/g, "t('durumX.profiliAc')");
    src = src.replace(/'Diğer seçenekler'/g, "t('durumX.digerSecenekler')");
    src = src.replace(/'Resmi büyüt'/g, "t('durumX.resmiBuyut')");
    return src;
  }],
  ['src/moduller/durum/bilesenler/DurumMuzikKarti.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/'Önizlemede çal'/g, "t('durumX.onizlemedeCal')");
    src = src.replace(/'Bu müzik artık kullanılamıyor'/g, "t('durumX.muzikKullanilamiyor')");
    src = src.replace(/'Müzik detayı'/g, "t('durumX.muzikDetayi')");
    src = src.replace(/'Önizlemede dinle'/g, "t('durumX.onizlemedeDinle')");
    return src;
  }],
  ['src/moduller/durum/bilesenler/DurumProfilIzgarasi.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/>Gönderiler</g, ">{t('durumX.gonderiler')}<");
    src = src.replace(/>Henüz paylaşım yok</g, ">{t('durumX.paylasimYok')}<");
    src = src.replace(/'Oyun kazancı durumu'/g, "t('durumX.oyunKazanciDurumu')");
    src = src.replace(/'Durum gönderisi'/g, "t('durumX.durumGonderisi')");
    return src;
  }],
  ['src/moduller/durum/bilesenler/DurumResimLightbox.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/'Büyütülmüş durum resmi'/g, "t('durumX.buyutulmusDurum')");
    return src;
  }],
  ['src/moduller/durum/bilesenler/DurumYorumPaneli.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/'Gönderilemedi'/g, "t('durumX.gonderilemedi')");
    src = src.replace(/'Vazgeç'/g, "t('ortak.vazgec')");
    src = src.replace(/'Başarısız'/g, "t('durum.basarisiz')");
    src = src.replace(
      /`\$\{yanitHedef\.display_name\} için yanıt yaz…`/g,
      "t('durumX.yanitYaz', { ad: yanitHedef.display_name })",
    );
    return src;
  }],
  ['src/moduller/durum/paylasim/bilesenler/GonderiPaylasButonu.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/'Gönderiyi paylaş'/g, "t('durumX.gonderiyiPaylas')");
    return src;
  }],
  ['src/moduller/durum/paylasim/bilesenler/GonderiPaylasKullaniciListesi.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/'Kullanıcı bulunamadı'/g, "t('durumX.kullaniciBulunamadi')");
    return src;
  }],
  ['src/moduller/durum/paylasim/bilesenler/GonderiPaylasSheet.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/\|\| 'Kullanıcı'/g, "|| t('ortak.kullanici')");
    src = src.replace(/'Gönderilemedi\.'/g, "t('durumX.gonderilemedi') + '.'");
    src = src.replace(/'Gönderildi'/g, "t('ortak.basarili')"); // approx - use gonderildiN
    src = src.replace(
      /`\$\{n\} kişiye gönderildi`/g,
      "t('durumX.gonderildiN', { n })",
    );
    src = src.replace(/>Gönder</g, ">{t('ortak.gonder')}<");
    src = src.replace(/>1 kişiye gönder</g, ">{t('durumX.birKisiyeGonder')}<");
    src = src.replace(
      /`\$\{secimSayisi\} kişiye gönder`/g,
      "t('durumX.nKisiyeGonder', { n: secimSayisi })",
    );
    src = src.replace(/'Mesaj ekle \(isteğe bağlı\)'/g, "t('durumX.mesajEkle')");
    src = src.replace(/placeholder="Mesaj ekle \(isteğe bağlı\)"/g, "placeholder={t('durumX.mesajEkle')}");
    src = src.replace(/'Sonuçlar'/g, "t('durumX.sonuclar')");
    src = src.replace(/'Son konuşmalar \/ takip'/g, "t('durumX.sonKonusmalar')");
    src = src.replace(/'Kullanıcı bulunamadı'/g, "t('durumX.kullaniciBulunamadi')");
    src = src.replace(/'Henüz konuşma veya takip yok'/g, "t('durumX.konusmaTakipYok')");
    return src;
  }],
  ['src/moduller/durum/paylasim/bilesenler/PaylasilanGonderiKarti.tsx', (src) => {
    src = ensureImport(src, "import { useCeviri } from '../../../../i18n/useCeviri';");
    const m = src.match(/export function \w+\(/);
    if (m) src = ensureHookAfterProps(src, m[0]);
    src = src.replace(/'Paylaşılan gönderiyi aç'/g, "t('durumX.paylasilanAc')");
    src = src.replace(/\|\| 'Kullanıcı'/g, "|| t('ortak.kullanici')");
    src = src.replace(/'Metin gönderisi'/g, "t('durumX.metinGonderisi')");
    return src;
  }],
];

for (const [f, fn] of durumFiles) patch(f, fn);

// durum paylasim services - i18n.t
for (const f of [
  'src/moduller/durum/paylasim/GonderiPaylasServisi.ts',
  'src/moduller/durum/paylasim/PaylasilanDurumlariGetir.ts',
  'src/moduller/durum/paylasim/tipler.ts',
  'src/moduller/durum/paylasim/usePaylasilanDurumOnizleme.ts',
  'src/moduller/kisiler-kesif/islemler/KisilerKesifIslemleri.ts',
]) {
  patch(f, (src) => {
    if (!src.includes("from '../../../i18n") && !src.includes('from "../../i18n') && !src.includes("from '../../../../i18n")) {
      // depth varies
      const depth = (f.match(/\//g) || []).length;
      // from src/moduller/X -> ../../../i18n
      const imp =
        f.includes('paylasim/') && !f.includes('bilesenler')
          ? "import i18n from '../../../i18n';\n"
          : f.includes('kisiler-kesif')
            ? "import i18n from '../../../i18n';\n"
            : "import i18n from '../../../i18n';\n";
      if (!src.includes("i18n")) src = imp + src;
    }
    const map = [
      ["'Mesajlaşma kapalı.'", "i18n.t('durumX.mesajlasmaKapali')"],
      ["'Geçersiz gönderi.'", "i18n.t('durumX.gecersizGonderi')"],
      ["'Alıcı seçilmedi.'", "i18n.t('durumX.aliciYok')"],
      ["'Gönderilemedi.'", "i18n.t('durumX.gonderilemedi')"],
      [
        '`${sent} kişiye gönderildi, ${fail} başarısız.`',
        "i18n.t('durumX.kismiGonderildi', { sent, fail })",
      ],
      ["'Bu gönderiye artık ulaşılamıyor.'", "i18n.t('durumX.ulasilamiyor')"],
      ["'Bu gönderi sahibi tarafından silindi.'", "i18n.t('durumX.sahibiSildi')"],
      [
        "'Bu içerik platform tarafından kaldırıldı.'",
        "i18n.t('durumX.platformKaldirildi')",
      ],
      ["'Bu gönderiyi görüntüleyemezsiniz.'", "i18n.t('durumX.goruntuleyemezsin')"],
      ["'Şu anda kişiler yüklenemedi.'", "i18n.t('kisilerX.yuklenemediBody')"],
      ["'Arama başlatılamadı'", "i18n.t('kisilerX.aramaBaslatilamadi')"],
    ];
    for (const [a, b] of map) src = src.split(a).join(b);
    return src;
  });
}

console.log('wire4 done');
