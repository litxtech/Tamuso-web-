import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminCoinPaketGuncelle,
  AdminEkonomiConfigGuncelle,
  AdminEkonomiKatalogu,
  AdminEkonomiSimuleEt,
  AdminHediyeGuncelle,
  AdminHediyeKatalogOranUygula,
  AdminPaketAktiflik,
} from '../../src/moduller/admin/platform/AdminPlatformIslemleri';
import type {
  AdminHediye,
  AdminPaket,
  EkonomiSimulasyon,
  PlatformEkonomiConfig,
} from '../../src/moduller/admin/tipler/PlatformTipleri';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { EkonomiOranCacheAyarla } from '../../src/moduller/cuzdan/katalog/EkonomiOranlariniGetir';
import { KatalogCache } from '../../src/ortak/onbellek/KatalogCache';

function pctMetin(oran: number): string {
  return String(Math.round(Number(oran) * 1000) / 10);
}

function pctParse(s: string): number {
  const n = Number(String(s).replace(',', '.'));
  if (!Number.isFinite(n)) return NaN;
  return n / 100;
}

function tryParse(s: string): number {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function tryYazi(n: number): string {
  return `${Number(n).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₺`;
}

export default function AdminEkonomiEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [paketler, setPaketler] = useState<AdminPaket[]>([]);
  const [hediyeler, setHediyeler] = useState<AdminHediye[]>([]);
  const [config, setConfig] = useState<PlatformEkonomiConfig | null>(null);
  const [sim, setSim] = useState<EkonomiSimulasyon | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);

  const [coinTry, setCoinTry] = useState('0.1');
  const [diamondTry, setDiamondTry] = useState('0.1');
  const [hostPct, setHostPct] = useState('80');
  const [agencyPct, setAgencyPct] = useState('20');
  const [storePct, setStorePct] = useState('30');
  const [simBrut, setSimBrut] = useState('4000');

  const [duzenPaketId, setDuzenPaketId] = useState<string | null>(null);
  const [pTitle, setPTitle] = useState('');
  const [pCoins, setPCoins] = useState('');
  const [pBonus, setPBonus] = useState('');
  const [pPrice, setPPrice] = useState('');

  const [duzenHediyeId, setDuzenHediyeId] = useState<string | null>(null);
  const [hName, setHName] = useState('');
  const [hEmoji, setHEmoji] = useState('');
  const [hCoin, setHCoin] = useState('');
  const [hDiamond, setHDiamond] = useState('');
  const [hRarity, setHRarity] = useState('');

  const configForma = useCallback((c: PlatformEkonomiConfig) => {
    setConfig(c);
    setCoinTry(String(c.coin_try));
    setDiamondTry(String(c.diamond_try));
    setHostPct(pctMetin(c.gift_host_share));
    setAgencyPct(pctMetin(c.default_agency_share));
    setStorePct(pctMetin(c.iap_store_fee_estimate));
    EkonomiOranCacheAyarla(c);
  }, []);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const k = await AdminEkonomiKatalogu();
      setPaketler(k.paketler);
      setHediyeler(k.hediyeler);
      if (k.config) configForma(k.config);
      setSim(k.simuleOrnek);
    } catch (e) {
      Alert.alert('Ekonomi', e instanceof Error ? e.message : 'Katalog alınamadı');
      setPaketler([]);
      setHediyeler([]);
    } finally {
      setYukleniyor(false);
    }
  }, [configForma]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  const oranKaydet = async () => {
    const coin_try = tryParse(coinTry);
    const diamond_try = tryParse(diamondTry);
    const gift_host_share = pctParse(hostPct);
    const default_agency_share = pctParse(agencyPct);
    const iap_store_fee_estimate = pctParse(storePct);
    if (
      [coin_try, diamond_try, gift_host_share, default_agency_share, iap_store_fee_estimate].some(
        (x) => !Number.isFinite(x),
      )
    ) {
      Alert.alert('Oranlar', 'Geçerli sayılar gir.');
      return;
    }
    setKaydediyor(true);
    try {
      const c = await AdminEkonomiConfigGuncelle({
        coin_try,
        diamond_try,
        gift_host_share,
        default_agency_share,
        iap_store_fee_estimate,
      });
      configForma(c);
      KatalogCache.invalidatePrefix('economy');
      KatalogCache.invalidatePrefix('gifts');
      const s = await AdminEkonomiSimuleEt(tryParse(simBrut) || 4000);
      setSim(s);
      Alert.alert('Kaydedildi', 'Küresel ekonomi oranları güncellendi.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  };

  const katalogaUygula = () => {
    Alert.alert(
      'Kataloga uygula',
      `Aktif hediyelerde elmas = floor(coin × %${hostPct}) olacak. Devam?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Uygula',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setKaydediyor(true);
              try {
                const r = await AdminHediyeKatalogOranUygula();
                KatalogCache.invalidatePrefix('gifts');
                await yukle();
                Alert.alert(
                  'Tamam',
                  `${r.updated_rows} hediye güncellendi (host payı %${pctMetin(r.gift_host_share)}).`,
                );
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'Uygulanamadı');
              } finally {
                setKaydediyor(false);
              }
            })();
          },
        },
      ],
    );
  };

  const simuleEt = async () => {
    const brut = tryParse(simBrut);
    if (!Number.isFinite(brut) || brut < 0) {
      Alert.alert('Simülatör', 'Geçerli brüt ₺ gir.');
      return;
    }
    setKaydediyor(true);
    try {
      setSim(await AdminEkonomiSimuleEt(brut));
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Simüle edilemedi');
    } finally {
      setKaydediyor(false);
    }
  };

  const paketDuzenAc = (p: AdminPaket) => {
    setDuzenPaketId(p.id);
    setPTitle(p.title);
    setPCoins(String(p.coins));
    setPBonus(String(p.bonus_coins));
    setPPrice(p.price_try != null ? String(p.price_try) : '');
  };

  const paketKaydet = async () => {
    if (!duzenPaketId) return;
    setKaydediyor(true);
    try {
      await AdminCoinPaketGuncelle({
        id: duzenPaketId,
        title: pTitle,
        coins: Math.floor(tryParse(pCoins)) || 0,
        bonusCoins: Math.floor(tryParse(pBonus)) || 0,
        priceTry: Number.isFinite(tryParse(pPrice)) ? tryParse(pPrice) : null,
      });
      setDuzenPaketId(null);
      KatalogCache.invalidatePrefix('coin_packages');
      await yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Paket güncellenemedi');
    } finally {
      setKaydediyor(false);
    }
  };

  const hediyeDuzenAc = (h: AdminHediye) => {
    setDuzenHediyeId(h.id);
    setHName(h.name);
    setHEmoji(h.emoji);
    setHCoin(String(h.coin_cost));
    setHDiamond(String(h.diamond_value));
    setHRarity(h.rarity);
  };

  const hediyeKaydet = async () => {
    if (!duzenHediyeId) return;
    setKaydediyor(true);
    try {
      await AdminHediyeGuncelle({
        id: duzenHediyeId,
        name: hName,
        emoji: hEmoji,
        coinCost: Math.floor(tryParse(hCoin)),
        diamondValue: Math.floor(tryParse(hDiamond)),
        rarity: hRarity,
      });
      setDuzenHediyeId(null);
      KatalogCache.invalidatePrefix('gifts');
      await yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Hediye güncellenemedi');
    } finally {
      setKaydediyor(false);
    }
  };

  if (!admin) return null;

  const gifted = sim?.if_all_gifted;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Ekonomi merkezi"
        subtitle="Oranlar · simülatör · paket · hediye"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        {yukleniyor && !config ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        <Text style={AdminStil.sectionLabel}>Küresel oranlar / komisyon</Text>
        <View style={AdminStil.kart}>
          <Text style={AdminStil.kartAlt}>
            1 coin / 1 elmas katalog ₺ · hediyede host payı · yeni ajans kesintisi · IAP
            mağaza tahmini (simülatör)
          </Text>
          <Pressable
            style={[AdminStil.aksiyon, { marginBottom: 8 }]}
            onPress={() => router.push('/admin/komisyonlar')}
          >
            <Text style={AdminStil.aksiyonYazi}>
              Ajans komisyonları (host / ajans / platform) →
            </Text>
          </Pressable>
          <Text style={AdminStil.kartAlt}>1 coin = ₺</Text>
          <TextInput
            style={AdminStil.input}
            value={coinTry}
            onChangeText={setCoinTry}
            keyboardType="decimal-pad"
            placeholder="0.10"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <Text style={AdminStil.kartAlt}>1 elmas çekim = ₺</Text>
          <TextInput
            style={AdminStil.input}
            value={diamondTry}
            onChangeText={setDiamondTry}
            keyboardType="decimal-pad"
            placeholder="0.10"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <Text style={AdminStil.kartAlt}>Hediye host payı %</Text>
          <TextInput
            style={AdminStil.input}
            value={hostPct}
            onChangeText={setHostPct}
            keyboardType="decimal-pad"
            placeholder="80"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <Text style={AdminStil.kartAlt}>Varsayılan ajans payı %</Text>
          <TextInput
            style={AdminStil.input}
            value={agencyPct}
            onChangeText={setAgencyPct}
            keyboardType="decimal-pad"
            placeholder="20"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <Text style={AdminStil.kartAlt}>Mağaza kesinti tahmini %</Text>
          <TextInput
            style={AdminStil.input}
            value={storePct}
            onChangeText={setStorePct}
            keyboardType="decimal-pad"
            placeholder="30"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <View style={AdminStil.aksiyonSatir}>
            <Pressable
              style={AdminStil.aksiyon}
              disabled={kaydediyor}
              onPress={() => void oranKaydet()}
            >
              <Text style={AdminStil.aksiyonYazi}>
                {kaydediyor ? '…' : 'Oranları kaydet'}
              </Text>
            </Pressable>
            <Pressable
              style={AdminStil.aksiyon}
              disabled={kaydediyor}
              onPress={katalogaUygula}
            >
              <Text style={AdminStil.aksiyonYazi}>Kataloga uygula</Text>
            </Pressable>
          </View>
        </View>

        <Text style={AdminStil.sectionLabel}>Kâr simülatörü</Text>
        <View style={AdminStil.kart}>
          <Text style={AdminStil.kartAlt}>Brüt alışveriş ₺ (katalog coin yüzü)</Text>
          <TextInput
            style={AdminStil.input}
            value={simBrut}
            onChangeText={setSimBrut}
            keyboardType="decimal-pad"
            placeholder="4000"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <Pressable
            style={AdminStil.aksiyon}
            disabled={kaydediyor}
            onPress={() => void simuleEt()}
          >
            <Text style={AdminStil.aksiyonYazi}>Simüle et</Text>
          </Pressable>
          {sim ? (
            <View style={{ gap: 6, marginTop: 8 }}>
              <Text style={AdminStil.kartBaslik}>
                Mağaza: {tryYazi(sim.store_fee_try)} · Platform IAP net:{' '}
                {tryYazi(sim.platform_iap_net_try)}
              </Text>
              <Text style={AdminStil.kartAlt}>
                ≈ {Number(sim.approx_coins).toLocaleString('tr-TR')} coin (katalog)
              </Text>
              {gifted ? (
                <>
                  <Text style={AdminStil.kartAlt}>
                    Hepsi hediye + ajans sonrası — host çekim:{' '}
                    {tryYazi(gifted.host_cashout_try)} · ajans:{' '}
                    {tryYazi(gifted.agency_cashout_try)}
                  </Text>
                  <Text style={AdminStil.kartBaslik}>
                    Platform kalan (IAP net − host − ajans):{' '}
                    {tryYazi(gifted.platform_net_after_cashout_try)}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        <Text style={AdminStil.sectionLabel}>Coin paketleri</Text>
        {paketler.map((p) => (
          <View key={p.id} style={AdminStil.kart}>
            <View style={AdminStil.satir}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={AdminStil.kartBaslik}>{p.title}</Text>
                <Text style={AdminStil.kartAlt}>
                  {p.coins}+{p.bonus_coins} coin ·{' '}
                  {p.price_try != null
                    ? `${Number(p.price_try).toLocaleString('tr-TR')} ₺`
                    : `$${p.price_usd}`}{' '}
                  · {p.sku}
                </Text>
              </View>
              <View style={AdminStil.chip}>
                <Text
                  style={[
                    AdminStil.chipYazi,
                    {
                      color: p.is_active
                        ? RenkTokenlari.success
                        : RenkTokenlari.textDim,
                    },
                  ]}
                >
                  {p.is_active ? 'Aktif' : 'Kapalı'}
                </Text>
              </View>
            </View>
            {duzenPaketId === p.id ? (
              <View style={{ gap: 8 }}>
                <TextInput
                  style={AdminStil.input}
                  value={pTitle}
                  onChangeText={setPTitle}
                  placeholder="Başlık"
                  placeholderTextColor={RenkTokenlari.textDim}
                />
                <TextInput
                  style={AdminStil.input}
                  value={pCoins}
                  onChangeText={setPCoins}
                  keyboardType="number-pad"
                  placeholder="Coin"
                  placeholderTextColor={RenkTokenlari.textDim}
                />
                <TextInput
                  style={AdminStil.input}
                  value={pBonus}
                  onChangeText={setPBonus}
                  keyboardType="number-pad"
                  placeholder="Bonus"
                  placeholderTextColor={RenkTokenlari.textDim}
                />
                <TextInput
                  style={AdminStil.input}
                  value={pPrice}
                  onChangeText={setPPrice}
                  keyboardType="decimal-pad"
                  placeholder="price_try"
                  placeholderTextColor={RenkTokenlari.textDim}
                />
                <View style={AdminStil.aksiyonSatir}>
                  <Pressable style={AdminStil.aksiyon} onPress={() => void paketKaydet()}>
                    <Text style={AdminStil.aksiyonYazi}>Kaydet</Text>
                  </Pressable>
                  <Pressable
                    style={AdminStil.aksiyon}
                    onPress={() => setDuzenPaketId(null)}
                  >
                    <Text style={AdminStil.aksiyonYazi}>İptal</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={AdminStil.aksiyonSatir}>
                <Pressable style={AdminStil.aksiyon} onPress={() => paketDuzenAc(p)}>
                  <Text style={AdminStil.aksiyonYazi}>Düzenle</Text>
                </Pressable>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={async () => {
                    try {
                      await AdminPaketAktiflik(p.id, !p.is_active);
                      await yukle();
                    } catch (e) {
                      Alert.alert(
                        'Hata',
                        e instanceof Error ? e.message : 'Güncellenemedi',
                      );
                    }
                  }}
                >
                  <Text style={AdminStil.aksiyonYazi}>
                    {p.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <Text style={AdminStil.sectionLabel}>Hediye kataloğu</Text>
        {hediyeler.map((h) => {
          const plat = h.platform_coins ?? Math.max(0, h.coin_cost - h.diamond_value);
          return (
            <View key={h.id} style={AdminStil.kart}>
              <View style={AdminStil.satir}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={AdminStil.kartBaslik}>
                    {h.emoji} {h.name}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    {h.coin_cost} coin → {h.diamond_value} elmas · platform {plat} coin ·{' '}
                    {h.rarity}
                  </Text>
                </View>
                <View style={AdminStil.chip}>
                  <Text
                    style={[
                      AdminStil.chipYazi,
                      {
                        color: h.is_active
                          ? RenkTokenlari.success
                          : RenkTokenlari.textDim,
                      },
                    ]}
                  >
                    {h.is_active ? 'Aktif' : 'Kapalı'}
                  </Text>
                </View>
              </View>
              {duzenHediyeId === h.id ? (
                <View style={{ gap: 8 }}>
                  <TextInput
                    style={AdminStil.input}
                    value={hName}
                    onChangeText={setHName}
                    placeholder="Ad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <TextInput
                    style={AdminStil.input}
                    value={hEmoji}
                    onChangeText={setHEmoji}
                    placeholder="Emoji"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <TextInput
                    style={AdminStil.input}
                    value={hCoin}
                    onChangeText={setHCoin}
                    keyboardType="number-pad"
                    placeholder="coin_cost"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <TextInput
                    style={AdminStil.input}
                    value={hDiamond}
                    onChangeText={setHDiamond}
                    keyboardType="number-pad"
                    placeholder="diamond_value"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <TextInput
                    style={AdminStil.input}
                    value={hRarity}
                    onChangeText={setHRarity}
                    placeholder="rarity"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <View style={AdminStil.aksiyonSatir}>
                    <Pressable
                      style={AdminStil.aksiyon}
                      onPress={() => void hediyeKaydet()}
                    >
                      <Text style={AdminStil.aksiyonYazi}>Kaydet</Text>
                    </Pressable>
                    <Pressable
                      style={AdminStil.aksiyon}
                      onPress={() => setDuzenHediyeId(null)}
                    >
                      <Text style={AdminStil.aksiyonYazi}>İptal</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={AdminStil.aksiyonSatir}>
                  <Pressable style={AdminStil.aksiyon} onPress={() => hediyeDuzenAc(h)}>
                    <Text style={AdminStil.aksiyonYazi}>Düzenle</Text>
                  </Pressable>
                  <Pressable
                    style={AdminStil.aksiyon}
                    onPress={async () => {
                      try {
                        await AdminHediyeGuncelle({
                          id: h.id,
                          isActive: !h.is_active,
                        });
                        await yukle();
                      } catch (e) {
                        Alert.alert(
                          'Hata',
                          e instanceof Error ? e.message : 'Güncellenemedi',
                        );
                      }
                    }}
                  >
                    <Text style={AdminStil.aksiyonYazi}>
                      {h.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
