/**
 * Ortak oyun algoritma paneli — Zeus ilk; ileride diğer oyunlar aynı ekrandan.
 * Her ayarın ne yaptığı Türkçe açıklanır. Kullanıcı bazlı gizli manipülasyon yok.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  gameAdminMathActivate,
  gameAdminMathList,
  gameAdminObservedRtp,
  gameAdminScheduleCancel,
  gameAdminScheduleCreate,
  gameAdminScheduleList,
  gameAdminSettingsGet,
  gameAdminSettingsUpdate,
  type GameCodeAlg,
  type GameMathRow,
  type GameScheduleRow,
  type GameSettingsBundle,
  type ObservedRtp,
} from '../../../src/moduller/oyunlar/ortak/servisler/OyunAlgoritmaAdminApi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const OYUNLAR: Array<{ kod: GameCodeAlg; ad: string; hazir: boolean }> = [
  { kod: 'zeus', ad: 'ZEUS', hazir: true },
  { kod: 'fair_spin', ad: 'Fair Spin', hazir: true },
  { kod: 'astral_falls', ad: 'Astral Falls', hazir: true },
  { kod: 'kozmik_kaskad', ad: 'Kaskad', hazir: false },
  { kod: 'nox_reels', ad: 'NOX', hazir: false },
];

const TAKVIM_SAAT = [
  { saat: 1, etiket: '1 saat' },
  { saat: 3, etiket: '3 saat' },
  { saat: 6, etiket: '6 saat' },
  { saat: 12, etiket: '12 saat' },
  { saat: 24, etiket: '24 saat' },
];

function Help({ text }: { text: string }) {
  return <Text style={styles.help}>{text}</Text>;
}

function Kart({
  baslik,
  children,
}: {
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.kart}>
      <Text style={styles.kartBaslik}>{baslik}</Text>
      {children}
    </View>
  );
}

export default function OyunAlgoritmaAdmin() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ oyun?: string }>();
  const yetkili = AdminYetkisiVarMi(profile);

  const initialKod = (OYUNLAR.find((o) => o.kod === params.oyun)?.kod ??
    'zeus') as GameCodeAlg;
  const [oyun, setOyun] = useState<GameCodeAlg>(initialKod);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [mathlar, setMathlar] = useState<GameMathRow[]>([]);
  const [settings, setSettings] = useState<GameSettingsBundle | null>(null);
  const [takvim, setTakvim] = useState<GameScheduleRow[]>([]);
  const [observed, setObserved] = useState<ObservedRtp | null>(null);
  const [seciliProfil, setSeciliProfil] = useState('olympus-balanced-v1');
  const [takvimSaat, setTakvimSaat] = useState(3);
  const [takvimSebep, setTakvimSebep] = useState('');
  const [minBet, setMinBet] = useState('20');
  const [maxBet, setMaxBet] = useState('200');
  const [presetsText, setPresetsText] = useState('20,50,100,150,200');

  const hazir = OYUNLAR.find((o) => o.kod === oyun)?.hazir === true;
  const help = settings?.fieldHelp ?? {};

  const yenile = useCallback(async () => {
    if (!hazir) {
      setYukleniyor(false);
      setMathlar([]);
      setSettings(null);
      setTakvim([]);
      setObserved(null);
      return;
    }
    setYukleniyor(true);
    try {
      const [m, s, sch, obs] = await Promise.all([
        gameAdminMathList(oyun),
        gameAdminSettingsGet(oyun),
        gameAdminScheduleList(oyun),
        gameAdminObservedRtp(oyun, 24),
      ]);
      setMathlar(Array.isArray(m) ? m : []);
      setSettings(s);
      setTakvim(Array.isArray(sch) ? sch : []);
      setObserved(obs);
      const aktif =
        s?.activeMath?.mathVersion ??
        m?.find((x) => x.isActive)?.mathVersion ??
        'olympus-balanced-v1';
      setSeciliProfil(aktif);
      setMinBet(String(s?.minBet ?? 20));
      setMaxBet(String(s?.maxBet ?? 200));
      const presets = s?.betPresets;
      setPresetsText(
        Array.isArray(presets) ? presets.join(',') : '20,50,100,150,200',
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, [hazir, oyun]);

  useFocusEffect(
    useCallback(() => {
      void yenile();
    }, [yenile]),
  );

  const aktifOzet = useMemo(() => {
    const src = settings?.activeMath?.source ?? '—';
    const ver = settings?.activeMath?.mathVersion ?? '—';
    const ad = settings?.activeMath?.displayName ?? '';
    return `${ad || ver} (${src === 'schedule' ? 'takvim' : 'aktif profil'})`;
  }, [settings]);

  if (!yetkili) {
    return (
      <Screen>
        <EkranBasligi title="Oyun algoritması" onBack={() => router.back()} />
        <Text style={styles.uyari}>Admin yetkisi gerekli.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <EkranBasligi
        title="Oyun algoritması"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.icerik}>
        <Text style={styles.ustNot}>
          Zamanlı RTP: Kazandırıcı / Dengeli / Kaybettirici. Tüm oyunculara aynı
          profil uygulanır; kullanıcı bazlı gizli sonuç yok.
        </Text>

        <View style={styles.oyunSatir}>
          {OYUNLAR.map((o) => (
            <Pressable
              key={o.kod}
              onPress={() => setOyun(o.kod)}
              style={[
                styles.oyunChip,
                oyun === o.kod && styles.oyunChipAktif,
                !o.hazir && styles.oyunChipPasif,
              ]}
            >
              <Text
                style={[
                  styles.oyunChipYazi,
                  oyun === o.kod && styles.oyunChipYaziAktif,
                ]}
              >
                {o.ad}
                {!o.hazir ? ' (yakında)' : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {!hazir ? (
          <Kart baslik="Henüz bağlı değil">
            <Text style={styles.help}>
              Bu oyun ortak tabloya sonraki sprintte bağlanacak. Şimdilik ZEUS
              üzerinden takip edin.
            </Text>
          </Kart>
        ) : yukleniyor ? (
          <ActivityIndicator color={RenkTokenlari.accent} style={{ marginTop: 24 }} />
        ) : (
          <>
            <Kart baslik="Canlı durum">
              <Text style={styles.deger}>Aktif: {aktifOzet}</Text>
              <Help text={help.mathVersion ?? 'Takvim penceresi varsa takvim kazanır.'} />
              <Text style={[styles.deger, { marginTop: 10 }]}>
                Son 24s gözlenen RTP:{' '}
                {observed?.observedRtp != null
                  ? `%${(observed.observedRtp * 100).toFixed(2)}`
                  : '—'}{' '}
                ({observed?.rounds ?? 0} round / {observed?.wager ?? 0} bahis)
              </Text>
              <Help text="Gözlenen RTP = toplam kazanç / toplam bahis (admin test hariç)." />
            </Kart>

            <Kart baslik="Acil kontroller">
              <Help text={help.gamePaused ?? ''} />
              <Pressable
                style={[
                  styles.aksiyon,
                  settings?.gamePaused && styles.aksiyonTehlike,
                ]}
                disabled={kaydediyor}
                onPress={() => {
                  setKaydediyor(true);
                  void gameAdminSettingsUpdate(oyun, {
                    gamePaused: !settings?.gamePaused,
                  })
                    .then(setSettings)
                    .catch((e) =>
                      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt'),
                    )
                    .finally(() => setKaydediyor(false));
                }}
              >
                <Text style={styles.aksiyonYazi}>
                  {settings?.gamePaused ? 'Duraklatmayı kaldır' : 'Oyunu duraklat'}
                </Text>
              </Pressable>
              <Help text={help.maintenanceMode ?? ''} />
              <Pressable
                style={[
                  styles.aksiyon,
                  settings?.maintenanceMode && styles.aksiyonTehlike,
                ]}
                disabled={kaydediyor}
                onPress={() => {
                  setKaydediyor(true);
                  void gameAdminSettingsUpdate(oyun, {
                    maintenanceMode: !settings?.maintenanceMode,
                    maintenanceMessage: settings?.maintenanceMode
                      ? ''
                      : 'Zeus kısa süreli bakımda',
                  })
                    .then(setSettings)
                    .catch((e) =>
                      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt'),
                    )
                    .finally(() => setKaydediyor(false));
                }}
              >
                <Text style={styles.aksiyonYazi}>
                  {settings?.maintenanceMode
                    ? 'Bakımı kapat'
                    : 'Bakım modunu aç'}
                </Text>
              </Pressable>
            </Kart>

            <Kart baslik="Bahis limitleri (max 200)">
              <Help text={help.maxBet ?? 'Zeus sert tavan: 200 coin.'} />
              <Text style={styles.label}>Min bahis</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={minBet}
                onChangeText={setMinBet}
              />
              <Help text={help.minBet ?? ''} />
              <Text style={styles.label}>Max bahis</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={maxBet}
                onChangeText={setMaxBet}
              />
              <Text style={styles.label}>Presetler (virgülle)</Text>
              <TextInput
                style={styles.input}
                value={presetsText}
                onChangeText={setPresetsText}
                autoCapitalize="none"
              />
              <Help text={help.betPresets ?? ''} />
              <Pressable
                style={styles.aksiyon}
                disabled={kaydediyor}
                onPress={() => {
                  const presets = presetsText
                    .split(/[,\s]+/)
                    .map((x) => Math.floor(Number(x)))
                    .filter((n) => Number.isFinite(n) && n > 0 && n <= 200);
                  setKaydediyor(true);
                  void gameAdminSettingsUpdate(oyun, {
                    minBet: Math.floor(Number(minBet)) || 20,
                    maxBet: Math.min(200, Math.floor(Number(maxBet)) || 200),
                    betPresets: presets.length
                      ? presets
                      : [20, 50, 100, 150, 200],
                  })
                    .then((s) => {
                      setSettings(s);
                      Alert.alert('Kaydedildi', 'Bahis limitleri güncellendi.');
                    })
                    .catch((e) =>
                      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt'),
                    )
                    .finally(() => setKaydediyor(false));
                }}
              >
                <Text style={styles.aksiyonYazi}>Bahisleri kaydet</Text>
              </Pressable>
            </Kart>

            <Kart baslik="Matematik profilleri">
              <Help text="Aktif profil, takvim yokken kullanılır. Her satır oyundaki ağırlıkları değiştirir." />
              {mathlar.map((m) => (
                <View key={m.mathVersion} style={styles.profilSatir}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profilAd}>
                      {m.displayName || m.mathVersion}
                      {m.isActive ? ' · AKTİF' : ''}
                    </Text>
                    <Text style={styles.help}>{m.description}</Text>
                    <Text style={styles.meta}>
                      Teorik RTP:{' '}
                      {m.simulatedRtp != null
                        ? `%${(Number(m.simulatedRtp) * 100).toFixed(1)}`
                        : '—'}
                    </Text>
                  </View>
                  {!m.isActive ? (
                    <Pressable
                      style={styles.kucukAksiyon}
                      onPress={() => {
                        Alert.alert(
                          'Profili aktif et?',
                          `${m.displayName} tüm yeni spinlere uygulanır (takvim yoksa).`,
                          [
                            { text: 'Vazgeç', style: 'cancel' },
                            {
                              text: 'Aktif et',
                              onPress: () => {
                                setKaydediyor(true);
                                void gameAdminMathActivate(
                                  oyun,
                                  m.mathVersion,
                                  'admin_panel',
                                )
                                  .then((list) => {
                                    setMathlar(list);
                                    void yenile();
                                  })
                                  .catch((e) =>
                                    Alert.alert(
                                      'Hata',
                                      e instanceof Error ? e.message : 'Kayıt',
                                    ),
                                  )
                                  .finally(() => setKaydediyor(false));
                              },
                            },
                          ],
                        );
                      }}
                    >
                      <Text style={styles.kucukAksiyonYazi}>Aktif et</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </Kart>

            <Kart baslik="RTP takvimi">
              <Help text={help.schedule ?? ''} />
              <Text style={styles.label}>Profil</Text>
              <View style={styles.oyunSatir}>
                {mathlar.map((m) => (
                  <Pressable
                    key={m.mathVersion}
                    onPress={() => setSeciliProfil(m.mathVersion)}
                    style={[
                      styles.oyunChip,
                      seciliProfil === m.mathVersion && styles.oyunChipAktif,
                    ]}
                  >
                    <Text
                      style={[
                        styles.oyunChipYazi,
                        seciliProfil === m.mathVersion &&
                          styles.oyunChipYaziAktif,
                      ]}
                    >
                      {m.displayName}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Süre</Text>
              <View style={styles.oyunSatir}>
                {TAKVIM_SAAT.map((t) => (
                  <Pressable
                    key={t.saat}
                    onPress={() => setTakvimSaat(t.saat)}
                    style={[
                      styles.oyunChip,
                      takvimSaat === t.saat && styles.oyunChipAktif,
                    ]}
                  >
                    <Text
                      style={[
                        styles.oyunChipYazi,
                        takvimSaat === t.saat && styles.oyunChipYaziAktif,
                      ]}
                    >
                      {t.etiket}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Sebep (zorunlu değil)</Text>
              <TextInput
                style={styles.input}
                value={takvimSebep}
                onChangeText={setTakvimSebep}
                placeholder="örn. akşam etkinliği"
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
              <Pressable
                style={styles.aksiyon}
                disabled={kaydediyor}
                onPress={() => {
                  const start = new Date();
                  const end = new Date(start.getTime() + takvimSaat * 3600_000);
                  setKaydediyor(true);
                  void gameAdminScheduleCreate(
                    oyun,
                    seciliProfil,
                    start.toISOString(),
                    end.toISOString(),
                    takvimSebep || 'admin_takvim',
                  )
                    .then((list) => {
                      setTakvim(list);
                      void yenile();
                      Alert.alert(
                        'Takvim eklendi',
                        `${takvimSaat} saat boyunca seçili profil geçerli.`,
                      );
                    })
                    .catch((e) =>
                      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt'),
                    )
                    .finally(() => setKaydediyor(false));
                }}
              >
                <Text style={styles.aksiyonYazi}>Takvim penceresi oluştur</Text>
              </Pressable>

              {takvim.map((row) => (
                <View key={row.id} style={styles.profilSatir}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profilAd}>
                      {row.displayName || row.mathVersion}
                      {row.isLive ? ' · CANLI' : ''}
                    </Text>
                    <Text style={styles.meta}>
                      {new Date(row.startsAt).toLocaleString()} →{' '}
                      {new Date(row.endsAt).toLocaleString()}
                    </Text>
                    <Text style={styles.help}>
                      {row.reason} · {row.status}
                    </Text>
                  </View>
                  {row.status === 'active' ? (
                    <Pressable
                      style={styles.kucukAksiyon}
                      onPress={() => {
                        setKaydediyor(true);
                        void gameAdminScheduleCancel(row.id, 'admin_iptal')
                          .then((list) => {
                            setTakvim(list);
                            void yenile();
                          })
                          .catch((e) =>
                            Alert.alert(
                              'Hata',
                              e instanceof Error ? e.message : 'İptal',
                            ),
                          )
                          .finally(() => setKaydediyor(false));
                      }}
                    >
                      <Text style={styles.kucukAksiyonYazi}>İptal</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </Kart>

            <Kart baslik="Parametre sözlüğü">
              <Text style={styles.help}>
                • symbolWeights — sembollerin çıkma ağırlığı. Yüksek sayı = daha
                sık o sembol. Değişince hit rate ve RTP kayar.
              </Text>
              <Text style={styles.help}>
                • multiplierSpawnChance — çarpan küresi ihtimali. Artınca büyük
                kazançlar sıklaşır.
              </Text>
              <Text style={styles.help}>
                • scatterSpawnChance — Zeus scatter ihtimali. Artınca free spin
                tetiklenmesi sıklaşır.
              </Text>
              <Text style={styles.help}>
                • paytable 8/10/12 — aynı sembolden o kadar kümülde bahis
                çarpanı. Yükseltmek RTP’yi artırır.
              </Text>
              <Text style={styles.help}>
                • maxBet / betPresets — oyuncunun seçebileceği coin. Zeus’ta 200
                üstü edge tarafından reddedilir.
              </Text>
            </Kart>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icerik: {
    padding: BoslukTokenlari.md,
    paddingBottom: 48,
    gap: 14,
  },
  ustNot: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },
  uyari: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
    padding: BoslukTokenlari.md,
  },
  oyunSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  oyunChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  oyunChipAktif: {
    backgroundColor: 'rgba(232,197,71,0.2)',
    borderColor: '#E8C547',
  },
  oyunChipPasif: {
    opacity: 0.55,
  },
  oyunChipYazi: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
  },
  oyunChipYaziAktif: {
    color: '#F6E27A',
  },
  kart: {
    backgroundColor: 'rgba(12,14,22,0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: BoslukTokenlari.md,
    gap: 8,
  },
  kartBaslik: {
    ...TipografiTokenlari.h2,
    color: '#FBF7EE',
    fontWeight: '800',
    marginBottom: 4,
  },
  help: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 17,
  },
  deger: {
    ...TipografiTokenlari.body,
    color: '#FBF7EE',
    fontWeight: '700',
  },
  label: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FBF7EE',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  aksiyon: {
    marginTop: 8,
    backgroundColor: RenkTokenlari.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  aksiyonTehlike: {
    backgroundColor: RenkTokenlari.danger,
  },
  aksiyonYazi: {
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  profilSatir: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  profilAd: {
    ...TipografiTokenlari.body,
    color: '#FBF7EE',
    fontWeight: '800',
  },
  meta: {
    ...TipografiTokenlari.caption,
    color: 'rgba(246,226,122,0.85)',
    marginTop: 2,
  },
  kucukAksiyon: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(232,197,71,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.45)',
  },
  kucukAksiyonYazi: {
    color: '#F6E27A',
    fontWeight: '800',
    fontSize: 12,
  },
});
