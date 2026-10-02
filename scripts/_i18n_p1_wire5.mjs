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

function ensureHook(src, marker) {
  const idx = src.indexOf(marker);
  if (idx < 0) return src;
  const end = src.indexOf(') {', idx);
  if (end < 0) return src;
  if (src.slice(end + 3, end + 80).includes('useCeviri')) return src;
  return src.slice(0, end + 3) + '\n  const { t } = useCeviri();' + src.slice(end + 3);
}

function patch(file, fn) {
  let src = fs.readFileSync(file, 'utf8');
  src = fn(src);
  fs.writeFileSync(file, src, 'utf8');
  console.log('ok', file);
}

patch('src/moduller/durum/bilesenler/DurumCaptionAcilir.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function DurumCaptionAcilir');
  src = src.replace(/accessibilityLabel="Devamını gör"/g, "accessibilityLabel={t('durumX.devaminiGor')}");
  src = src.replace(/accessibilityLabel="Daha az göster"/g, "accessibilityLabel={t('durumX.dahaAzGoster')}");
  src = src.replace(/>…devamını gör</g, ">{t('durumX.devaminiGor')}</Text>".replace('</Text>', ''));
  // fix text nodes carefully
  src = src.replace(/\{?…devamını gör\}?/g, "{t('durumX.devaminiGor')}");
  src = src.replace(/>daha az göster</g, ">{t('durumX.dahaAzGoster')}<");
  return src;
});

patch('src/moduller/durum/bilesenler/DurumKart.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function DurumKart');
  if (!src.includes('useCeviri()')) {
    // maybe named differently
    const m = src.match(/function DurumKart\w*\(/) || src.match(/export const DurumKart/);
  }
  src = src.replace(/accessibilityLabel="Gönderi detayı"/g, "accessibilityLabel={t('durumX.gonderiDetayi')}");
  src = src.replace(/accessibilityLabel="Profili aç"/g, "accessibilityLabel={t('durumX.profiliAc')}");
  src = src.replace(/accessibilityLabel="Diğer seçenekler"/g, "accessibilityLabel={t('durumX.digerSecenekler')}");
  src = src.replace(/accessibilityLabel="Resmi büyüt"/g, "accessibilityLabel={t('durumX.resmiBuyut')}");
  return src;
});

patch('src/moduller/durum/bilesenler/DurumEtkilesimCubugu.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function DurumEtkilesimCubugu');
  src = src.replace(/accessibilityLabel="Paylaş"/g, "accessibilityLabel={t('durumX.paylas')}");
  src = src.replace(/>Paylaş</g, ">{t('durumX.paylas')}<");
  return src;
});

patch('src/moduller/durum/bilesenler/DurumMuzikKarti.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function DurumMuzikKarti');
  src = src.replace(/accessibilityLabel="Müzik detayı"/g, "accessibilityLabel={t('durumX.muzikDetayi')}");
  return src;
});

patch('src/moduller/durum/bilesenler/DurumProfilIzgarasi.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function DurumProfilIzgarasi');
  src = src.replace(/>Gönderiler</g, ">{t('durumX.gonderiler')}<");
  src = src.replace(/>Henüz paylaşım yok</g, ">{t('durumX.paylasimYok')}<");
  src = src.replace(/'Gönderiler'/g, "t('durumX.gonderiler')");
  src = src.replace(/'Henüz paylaşım yok'/g, "t('durumX.paylasimYok')");
  return src;
});

patch('src/moduller/durum/bilesenler/DurumResimLightbox.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function DurumResimLightbox');
  src = src.replace(/accessibilityLabel="Büyütülmüş durum resmi"/g, "accessibilityLabel={t('durumX.buyutulmusDurum')}");
  return src;
});

patch('src/moduller/ses-odalari/bilesenler/AktifSesOdasiMiniBar.tsx', (src) => {
  src = src.replace(
    /Alert\.alert\('Oda kapatıldı', t\('sesOda\.yonetimKapatti'\)\)/g,
    "Alert.alert(t('sesOda.sesOdasi'), t('sesOda.yonetimKapatti'))",
  );
  src = src.replace(
    /Alert\.alert\('Odadan çık', t\('sesOda\.ayrilSoru'\),/g,
    "Alert.alert(t('sesOda.odadanCik'), t('sesOda.ayrilSoru'),",
  );
  return src;
});

patch('src/moduller/ses-odalari/bilesenler/OdaDinleyiciPaneli.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function OdaDinleyiciPaneli');
  if (!src.includes('useCeviri()')) {
    const m = src.match(/function OdaDinleyici/);
    if (m) src = ensureHook(src, m[0]);
  }
  src = src.replace(
    /`\$\{sayi\} kişi koltukta oturmadan dinliyor`/g,
    "t('sesOda.dinliyor', { sayi })",
  );
  return src;
});

patch('src/moduller/ses-odalari/bilesenler/OdaProfilKartiPaneli.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function OdaProfilKartiPaneli');
  if (!src.includes('useCeviri()')) {
    const m = src.match(/function OdaProfil/);
    if (m) src = ensureHook(src, m[0]);
  }
  src = src.replace(/'Takip için hesabını tamamla\.'/g, "t('sesOda.takipMisafir')");
  src = src.replace(/accessibilityLabel="Profil fotoğrafını büyüt"/g, "accessibilityLabel={t('sesOda.profilBuyut')}");
  src = src.replace(/>Takipçiler</g, ">{t('sesOda.takipciler')}<");
  src = src.replace(/>Tam profili aç</g, ">{t('sesOda.tamProfilAc')}<");
  src = src.replace(/'Tam profili aç'/g, "t('sesOda.tamProfilAc')");
  src = src.replace(/'Takipçiler'/g, "t('sesOda.takipciler')");
  return src;
});

patch('src/moduller/ses-odalari/bilesenler/OdaSesHacmiButonu.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function OdaSesHacmiButonu');
  src = src.replace(
    /`Oda sesi \$\{yuzde\} yüzde`/g,
    "t('sesOda.odaSesiA11y', { yuzde })",
  );
  return src;
});

patch('src/moduller/ses-odalari/bilesenler/ProfilSesOdasiButonu.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function ProfilSesOdasiButonu');
  src = src.replace(/'Yardımcı'/g, "t('sesOda.yardimci')");
  src = src.replace(/'Konuşmacı'/g, "t('sesOda.konusmaci')");
  src = src.replace(
    /`\$\{oda\.title\} ses odasına git`/g,
    "t('sesOda.odayaGitA11y', { baslik: oda.title })",
  );
  return src;
});

patch('src/moduller/ses-odalari/bilesenler/OdaArkaPlanTemaSeridi.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function OdaArkaPlanTemaSeridi');
  src = src.replace(/`\$\{tema\.ad\} teması`/g, "t('sesOda.temaA11y', { tema: tema.ad })");
  return src;
});

// GorusmeGecmis Kullanıcı leftover
patch('src/moduller/gorusme/bilesenler/GorusmeGecmisPaneli.tsx', (src) => {
  src = src.replace(/\|\| 'Kullanıcı'/g, "|| t('ortak.kullanici')");
  return src;
});

// OdaKapakDuzenlePaneli - key labels
patch('src/moduller/ses-odalari/bilesenler/OdaKapakDuzenlePaneli.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHook(src, 'export function OdaKapakDuzenlePaneli');
  if (!src.includes('useCeviri()')) {
    const m = src.match(/function OdaKapak/);
    if (m) src = ensureHook(src, m[0]);
  }
  const pairs = [
    ["'Oda adı'", "t('sesOda.odaAdi')"],
    ["'Başlık gerekli'", "t('sesOda.baslikGerekli')"],
    ["'Koltuk sayısı'", "t('sesOda.koltukSayisi')"],
    ["'Vazgeç'", "t('ortak.vazgec')"],
    ["'Arka plan seç'", "t('sesOda.arkaPlanSec')"],
    ["'Özel fotoğraf'", "t('sesOda.ozelFotograf')"],
    ["'Değiştir'", "t('ortak.degistir')"],
    ["'Foto yükle'", "t('sesOda.fotoYukle')"],
    ["'Özel arka planı kaldır'", "t('sesOda.ozelArkaPlanKaldir')"],
    ["'Kapak önizleme'", "t('sesOda.kapakOnizleme')"],
    ["'Başlık'", "t('sesOda.baslik')"],
    ["'Açıklama'", "t('sesOda.aciklama')"],
    ["'Kısa konu / davet metni'", "t('sesOda.aciklamaPlaceholder')"],
    ["'Koltuk artır'", "t('sesOda.koltukArtir')"],
  ];
  for (const [a, b] of pairs) src = src.split(a).join(b);
  src = src.replace(
    /`\$\{r\.kicked\} kişi \(en son gelenler\) koltuktan düşürüldü\.`/g,
    "t('sesOda.koltuktanDustu', { adet: r.kicked })",
  );
  src = src.replace(
    /`\$\{onizlemeTema\.ad\} teması`/g,
    "t('sesOda.temaA11y', { tema: onizlemeTema.ad })",
  );
  src = src.replace(
    /` · \$\{doluKoltuk - maxSeats\} kişi düşer`/g,
    "t('sesOda.kisiDuser', { adet: doluKoltuk - maxSeats })",
  );
  return src;
});

console.log('wire5 done');
