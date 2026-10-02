/**
 * Wire t() into P1 leftover files. Run after _i18n_p1_keys.mjs
 */
import fs from 'fs';

function ensureImport(src, importLine) {
  if (src.includes(importLine)) return src;
  if (src.includes("from '../../../i18n/useCeviri'") || src.includes("from '../../i18n/useCeviri'") || src.includes("from '../../../../i18n/useCeviri'")) {
    return src;
  }
  // insert after last import
  const lines = src.split('\n');
  let lastImport = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i]) || /^} from /.test(lines[i])) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, importLine);
  return lines.join('\n');
}

function ensureHook(src, componentSig, hookLine = '  const { t } = useCeviri();') {
  if (src.includes('const { t } = useCeviri()') || src.includes('const { t, i18n } = useCeviri()')) {
    return src;
  }
  // after function start + first {
  const idx = src.indexOf(componentSig);
  if (idx < 0) {
    console.warn('component not found', componentSig.slice(0, 60));
    return src;
  }
  const brace = src.indexOf('{', idx);
  return src.slice(0, brace + 1) + '\n' + hookLine + src.slice(brace + 1);
}

function replAll(src, pairs) {
  for (const [a, b] of pairs) {
    if (!src.includes(a)) {
      // try without exact — skip silently for optional
      continue;
    }
    src = src.split(a).join(b);
  }
  return src;
}

// ---- mesaj/[id].tsx ----
{
  let src = fs.readFileSync('app/mesaj/[id].tsx', 'utf8');
  src = ensureImport(src, "import { useCeviri } from '../../src/i18n/useCeviri';");
  src = ensureHook(src, 'export default function MesajDetayEkrani()');
  const pairs = [
    ["Alert.alert('Engelli', 'Bu kullanıcıyla iletişim engellenmiş.');", "Alert.alert(t('mesajSohbet.engelliBaslik'), t('mesajSohbet.engelliIletisim'));"],
    ["Alert.alert('Misafir', 'Arama için hesabını tamamla.');", "Alert.alert(t('ortak.misafir'), t('mesajSohbet.misafirArama'));"],
    ["Alert.alert('Arama', r.hata);", "Alert.alert(t('mesajSohbet.arama'), r.hata);"],
    ["Alert.alert('Gönderilemedi', sonuc.hata ?? 'Hata');", "Alert.alert(t('mesajSohbet.gonderilemedi'), sonuc.hata ?? t('ortak.hata'));"],
    ["Alert.alert('Cüzdan', r.ok === false ? r.hata : 'Cüzdan no bulunamadı.');", "Alert.alert(t('cuzdan.baslik'), r.ok === false ? r.hata : t('mesajSohbet.cuzdanNoYok'));"],
    ['`MUTA PAY cüzdan no: ${formatli}`', "`${t('mesajSohbet.cuzdanNoPaylasMetin', { no: formatli })}`"],
    ["Alert.alert('ID', 'Kullanıcı ID henüz yok.');", "Alert.alert('ID', t('mesajSohbet.idYok'));"],
    ['`Kullanıcı ID: ${pid}`', "`${t('mesajSohbet.idPaylasMetin', { id: pid })}`"],
    ["Alert.alert('Misafir', 'Medya için hesabını tamamla.');", "Alert.alert(t('ortak.misafir'), t('mesajSohbet.misafirMedya'));"],
    ["Alert.alert('Medya', up.hata);", "Alert.alert(t('ortak.medya'), up.hata);"],
    ["text: 'Benden sil',", "text: t('mesajSohbet.bendenSil'),"],
    ["Alert.alert('Sil', r.hata);", "Alert.alert(t('mesajSohbet.sil'), r.hata);"],
    ["text: 'Herkesten sil',", "text: t('mesajSohbet.herkestenSil'),"],
    ["text: 'Bildir',", "text: t('mesajSohbet.bildir'),"],
    ["? 'Bir gönderi paylaştı'", "? t('mesajSohbet.paylasilanGonderi')"],
    ["opts.push({ text: 'Vazgeç', style: 'cancel' });", "opts.push({ text: t('ortak.vazgec'), style: 'cancel' });"],
    ["Alert.alert('Mesaj', undefined, opts);", "Alert.alert(t('mesajSohbet.mesajBaslik'), undefined, opts);"],
    ["text: 'Platform hesapları (mavi tik)',", "text: t('mesajSohbet.platformHesaplari'),"],
    ["text: `Kara · ${h.display_name || h.username || 'taraf'}`,", "text: t('mesajSohbet.karaTaraf', { ad: h.display_name || h.username || t('mesajSohbet.taraf') }),"],
    ["'Kara işlem'", "t('mesajSohbet.karaIslem')"],
    ["`${h.display_name || h.username} için kara açılacak.\\nHesap askıya alınır / kapatma yolu başlar. Onaylıyor musun?`", "t('mesajSohbet.karaAcSoru', { ad: h.display_name || h.username })"],
    ["{ text: 'Vazgeç', style: 'cancel' },", "{ text: t('ortak.vazgec'), style: 'cancel' },"],
    ["text: 'Kara aç',", "text: t('mesajSohbet.karaAc'),"],
    ["Alert.alert('Kara', r.hata);", "Alert.alert(t('mesajSohbet.karaIslem'), r.hata);"],
    ["'Kara açıldı'", "t('mesajSohbet.karaAcildi')"],
    ["'Karar mahkeme grubuna bildirildi.'", "t('mesajSohbet.karaAcildiBody')"],
    ["'Mahkeme kararı: usulsüzlük / dolandırıcılık / cevap vermeme'", "t('mesajSohbet.karaSebep')"],
    ["text: 'Mahkemeyi kapat',", "text: t('mesajSohbet.mahkemeyiKapat'),"],
    ["'Mahkemeyi kapat'", "t('mesajSohbet.mahkemeyiKapat')"],
    ["'Grup kapanır; yeni mesaj yazılamaz. Onaylıyor musun?'", "t('mesajSohbet.mahkemeyiKapatSoru')"],
    ["text: 'Kapat',", "text: t('ortak.kapat'),"],
    ["note: 'Mahkeme platform tarafından kapatıldı.',", "note: t('mesajSohbet.mahkemeKapatNot'),"],
    ["Alert.alert('Kapat', r.hata);", "Alert.alert(t('ortak.kapat'), r.hata);"],
    ["text: 'Arşivle',", "text: t('mesajlar.arsivle'),"],
    ["Alert.alert('Arşiv', r.hata);", "Alert.alert(t('mesajSohbet.arsiv'), r.hata);"],
    ["{ text: 'Vazgeç', style: 'cancel' },", "{ text: t('ortak.vazgec'), style: 'cancel' },"],
    ["peer?.thread_title || peer?.display_name || 'Mahkeme'", "peer?.thread_title || peer?.display_name || t('mesajSohbet.mahkeme')"],
    ["? 'Bu mahkeme kapalı.'", "? t('mesajSohbet.mahkemeKapali')"],
    [": 'Yargıç paneli · savunmalar bu grupta'", ": t('mesajSohbet.yargicPanel')"],
    ["peer?.agency_name || peer?.display_name || peer?.username || 'Sohbet'", "peer?.agency_name || peer?.display_name || peer?.username || t('mesajSohbet.sohbet')"],
    ["text: 'Ajans profili',", "text: t('mesajSohbet.ajansProfili'),"],
    ["text: 'Profil',", "text: t('profil.baslik'),"],
    ["text: 'Hediye gönder',", "text: t('mesajSohbet.hediyeGonder'),"],
    ["body: `🎁 ${gift.emoji} ${gift.name}${adet > 1 ? ` ×${adet}` : ''} hediye gönderdi`,", "body: t('mesajSohbet.hediyeGonderdi', { emoji: `🎁 ${gift.emoji}`, ad: gift.name, adet: adet > 1 ? ` ×${adet}` : '' }),"],
    ["Alert.alert('Arşivlendi', 'Sohbet arşive taşındı.');", "Alert.alert(t('mesajSohbet.arsivlendi'), t('mesajSohbet.arsivlendiBody'));"],
    ["text: 'Sohbeti sil',", "text: t('mesajSohbet.sohbetiSil'),"],
    ["'Sohbeti sil'", "t('mesajSohbet.sohbetiSil')"],
    ["'Bu sohbet senden tamamen silinir. Geçmiş temizlenir; karşı taraf etkilenmez.'", "t('mesajSohbet.sohbetiSilBody')"],
    ["text: 'Sil',", "text: t('ortak.sil'),"],
    ["Alert.alert('Silinemedi', r.hata);", "Alert.alert(t('mesajSohbet.silinemedi'), r.hata);"],
    ["text: 'Engelle / Bildir',", "text: t('mesajSohbet.engelleBildir'),"],
    ["Alert.alert('Sohbet açılamadı', sonuc.hata);", "Alert.alert(t('mesajSohbet.sohbetAcilamadi'), sonuc.hata);"],
    ["<Text style={styles.topFisilti}>YENİ SOHBET</Text>", "<Text style={styles.topFisilti}>{t('mesajSohbet.yeniSohbetFisilti')}</Text>"],
    ["<Text style={styles.topTitle}>Kullanıcı ara</Text>", "<Text style={styles.topTitle}>{t('mesajSohbet.kullaniciAra')}</Text>"],
    ["<Text style={styles.topTitle}>Sohbet bulunamadı</Text>", "<Text style={styles.topTitle}>{t('mesajSohbet.sohbetBulunamadi')}</Text>"],
    ["<Text style={styles.topFisilti}>Geri dönüp tekrar dene</Text>", "<Text style={styles.topFisilti}>{t('mesajSohbet.sohbetBulunamadiAlt')}</Text>"],
    ["||\\n                    'Mesaj'", "||\\n                    t('mesajSohbet.mesajBaslik')"],
    ["? 'mahkeme kapalı · yargıç'", "? t('mesajSohbet.mahkemeKapaliFisilti')"],
    [": 'yargıç · mavi tik · dokun'", ": t('mesajSohbet.yargicFisilti')"],
    ["? 'ajans · dokunarak profil'", "? t('mesajSohbet.ajansFisilti')"],
    [": 'çevrimiçi · dokunarak menü'}", ": t('mesajSohbet.cevrimiciFisilti')}"],
    ["<Text style={styles.emptyChat}>Henüz mesaj yok</Text>", "<Text style={styles.emptyChat}>{t('mesajSohbet.bosChat')}</Text>"],
    ["Metin, fotoğraf veya video gönder — anında ulaşır.", "{t('mesajSohbet.bosChatAlt')}"],
    ["Bu kullanıcıyla iletişim engellenmiş. Mesaj, arama ve hediye\\n                kapalı.", "{t('mesajSohbet.engelliComposer')}"],
    ["Engellenenleri yönet", "{t('mesajSohbet.engellenenleriYonet')}"],
    ["Bu mahkeme kapatıldı. Yeni mesaj yazılamaz.", "{t('mesajSohbet.mahkemeKapaliComposer')}"],
    ['accessibilityLabel="Hediye gönder"', "accessibilityLabel={t('mesajSohbet.hediyeA11y')}"],
    ['accessibilityLabel="Fotoğraf veya video gönder"', "accessibilityLabel={t('mesajSohbet.medyaGonderA11y')}"],
    ['placeholder="Mesaj yaz..."', "placeholder={t('mesajSohbet.yazPlaceholder')}"],
  ];
  // fix peer message fallback more carefully
  src = src.replace(
    /peer\?\.username \|\|\s*\n\s*'Mesaj'/,
    "peer?.username ||\n                    t('mesajSohbet.mesajBaslik')",
  );
  src = replAll(src, pairs);
  // multiline engelli composer
  src = src.replace(
    /Bu kullanıcıyla iletişim engellenmiş\. Mesaj, arama ve hediye\s+kapalı\./,
    "{t('mesajSohbet.engelliComposer')}",
  );
  src = src.replace(
    />\s*Engellenenleri yönet\s*</,
    ">{t('mesajSohbet.engellenenleriYonet')}<",
  );
  src = src.replace(
    /Metin, fotoğraf veya video gönder — anında ulaşır\./,
    "{t('mesajSohbet.bosChatAlt')}",
  );
  src = src.replace(
    /Bu mahkeme kapatıldı\. Yeni mesaj yazılamaz\./,
    "{t('mesajSohbet.mahkemeKapaliComposer')}",
  );
  // gift body remaining
  src = src.replace(
    /body: `🎁 \$\{gift\.emoji\} \$\{gift\.name\}\$\{adet > 1 \? ` ×\$\{adet\}` : ''\} hediye gönderdi`/g,
    "body: t('mesajSohbet.hediyeGonderdi', { emoji: `🎁 ${gift.emoji}`, ad: gift.name, adet: adet > 1 ? ` ×${adet}` : '' })",
  );
  fs.writeFileSync('app/mesaj/[id].tsx', src);
  console.log('mesaj/[id].tsx done, remaining TR?', /[çğıöşüÇĞİÖŞÜ]/.test(src.replace(/t\('[^']+'\)/g,'').replace(/\/\/.*/g,'')));
}

console.log('batch1 ok');
