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
  if (src.includes('const { t } = useCeviri()') || src.includes('const { t, i18n } = useCeviri()')) {
    // already has somewhere — may still need in this component
  }
  const idx = src.indexOf(exportSig);
  if (idx < 0) return src;
  // Find }: Props) { or }: Xxx) {
  const propsEnd = src.indexOf(') {', idx);
  if (propsEnd < 0) return src;
  const after = src.slice(propsEnd + 3, propsEnd + 60);
  if (after.includes('useCeviri')) return src;
  return src.slice(0, propsEnd + 3) + '\n  const { t } = useCeviri();' + src.slice(propsEnd + 3);
}

function patch(file, fn) {
  let src = fs.readFileSync(file, 'utf8');
  src = fn(src);
  fs.writeFileSync(file, src, 'utf8');
  console.log('ok', file);
}

// durum/[id].tsx
patch('app/durum/[id].tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../src/i18n/useCeviri';");
  // find default export function
  const m = src.match(/export default function \w+\(/);
  if (m) {
    const idx = src.indexOf(m[0]);
    const brace = src.indexOf('{', idx);
    if (!src.slice(brace, brace + 80).includes('useCeviri')) {
      src = src.slice(0, brace + 1) + '\n  const { t } = useCeviri();' + src.slice(brace + 1);
    }
  }
  src = src.replace(
    /Alert\.alert\('Beğeni', r\.hata \?\? 'Başarısız'\);/g,
    "Alert.alert(t('durum.begeni'), r.hata ?? t('durum.basarisiz'));",
  );
  src = src.replace(
    /Alert\.alert\('Durumu sil', 'Bu paylaşım kalıcı olarak silinsin mi\?', \[/g,
    "Alert.alert(t('durum.durumuSil'), t('durum.silKalici'), [",
  );
  src = src.replace(/\{ text: 'Vazgeç', style: 'cancel' \},/g, "{ text: t('ortak.vazgec'), style: 'cancel' },");
  src = src.replace(/text: 'Sil',/g, "text: t('ortak.sil'),");
  src = src.replace(
    /Alert\.alert\('Sil', r\.hata \?\? 'Başarısız'\);/g,
    "Alert.alert(t('ortak.sil'), r.hata ?? t('durum.basarisiz'));",
  );
  src = src.replace(/accessibilityLabel="Resmi büyüt"/g, "accessibilityLabel={t('durum.resmiBuyut')}");
  src = src.replace(/accessibilityLabel="Büyütülmüş resim"/g, "accessibilityLabel={t('durum.buyutulmusResim')}");
  src = src.replace(/accessibilityLabel="Düzenle"/g, "accessibilityLabel={t('ortak.duzenle')}");
  src = src.replace(/accessibilityLabel="Gönderiyi paylaş"/g, "accessibilityLabel={t('durum.gonderiyiPaylas')}");
  src = src.replace(/>\s*Düzenle\s*</g, ">{t('ortak.duzenle')}<");
  return src;
});

// KisilerKesifEkrani
patch('src/moduller/kisiler-kesif/bilesenler/KisilerKesifEkrani.tsx', (src) => {
  src = src.replace(/setHata\(res\.message \?\? res\.error \?\? 'Yüklenemedi'\)/g, "setHata(res.message ?? res.error ?? t('kisilerX.yuklenemedi'))");
  src = src.replace(/: 'Şu anda kişiler yüklenemedi\.'/g, ": t('kisilerX.yuklenemediBody')");
  src = src.replace(
    /\{ id: 'for_you', label: 'Sana Özel' \},/g,
    "{ id: 'for_you', label: t('kisilerX.sanaOzel') },",
  );
  src = src.replace(/list\.push\(\{ id: 'female', label: 'Kadın' \}\);/g, "list.push({ id: 'female', label: t('kisilerX.kadin') });");
  src = src.replace(/list\.push\(\{ id: 'male', label: 'Erkek' \}\);/g, "list.push({ id: 'male', label: t('kisilerX.erkek') });");
  src = src.replace(/\}, \[feat\?\.gender_filter_enabled\]\);/g, '}, [feat?.gender_filter_enabled, t]);');
  src = src.replace(/Alert\.alert\('Mesaj', r\.hata\);/g, "Alert.alert(t('kisilerX.mesaj'), r.hata);");
  src = src.replace(/Alert\.alert\('Arama', r\.hata\);/g, "Alert.alert(t('kisilerX.arama'), r.hata);");
  src = src.replace(/Alert\.alert\('Arama', 'Çağrı kimliği alınamadı'\);/g, "Alert.alert(t('kisilerX.arama'), t('kisilerX.cagriIdYok'));");
  src = src.replace(/: 'Başlatılamadı'/g, ": t('kisilerX.baslatilamadi')");
  src = src.replace(/label=\{ulke \? `\$\{ulkeBayragi\(ulke\)\} \$\{ulke\}` : 'Ülke'\}/g, "label={ulke ? `${ulkeBayragi(ulke)} ${ulke}` : t('kisilerX.ulke')}");
  src = src.replace(/label="Çevrimiçi"/g, "label={t('kisilerX.cevrimici')}");
  src = src.replace(/label="Temizle"/g, "label={t('kisilerX.temizle')}");
  src = src.replace(
    /Öneriler; tercihlerin ve Tamuso’daki etkileşimlerine göre kişiselleştirilebilir\./g,
    "{t('kisilerX.onerilerInfo')}",
  );
  src = src.replace(/placeholder="Ülke ara\.\.\."/g, "placeholder={t('kisilerX.ulkeAra')}");
  // yukle callback needs t in deps - add if present
  return src;
});

// KisilerKart
patch('src/moduller/kisiler-kesif/bilesenler/KisilerKart.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHookAfterProps(src, 'function KisilerKartIc(');
  src = src.replace(/\|\| 'Kullanıcı';/g, "|| t('ortak.kullanici');");
  src = src.replace(/accessibilityLabel=\{`\$\{isim\} profili`\}/g, "accessibilityLabel={t('kisilerX.profilA11y', { isim })}");
  src = src.replace(/accessibilityLabel="Çevrimiçi"/g, "accessibilityLabel={t('kisilerX.cevrimici')}");
  src = src.replace(/label="Mesaj"/g, "label={t('kisilerX.mesaj')}");
  src = src.replace(/label="Sesli ara"/g, "label={t('kisilerX.sesliAra')}");
  src = src.replace(/label="Görüntülü ara"/g, "label={t('kisilerX.goruntuluAra')}");
  return src;
});

// KisilerAramaOnaySheet
patch('src/moduller/kisiler-kesif/bilesenler/KisilerAramaOnaySheet.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHookAfterProps(src, 'export function KisilerAramaOnaySheet(');
  src = src.replace(
    /const turLabel = callType === 'video' \? 'Görüntülü Arama' : 'Sesli Arama';/,
    "const turLabel = callType === 'video' ? t('kisilerX.goruntuluArama') : t('kisilerX.sesliArama');",
  );
  src = src.replace(/\|\| 'Kullanıcı';/, "|| t('ortak.kullanici');");
  src = src.replace(
    /\? 'Yetersiz coin bakiyesi — en az 1 dakika için coin gerekir\.'/,
    "? t('kisilerX.yetersizCoin')",
  );
  src = src.replace(
    /\{isim\} ile \{turLabel\}/,
    "{t('kisilerX.ileArama', { isim, tur: turLabel })}",
  );
  src = src.replace(
    /\{onizleme\.price_per_minute \?\? '—'\} coin \/ dakika/,
    "{t('kisilerX.coinDk', { n: onizleme.price_per_minute ?? '—' })}",
  );
  src = src.replace(/>Ücretsiz arama</g, ">{t('kisilerX.ucretsizArama')}<");
  src = src.replace(/label="Bakiyen"/g, "label={t('kisilerX.bakiyen')}");
  src = src.replace(/label="Tahmini süre"/g, "label={t('kisilerX.tahminiSure')}");
  src = src.replace(/>Vazgeç</g, ">{t('ortak.vazgec')}<");
  return src;
});

// GorusmeGecmisPaneli
patch('src/moduller/gorusme/bilesenler/GorusmeGecmisPaneli.tsx', (src) => {
  src = ensureImport(src, "import { useCeviri } from '../../../i18n/useCeviri';");
  src = ensureHookAfterProps(src, 'export function GorusmeGecmisPaneli(');
  // formatTarih / durumEtiket need t - convert to use inside component or pass t
  // Replace formatTarih to accept t
  src = src.replace(
    /function formatTarih\(iso: string \| null\): string \{/,
    "function formatTarih(iso: string | null, t: (k: any, o?: any) => string): string {",
  );
  src = src.replace(
    /if \(sameDay\) return `Bugün · \$\{saat\}`;/,
    "if (sameDay) return t('gorusme.bugunSaat', { saat });",
  );
  src = src.replace(
    /function durumEtiket\(k: GorusmeGecmisKayit\): string \{/,
    "function durumEtiket(k: GorusmeGecmisKayit, t: (k: any, o?: any) => string): string {",
  );
  src = src.replace(
    /return k\.status === 'ringing' \? 'Aranıyor…' : 'Devam ediyor';/,
    "return k.status === 'ringing' ? t('gorusme.araniyor') : t('gorusme.devamEdiyor');",
  );
  src = src.replace(/return 'Cevapsız';/, "return t('gorusme.cevapsiz');");
  src = src.replace(/return 'Reddedildi';/, "return t('gorusme.reddedildi');");
  src = src.replace(/return 'İptal';/, "return t('gorusme.iptal');");
  src = src.replace(
    /return k\.is_outgoing \? 'Giden' : 'Gelen';/,
    "return k.is_outgoing ? t('gorusme.giden') : t('gorusme.gelen');",
  );
  // call sites
  src = src.replace(/formatTarih\(([^)]+)\)/g, 'formatTarih($1, t)');
  src = src.replace(/durumEtiket\(([^)]+)\)/g, 'durumEtiket($1, t)');
  src = src.replace(
    /Alert\.alert\(\s*'Görüşmeyi sil',\s*'Bu kayıt yalnızca senden silinir\. Karşı tarafın geçmişi etkilenmez\.',/g,
    "Alert.alert(t('gorusme.gorusmeyiSil'), t('gorusme.gorusmeyiSilBody'),",
  );
  src = src.replace(/\{ text: 'Vazgeç', style: 'cancel' \}/g, "{ text: t('ortak.vazgec'), style: 'cancel' }");
  src = src.replace(/>Geçmiş</g, ">{t('gorusme.gecmis')}<");
  src = src.replace(
    /\{yukleniyor \? 'Yükleniyor…' : 'Henüz görüşme yok'\}/g,
    "{yukleniyor ? t('ortak.yukleniyor') : t('gorusme.gorusmeYok')}",
  );
  src = src.replace(/\|\| 'Kullanıcı'/g, "|| t('ortak.kullanici')");
  return src;
});

console.log('batch done');
