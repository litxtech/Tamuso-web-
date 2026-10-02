/**
 * SİS Spin — bahis ve kazanç wallets.coins üzerinde, sunucu RPC'sinde.
 * Dilim sırası supabase/migrations/20261002183000_sis_spin_cevir.sql ile aynı.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { CanliCoinSimgesi } from '../../cuzdan/bilesenler/CanliCoinSimgesi';

const HALKA = 8;
const BAHISLER = [10, 50, 100, 250, 500, 1000] as const;
const TURLAR = [3, 4, 5, 6, 7, 8] as const;

type Dilim = { id: number; label: string; color: string };
type Sonuc = {
  segmentId: number;
  label: string;
  multiplier: number;
  bet: number;
  payout: number;
  balanceAfter: number;
};

const DILIMLER: Dilim[] = [
  { id: 0, label: '0', color: '#241433' },
  { id: 1, label: '½', color: '#6e4a16' },
  { id: 2, label: '1×', color: '#3b2158' },
  { id: 3, label: '2×', color: '#8f6420' },
  { id: 4, label: '3×', color: '#4e2c72' },
  { id: 5, label: '5×', color: '#b8892e' },
  { id: 6, label: '8×', color: '#2d1844' },
  { id: 7, label: '10×', color: '#d4a84a' },
];

const DILIM = 360 / DILIMLER.length;

function hedefAci(id: number): number {
  return (360 - id * DILIM) % 360;
}

function donusHesapla(mevcut: number, hedef: number, tur: number): number {
  const mod = ((mevcut % 360) + 360) % 360;
  const fark = (hedef - mod + 360) % 360;
  return mevcut + tur * 360 + fark;
}

function para(n: number): string {
  return Math.floor(n).toLocaleString('tr-TR');
}

function hataMetni(ham: string): string {
  const m = ham.toLowerCase();
  if (m.includes('insufficient')) return 'Yetersiz coin';
  if (m.includes('wallet')) return 'Cüzdan bulunamadı';
  if (m.includes('disabled')) return 'Oyun geçici olarak kapalı';
  if (m.includes('invalid bet')) return 'Bu bahis tutarı yok';
  return 'Çevirme tamamlanamadı';
}

function PastaDilimi({
  color,
  aci,
  taban,
  yaricap,
  merkez,
}: {
  color: string;
  aci: number;
  taban: number;
  yaricap: number;
  merkez: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: taban,
        height: yaricap,
        left: merkez - taban / 2,
        top: merkez - yaricap,
        alignItems: 'center',
        transformOrigin: '50% 100%',
        transform: [{ rotate: `${aci}deg` }],
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: taban / 2,
          borderRightWidth: taban / 2,
          borderTopWidth: yaricap,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
    </View>
  );
}

type Props = {
  onClose: () => void;
  embedded?: boolean;
};

export function SisSpinEkrani({ onClose, embedded = false }: Props) {
  const insets = useSafeAreaInsets();
  const [alan, setAlan] = useState({ w: 280, h: 280 });
  const { wallet, refreshWallet } = useAuth();
  const gercek = wallet?.coins ?? 0;
  const gercekRef = useRef(gercek);
  gercekRef.current = gercek;

  const [oturum, setOturum] = useState(false);
  const [donuyor, setDonuyor] = useState(false);
  const [oto, setOto] = useState(false);
  const [otoCalisiyor, setOtoCalisiyor] = useState(false);
  const [bahis, setBahis] = useState<(typeof BAHISLER)[number]>(50);
  const [tur, setTur] = useState<(typeof TURLAR)[number]>(6);
  const [sonTur, setSonTur] = useState<number | null>(null);
  const [anim, setAnim] = useState<number | null>(null);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [mesaj, setMesaj] = useState('Bahisi seç, Başlat, sonra Spin.');

  const aci = useRef(new Animated.Value(0)).current;
  const aciSayi = useRef(0);
  const devam = useRef(false);
  const donuyorRef = useRef(false);
  const bahisRef = useRef(bahis);
  const turRef = useRef(tur);
  const otoRef = useRef(oto);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bahisRef.current = bahis;
  }, [bahis]);
  useEffect(() => {
    turRef.current = tur;
  }, [tur]);
  useEffect(() => {
    otoRef.current = oto;
  }, [oto]);

  useEffect(() => {
    void refreshWallet();
    return () => {
      devam.current = false;
      aci.stopAnimation();
      if (zamanlayici.current) clearTimeout(zamanlayici.current);
    };
  }, [aci, refreshWallet]);

  const dondur = aci.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  const cevir = useCallback(async () => {
    if (donuyorRef.current) return;
    const tutar = bahisRef.current;
    if (gercekRef.current < tutar) {
      devam.current = false;
      setOtoCalisiyor(false);
      setMesaj('Yetersiz coin');
      return;
    }
    const secilenTur = otoRef.current
      ? TURLAR[Math.floor(Math.random() * TURLAR.length)]
      : turRef.current;

    donuyorRef.current = true;
    setDonuyor(true);
    setSonuc(null);
    setSonTur(secilenTur);
    setAnim(Math.max(0, gercekRef.current - tutar));
    setMesaj(`${para(tutar)} coin bahis · ${secilenTur} tur`);

    const { data, error } = await supabase.rpc('sis_spin_cevir', { p_bet: tutar });
    if (error || !data) {
      donuyorRef.current = false;
      setDonuyor(false);
      setAnim(null);
      devam.current = false;
      setOtoCalisiyor(false);
      setMesaj(hataMetni(error?.message ?? ''));
      return;
    }

    const gelen = data as Sonuc;
    const bitis = donusHesapla(aciSayi.current, hedefAci(gelen.segmentId), secilenTur);
    aciSayi.current = bitis;
    Animated.timing(aci, {
      toValue: bitis,
      duration: 1600 + secilenTur * 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      donuyorRef.current = false;
      setDonuyor(false);
      setAnim(gelen.balanceAfter);
      void refreshWallet().finally(() => setAnim(null));
      if (!finished) return;
      const net = gelen.payout - gelen.bet;
      setMesaj(
        net > 0 ? `${gelen.label} · +${para(net)} coin` : net === 0 ? `${gelen.label} · bahis geri geldi` : `${gelen.label}`,
      );
      if (devam.current) {
        zamanlayici.current = setTimeout(() => {
          if (devam.current) void cevir();
        }, 700);
        return;
      }
      setSonuc(gelen);
    });
  }, [aci, refreshWallet]);

  const baslat = useCallback(() => {
    if (donuyorRef.current) return;
    setOturum(true);
    setSonuc(null);
    if (otoRef.current) {
      devam.current = true;
      setOtoCalisiyor(true);
      void cevir();
      return;
    }
    setMesaj(`${para(bahisRef.current)} coin · ${turRef.current} tur. Spin ile çevir.`);
  }, [cevir]);

  const bitir = useCallback(() => {
    devam.current = false;
    setOtoCalisiyor(false);
    setOturum(false);
    setMesaj(donuyorRef.current ? 'Bu tur bitince duracak' : 'Tur bitti');
  }, []);

  const spin = useCallback(() => {
    if (!oturum) {
      setMesaj('Önce Başlat');
      return;
    }
    if (otoCalisiyor || donuyorRef.current) return;
    void cevir();
  }, [cevir, otoCalisiyor, oturum]);

  const kapat = useCallback(() => {
    devam.current = false;
    onClose();
  }, [onClose]);

  const gosterilen = anim ?? gercek;
  const net = sonuc ? sonuc.payout - sonuc.bet : 0;
  const boyut = Math.max(168, Math.floor(Math.min(alan.w - 12, alan.h - 8)));
  const ic = boyut - HALKA * 2;
  const merkez = ic / 2;
  const yaricap = ic / 2;
  const taban = yaricap * Math.tan(Math.PI / DILIMLER.length) * 2;
  const govde = Math.max(56, Math.round(boyut * 0.24));

  return (
    <LinearGradient colors={['#100c18', '#1b132c', '#120e0a']} style={styles.kok}>
      <View style={[styles.ustBlok, { paddingTop: embedded ? 12 : insets.top + 8 }]}>
        <View style={styles.ust}>
          <Pressable onPress={kapat} style={styles.kapat} accessibilityLabel="Kapat">
            <Text style={styles.kapatYazi}>Kapat</Text>
          </Pressable>
          <Text style={styles.marka}>SİS Spin</Text>
        </View>

        <View style={styles.cuzdan}>
          <CanliCoinSimgesi size={34} seviye={0.7} />
          <View style={styles.cuzdanMetin}>
            <Text style={styles.cuzdanEtiket}>Cüzdan</Text>
            <Text style={styles.cuzdanDeger}>{para(gosterilen)}</Text>
          </View>
          <Text style={styles.bahisEtiket}>{para(bahis)} bahis</Text>
        </View>
      </View>

      <View
        style={styles.sahne}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setAlan((onceki) =>
            onceki.w === width && onceki.h === height ? onceki : { w: width, h: height },
          );
        }}
      >
        <View style={[styles.carkKutu, { width: boyut, height: boyut }]}>
          <View style={styles.ibre} />
          <LinearGradient
            colors={['#8a733f', '#f8e7b5', '#b59b58', '#fff4d2', '#8a733f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.halka, { width: boyut, height: boyut, borderRadius: boyut / 2 }]}
          >
            <View style={[styles.klips, { width: ic, height: ic, borderRadius: ic / 2 }]}>
              <Animated.View style={[styles.cark, { width: ic, height: ic, transform: [{ rotate: dondur }] }]}>
                {DILIMLER.map((dilim) => (
                  <PastaDilimi
                    key={dilim.id}
                    color={dilim.color}
                    aci={dilim.id * DILIM}
                    taban={taban}
                    yaricap={yaricap}
                    merkez={merkez}
                  />
                ))}
                {DILIMLER.map((dilim) => (
                  <View
                    key={`cizgi-${dilim.id}`}
                    pointerEvents="none"
                    style={[
                      styles.ayrac,
                      {
                        left: merkez - 0.5,
                        height: merkez,
                        transform: [
                          { translateY: -merkez / 2 },
                          { rotate: `${dilim.id * DILIM + DILIM / 2}deg` },
                          { translateY: -merkez / 2 },
                        ],
                      },
                    ]}
                  />
                ))}
                {DILIMLER.map((dilim) => {
                  const derece = dilim.id * DILIM;
                  const altin = dilim.id % 2 === 1;
                  return (
                    <View
                      key={`yazi-${dilim.id}`}
                      style={[
                        styles.yazi,
                        {
                          left: merkez - 26,
                          top: merkez - 16,
                          transform: [{ rotate: `${derece}deg` }, { translateY: -merkez * 0.62 }],
                        },
                      ]}
                    >
                      <View style={{ transform: [{ rotate: `${-derece}deg` }] }}>
                        <Text style={[styles.etiket, altin && styles.etiketKoyu]}>{dilim.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </Animated.View>
            </View>
          </LinearGradient>
          <View
            style={[
              styles.govdeSabit,
              { width: govde, height: govde, borderRadius: govde / 2 },
            ]}
          >
            <Text style={styles.govdeSayi}>{sonTur ?? tur}</Text>
            <Text style={styles.govdeYazi}>tur</Text>
          </View>
        </View>
      </View>

      <View style={[styles.dok, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Text style={styles.mesaj}>{mesaj}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bahisSatir}
        >
          {BAHISLER.map((tutar) => {
            const secili = tutar === bahis;
            const yetmez = gercek < tutar;
            return (
              <Pressable
                key={tutar}
                disabled={donuyor || otoCalisiyor}
                onPress={() => setBahis(tutar)}
                style={[styles.bahisCip, secili && styles.bahisCipSecili, yetmez && styles.bahisSoluk]}
              >
                <Text style={[styles.bahisYazi, secili && styles.bahisYaziSecili]}>{para(tutar)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.satir}>
          <Pressable onPress={baslat} disabled={donuyor || otoCalisiyor} style={[styles.tus, styles.baslat]}>
            <Text style={styles.tusYaziKoyu}>Başlat</Text>
          </Pressable>
          <Pressable onPress={spin} disabled={!oturum || donuyor || otoCalisiyor} style={[styles.tus, styles.spin, (!oturum || donuyor || otoCalisiyor) && styles.pasif]}>
            <Text style={styles.tusYazi}>Spin</Text>
          </Pressable>
          <Pressable onPress={bitir} style={[styles.tus, styles.bitir]}>
            <Text style={styles.tusYazi}>Bitir</Text>
          </Pressable>
        </View>

        <View style={styles.turSatir}>
          {TURLAR.map((n) => {
            const secili = n === tur;
            return (
              <Pressable
                key={n}
                disabled={donuyor || otoCalisiyor}
                onPress={() => setTur(n)}
                style={[styles.turCip, secili && styles.turCipSecili]}
              >
                <Text style={[styles.turYazi, secili && styles.turYaziSecili]}>{n}</Text>
              </Pressable>
            );
          })}
          <Pressable
            disabled={donuyor || otoCalisiyor}
            onPress={() => setOto((v) => !v)}
            style={[styles.oto, oto && styles.otoAcik]}
          >
            <Text style={[styles.otoYazi, oto && styles.otoYaziAcik]}>{oto ? 'Otomatik' : 'Tek tur'}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={sonuc != null && !otoCalisiyor} transparent animationType="fade" onRequestClose={() => setSonuc(null)}>
        <View style={styles.perde}>
          <LinearGradient colors={['#1c1428', '#24180c']} style={styles.kutu}>
            <CanliCoinSimgesi size={48} seviye={0.8} />
            <Text style={styles.kutuBaslik}>{sonuc?.label}</Text>
            <Text style={styles.kutuGovde}>
              {net > 0 ? `+${para(net)} coin` : net === 0 ? 'Bahis geri geldi' : `−${para(Math.abs(net))} coin`}
            </Text>
            <Text style={styles.kutuAlt}>Cüzdan {sonuc ? para(sonuc.balanceAfter) : ''}</Text>
            <Pressable onPress={() => setSonuc(null)} style={styles.kutuTus}>
              <Text style={styles.tusYaziKoyu}>Devam</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  ustBlok: { paddingHorizontal: 16, gap: 12 },
  ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kapat: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  kapatYazi: { color: '#fff', fontWeight: '700' },
  marka: { color: '#f0d58c', fontSize: 16, fontWeight: '800', letterSpacing: 0.6 },
  cuzdan: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 120, 0.22)',
  },
  cuzdanMetin: { flex: 1 },
  cuzdanEtiket: { color: 'rgba(255,214,120,0.8)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cuzdanDeger: { color: '#fff', fontSize: 26, fontWeight: '800' },
  bahisEtiket: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
  bahisSatir: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  bahisCip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bahisCipSecili: { backgroundColor: '#f0d58c' },
  bahisSoluk: { opacity: 0.4 },
  bahisYazi: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bahisYaziSecili: { color: '#2a1b08' },
  sahne: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  carkKutu: { alignItems: 'center', justifyContent: 'center' },
  ibre: {
    position: 'absolute',
    top: -6,
    zIndex: 6,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#f8e7b5',
  },
  halka: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: HALKA,
  },
  klips: {
    overflow: 'hidden',
    backgroundColor: '#120c18',
  },
  cark: { backgroundColor: '#120c18' },
  ayrac: {
    position: 'absolute',
    top: '50%',
    width: 1,
    backgroundColor: 'rgba(248, 231, 181, 0.28)',
  },
  yazi: {
    position: 'absolute',
    width: 52,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiket: { color: '#fff', fontWeight: '800', fontSize: 15 },
  etiketKoyu: { color: '#1a1208' },
  govdeSabit: {
    position: 'absolute',
    backgroundColor: '#140e18',
    borderWidth: 3,
    borderColor: '#f0d58c',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  govdeSayi: { color: '#fff', fontSize: 22, fontWeight: '800' },
  govdeYazi: { color: 'rgba(255,214,120,0.85)', fontSize: 11, fontWeight: '700' },
  dok: {
    backgroundColor: '#0B0D16',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(248, 231, 181, 0.28)',
  },
  mesaj: { color: 'rgba(255,255,255,0.78)', textAlign: 'center', fontWeight: '600' },
  satir: { flexDirection: 'row', gap: 8 },
  tus: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16 },
  baslat: { backgroundColor: '#f0d58c' },
  spin: { backgroundColor: '#7a4ea0' },
  bitir: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  pasif: { opacity: 0.45 },
  tusYazi: { color: '#fff', fontWeight: '800', fontSize: 16 },
  tusYaziKoyu: { color: '#2a1b08', fontWeight: '800', fontSize: 16 },
  turSatir: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  turCip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  turCipSecili: { backgroundColor: '#f0d58c' },
  turYazi: { color: '#fff', fontWeight: '700' },
  turYaziSecili: { color: '#2a1b08' },
  oto: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  otoAcik: { backgroundColor: '#f0d58c' },
  otoYazi: { color: '#fff', fontWeight: '700', fontSize: 12 },
  otoYaziAcik: { color: '#2a1b08' },
  perde: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  kutu: {
    width: '100%',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 120, 0.28)',
  },
  kutuBaslik: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 6 },
  kutuGovde: { color: '#f0d58c', fontSize: 18, fontWeight: '700' },
  kutuAlt: { color: 'rgba(255,255,255,0.62)', marginBottom: 8 },
  kutuTus: { backgroundColor: '#f0d58c', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 12 },
});
