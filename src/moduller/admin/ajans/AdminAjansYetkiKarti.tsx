import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AdminAjansCoinYukle,
  AdminAjansDistributorAyarla,
  AdminAjansLimitSet,
  AjansPanelDetayGetir,
  type AjansPanelDetay,
} from '../../ajanslar/islemler/AjansPanelIslemleri';
import {
  AdminAjansKomisyonGuncelle,
  AdminAjansKomisyonListele,
} from '../platform/AdminPlatformIslemleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

const LIMIT_ONSETLER = [
  { ad: 'Düşük', single: 5_000, daily: 25_000, monthly: 200_000, perUser: 10_000 },
  { ad: 'Standart', single: 10_000, daily: 50_000, monthly: 500_000, perUser: 20_000 },
  { ad: 'Yüksek', single: 50_000, daily: 250_000, monthly: 2_000_000, perUser: 100_000 },
  { ad: 'VIP', single: 200_000, daily: 1_000_000, monthly: 10_000_000, perUser: 500_000 },
];

function sayi(n: number) {
  return new Intl.NumberFormat('tr-TR').format(n);
}

export function AdminAjansYetkiKarti({ agencyId }: { agencyId: string }) {
  const [detay, setDetay] = useState<AjansPanelDetay | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [coin, setCoin] = useState('50000');
  const [single, setSingle] = useState('');
  const [daily, setDaily] = useState('');
  const [monthly, setMonthly] = useState('');
  const [perUser, setPerUser] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [ajansPct, setAjansPct] = useState('20');
  const [platformPct, setPlatformPct] = useState('10');
  const [hostPct, setHostPct] = useState('70');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [d, kom] = await Promise.all([
        AjansPanelDetayGetir(agencyId),
        AdminAjansKomisyonListele().catch(() => null),
      ]);
      setDetay(d);
      if (d.limits) {
        setSingle(String(d.limits.single_transfer_limit));
        setDaily(String(d.limits.daily_limit));
        setMonthly(String(d.limits.monthly_limit));
        setPerUser(String(d.limits.per_user_limit));
        setUnlimited(Boolean(d.limits.unlimited));
      }
      const row = kom?.items?.find((x) => x.agency_id === agencyId);
      if (row) {
        setAjansPct(String(Math.round(row.agency_share * 1000) / 10));
        setPlatformPct(String(Math.round(row.platform_share * 1000) / 10));
        setHostPct(String(Math.round(row.host_share * 1000) / 10));
      }
    } catch (e) {
      Alert.alert('Yetki', e instanceof Error ? e.message : 'Ajans yetkisi yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, [agencyId]);

  React.useEffect(() => {
    void yukle();
  }, [yukle]);

  const coinIsle = (delta: number) => {
    if (!delta) return;
    Alert.alert(
      delta > 0 ? 'Coin yükle' : 'Coin düşür',
      `Ajans bakiyesine ${delta > 0 ? '+' : ''}${sayi(delta)} coin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Uygula',
          onPress: () => {
            void (async () => {
              const r = await AdminAjansCoinYukle({
                agencyId,
                delta,
                reason: delta > 0 ? 'admin_topup' : 'admin_deduct',
              });
              if (!r.ok) Alert.alert('Coin', r.hata ?? 'İşlem olmadı');
              else Alert.alert('Tamam', `Yeni bakiye: ${sayi(r.distribution_balance ?? 0)}`);
              await yukle();
            })();
          },
        },
      ],
    );
  };

  const limitKaydet = async (
    paket?: (typeof LIMIT_ONSETLER)[number],
    sinirsiz = unlimited,
  ) => {
    const s = paket?.single ?? Math.floor(Number(single));
    const d = paket?.daily ?? Math.floor(Number(daily));
    const m = paket?.monthly ?? Math.floor(Number(monthly));
    const p = paket?.perUser ?? Math.floor(Number(perUser));
    if (!sinirsiz && [s, d, m, p].some((n) => !Number.isFinite(n) || n < 100)) {
      Alert.alert('Limit', 'Tek sefer, günlük, aylık ve kişi başı limit en az 100 olmalı.');
      return;
    }
    const r = await AdminAjansLimitSet({
      agencyId,
      single: s || 10000,
      daily: d || 50000,
      monthly: m || 500000,
      perUser: p || 20000,
      unlimited: sinirsiz,
    });
    if (!r.ok) Alert.alert('Limit', r.hata ?? 'Kaydedilemedi');
    else {
      setUnlimited(sinirsiz);
      Alert.alert('Tamam', sinirsiz ? 'Sınırsız coin yetkisi açıldı.' : 'Limitler güncellendi.');
    }
    await yukle();
  };

  const komisyonKaydet = async () => {
    const agencyShare = Number(String(ajansPct).replace(',', '.')) / 100;
    const platformShare = Number(String(platformPct).replace(',', '.')) / 100;
    if (
      ![agencyShare, platformShare].every((n) => Number.isFinite(n) && n >= 0) ||
      agencyShare + platformShare > 1
    ) {
      Alert.alert('Komisyon', 'Ajans ve platform payı birlikte %100’ü geçemez.');
      return;
    }
    try {
      const r = await AdminAjansKomisyonGuncelle({
        agencyId,
        agencyShare,
        platformShare,
      });
      setHostPct(String(Math.round(r.host_share * 1000) / 10));
      setAjansPct(String(Math.round(r.agency_share * 1000) / 10));
      setPlatformPct(String(Math.round(r.platform_share * 1000) / 10));
      Alert.alert('Komisyon', 'Paylar kaydedildi.');
    } catch (e) {
      Alert.alert('Komisyon', e instanceof Error ? e.message : 'Kaydedilemedi');
    }
  };

  const distributor = () => {
    const next = !detay?.agency.is_coin_distributor;
    Alert.alert(
      next ? 'Kullanıcıya coin gönderme yetkisi' : 'Coin gönderme yetkisini kapat',
      next
        ? 'Ajans, kendi bakiyesinden kullanıcılara coin gönderebilecek.'
        : 'Ajans artık kullanıcılara coin gönderemez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: next ? 'Yetki ver' : 'Kapat',
          style: next ? 'default' : 'destructive',
          onPress: () => {
            void (async () => {
              const r = await AdminAjansDistributorAyarla({ agencyId, enabled: next });
              if (!r.ok) Alert.alert('Yetki', r.hata ?? 'Kaydedilemedi');
              await yukle();
            })();
          },
        },
      ],
    );
  };

  if (yukleniyor && !detay) {
    return <ActivityIndicator color={RenkTokenlari.primarySoft} />;
  }
  if (!detay) return null;

  const bakiye = detay.wallet?.distribution_balance ?? 0;

  return (
    <View style={styles.kutu}>
      <Text style={styles.satir}>
        Dağıtım bakiyesi <Text style={styles.vurgu}>{sayi(bakiye)} coin</Text>
      </Text>
      <Text style={styles.alt}>
        {detay.agency.host_count} üye · güven {detay.agency.trust_tier} ·{' '}
        {detay.agency.status === 'active'
          ? 'aktif'
          : detay.agency.status === 'suspended'
            ? 'askıda'
            : detay.agency.status}
      </Text>

      <Text style={styles.etiket}>Coin yükle veya düş</Text>
      <TextInput
        style={styles.girdi}
        value={coin}
        onChangeText={setCoin}
        keyboardType="number-pad"
        placeholder="Miktar"
        placeholderTextColor={RenkTokenlari.textMuted}
      />
      <View style={styles.satirBtn}>
        <Pressable style={styles.btn} onPress={() => coinIsle(Math.floor(Number(coin) || 0))}>
          <Text style={styles.btnMint}>Yükle</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => coinIsle(-Math.floor(Number(coin) || 0))}>
          <Text style={styles.btnTehlike}>Düş</Text>
        </Pressable>
      </View>

      <View style={styles.anahtar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.etiket}>Kullanıcıya coin gönderme</Text>
          <Text style={styles.alt}>
            Açıkken ajans kendi bakiyesinden üyelere coin yollar.
          </Text>
        </View>
        <Switch value={!!detay.agency.is_coin_distributor} onValueChange={() => distributor()} />
      </View>

      <Text style={styles.etiket}>Transfer limitleri</Text>
      <Text style={styles.alt}>
        Tek sefer, günlük, aylık ve bir kullanıcıya gidebilecek en fazla coin.
      </Text>
      <View style={styles.satirBtn}>
        {LIMIT_ONSETLER.map((p) => (
          <Pressable key={p.ad} style={styles.cip} onPress={() => void limitKaydet(p, false)}>
            <Text style={styles.cipYazi}>{p.ad}</Text>
          </Pressable>
        ))}
      </View>
      <LimitSatir etiket="Tek sefer" deger={single} onChange={setSingle} />
      <LimitSatir etiket="Günlük" deger={daily} onChange={setDaily} />
      <LimitSatir etiket="Aylık" deger={monthly} onChange={setMonthly} />
      <LimitSatir etiket="Kişi başı" deger={perUser} onChange={setPerUser} />
      <View style={styles.anahtar}>
        <Text style={styles.etiket}>Sınırsız</Text>
        <Switch value={unlimited} onValueChange={setUnlimited} />
      </View>
      <Pressable style={styles.kaydet} onPress={() => void limitKaydet()}>
        <Text style={styles.btnMint}>Limitleri kaydet</Text>
      </Pressable>

      <Text style={styles.etiket}>Hediye payı</Text>
      <Text style={styles.alt}>Ajans ve platform birlikte %100’ü geçemez. Kalan hosta kalır.</Text>
      <LimitSatir etiket="Ajans %" deger={ajansPct} onChange={setAjansPct} />
      <LimitSatir etiket="Platform %" deger={platformPct} onChange={setPlatformPct} />
      <Text style={styles.alt}>Host payı %{hostPct}</Text>
      <Pressable style={styles.kaydet} onPress={() => void komisyonKaydet()}>
        <Text style={styles.btnMint}>Payı kaydet</Text>
      </Pressable>
    </View>
  );
}

function LimitSatir({
  etiket,
  deger,
  onChange,
}: {
  etiket: string;
  deger: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.limit}>
      <Text style={styles.limitEtiket}>{etiket}</Text>
      <TextInput
        style={styles.limitGirdi}
        value={deger}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholderTextColor={RenkTokenlari.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: { gap: 8 },
  satir: { ...TipografiTokenlari.body, color: RenkTokenlari.text },
  vurgu: { color: RenkTokenlari.mint, fontWeight: '800' },
  alt: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, lineHeight: 18 },
  etiket: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700', marginTop: 8 },
  girdi: {
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    color: RenkTokenlari.text,
  },
  satirBtn: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  btnMint: { ...TipografiTokenlari.caption, color: RenkTokenlari.mint, fontWeight: '800' },
  btnTehlike: { ...TipografiTokenlari.caption, color: RenkTokenlari.danger, fontWeight: '800' },
  anahtar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(61, 207, 176, 0.12)',
  },
  cipYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.mint, fontWeight: '700' },
  limit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitEtiket: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, width: 88 },
  limitGirdi: {
    flex: 1,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    color: RenkTokenlari.text,
  },
  kaydet: {
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 207, 176, 0.16)',
  },
});
