# -*- coding: utf-8 -*-
"""Wire remaining Turkish UI strings in app/room/[id].tsx to t()."""
from pathlib import Path
import re

path = Path("app/room/[id].tsx")
src = path.read_text(encoding="utf-8")

if "const { t } = useCeviri()" not in src:
    src = src.replace(
        "export default function RoomScreen() {\n  const { id, oyun: oyunParam }",
        "export default function RoomScreen() {\n  const { t } = useCeviri();\n  const { id, oyun: oyunParam }",
        1,
    )

# Normalize fancy apostrophes in target replacements by matching flexibly
replacements = [
    # closed room
    (
        r"Alert\.alert\(\s*'Oda kapatıldı',\s*'Yönetim bu ses odasını kapattı\. Feed.den kaldırıldı\.',\s*\[\s*\{\s*text:\s*'Tamam'",
        "Alert.alert(\n              t('sesOda.odaKapatildi'),\n              t('sesOda.yonetimKapattiFeed'),\n              [{ text: t('ortak.tamam')",
    ),
    (
        r"Alert\.alert\(\s*'Odadan çık',\s*'Oda açık kalır\. Kalıcı kapatmak için oda numarasına dokun\.',\s*\[\s*\{\s*text:\s*'Kal'",
        "Alert.alert(\n        t('sesOda.odadanCik'),\n        t('sesOda.hostCikisSoru'),\n        [\n          { text: t('sesOda.kal')",
    ),
    (
        r"text:\s*'Çık',\s*style:\s*'destructive',\s*onPress:\s*\(\)\s*=>\s*void odadanAyril\(false\)",
        "text: t('sesOda.cik'),\n            style: 'destructive',\n            onPress: () => void odadanAyril(false)",
    ),
    (
        r"Alert\.alert\('Odadan çık', 'Sesli odadan ayrılmak istiyor musun\?', \[\s*\{\s*text:\s*'Kal'",
        "Alert.alert(t('sesOda.odadanCik'), t('sesOda.ayrilSoruKisa'), [\n      { text: t('sesOda.kal')",
    ),
    (
        r"Alert\.alert\(\s*'Odayı kapat',\s*'Bu ses odası kalıcı olarak kapanacak ve feed.den kalkacak\. Emin misin\?',\s*\[\s*\{\s*text:\s*'Vazgeç'",
        "Alert.alert(\n      t('sesOda.odayiKapat'),\n      t('sesOda.odayiKapatSoru'),\n      [\n        { text: t('ortak.vazgec')",
    ),
    (
        r"text:\s*'Evet, kapat'",
        "text: t('sesOda.evetKapat')",
    ),
    (
        r"Alert\.alert\(\s*'Mikrofon',\s*'Mikrofonunuz oda yöneticisi tarafından kilitlendi\.',\s*\)",
        "Alert.alert(\n            t('sesOda.mikrofon'),\n            t('sesOda.mikrofonKilitli'),\n          )",
    ),
    (
        r"Alert\.alert\(\s*'Mikrofon',\s*'Mikrofonunuz yönetici tarafından kapatıldı\.',\s*\)",
        "Alert.alert(\n            t('sesOda.mikrofon'),\n            t('sesOda.mikrofonYoneticiKapatti'),\n          )",
    ),
    (
        r"Alert\.alert\(\s*'Mikrofon',\s*'İstek gönderildi\. Host kabul edince koltuğa oturursun\.',\s*\)",
        "Alert.alert(\n          t('sesOda.mikrofon'),\n          t('sesOda.istekGonderildiKoltuk'),\n        )",
    ),
    (
        r"case 'mute':\s*return 'Mikrofon kapatıldı\.';",
        "case 'mute':\n        return t('sesOda.modMute');",
    ),
    (
        r"case 'unmute':\s*return 'Mikrofon izni güncellendi\.';",
        "case 'unmute':\n        return t('sesOda.modUnmute');",
    ),
    (
        r"case 'mic_lock':\s*return 'Mikrofon kilitlendi\.';",
        "case 'mic_lock':\n        return t('sesOda.modMicLock');",
    ),
    (
        r"case 'mic_unlock':\s*return 'Mikrofon kilidi kaldırıldı\.';",
        "case 'mic_unlock':\n        return t('sesOda.modMicUnlock');",
    ),
    (
        r"case 'unseat':\s*return 'Kullanıcı dinleyiciye alındı\.';",
        "case 'unseat':\n        return t('sesOda.modUnseat');",
    ),
    (
        r"case 'kick':\s*return 'Kullanıcı odadan çıkarıldı\.';",
        "case 'kick':\n        return t('sesOda.modKick');",
    ),
    (
        r"case 'ban':\s*return 'Kullanıcı yasaklandı\.';",
        "case 'ban':\n        return t('sesOda.modBan');",
    ),
    (
        r"case 'unban':\s*return 'Yasak kaldırıldı\.';",
        "case 'unban':\n        return t('sesOda.modUnban');",
    ),
    (
        r"default:\s*return 'İşlem tamamlandı\.';",
        "default:\n        return t('sesOda.islemTamamlandi');",
    ),
    (
        r"Alert\.alert\(onay\.baslik, onay\.metin, \[\s*\{\s*text:\s*'Vazgeç'",
        "Alert.alert(onay.baslik, onay.metin, [\n        { text: t('ortak.vazgec')",
    ),
    (
        r"\{\s*text:\s*'Onayla',\s*style:\s*'destructive',\s*onPress:\s*calistir\s*\}",
        "{ text: t('ortak.onayla'), style: 'destructive', onPress: calistir }",
    ),
    (
        r"Alert\.alert\('Koltuktan kalk', 'Konuşmacı koltuğundan ayrılıp dinleyici olmak ister misin\?', \[\s*\{\s*text:\s*'Vazgeç'",
        "Alert.alert(t('sesOda.koltuktanKalk'), t('sesOda.koltuktanKalkSoru'), [\n      { text: t('ortak.vazgec')",
    ),
    (
        r"text:\s*'Ayrıl',",
        "text: t('sesOda.ayril'),",
    ),
    (
        r"Alert\.alert\('Koltuk', 'İşlem tamamlanamadı\. Tekrar deneyin\.'\);",
        "Alert.alert(t('sesOda.koltuk'), t('sesOda.islemBasarisiz'));",
    ),
    (
        r"'bu kullanıcıya'",
        "t('sesOda.buKullaniciya')",
    ),
    (
        r"Alert\.alert\(\s*'Liderliği devret',\s*`\$\{ad\} oda sahibi olacak\. Tahta oturacak\. Emin misin\?`,\s*\[\s*\{\s*text:\s*'İptal'",
        "Alert.alert(\n        t('sesOda.liderligiDevret'),\n        t('sesOda.liderligiDevretSoru', { ad }),\n        [\n          { text: t('ortak.iptal')",
    ),
    (
        r"text:\s*'Devret',",
        "text: t('sesOda.devret'),",
    ),
    (
        r"Alert\.alert\('Liderlik', r\.hata \?\? 'Devredilemedi'\)",
        "Alert.alert(t('sesOda.liderlik'), r.hata ?? t('sesOda.devredilemedi'))",
    ),
    (
        r"const baslik = suanCohost\s*\?\s*'Yönetici yetkisini kaldır'\s*:\s*'Yönetici yap';\s*const metin = suanCohost\s*\?\s*'Bu kullanıcının oda yöneticisi yetkisi kaldırılsın mı\?'\s*:\s*'Bu kullanıcıyı oda yöneticisi yapmak istiyor musunuz\?';\s*Alert\.alert\(baslik, metin, \[\s*\{\s*text:\s*'Vazgeç'",
        "const baslik = suanCohost\n        ? t('sesOda.yoneticiYetkisiniKaldir')\n        : t('sesOda.yoneticiYap');\n      const metin = suanCohost\n        ? t('sesOda.yoneticiKaldirSoru')\n        : t('sesOda.yoneticiYapSoru');\n      Alert.alert(baslik, metin, [\n        { text: t('ortak.vazgec')",
    ),
    (
        r"text:\s*'Onayla',\s*onPress:\s*\(\)\s*=>\s*\{\s*void \(async \(\) => \{\s*const r = suanCohost",
        "text: t('ortak.onayla'),\n          onPress: () => {\n            void (async () => {\n              const r = suanCohost",
    ),
    (
        r"Alert\.alert\('Yönetici', 'İşlem tamamlanamadı\. Tekrar deneyin\.'\);",
        "Alert.alert(t('sesOda.yonetici'), t('sesOda.islemBasarisiz'));",
    ),
    (
        r"Alert\.alert\(\s*'Tamam',\s*suanCohost\s*\?\s*'Yönetici yetkisi kaldırıldı\.'\s*:\s*'Yönetici yetkisi verildi\.',\s*\)",
        "Alert.alert(\n                t('ortak.tamam'),\n                suanCohost\n                  ? t('sesOda.yoneticiKaldirildi')\n                  : t('sesOda.yoneticiVerildi'),\n              )",
    ),
    (
        r"Alert\.alert\(\s*'Koltuk talebi',\s*`Koltuk \$\{seat\.seat_index \+ 1\} için istek gönderilsin mi\?`,\s*\[\s*\{\s*text:\s*'Vazgeç'",
        "Alert.alert(\n            t('sesOda.koltukTalebi'),\n            t('sesOda.koltukTalebiSoru', { n: seat.seat_index + 1 }),\n            [\n              { text: t('ortak.vazgec')",
    ),
    (
        r"text:\s*'İstek gönder',",
        "text: t('sesOda.istekGonder'),",
    ),
    (
        r"Alert\.alert\('Koltuk', r\.hata \?\? 'İstek gönderilemedi'\)",
        "Alert.alert(t('sesOda.koltuk'), r.hata ?? t('sesOda.istekGonderilemedi'))",
    ),
    (
        r"Alert\.alert\(\s*'Koltuk',\s*'İstek gönderildi\. Host kabul edince bu koltuğa oturacaksın\.',\s*\)",
        "Alert.alert(\n                      t('sesOda.koltuk'),\n                      t('sesOda.istekGonderildiBuKoltuk'),\n                    )",
    ),
    (
        r"baslik:\s*'Odadan çıkar',\s*metin:\s*`\$\{name\} odadan çıkarılsın mı\?`",
        "baslik: t('sesOda.odadanCikar'),\n              metin: t('sesOda.odadanCikarSoru', { ad: name })",
    ),
    (
        r"baslik:\s*'Yasakla',\s*metin:\s*`\$\{name\} bu odadan yasaklansın mı\?`",
        "baslik: t('sesOda.yasakla'),\n              metin: t('sesOda.yasaklaSoru', { ad: name })",
    ),
    (
        r"case 'profil':\s*return 'Profilini Gör';",
        "case 'profil':\n            return t('sesOda.menuProfiliniGor');",
    ),
    (
        r"case 'koltuktan_ayril':\s*return 'Koltuktan Kalk';",
        "case 'koltuktan_ayril':\n            return t('sesOda.menuKoltuktanKalk');",
    ),
    (
        r"case 'mute':\s*return 'Mikrofonu Kapat';",
        "case 'mute':\n            return t('sesOda.menuMikrofonuKapat');",
    ),
    (
        r"case 'mic_lock':\s*return 'Mikrofonu Kilitle';",
        "case 'mic_lock':\n            return t('sesOda.menuMikrofonuKilitle');",
    ),
    (
        r"case 'mic_unlock':\s*return 'Mikrofon Kilidini Aç';",
        "case 'mic_unlock':\n            return t('sesOda.menuMikrofonKilidiniAc');",
    ),
    (
        r"case 'unseat':\s*return 'Koltuktan İndir';",
        "case 'unseat':\n            return t('sesOda.menuKoltuktanIndir');",
    ),
    (
        r"case 'admin_ata':\s*return 'Yönetici Yap';",
        "case 'admin_ata':\n            return t('sesOda.menuYoneticiYap');",
    ),
    (
        r"case 'admin_kaldir':\s*return 'Yönetici Yetkisini Kaldır';",
        "case 'admin_kaldir':\n            return t('sesOda.menuYoneticiYetkisiniKaldir');",
    ),
    (
        r"case 'lider_devret':\s*return 'Liderliği Devret';",
        "case 'lider_devret':\n            return t('sesOda.menuLiderligiDevret');",
    ),
    (
        r"case 'kick':\s*return 'Odadan Çıkar';",
        "case 'kick':\n            return t('sesOda.menuOdadanCikar');",
    ),
    (
        r"case 'ban':\s*return 'Engelle / Yasakla';",
        "case 'ban':\n            return t('sesOda.menuEngelleYasakla');",
    ),
    (
        r"title:\s*'Demo canlı oda',\s*topic:\s*'Ses \+ hediye önizleme',",
        "title: t('sesOda.demoCanliOda'),\n        topic: t('sesOda.demoTopic'),",
    ),
    (
        r"useState\('Hazır'\)",
        "useState(() => t('sesOda.hazir'))",
    ),
    (
        r"Alert\.alert\(\s*'Ses bağlantısı',\s*medya\.hata \?\?\s*'Mikrofon yayınlanamadı\. İzinleri kontrol edip odadan çıkıp tekrar dene\.',\s*\)",
        "Alert.alert(\n            t('sesOda.sesBaglantisi'),\n            medya.hata ?? t('sesOda.sesBaglantisiHata'),\n          )",
    ),
    (
        r"Alert\.alert\(\s*'Şehrine güç',\s*`\$\{ozet\.city_name\}: \+\$\{ozet\.last_delta\} güç\\nBugün toplam \$\{ozet\.today_power\} güç kattın\.`,\s*\)",
        "Alert.alert(\n              t('sesOda.sehireGuc'),\n              t('sesOda.sehireGucBody', {\n                sehir: ozet.city_name,\n                delta: ozet.last_delta,\n                toplam: ozet.today_power,\n              }),\n            )",
    ),
    (
        r"\?\? 'Oda sahibi'",
        "?? t('sesOda.odaSahibi')",
    ),
    (
        r"altEtiket=\"Oda sahibi\"",
        "altEtiket={t('sesOda.odaSahibi')}",
    ),
    (
        r">Yorumlar<",
        ">{t('sesOda.yorumlar')}<",
    ),
    (
        r">\{\s*t\('sesOda\.odaBulunamadi'\)\s*\}<",
        ">{t('sesOda.odaBulunamadi')}<",
    ),
    (
        r">Oda bulunamadı<",
        ">{t('sesOda.odaBulunamadi')}<",
    ),
    (
        r"setLkDurum\('Ses bağlanıyor…'\)",
        "setLkDurum(t('sesOda.sesBaglaniyor'))",
    ),
    (
        r"setLkDurum\(medya\.mock \? `Demo · dinleyici` : `Bağlı · dinleyici`\)",
        "setLkDurum(medya.mock ? t('sesOda.demoDinleyici') : t('sesOda.bagliDinleyici'))",
    ),
    (
        r"setLkDurum\(medya\.mock \? `Demo · konuşmacı` : `Bağlı · konuşmacı`\)",
        "setLkDurum(medya.mock ? t('sesOda.demoKonusmaci') : t('sesOda.bagliKonusmaci'))",
    ),
    (
        r"\?\? 'Oda sahibi';",
        "?? t('sesOda.odaSahibi');",
    ),
]

ok = miss = 0
for pat, repl in replacements:
    new, n = re.subn(pat, repl, src, count=1, flags=re.DOTALL)
    if n:
        src = new
        ok += 1
    else:
        miss += 1
        print("MISS:", pat[:70])

# Fix sahip animation ad fallback if still Turkish
src2, n = re.subn(
    r"(const ad =\s*taht\?\.profile\?\.display_name\?\.trim\(\) \|\|\s*taht\?\.profile\?\.username\?\.trim\(\) \|\|\s*)'Oda sahibi';",
    r"\1t('sesOda.odaSahibi');",
    src,
    count=1,
)
if n:
    src = src2
    ok += 1
else:
    # maybe already partially wrong from earlier bad replace
    pass

# baslik: 'Oda sahibi' / Profil
src = src.replace("baslik: 'Oda sahibi',", "baslik: t('sesOda.odaSahibi'),")
src = src.replace("baslik: 'Profil',", "baslik: t('ortak.profil'),")

# displayName fallback still hardcode
src = re.sub(
    r"(displayName=\{\s*odaSahibi\?\.display_name \?\?\s*\(isHost \? profile\?\.display_name : null\) \?\?\s*)'Oda sahibi'",
    r"\1t('sesOda.odaSahibi')",
    src,
    count=1,
)

path.write_text(src, encoding="utf-8")
print({"ok": ok, "miss": miss, "has_t": "const { t } = useCeviri()" in src})
