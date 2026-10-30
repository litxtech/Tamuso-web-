import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminAktifOyunOturumlari,
  AdminOyunGorunurlukAyarla,
  AdminOyunKapiDurumuGetir,
  AdminOyunKataloguGetir,
  AdminOyunKontrolGuncelle,
  AdminOyunPlatformAyarla,
  AdminOyunPlatformDurumu,
  AdminTumOyunKontrolleriniGetir,
  oyunKapisiUyumsuzMu,
  type AdminOyunKapiDurumu,
  type AdminOyunKatalogSatiri,
} from '../../../../src/moduller/admin/oyunlar/AdminOyunIslemleri';
import { KullaniciOyunuMu } from '../../../../src/moduller/oyunlar/ortak/servisler/OyunKontrolServisi';
import {
  feedOyunKartlari,
  oyunKartKimligi,
} from '../../../../src/moduller/oyunlar/ortak/katalog/OyunKartKatalogu';
import type {
  EconomyMode,
  GameCode,
  GameControlConfig,
} from '../../../../src/moduller/oyunlar/ortak/tipler/OyunTipleri';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

/** MAINTENANCE yok: kapatma yalnızca aç/kapa anahtarıyla, sunucu kapısıyla birlikte yapılır. */
const MODLAR: EconomyMode[] = ['NORMAL', 'PROMOTION', 'LOW_REWARD', 'NO_REWARD'];

const SIRALI_KODLAR: GameCode[] = ['fruit_wheel', 'storm_king', 'zeus', 'nox_reels', 'kozmik_kaskad'];

/** Kapanışın canlı istemcilere ulaşması için yeniden açmadan önce beklenir. */
const YENIDEN_AC_BEKLEME_MS = 3000;

const bekle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function oyunAcikMi(c: GameControlConfig) {
  return c.is_enabled && c.mode !== 'MAINTENANCE';
}

function oyunBaslik(
  code: string,
  katalog: AdminOyunKatalogSatiri[],
): string {
  const kart = oyunKartKimligi(code as GameCode);
  if (kart) return kart.baslik;
  return katalog.find((k) => k.game_code === code)?.name ?? code;
}

export default function AdminOyunlarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [configs, setConfigs] = useState<GameControlConfig[]>([]);
  const [katalog, setKatalog] = useState<AdminOyunKatalogSatiri[]>([]);
  const [kapilar, setKapilar] = useState<AdminOyunKapiDurumu[]>([]);
  const [platformAcik, setPlatformAcik] = useState(true);
  const [detayKod, setDetayKod] = useState<string | null>(null);
  const [aktif, setAktif] = useState<
    Awaited<ReturnType<typeof AdminAktifOyunOturumlari>>
  >([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busyKod, setBusyKod] = useState<string | null>(null);
  const [xpMul, setXpMul] = useState('1');
  const [trophyMul, setTrophyMul] = useState('1');
  const [rewardFactor, setRewardFactor] = useState('1');
  const [reason, setReason] = useState('');

  const siraliConfigs = useMemo(() => {
    const map = new Map(configs.map((c) => [c.game_code, c]));
    const ordered: GameControlConfig[] = [];
    for (const kod of SIRALI_KODLAR) {
      const c = map.get(kod);
      if (c) ordered.push(c);
    }
    for (const c of configs) {
      if (!SIRALI_KODLAR.includes(c.game_code as GameCode)) ordered.push(c);
    }
    return ordered;
  }, [configs]);

  const uygulamaOyunlari = siraliConfigs.filter((c) => KullaniciOyunuMu(c.game_code));
  const acikSayisi = uygulamaOyunlari.filter(oyunAcikMi).length;
  const detay = configs.find((c) => c.game_code === detayKod) ?? null;

  const kapilariYenile = useCallback(async () => {
    try {
      setKapilar(await AdminOyunKapiDurumuGetir());
    } catch {
      setKapilar([]);
    }
  }, []);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [cList, kat, a, plat] = await Promise.all([
        AdminTumOyunKontrolleriniGetir(),
        AdminOyunKataloguGetir(),
        AdminAktifOyunOturumlari(),
        AdminOyunPlatformDurumu(),
        kapilariYenile(),
      ]);
      setConfigs(cList);
      setKatalog(kat);
      setAktif(a);
      setPlatformAcik(plat.gamesEnabled && !plat.killGames);
    } catch (e) {
      Alert.alert('Oyunlar', e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, [kapilariYenile]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  const platformToggle = async (v: boolean) => {
    setBusyKod('__platform__');
    try {
      await AdminOyunPlatformAyarla(v);
      setPlatformAcik(v);
      Alert.alert(
        v ? 'Oyunlar açık' : 'Oyunlar kapalı',
        v
          ? 'Oda oyun butonu, açık olan oyunlar için görünür.'
          : 'Uygulamadaki tüm oyun butonları gizlendi.',
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setBusyKod(null);
    }
  };

  const configYaz = (next: GameControlConfig) =>
    setConfigs((prev) =>
      prev.map((c) => (c.game_code === next.game_code ? next : c)),
    );

  const oyunToggle = async (gameCode: string, acik: boolean) => {
    setBusyKod(gameCode);
    try {
      configYaz(await AdminOyunGorunurlukAyarla(gameCode, acik));
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      await kapilariYenile();
      setBusyKod(null);
    }
  };

  const yenidenAc = (gameCode: string) => {
    Alert.alert(
      'Kapat ve yeniden aç',
      `${oyunBaslik(gameCode, katalog)} herkes için kapatılır, açık oyun ekranları kapanır ve birkaç saniye sonra tekrar açılır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Yeniden aç',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              setBusyKod(gameCode);
              try {
                configYaz(
                  await AdminOyunGorunurlukAyarla(gameCode, false, 'admin: yeniden aç (kapat)'),
                );
                await bekle(YENIDEN_AC_BEKLEME_MS);
                configYaz(
                  await AdminOyunGorunurlukAyarla(gameCode, true, 'admin: yeniden aç (aç)'),
                );
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız');
              } finally {
                await kapilariYenile();
                setBusyKod(null);
              }
            })(),
        },
      ],
    );
  };

  const kaydet = async (
    gameCode: string,
    patch: Record<string, unknown>,
    sebep?: string,
  ) => {
    setBusyKod(gameCode);
    try {
      const next = await AdminOyunKontrolGuncelle({
        gameCode,
        patch,
        reason: sebep ?? (reason || 'admin panel'),
      });
      setConfigs((prev) =>
        prev.map((c) => (c.game_code === gameCode ? next : c)),
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt başarısız');
    } finally {
      setBusyKod(null);
    }
  };

  const detayAc = (code: string) => {
    const next = configs.find((c) => c.game_code === code);
    setDetayKod((prev) => (prev === code ? null : code));
    if (next) {
      setXpMul(String(next.xp_multiplier));
      setTrophyMul(String(next.trophy_multiplier));
      setRewardFactor(String(next.reward_factor));
    }
  };

  if (!admin) return null;

  const onizlemeKartlari = feedOyunKartlari(
    uygulamaOyunlari.filter(oyunAcikMi).map((c) => c.game_code as GameCode),
  );

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Oyun yönetimi"
        subtitle={
          platformAcik
            ? `${acikSayisi}/${uygulamaOyunlari.length} oyun uygulamada görünür`
            : 'Tüm oyun butonları kapalı'
        }
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        {yukleniyor && configs.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.accent} />
        ) : null}

        {/* Master */}
        <View style={[AdminStil.kart, styles.masterKart]}>
          <View style={AdminStil.satir}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={AdminStil.kartBaslik}>Oyun butonu (uygulama)</Text>
              <Text style={AdminStil.kartAlt}>
                Kapalıyken odadaki oyun ikonu hiç görünmez. Açıkken yalnızca
                aşağıda açık bıraktığın oyunlar listelenir.
              </Text>
            </View>
            <Switch
              value={platformAcik}
              onValueChange={(v) => void platformToggle(v)}
              disabled={busyKod === '__platform__'}
              trackColor={{
                false: RenkTokenlari.border,
                true: RenkTokenlari.mint,
              }}
            />
          </View>
          <View
            style={[
              styles.durumRozet,
              {
                backgroundColor: platformAcik
                  ? 'rgba(52,211,153,0.15)'
                  : 'rgba(248,113,113,0.15)',
              },
            ]}
          >
            <Text
              style={{
                color: platformAcik ? RenkTokenlari.mint : RenkTokenlari.danger,
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {platformAcik ? 'PLATFORM AÇIK' : 'PLATFORM KAPALI'}
            </Text>
          </View>
        </View>

        <Text style={AdminStil.sectionLabel}>Oyunlar — aç / kapa</Text>
        <Text style={[AdminStil.kartAlt, { marginBottom: 4 }]}>
          Kapatınca oyun herkes için anında gizlenir, açık oyun ekranları kapanır
          ve sunucu yeni bahis/spin kabul etmez. Sorunlu oyunda “Kapat ve yeniden
          aç” kullan.
        </Text>

        {siraliConfigs.map((c) => {
          const acik = oyunAcikMi(c);
          const kart = oyunKartKimligi(c.game_code as GameCode);
          const baslik = oyunBaslik(c.game_code, katalog);
          const busy = busyKod === c.game_code;
          const uygulamada = KullaniciOyunuMu(c.game_code);
          const kapi = kapilar.find((k) => k.game_code === c.game_code);
          const uyumsuz = kapi ? oyunKapisiUyumsuzMu(kapi) : false;
          return (
            <View
              key={c.game_code}
              style={[
                AdminStil.kart,
                !acik && styles.kartKapali,
                !platformAcik && styles.kartSoluk,
              ]}
            >
              <View style={styles.oyunUst}>
                {kart ? (
                  <Image source={kart.kapak} style={styles.kapak} />
                ) : (
                  <View style={[styles.kapak, styles.kapakBos]}>
                    <Ionicons
                      name="game-controller"
                      size={22}
                      color={RenkTokenlari.textMuted}
                    />
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={AdminStil.kartBaslik}>{baslik}</Text>
                  <Text style={AdminStil.kartAlt}>
                    {kart?.eyebrow ?? c.game_code}
                    {kart ? ` · ${kart.slogan}` : ''}
                  </Text>
                  <View style={AdminStil.satir}>
                    <View
                      style={[
                        AdminStil.chip,
                        {
                          backgroundColor: acik
                            ? 'rgba(52,211,153,0.18)'
                            : 'rgba(248,113,113,0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          AdminStil.chipYazi,
                          {
                            color: acik
                              ? RenkTokenlari.mint
                              : RenkTokenlari.danger,
                          },
                        ]}
                      >
                        {acik ? 'AÇIK' : 'KAPALI'}
                      </Text>
                    </View>
                    <Text style={AdminStil.kartAlt}>{c.mode}</Text>
                    {!uygulamada ? (
                      <Text style={AdminStil.kartAlt}>· uygulamada yok</Text>
                    ) : null}
                  </View>
                </View>
                <Switch
                  value={acik}
                  onValueChange={(v) => void oyunToggle(c.game_code, v)}
                  disabled={busy || !platformAcik}
                  trackColor={{
                    false: RenkTokenlari.border,
                    true: RenkTokenlari.mint,
                  }}
                />
              </View>

              {uyumsuz && kapi ? (
                <View style={styles.uyari}>
                  <Ionicons name="warning" size={16} color={RenkTokenlari.danger} />
                  <Text style={styles.uyariYazi}>
                    Senkron değil: liste {kapi.liste_acik ? 'açık' : 'kapalı'}
                    {kapi.bayrak_acik != null
                      ? `, ${kapi.bayrak} ${kapi.bayrak_acik ? 'açık' : 'kapalı'}`
                      : ''}
                    {kapi.politika_acik != null
                      ? `, politika ${kapi.politika_acik ? 'açık' : 'kapalı'}`
                      : ''}
                    . Anahtarı kapatıp açarak eşitle.
                  </Text>
                </View>
              ) : null}

              <View style={styles.aksiyonSatir}>
                {uygulamada && platformAcik ? (
                  <Pressable
                    onPress={() => yenidenAc(c.game_code)}
                    disabled={busy}
                    style={AdminStil.aksiyon}
                  >
                    <Text style={AdminStil.aksiyonYazi}>
                      {busy ? 'İşleniyor…' : 'Kapat ve yeniden aç'}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => detayAc(c.game_code)}
                  style={AdminStil.aksiyon}
                >
                  <Text style={AdminStil.aksiyonYazi}>
                    {detayKod === c.game_code ? 'Detayı gizle' : 'Ekonomi / detay'}
                  </Text>
                </Pressable>
                {c.game_code === 'kozmik_kaskad' ? (
                  <Pressable
                    onPress={() => router.push('/admin/kaskad-yonetim' as any)}
                    style={AdminStil.aksiyon}
                  >
                    <Text style={AdminStil.aksiyonYazi}>Kaskad RTP</Text>
                  </Pressable>
                ) : null}
                {c.game_code === 'zeus' ? (
                  <Pressable
                    onPress={() =>
                      router.push('/admin/oyun-algoritma?oyun=zeus' as any)
                    }
                    style={AdminStil.aksiyon}
                  >
                    <Text style={AdminStil.aksiyonYazi}>Algoritma</Text>
                  </Pressable>
                ) : null}
              </View>

              {detayKod === c.game_code && detay ? (
                <View style={styles.detayKutu}>
                  <View style={AdminStil.satir}>
                    <Text style={styles.label}>Coin ödül (havuz)</Text>
                    <Switch
                      value={detay.coin_rewards_enabled}
                      onValueChange={(v) =>
                        void kaydet(
                          detay.game_code,
                          { coin_rewards_enabled: v },
                          `coin_rewards=${v}`,
                        )
                      }
                      disabled={busy}
                    />
                  </View>

                  <Text style={styles.section}>Günlük mod</Text>
                  <View style={styles.chips}>
                    {MODLAR.map((m) => (
                      <Pressable
                        key={m}
                        style={[styles.chip, detay.mode === m && styles.chipOn]}
                        onPress={() =>
                          void kaydet(detay.game_code, { mode: m }, `mode=${m}`)
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            detay.mode === m && styles.chipTextOn,
                          ]}
                        >
                          {m}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.section}>Çarpanlar</Text>
                  <Text style={styles.label}>XP</Text>
                  <TextInput
                    style={AdminStil.input}
                    value={xpMul}
                    onChangeText={setXpMul}
                    keyboardType="decimal-pad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <Text style={styles.label}>Kupa</Text>
                  <TextInput
                    style={AdminStil.input}
                    value={trophyMul}
                    onChangeText={setTrophyMul}
                    keyboardType="decimal-pad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <Text style={styles.label}>Ödül oranı (0.1–1)</Text>
                  <TextInput
                    style={AdminStil.input}
                    value={rewardFactor}
                    onChangeText={setRewardFactor}
                    keyboardType="decimal-pad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <Text style={styles.label}>Gerekçe (audit)</Text>
                  <TextInput
                    style={AdminStil.input}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Örn: hafta sonu kampanyası"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <Pressable
                    style={styles.btn}
                    disabled={busy}
                    onPress={() =>
                      void kaydet(detay.game_code, {
                        xp_multiplier: Number(xpMul) || 1,
                        trophy_multiplier: Number(trophyMul) || 1,
                        reward_factor: Number(rewardFactor) || 1,
                      })
                    }
                  >
                    <Text style={styles.btnText}>
                      {busy ? 'Kaydediliyor…' : 'Çarpanları kaydet'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}

        {onizlemeKartlari.length > 0 && platformAcik ? (
          <>
            <Text style={AdminStil.sectionLabel}>Kullanıcı ne görür</Text>
            <Text style={AdminStil.kartAlt}>
              Odadaki oyun menüsünde şu kartlar çıkar:
            </Text>
            <View style={styles.onizlemeSatir}>
              {onizlemeKartlari.map((k) => (
                <View key={k.kod} style={styles.onizlemeChip}>
                  <Image source={k.kapak} style={styles.onizlemeImg} />
                  <Text style={styles.onizlemeYazi} numberOfLines={1}>
                    {k.baslik}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={AdminStil.sectionLabel}>Araçlar</Text>
        <Pressable
          style={AdminStil.kart}
          onPress={() => router.push('/admin/oyun-test' as any)}
        >
          <Text style={AdminStil.kartBaslik}>Oyun testi</Text>
          <Text style={AdminStil.kartAlt}>
            Odasız · coin’siz denetim (Kaskad / Zeus / NOX)
          </Text>
        </Pressable>
        <Pressable
          style={AdminStil.kart}
          onPress={() => router.push('/admin/kaskad-yonetim' as any)}
        >
          <Text style={AdminStil.kartBaslik}>Realm of Storms yönetimi</Text>
          <Text style={AdminStil.kartAlt}>RTP · math · refund · müzik</Text>
        </Pressable>
        <Pressable
          style={AdminStil.kart}
          onPress={() => router.push('/admin/oyun-algoritma?oyun=zeus' as any)}
        >
          <Text style={AdminStil.kartBaslik}>Ortak oyun algoritması</Text>
          <Text style={AdminStil.kartAlt}>
            Zeus RTP · takvim · bahis 200 · açıklamalı kontroller
          </Text>
        </Pressable>

        <View style={AdminStil.kart}>
          <Text style={AdminStil.kartBaslik}>Aktif oturumlar</Text>
          {aktif.length === 0 ? (
            <Text style={AdminStil.kartAlt}>Şu an aktif oyun yok.</Text>
          ) : (
            aktif.map((o) => (
              <Text key={o.id} style={AdminStil.kartAlt}>
                {oyunBaslik(o.game_code, katalog)} · {o.status} ·{' '}
                {o.id.slice(0, 8)}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  masterKart: {
    borderColor: RenkTokenlari.borderAccent,
  },
  durumRozet: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  oyunUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
  },
  kapak: {
    width: 64,
    height: 64,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
  },
  kapakBos: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  kartKapali: {
    opacity: 0.85,
    borderColor: RenkTokenlari.danger,
  },
  kartSoluk: {
    opacity: 0.55,
  },
  uyari: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  uyariYazi: {
    ...TipografiTokenlari.caption,
    flex: 1,
    color: RenkTokenlari.danger,
  },
  aksiyonSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BoslukTokenlari.sm,
    marginTop: 4,
  },
  detayKutu: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
    gap: 8,
  },
  label: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
  },
  section: {
    marginTop: 4,
    color: RenkTokenlari.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipOn: {
    backgroundColor: RenkTokenlari.violet,
    borderColor: RenkTokenlari.violet,
  },
  chipText: { color: RenkTokenlari.textMuted, fontSize: 11, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  btn: {
    marginTop: 4,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  onizlemeSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BoslukTokenlari.sm,
  },
  onizlemeChip: {
    width: '30%',
    flexGrow: 1,
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  onizlemeImg: {
    width: '100%',
    height: 56,
  },
  onizlemeYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    padding: 6,
    fontWeight: '600',
  },
});
