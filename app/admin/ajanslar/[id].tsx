import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminAjansCoinYukle,
  AdminAjansDistributorAyarla,
  AdminAjansLimitSet,
  AjansPanelDetayGetir,
  AjansSil,
  type AjansPanelDetay,
} from '../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import {
  AdminAjansKomisyonGuncelle,
  AdminAjansKomisyonListele,
} from '../../../src/moduller/admin/platform/AdminPlatformIslemleri';
import { KomisyonPayCubugu } from '../../../src/moduller/admin/bilesenler/KomisyonPayCubugu';
import { AdminAjansOperasyonPaneli } from '../../../src/moduller/admin/ajans/AdminAjansOperasyonPaneli';
import {
  AjansProfilGetir,
  type AjansProfil,
} from '../../../src/moduller/ajanslar/okuma/AjansProfilGetir';
import { AdminStil, SayiKisa } from '../../../src/moduller/admin/bilesenler/AdminStil';
import { MedyaUriGuvenli } from '../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

function sayi(n: number) {
  return new Intl.NumberFormat('tr-TR').format(n);
}

function AvatarKucuk({
  url,
  ad,
  size = 40,
}: {
  url?: string | null;
  ad: string;
  size?: number;
}) {
  const harf = (ad.trim() || '?').charAt(0).toLocaleUpperCase('tr-TR');
  const safe = MedyaUriGuvenli(url);
  if (safe) {
    return (
      <Image
        source={{ uri: safe }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: RenkTokenlari.borderAccent,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: RenkTokenlari.bgElevated,
        borderWidth: 1,
        borderColor: RenkTokenlari.border,
      }}
    >
      <Text style={{ color: RenkTokenlari.text, fontWeight: '800', fontSize: size * 0.34 }}>
        {harf}
      </Text>
    </View>
  );
}

const LIMIT_ONSETLER = [
  {
    ad: 'Düşük',
    single: 5_000,
    daily: 25_000,
    monthly: 200_000,
    perUser: 10_000,
  },
  {
    ad: 'Standart',
    single: 10_000,
    daily: 50_000,
    monthly: 500_000,
    perUser: 20_000,
  },
  {
    ad: 'Yüksek',
    single: 50_000,
    daily: 250_000,
    monthly: 2_000_000,
    perUser: 100_000,
  },
  {
    ad: 'VIP',
    single: 200_000,
    daily: 1_000_000,
    monthly: 10_000_000,
    perUser: 500_000,
  },
];

export default function AdminAjansDetayEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [detay, setDetay] = useState<AjansPanelDetay | null>(null);
  const [profil, setProfil] = useState<AjansProfil | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [yukleMiktar, setYukleMiktar] = useState('50000');
  const [single, setSingle] = useState('');
  const [daily, setDaily] = useState('');
  const [monthly, setMonthly] = useState('');
  const [perUser, setPerUser] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [komisyonAjansPct, setKomisyonAjansPct] = useState('20');
  const [komisyonPlatformPct, setKomisyonPlatformPct] = useState('10');
  const [komisyonHostPct, setKomisyonHostPct] = useState('70');

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [d, p, kom] = await Promise.all([
        AjansPanelDetayGetir(id),
        AjansProfilGetir(id).catch(() => null),
        AdminAjansKomisyonListele().catch(() => null),
      ]);
      setDetay(d);
      setProfil(p);
      if (d.limits) {
        setSingle(String(d.limits.single_transfer_limit));
        setDaily(String(d.limits.daily_limit));
        setMonthly(String(d.limits.monthly_limit));
        setPerUser(String(d.limits.per_user_limit));
        setUnlimited(Boolean(d.limits.unlimited));
      }
      const row = kom?.items?.find((x) => x.agency_id === id);
      if (row) {
        setKomisyonAjansPct(String(Math.round(row.agency_share * 1000) / 10));
        setKomisyonPlatformPct(
          String(Math.round(row.platform_share * 1000) / 10),
        );
        setKomisyonHostPct(String(Math.round(row.host_share * 1000) / 10));
      }
    } catch (e) {
      Alert.alert(
        'Ajans',
        e instanceof Error ? e.message : 'Detay yüklenemedi',
      );
      setDetay(null);
      setProfil(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  if (!admin) return null;

  const bakiye = detay?.wallet?.distribution_balance ?? 0;

  const coinIsle = (delta: number) => {
    if (!id || !delta) return;
    Alert.alert(
      delta > 0 ? 'Coin yükle' : 'Coin düşür',
      `Ajans bakiyesine ${delta > 0 ? '+' : ''}${sayi(delta)} coin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Uygula',
          onPress: () => {
            void (async () => {
              setBusy(true);
              const r = await AdminAjansCoinYukle({
                agencyId: id,
                delta,
                reason: delta > 0 ? 'admin_topup' : 'admin_deduct',
              });
              setBusy(false);
              if (!r.ok) Alert.alert('Coin', r.hata);
              else {
                Alert.alert(
                  'Tamam',
                  `Yeni bakiye: ${sayi(r.distribution_balance ?? 0)}`,
                );
                await yukle();
              }
            })();
          },
        },
      ],
    );
  };

  const limitKaydet = () => {
    if (!id) return;
    if (unlimited) {
      void (async () => {
        setBusy(true);
        const r = await AdminAjansLimitSet({
          agencyId: id,
          single: Math.floor(Number(single)) || 10000,
          daily: Math.floor(Number(daily)) || 50000,
          monthly: Math.floor(Number(monthly)) || 500000,
          perUser: Math.floor(Number(perUser)) || 20000,
          unlimited: true,
        });
        setBusy(false);
        if (!r.ok) Alert.alert('Limit', r.hata);
        else {
          Alert.alert('Tamam', 'Sınırsız coin yetkisi açıldı.');
          await yukle();
        }
      })();
      return;
    }
    const s = Math.floor(Number(single));
    const d = Math.floor(Number(daily));
    const m = Math.floor(Number(monthly));
    const p = Math.floor(Number(perUser));
    if ([s, d, m, p].some((n) => !Number.isFinite(n) || n < 100)) {
      Alert.alert('Limit', 'Tüm limitler ≥ 100 olmalı.');
      return;
    }
    void (async () => {
      setBusy(true);
      const r = await AdminAjansLimitSet({
        agencyId: id,
        single: s,
        daily: d,
        monthly: m,
        perUser: p,
        unlimited: false,
      });
      setBusy(false);
      if (!r.ok) Alert.alert('Limit', r.hata);
      else {
        Alert.alert('Tamam', 'Limitler güncellendi.');
        await yukle();
      }
    })();
  };

  const limitDelta = (alan: 'single' | 'daily' | 'monthly' | 'perUser', carpan: number) => {
    const map = {
      single: [single, setSingle],
      daily: [daily, setDaily],
      monthly: [monthly, setMonthly],
      perUser: [perUser, setPerUser],
    } as const;
    const [val, setVal] = map[alan];
    const n = Math.floor(Number(val) || 0);
    const next = Math.max(100, Math.floor(n * carpan));
    setVal(String(next));
  };

  const komisyonKaydet = () => {
    if (!id) return;
    const agencyShare =
      Number(String(komisyonAjansPct).replace(',', '.')) / 100;
    const platformShare =
      Number(String(komisyonPlatformPct).replace(',', '.')) / 100;
    if (
      ![agencyShare, platformShare].every(
        (n) => Number.isFinite(n) && n >= 0,
      ) ||
      agencyShare + platformShare > 1
    ) {
      Alert.alert('Komisyon', 'Ajans + platform %100’ü geçemez.');
      return;
    }
    void (async () => {
      setBusy(true);
      try {
        const r = await AdminAjansKomisyonGuncelle({
          agencyId: id,
          agencyShare,
          platformShare,
        });
        setKomisyonHostPct(String(Math.round(r.host_share * 1000) / 10));
        setKomisyonAjansPct(String(Math.round(r.agency_share * 1000) / 10));
        setKomisyonPlatformPct(
          String(Math.round(r.platform_share * 1000) / 10),
        );
        Alert.alert(
          'Komisyon',
          `Host %${Math.round(r.host_share * 1000) / 10} kaydedildi.`,
        );
      } catch (e) {
        Alert.alert(
          'Komisyon',
          e instanceof Error ? e.message : 'Kaydedilemedi',
        );
      } finally {
        setBusy(false);
      }
    })();
  };

  const distributorToggle = () => {
    if (!id || !detay) return;
    const next = !detay.agency.is_coin_distributor;
    Alert.alert(
      next ? 'Coin yükleme yetkisi ver' : 'Coin yükleme yetkisini kaldır',
      next
        ? 'Bu ajans, yönetim ekranından kullanıcılara coin gönderebilecek. Onaylıyor musun?'
        : 'Ajansın kullanıcıya coin yükleme yetkisi kapatılacak.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: next ? 'Yetki ver' : 'Kaldır',
          style: next ? 'default' : 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              const r = await AdminAjansDistributorAyarla({
                agencyId: id,
                enabled: next,
              });
              setBusy(false);
              if (!r.ok) Alert.alert('Yetki', r.hata);
              else {
                Alert.alert(
                  'Tamam',
                  next
                    ? 'Coin yükleme yetkisi verildi.'
                    : 'Coin yükleme yetkisi kaldırıldı.',
                );
                await yukle();
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={detay?.agency.name ?? 'Ajans'}
        subtitle="Operasyon · yaptırım · coin · limit"
        fallbackHref={"/admin/ajanslar" as any}
      />
      {yukleniyor && !detay ? (
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginTop: 40 }}
        />
      ) : !detay ? (
        <Text style={AdminStil.bos}>Ajans yok</Text>
      ) : (
        <ScrollView
          contentContainerStyle={AdminStil.content}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor || busy}
              onRefresh={() => void yukle()}
              tintColor={RenkTokenlari.primarySoft}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.profilKart}>
            {profil?.agency.banner_url || detay.agency.banner_url ? (
              <Image
                source={{
                  uri: (profil?.agency.banner_url ||
                    detay.agency.banner_url) as string,
                }}
                style={styles.banner}
              />
            ) : (
              <LinearGradient
                colors={[...RenkTokenlari.gradientCard]}
                style={styles.banner}
              />
            )}
            <View style={styles.profilGovde}>
              <AvatarKucuk
                url={profil?.agency.logo_url || detay.agency.logo_url}
                ad={detay.agency.name}
                size={64}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.eyebrow}>
                  {detay.agency.agency_public_id} · {detay.agency.trust_tier}
                  {detay.agency.level_code
                    ? ` · ${detay.agency.level_code}`
                    : ''}
                </Text>
                <Text style={AdminStil.kartBaslik}>{detay.agency.name}</Text>
                {(profil?.agency.slogan || detay.agency.slogan) ? (
                  <Text style={styles.alt}>
                    {profil?.agency.slogan || detay.agency.slogan}
                  </Text>
                ) : null}
                <Text style={styles.alt}>
                  {detay.agency.country ?? '—'} · {detay.agency.status} ·{' '}
                  {detay.agency.host_count} üye
                </Text>
              </View>
            </View>
            {(profil?.agency.description || detay.agency.description) ? (
              <Text style={styles.aciklama}>
                {profil?.agency.description || detay.agency.description}
              </Text>
            ) : null}
            {(profil?.agency.website_url || detay.agency.website_url) ? (
              <Text
                style={[
                  styles.alt,
                  {
                    color: RenkTokenlari.primarySoft,
                    paddingHorizontal: BoslukTokenlari.lg,
                  },
                ]}
              >
                {profil?.agency.website_url || detay.agency.website_url}
              </Text>
            ) : null}
            <View style={styles.sahipSatir}>
              <AvatarKucuk
                url={
                  profil?.owner?.avatar_url || detay.owner?.avatar_url
                }
                ad={
                  detay.owner?.display_name ||
                  detay.owner?.username ||
                  'Sahip'
                }
                size={36}
              />
              <View style={{ flex: 1 }}>
                <Text style={AdminStil.kartBaslik}>
                  {detay.owner?.display_name ||
                    detay.owner?.username ||
                    '—'}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Sahip
                  {detay.owner?.username
                    ? ` · @${detay.owner.username}`
                    : ''}
                  {detay.owner?.public_user_id
                    ? ` · ${detay.owner.public_user_id}`
                    : ''}
                </Text>
              </View>
              {detay.owner?.id ? (
                <Pressable
                  onPress={() =>
                    router.push(`/admin/kullanicilar/${detay.owner!.id}` as any)
                  }
                >
                  <Text
                    style={[
                      AdminStil.aksiyonYazi,
                      { color: RenkTokenlari.primarySoft },
                    ]}
                  >
                    Profil →
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.bakiye}>{sayi(bakiye)}</Text>
            <Text style={styles.bakiyeAlt}>Dağıtım bakiyesi</Text>
            {profil?.istatistik ? (
              <View style={styles.kpiSatir}>
                <Text style={AdminStil.kartAlt}>
                  Üye {sayi(profil.istatistik.uye_sayisi)}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Haftalık coin {SayiKisa(profil.istatistik.haftalik_coin)}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Toplam coin {SayiKisa(profil.istatistik.toplam_coin)}
                </Text>
              </View>
            ) : null}
          </View>

          <AdminAjansOperasyonPaneli agencyId={id} />

          <Text style={AdminStil.sectionLabel}>Komisyon oranları</Text>
          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartAlt}>
              Bu ajansa bağlı yayıncı hediye aldığında elmas böyle bölünür.
              Yayıncı payı otomatik hesaplanır (100 − ajans − platform).
            </Text>
            <KomisyonPayCubugu
              host={Number(String(komisyonHostPct).replace(',', '.')) || 0}
              ajans={Number(String(komisyonAjansPct).replace(',', '.')) || 0}
              platform={
                Number(String(komisyonPlatformPct).replace(',', '.')) || 0
              }
            />
            <Text style={[AdminStil.kartAlt, { fontWeight: '700', color: RenkTokenlari.text }]}>
              Ajans payı (%)
            </Text>
            <TextInput
              style={AdminStil.input}
              value={komisyonAjansPct}
              onChangeText={(t) => {
                setKomisyonAjansPct(t);
                const a = Number(String(t).replace(',', '.')) || 0;
                const p =
                  Number(String(komisyonPlatformPct).replace(',', '.')) || 0;
                setKomisyonHostPct(
                  String(Math.max(0, Math.round((100 - a - p) * 10) / 10)),
                );
              }}
              keyboardType="decimal-pad"
              placeholder="20"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Text style={[AdminStil.kartAlt, { fontWeight: '700', color: RenkTokenlari.text }]}>
              Platform payı (%)
            </Text>
            <TextInput
              style={AdminStil.input}
              value={komisyonPlatformPct}
              onChangeText={(t) => {
                setKomisyonPlatformPct(t);
                const p = Number(String(t).replace(',', '.')) || 0;
                const a =
                  Number(String(komisyonAjansPct).replace(',', '.')) || 0;
                setKomisyonHostPct(
                  String(Math.max(0, Math.round((100 - a - p) * 10) / 10)),
                );
              }}
              keyboardType="decimal-pad"
              placeholder="10"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Text style={AdminStil.kartBaslik}>
              Yayıncı (host) %{komisyonHostPct} — otomatik
            </Text>
            <Pressable
              style={[
                AdminStil.aksiyon,
                {
                  backgroundColor: RenkTokenlari.primarySoft,
                  borderColor: RenkTokenlari.primarySoft,
                },
              ]}
              disabled={busy}
              onPress={komisyonKaydet}
            >
              <Text
                style={[
                  AdminStil.aksiyonYazi,
                  { color: RenkTokenlari.bg, fontWeight: '800' },
                ]}
              >
                {busy ? '…' : 'Komisyonu kaydet'}
              </Text>
            </Pressable>
            <Pressable
              style={AdminStil.aksiyon}
              onPress={() => router.push('/admin/komisyonlar')}
            >
              <Text style={AdminStil.aksiyonYazi}>Tüm ajans komisyonları →</Text>
            </Pressable>
          </View>

          <Text style={AdminStil.sectionLabel}>
            Üyeler ({(detay.uyeler ?? profil?.yayincilar ?? []).length})
          </Text>
          {(detay.uyeler?.length ?? 0) === 0 &&
          (profil?.yayincilar?.length ?? 0) === 0 ? (
            <Text style={AdminStil.bos}>Üye yok</Text>
          ) : (
            (detay.uyeler?.length
              ? detay.uyeler
              : (profil?.yayincilar ?? []).map((y) => ({
                  user_id: y.user_id,
                  display_name: y.display_name,
                  username: y.username,
                  public_user_id: y.public_user_id,
                  avatar_url: y.avatar_url,
                  status: 'agency',
                  joined_at: y.joined_at,
                  ses_dakika_toplam: y.ses_dakika,
                  ses_dakika_ay: 0,
                  yayin_dakika_toplam: y.yayin_dakika,
                  yayin_dakika_ay: 0,
                  yukleme_coin_toplam: 0,
                  yukleme_coin_ay: 0,
                  kazanc_elmas_toplam: y.kazanc_elmas,
                  kazanc_elmas_ay: 0,
                }))
            ).map((u) => {
              const ad = u.display_name || u.username || u.user_id.slice(0, 8);
              return (
                <Pressable
                  key={u.user_id}
                  style={AdminStil.kart}
                  onPress={() =>
                    router.push(`/admin/kullanicilar/${u.user_id}` as any)
                  }
                >
                  <View style={styles.sahipSatir}>
                    <AvatarKucuk url={u.avatar_url} ad={ad} size={40} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={AdminStil.kartBaslik}>{ad}</Text>
                      <Text style={AdminStil.kartAlt}>
                        {u.username ? `@${u.username}` : u.public_user_id ?? '—'}
                        {u.joined_at
                          ? ` · ${new Date(u.joined_at).toLocaleDateString('tr-TR')}`
                          : ''}
                      </Text>
                      <Text style={AdminStil.kartAlt}>
                        Yayın {sayi(u.yayin_dakika_toplam)} dk · Ses{' '}
                        {sayi(u.ses_dakika_toplam)} dk · Elmas{' '}
                        {SayiKisa(u.kazanc_elmas_toplam)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}

          <Text style={AdminStil.sectionLabel}>Ajansa coin yükle / indir</Text>
          <View style={AdminStil.kart}>
            <View style={AdminStil.aksiyonSatir}>
              {[10_000, 50_000, 100_000, 500_000].map((n) => (
                <Pressable
                  key={n}
                  style={AdminStil.aksiyon}
                  onPress={() => setYukleMiktar(String(n))}
                >
                  <Text style={AdminStil.aksiyonYazi}>{SayiKisa(n)}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={yukleMiktar}
              onChangeText={setYukleMiktar}
              keyboardType="number-pad"
              placeholder="Miktar"
              placeholderTextColor={RenkTokenlari.textDim}
              style={AdminStil.input}
            />
            <View style={AdminStil.aksiyonSatir}>
              <Pressable
                style={[AdminStil.aksiyon, styles.yesil]}
                onPress={() => coinIsle(Math.floor(Number(yukleMiktar)) || 0)}
              >
                <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.mint }]}>
                  Yükle (+)
                </Text>
              </Pressable>
              <Pressable
                style={[AdminStil.aksiyon, styles.kirmizi]}
                onPress={() =>
                  coinIsle(-(Math.floor(Number(yukleMiktar)) || 0))
                }
              >
                <Text
                  style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}
                >
                  İndir (−)
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={AdminStil.sectionLabel}>Coin yükleme yetkisi</Text>
          <Pressable
            style={[
              AdminStil.kart,
              detay.agency.is_coin_distributor && styles.yetkiAcik,
            ]}
            onPress={distributorToggle}
            disabled={busy}
          >
            <View style={styles.yetkiSatir}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={AdminStil.kartBaslik}>
                  {detay.agency.is_coin_distributor
                    ? 'Yetki açık'
                    : 'Yetki kapalı'}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  {detay.agency.is_coin_distributor
                    ? 'Ajans sahibi, Ajansım ekranından istediği kullanıcıya coin gönderebilir. Dokunarak kaldır.'
                    : 'Platform bu ajansa yetki verince ajans yönetim ekranında coin sistemi açılır. Dokunarak ver.'}
                </Text>
              </View>
              <View
                style={[
                  styles.yetkiSwitch,
                  detay.agency.is_coin_distributor && styles.yetkiSwitchAcik,
                ]}
              >
                <Text
                  style={[
                    styles.yetkiSwitchYazi,
                    detay.agency.is_coin_distributor &&
                      styles.yetkiSwitchYaziAcik,
                  ]}
                >
                  {detay.agency.is_coin_distributor ? 'AÇIK' : 'KAPALI'}
                </Text>
              </View>
            </View>
          </Pressable>

          <Text style={AdminStil.sectionLabel}>Limit yükselt / indir</Text>
          <Pressable
            style={AdminStil.kart}
            onPress={() => setUnlimited((v) => !v)}
          >
            <Text style={AdminStil.kartBaslik}>
              {unlimited
                ? 'Sınırsız — dokunarak limitli yap'
                : 'Limitli — dokunarak sınırsız yap'}
            </Text>
            <Text style={AdminStil.kartAlt}>
              Sınırsızda günlük/aylık/tek sefer üst sınırı uygulanmaz (bakiye
              yeterse)
            </Text>
          </Pressable>
          {!unlimited ? (
            <>
          <View style={AdminStil.aksiyonSatir}>
            {LIMIT_ONSETLER.map((p) => (
              <Pressable
                key={p.ad}
                style={AdminStil.aksiyon}
                onPress={() => {
                  setSingle(String(p.single));
                  setDaily(String(p.daily));
                  setMonthly(String(p.monthly));
                  setPerUser(String(p.perUser));
                  setUnlimited(false);
                }}
              >
                <Text style={AdminStil.aksiyonYazi}>{p.ad}</Text>
              </Pressable>
            ))}
          </View>

          {(
            [
              ['Tek sefer', single, setSingle, 'single'],
              ['Günlük', daily, setDaily, 'daily'],
              ['Aylık', monthly, setMonthly, 'monthly'],
              ['Kişi başı', perUser, setPerUser, 'perUser'],
            ] as const
          ).map(([label, val, , key]) => (
            <View key={key} style={AdminStil.kart}>
              <Text style={AdminStil.kartBaslik}>{label}</Text>
              <TextInput
                value={val}
                onChangeText={
                  key === 'single'
                    ? setSingle
                    : key === 'daily'
                      ? setDaily
                      : key === 'monthly'
                        ? setMonthly
                        : setPerUser
                }
                keyboardType="number-pad"
                style={AdminStil.input}
              />
              <View style={AdminStil.aksiyonSatir}>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={() => limitDelta(key, 0.5)}
                >
                  <Text style={AdminStil.aksiyonYazi}>÷2 indir</Text>
                </Pressable>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={() => limitDelta(key, 2)}
                >
                  <Text style={AdminStil.aksiyonYazi}>×2 yükselt</Text>
                </Pressable>
              </View>
            </View>
          ))}
            </>
          ) : null}

          <Pressable
            style={[AdminStil.aksiyon, styles.kaydet]}
            onPress={limitKaydet}
            disabled={busy}
          >
            <Text style={[AdminStil.aksiyonYazi, { color: '#12040C' }]}>
              {unlimited ? 'Sınırsızı kaydet' : 'Limitleri kaydet'}
            </Text>
          </Pressable>
          <Text style={AdminStil.sectionLabel}>Kullanım</Text>
          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartAlt}>
              Günlük: {sayi(detay.kullanim.gunluk_transfer)}
              {detay.limits?.unlimited
                ? ' · sınırsız'
                : ` / ${sayi(detay.limits?.daily_limit ?? 0)}`}
            </Text>
            <Text style={AdminStil.kartAlt}>
              Aylık: {sayi(detay.kullanim.aylik_transfer)}
              {detay.limits?.unlimited
                ? ' · sınırsız'
                : ` / ${sayi(detay.limits?.monthly_limit ?? 0)}`}
            </Text>
          </View>

          <Text style={AdminStil.sectionLabel}>Son transferler</Text>
          {(detay.son_transferler ?? []).length === 0 ? (
            <Text style={AdminStil.bos}>Transfer yok</Text>
          ) : (
            detay.son_transferler.map((t) => (
              <View key={t.id} style={AdminStil.kart}>
                <View style={AdminStil.satir}>
                  <Text style={AdminStil.kartBaslik}>{t.to_name}</Text>
                  <Text style={{ color: RenkTokenlari.mint, fontWeight: '700' }}>
                    +{sayi(t.coins)}
                  </Text>
                </View>
                <Text style={AdminStil.kartAlt}>
                  {new Date(t.created_at).toLocaleString('tr-TR')}
                </Text>
              </View>
            ))
          )}

          <Text style={AdminStil.sectionLabel}>Tehlikeli</Text>
          <Pressable
            style={[AdminStil.aksiyon, styles.kirmizi]}
            disabled={busy}
            onPress={() => {
              Alert.alert('Ajansı kapat', 'Ajans kapatılsın mı?', [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Kapat',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      setBusy(true);
                      const r = await AjansSil(id);
                      setBusy(false);
                      if (!r.ok) Alert.alert('Silme', r.hata);
                      else {
                        Alert.alert('Tamam', 'Ajans kapatıldı.');
                        router.replace('/admin/ajanslar' as any);
                      }
                    })();
                  },
                },
              ]);
            }}
          >
            <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}>
              Ajansı sil / kapat
            </Text>
          </Pressable>

          <Pressable
            style={AdminStil.kart}
            onPress={() => router.push(`/ajans/${id}` as any)}
          >
            <Text style={AdminStil.kartBaslik}>
              Ajans kullanıcı paneli →
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profilKart: {
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.bgCard,
    overflow: 'hidden',
    gap: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.lg,
  },
  banner: {
    width: '100%',
    height: 110,
  },
  profilGovde: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.lg,
    marginTop: -28,
  },
  sahipSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  aciklama: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 20,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  kpiSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  hero: {
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.xl,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: 4,
  },
  eyebrow: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  bakiye: {
    ...TipografiTokenlari.title,
    fontSize: 36,
    color: RenkTokenlari.text,
    paddingHorizontal: BoslukTokenlari.lg,
    marginTop: BoslukTokenlari.sm,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  bakiyeAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  yesil: { borderColor: 'rgba(80,200,160,0.4)' },
  kirmizi: { borderColor: 'rgba(232,64,64,0.35)' },
  kaydet: {
    backgroundColor: RenkTokenlari.primary,
    borderColor: RenkTokenlari.primary,
    alignItems: 'center',
    paddingVertical: 14,
  },
  yetkiAcik: {
    borderColor: 'rgba(110, 231, 183, 0.35)',
    backgroundColor: 'rgba(110, 231, 183, 0.06)',
  },
  yetkiSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yetkiSwitch: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  yetkiSwitchAcik: {
    backgroundColor: 'rgba(110, 231, 183, 0.2)',
    borderColor: RenkTokenlari.mint,
  },
  yetkiSwitchYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  yetkiSwitchYaziAcik: {
    color: RenkTokenlari.mint,
  },
});
