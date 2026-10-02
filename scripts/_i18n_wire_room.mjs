/**
 * One-shot patches for room/[id].tsx Turkish → t() wiring helpers.
 * Manual review still needed for complex templates; this inserts import + hook.
 */
import fs from 'fs';

const path = 'app/room/[id].tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes("from '../../src/i18n/useCeviri'")) {
  src = src.replace(
    "import { Screen } from '../../src/components/Screen';",
    "import { Screen } from '../../src/components/Screen';\nimport { useCeviri } from '../../src/i18n/useCeviri';",
  );
}

if (!src.includes('const { t } = useCeviri()')) {
  src = src.replace(
    "export default function RoomScreen() {\n  const { id, oyun: oyunParam } = useLocalSearchParams",
    "export default function RoomScreen() {\n  const { t } = useCeviri();\n  const { id, oyun: oyunParam } = useLocalSearchParams",
  );
}

const reps = [
  [
    `Alert.alert(
              'Oda kapatıldı',
              'Yönetim bu ses odasını kapattı. Feed’den kaldırıldı.',
              [{ text: 'Tamam', onPress: () => OdadanCikisYonlendir() }],
            )`,
    `Alert.alert(
              t('sesOda.odaKapatildi'),
              t('sesOda.yonetimKapattiFeed'),
              [{ text: t('ortak.tamam'), onPress: () => OdadanCikisYonlendir() }],
            )`,
  ],
  [
    `Alert.alert('Oda', 'Odadan çıkarıldınız.');`,
    `Alert.alert(t('sesOda.oda'), t('sesOda.odadanCikarildiniz'));`,
  ],
  [
    `Alert.alert(
        'Odadan çık',
        'Oda açık kalır. Kalıcı kapatmak için oda numarasına dokun.',
        [
          { text: 'Kal', style: 'cancel' },
          {
            text: 'Çık',
            style: 'destructive',
            onPress: () => void odadanAyril(false),
          },
        ],
      );`,
    `Alert.alert(
        t('sesOda.odadanCik'),
        t('sesOda.hostCikisSoru'),
        [
          { text: t('sesOda.kal'), style: 'cancel' },
          {
            text: t('sesOda.cik'),
            style: 'destructive',
            onPress: () => void odadanAyril(false),
          },
        ],
      );`,
  ],
  [
    `Alert.alert('Odadan çık', 'Sesli odadan ayrılmak istiyor musun?', [
      { text: 'Kal', style: 'cancel' },
      {
        text: 'Çık',
        style: 'destructive',
        onPress: () => void odadanAyril(false),
      },
    ]);`,
    `Alert.alert(t('sesOda.odadanCik'), t('sesOda.ayrilSoruKisa'), [
      { text: t('sesOda.kal'), style: 'cancel' },
      {
        text: t('sesOda.cik'),
        style: 'destructive',
        onPress: () => void odadanAyril(false),
      },
    ]);`,
  ],
  [
    `Alert.alert(
      'Odayı kapat',
      'Bu ses odası kalıcı olarak kapanacak ve feed’den kalkacak. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, kapat',
          style: 'destructive',
          onPress: () => void odadanAyril(true),
        },
      ],
    );`,
    `Alert.alert(
      t('sesOda.odayiKapat'),
      t('sesOda.odayiKapatSoru'),
      [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('sesOda.evetKapat'),
          style: 'destructive',
          onPress: () => void odadanAyril(true),
        },
      ],
    );`,
  ],
  [
    `Alert.alert(
            'Mikrofon',
            'Mikrofonunuz oda yöneticisi tarafından kilitlendi.',
          );`,
    `Alert.alert(
            t('sesOda.mikrofon'),
            t('sesOda.mikrofonKilitli'),
          );`,
  ],
  [
    `Alert.alert(
            'Mikrofon',
            'Mikrofonunuz yönetici tarafından kapatıldı.',
          );`,
    `Alert.alert(
            t('sesOda.mikrofon'),
            t('sesOda.mikrofonYoneticiKapatti'),
          );`,
  ],
  [
    `Alert.alert('Mikrofon', r.hata ?? 'İstek gönderilemedi');`,
    `Alert.alert(t('sesOda.mikrofon'), r.hata ?? t('sesOda.istekGonderilemedi'));`,
  ],
  [
    `Alert.alert(
          'Mikrofon',
          'İstek gönderildi. Host kabul edince koltuğa oturursun.',
        );`,
    `Alert.alert(
          t('sesOda.mikrofon'),
          t('sesOda.istekGonderildiKoltuk'),
        );`,
  ],
  [
    `Alert.alert('Mikrofon', medya.hata ?? 'Konuşmacı bağlantısı kurulamadı');`,
    `Alert.alert(t('sesOda.mikrofon'), medya.hata ?? t('sesOda.konusmaciBaglantiHatasi'));`,
  ],
  [
    `const moderasyonMesaji = (action: ModerasyonAksiyonu): string => {
    switch (action) {
      case 'mute':
        return 'Mikrofon kapatıldı.';
      case 'unmute':
        return 'Mikrofon izni güncellendi.';
      case 'mic_lock':
        return 'Mikrofon kilitlendi.';
      case 'mic_unlock':
        return 'Mikrofon kilidi kaldırıldı.';
      case 'unseat':
        return 'Kullanıcı dinleyiciye alındı.';
      case 'kick':
        return 'Kullanıcı odadan çıkarıldı.';
      case 'ban':
        return 'Kullanıcı yasaklandı.';
      case 'unban':
        return 'Yasak kaldırıldı.';
      default:
        return 'İşlem tamamlandı.';
    }
  };`,
    `const moderasyonMesaji = (action: ModerasyonAksiyonu): string => {
    switch (action) {
      case 'mute':
        return t('sesOda.modMute');
      case 'unmute':
        return t('sesOda.modUnmute');
      case 'mic_lock':
        return t('sesOda.modMicLock');
      case 'mic_unlock':
        return t('sesOda.modMicUnlock');
      case 'unseat':
        return t('sesOda.modUnseat');
      case 'kick':
        return t('sesOda.modKick');
      case 'ban':
        return t('sesOda.modBan');
      case 'unban':
        return t('sesOda.modUnban');
      default:
        return t('sesOda.islemTamamlandi');
    }
  };`,
  ],
  [
    `Alert.alert('Demo', 'Gerçek odada moderasyon çalışır.');`,
    `Alert.alert(t('sesOda.demo'), t('sesOda.demoModerasyon'));`,
  ],
  [
    `Alert.alert('Moderasyon', 'İşlem tamamlanamadı. Tekrar deneyin.');`,
    `Alert.alert(t('sesOda.moderasyon'), t('sesOda.islemBasarisiz'));`,
  ],
  [
    `Alert.alert('Tamam', moderasyonMesaji(action));`,
    `Alert.alert(t('ortak.tamam'), moderasyonMesaji(action));`,
  ],
  [
    `Alert.alert(onay.baslik, onay.metin, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Onayla', style: 'destructive', onPress: calistir },
      ]);`,
    `Alert.alert(onay.baslik, onay.metin, [
        { text: t('ortak.vazgec'), style: 'cancel' },
        { text: t('ortak.onayla'), style: 'destructive', onPress: calistir },
      ]);`,
  ],
  [
    `Alert.alert('Koltuktan kalk', 'Konuşmacı koltuğundan ayrılıp dinleyici olmak ister misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ayrıl',
        onPress: () => {
          void (async () => {
            const r = await KoltuktanAyril(room.id);
            if (!r.ok) {
              if (__DEV__) console.warn('[koltuktan_ayril]', r.hata);
              Alert.alert('Koltuk', 'İşlem tamamlanamadı. Tekrar deneyin.');
              return;
            }`,
    `Alert.alert(t('sesOda.koltuktanKalk'), t('sesOda.koltuktanKalkSoru'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('sesOda.ayril'),
        onPress: () => {
          void (async () => {
            const r = await KoltuktanAyril(room.id);
            if (!r.ok) {
              if (__DEV__) console.warn('[koltuktan_ayril]', r.hata);
              Alert.alert(t('sesOda.koltuk'), t('sesOda.islemBasarisiz'));
              return;
            }`,
  ],
  [
    `Alert.alert('Demo', 'Liderlik devri gerçek odada çalışır.');`,
    `Alert.alert(t('sesOda.demo'), t('sesOda.demoLiderlik'));`,
  ],
  [
    `        'bu kullanıcıya';
      Alert.alert(
        'Liderliği devret',
        \`\${ad} oda sahibi olacak. Tahta oturacak. Emin misin?\`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Devret',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                const r = await LiderligiDevret({
                  roomId: room.id,
                  yeniHostId,
                });
                if (!r.ok) {
                  Alert.alert('Liderlik', r.hata ?? 'Devredilemedi');
                  return;
                }`,
    `        t('sesOda.buKullaniciya');
      Alert.alert(
        t('sesOda.liderligiDevret'),
        t('sesOda.liderligiDevretSoru', { ad }),
        [
          { text: t('ortak.iptal'), style: 'cancel' },
          {
            text: t('sesOda.devret'),
            style: 'destructive',
            onPress: () => {
              void (async () => {
                const r = await LiderligiDevret({
                  roomId: room.id,
                  yeniHostId,
                });
                if (!r.ok) {
                  Alert.alert(t('sesOda.liderlik'), r.hata ?? t('sesOda.devredilemedi'));
                  return;
                }`,
  ],
  [
    `const baslik = suanCohost
        ? 'Yönetici yetkisini kaldır'
        : 'Yönetici yap';
      const metin = suanCohost
        ? 'Bu kullanıcının oda yöneticisi yetkisi kaldırılsın mı?'
        : 'Bu kullanıcıyı oda yöneticisi yapmak istiyor musunuz?';
      Alert.alert(baslik, metin, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',`,
    `const baslik = suanCohost
        ? t('sesOda.yoneticiYetkisiniKaldir')
        : t('sesOda.yoneticiYap');
      const metin = suanCohost
        ? t('sesOda.yoneticiKaldirSoru')
        : t('sesOda.yoneticiYapSoru');
      Alert.alert(baslik, metin, [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('ortak.onayla'),`,
  ],
  [
    `Alert.alert('Yönetici', 'İşlem tamamlanamadı. Tekrar deneyin.');
                return;
              }
              Alert.alert(
                'Tamam',
                suanCohost
                  ? 'Yönetici yetkisi kaldırıldı.'
                  : 'Yönetici yetkisi verildi.',
              );`,
    `Alert.alert(t('sesOda.yonetici'), t('sesOda.islemBasarisiz'));
                return;
              }
              Alert.alert(
                t('ortak.tamam'),
                suanCohost
                  ? t('sesOda.yoneticiKaldirildi')
                  : t('sesOda.yoneticiVerildi'),
              );`,
  ],
  [
    `Alert.alert('Taht', 'Taht yalnızca oda sahibine aittir.');`,
    `Alert.alert(t('sesOda.taht'), t('sesOda.tahtSadeceSahip'));`,
  ],
  [
    `Alert.alert('Koltuk', 'Bu koltuk kilitli.');`,
    `Alert.alert(t('sesOda.koltuk'), t('sesOda.koltukKilitli'));`,
  ],
  [
    `Alert.alert(
            'Koltuk talebi',
            \`Koltuk \${seat.seat_index + 1} için istek gönderilsin mi?\`,
            [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'İstek gönder',
                onPress: () => {
                  void (async () => {
                    const r = await MikrofonIstegiGonder(
                      room.id,
                      seat.seat_index,
                    );
                    if (!r.ok) {
                      Alert.alert('Koltuk', r.hata ?? 'İstek gönderilemedi');
                      return;
                    }
                    Alert.alert(
                      'Koltuk',
                      'İstek gönderildi. Host kabul edince bu koltuğa oturacaksın.',
                    );
                  })();
                },
              },
            ],
          );`,
    `Alert.alert(
            t('sesOda.koltukTalebi'),
            t('sesOda.koltukTalebiSoru', { n: seat.seat_index + 1 }),
            [
              { text: t('ortak.vazgec'), style: 'cancel' },
              {
                text: t('sesOda.istekGonder'),
                onPress: () => {
                  void (async () => {
                    const r = await MikrofonIstegiGonder(
                      room.id,
                      seat.seat_index,
                    );
                    if (!r.ok) {
                      Alert.alert(t('sesOda.koltuk'), r.hata ?? t('sesOda.istekGonderilemedi'));
                      return;
                    }
                    Alert.alert(
                      t('sesOda.koltuk'),
                      t('sesOda.istekGonderildiBuKoltuk'),
                    );
                  })();
                },
              },
            ],
          );`,
  ],
  [
    `moderasyonUygula(seat.user_id!, 'kick', {
              baslik: 'Odadan çıkar',
              metin: \`\${name} odadan çıkarılsın mı?\`,
            });`,
    `moderasyonUygula(seat.user_id!, 'kick', {
              baslik: t('sesOda.odadanCikar'),
              metin: t('sesOda.odadanCikarSoru', { ad: name }),
            });`,
  ],
  [
    `moderasyonUygula(seat.user_id!, 'ban', {
              baslik: 'Yasakla',
              metin: \`\${name} bu odadan yasaklansın mı?\`,
            });`,
    `moderasyonUygula(seat.user_id!, 'ban', {
              baslik: t('sesOda.yasakla'),
              metin: t('sesOda.yasaklaSoru', { ad: name }),
            });`,
  ],
  [
    `const etiket = (a: KatilimciMenuAksiyonu): string => {
        switch (a) {
          case 'profil':
            return 'Profilini Gör';
          case 'koltuktan_ayril':
            return 'Koltuktan Kalk';
          case 'mute':
            return 'Mikrofonu Kapat';
          case 'mic_lock':
            return 'Mikrofonu Kilitle';
          case 'mic_unlock':
            return 'Mikrofon Kilidini Aç';
          case 'unseat':
            return 'Koltuktan İndir';
          case 'admin_ata':
            return 'Yönetici Yap';
          case 'admin_kaldir':
            return 'Yönetici Yetkisini Kaldır';
          case 'lider_devret':
            return 'Liderliği Devret';
          case 'kick':
            return 'Odadan Çıkar';
          case 'ban':
            return 'Engelle / Yasakla';
          default:
            return a;
        }
      };`,
    `const etiket = (a: KatilimciMenuAksiyonu): string => {
        switch (a) {
          case 'profil':
            return t('sesOda.menuProfiliniGor');
          case 'koltuktan_ayril':
            return t('sesOda.menuKoltuktanKalk');
          case 'mute':
            return t('sesOda.menuMikrofonuKapat');
          case 'mic_lock':
            return t('sesOda.menuMikrofonuKilitle');
          case 'mic_unlock':
            return t('sesOda.menuMikrofonKilidiniAc');
          case 'unseat':
            return t('sesOda.menuKoltuktanIndir');
          case 'admin_ata':
            return t('sesOda.menuYoneticiYap');
          case 'admin_kaldir':
            return t('sesOda.menuYoneticiYetkisiniKaldir');
          case 'lider_devret':
            return t('sesOda.menuLiderligiDevret');
          case 'kick':
            return t('sesOda.menuOdadanCikar');
          case 'ban':
            return t('sesOda.menuEngelleYasakla');
          default:
            return a;
        }
      };`,
  ],
  [
    `Alert.alert('Oda', 'Bu oda artık canlı değil');`,
    `Alert.alert(t('sesOda.oda'), t('sesOda.odaArtikCanliDegil'));`,
  ],
  [
    `Alert.alert(
            'Ses bağlantısı',
            medya.hata ??
              'Mikrofon yayınlanamadı. İzinleri kontrol edip odadan çıkıp tekrar dene.',
          );`,
    `Alert.alert(
            t('sesOda.sesBaglantisi'),
            medya.hata ?? t('sesOda.sesBaglantisiHata'),
          );`,
  ],
  [
    `Alert.alert('Oda yüklenemedi', e instanceof Error ? e.message : 'Hata');`,
    `Alert.alert(t('sesOda.odaYuklenemedi'), e instanceof Error ? e.message : t('ortak.hata'));`,
  ],
  [
    `Alert.alert('Hediye', 'Katalog yükleniyor — biraz sonra dene.');`,
    `Alert.alert(t('sesOda.hediye'), t('sesOda.katalogYukleniyor'));`,
  ],
  [
    `Alert.alert('Yetersiz coin', 'Hediye kartında Coin yükle’ye bas.');`,
    `Alert.alert(t('sesOda.yetersizCoin'), t('sesOda.hediyeCoinYukle'));`,
  ],
  [
    `Alert.alert('Hediye', sonuc.hata ?? 'Gönderilemedi');`,
    `Alert.alert(t('sesOda.hediye'), sonuc.hata ?? t('sesOda.gonderilemedi'));`,
  ],
  [
    `Alert.alert(
              'Şehrine güç',
              \`\${ozet.city_name}: +\${ozet.last_delta} güç\\nBugün toplam \${ozet.today_power} güç kattın.\`,
            );`,
    `Alert.alert(
              t('sesOda.sehireGuc'),
              t('sesOda.sehireGucBody', {
                sehir: ozet.city_name,
                delta: ozet.last_delta,
                toplam: ozet.today_power,
              }),
            );`,
  ],
  [
    `title: 'Demo canlı oda',
        topic: 'Ses + hediye önizleme',`,
    `title: t('sesOda.demoCanliOda'),
        topic: t('sesOda.demoTopic'),`,
  ],
  [
    `setLkDurum('Hazır');`,
    `setLkDurum(t('sesOda.hazir'));`,
  ],
  [
    `title: muzikSession?.track?.title ?? 'Müzik',`,
    `title: muzikSession?.track?.title ?? t('sesOda.muzik'),`,
  ],
  [
    `        'Sen',`,
    `        t('gorusme.sen'),`,
  ],
  [
    `          'Oda sahibi';`,
    `          t('sesOda.odaSahibi');`,
  ],
  [
    `baslik: 'Oda sahibi',`,
    `baslik: t('sesOda.odaSahibi'),`,
  ],
  [
    `baslik: 'Profil',`,
    `baslik: t('ortak.profil'),`,
  ],
  [
    `senderName: profile?.display_name ?? profile?.username ?? 'Sen',`,
    `senderName: profile?.display_name ?? profile?.username ?? t('gorusme.sen'),`,
  ],
  [
    `Oda bulunamadı`,
    `{t('sesOda.odaBulunamadi')}`,
  ],
  [
    `accessibilityLabel="Klavyeyi kapat"`,
    `accessibilityLabel={t('ortak.klavyeyiKapat')}`,
  ],
  [
    `accessibilityLabel={\`Oda numarası \${room.room_code}\`}`,
    `accessibilityLabel={t('sesOda.odaNumarasiA11y', { kod: room.room_code })}`,
  ],
  [
    `accessibilityLabel="Canlı dinleyici"`,
    `accessibilityLabel={t('sesOda.canliDinleyici')}`,
  ],
  [
    `accessibilityLabel="Oda kartını ve koltuk sayısını düzenle"`,
    `accessibilityLabel={t('sesOda.odaKartiDuzenle')}`,
  ],
  [
    `accessibilityLabel="Odadan çık"`,
    `accessibilityLabel={t('sesOda.odadanCik')}`,
  ],
  [
    `accessibilityLabel="Yorumları göster"`,
    `accessibilityLabel={t('sesOda.yorumlariGoster')}`,
  ],
  [
    `<Text style={styles.yorumAcYazi}>Yorumlar</Text>`,
    `<Text style={styles.yorumAcYazi}>{t('sesOda.yorumlar')}</Text>`,
  ],
  [
    `accessibilityLabel={muted ? 'Mikrofonu aç' : 'Mikrofonu kapat'}`,
    `accessibilityLabel={muted ? t('sesOda.mikrofonuAc') : t('sesOda.mikrofonuKapat')}`,
  ],
  [
    `accessibilityLabel="Hediye gönder"`,
    `accessibilityLabel={t('sesOda.hediyeGonder')}`,
  ],
  [
    `                  'Oda sahibi'
                }
                username={
                  odaSahibi?.username ?? (isHost ? profile?.username : null)
                }
                avatarUrl={
                  odaSahibi?.avatar_url ?? (isHost ? profile?.avatar_url : null)
                }
                level={odaSahibi?.level ?? (isHost ? profile?.level : null)}
                altEtiket="Oda sahibi"`,
    `                  t('sesOda.odaSahibi')
                }
                username={
                  odaSahibi?.username ?? (isHost ? profile?.username : null)
                }
                avatarUrl={
                  odaSahibi?.avatar_url ?? (isHost ? profile?.avatar_url : null)
                }
                level={odaSahibi?.level ?? (isHost ? profile?.level : null)}
                altEtiket={t('sesOda.odaSahibi')}`,
  ],
  [
    `setLkDurum(medya.mock ? \`Demo · dinleyici\` : \`Bağlı · dinleyici\`);`,
    `setLkDurum(medya.mock ? t('sesOda.demoDinleyici') : t('sesOda.bagliDinleyici'));`,
  ],
  [
    `setLkDurum(medya.mock ? \`Demo · konuşmacı\` : \`Bağlı · konuşmacı\`);`,
    `setLkDurum(medya.mock ? t('sesOda.demoKonusmaci') : t('sesOda.bagliKonusmaci'));`,
  ],
  [
    `setLkDurum('Ses bağlanıyor…');`,
    `setLkDurum(t('sesOda.sesBaglaniyor'));`,
  ],
  [
    `Alert.alert('Oda', r.hata);`,
    `Alert.alert(t('sesOda.oda'), r.hata);`,
  ],
];

let ok = 0;
let miss = 0;
for (const [a, b] of reps) {
  if (src.includes(a)) {
    src = src.replace(a, b);
    ok++;
  } else {
    miss++;
    console.warn('MISS:', a.slice(0, 80).replace(/\n/g, ' '));
  }
}

fs.writeFileSync(path, src, 'utf8');
console.log(JSON.stringify({ ok, miss }));
