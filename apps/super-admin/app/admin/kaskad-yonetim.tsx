/**
 * Realm of Storms — Admin Kontrol Merkezi.
 * Observed analytics, math profil versiyonlama, round/refund, audit ve
 * simülasyon (theoretical RTP) tek ekranda. Tüm yetki backend'de doğrulanır.
 * Gizli sonuç manipülasyonu YOKTUR; math profili tüm oyuncular için ortaktır.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  kaskadAdminAuditList,
  kaskadAdminMathActivate,
  kaskadAdminMathCreate,
  kaskadAdminMathList,
  kaskadAdminMuzikList,
  kaskadAdminRefund,
  kaskadAdminRoundList,
  kaskadAdminScheduleCancel,
  kaskadAdminScheduleCreate,
  kaskadAdminScheduleList,
  kaskadAdminSettingsGet,
  kaskadAdminSettingsUpdate,
  kaskadAdminSimList,
  kaskadAdminSimSave,
  kaskadAdminStats,
  type KaskadAdminRoundRow,
  type KaskadAdminStats,
  type KaskadAuditRow,
  type KaskadGameSettings,
  type KaskadMathVersionRow,
  type KaskadMusicAdminState,
  type KaskadScheduleRow,
  type KaskadSimRunRow,
} from '../../../../src/moduller/oyunlar/kaskad/servisler/KaskadAdminApi';
import {
  runBatchSimulationAsync,
  type SimulationReport,
} from '../../../../src/moduller/oyunlar/kaskad/motor/SpinSimulator';
import type { KaskadMathConfig } from '../../../../src/moduller/oyunlar/kaskad/tipler/KaskadTipleri';
import { KaskadAdminMuzikPaneli } from '../../../../src/moduller/admin/oyunlar/KaskadAdminMuzikPaneli';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Sekme =
  | 'analitik'
  | 'ayarlar'
  | 'muzik'
  | 'takvim'
  | 'math'
  | 'roundlar'
  | 'simulasyon'
  | 'audit';

const SEKMELER: Array<{ id: Sekme; ad: string }> = [
  { id: 'analitik', ad: 'Analitik' },
  { id: 'ayarlar', ad: 'Ayarlar' },
  { id: 'muzik', ad: 'Müzik' },
  { id: 'takvim', ad: 'RTP Takvim' },
  { id: 'math', ad: 'Math Profil' },
  { id: 'roundlar', ad: 'Roundlar' },
  { id: 'simulasyon', ad: 'Simülasyon' },
  { id: 'audit', ad: 'Audit' },
];

/** Takvim süre ön ayarları (saat) */
const SURE_SECENEKLERI: Array<{ ad: string; saat: number }> = [
  { ad: '1 saat', saat: 1 },
  { ad: '6 saat', saat: 6 },
  { ad: '24 saat', saat: 24 },
  { ad: '3 gün', saat: 72 },
  { ad: '7 gün', saat: 168 },
];

const SIM_ROUND_SECENEKLERI = [10_000, 50_000, 100_000] as const;
const RTP_HEDEF_ALT = 0.9;
const RTP_HEDEF_UST = 0.99;

function yuzde(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function sayi(v: number): string {
  return Math.round(v).toLocaleString('tr-TR');
}

export default function KaskadYonetimEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);

  const [sekme, setSekme] = useState<Sekme>('analitik');
  const [yukleniyor, setYukleniyor] = useState(false);

  // Analitik
  const [gun, setGun] = useState(1);
  const [stats, setStats] = useState<KaskadAdminStats | null>(null);

  // Math
  const [mathList, setMathList] = useState<KaskadMathVersionRow[]>([]);
  const [yeniVersiyon, setYeniVersiyon] = useState('');
  const [yeniConfigJson, setYeniConfigJson] = useState('');
  const [mathSebep, setMathSebep] = useState('');

  // Roundlar / refund
  const [roundlar, setRoundlar] = useState<KaskadAdminRoundRow[]>([]);
  const [refundSebep, setRefundSebep] = useState('');
  const [kullaniciFiltre, setKullaniciFiltre] = useState('');

  // Audit
  const [auditler, setAuditler] = useState<KaskadAuditRow[]>([]);

  // Simülasyon
  const [simRounds, setSimRounds] = useState<number>(SIM_ROUND_SECENEKLERI[0]);
  const [simKosuyor, setSimKosuyor] = useState(false);
  const [simIlerleme, setSimIlerleme] = useState(0);
  const [simRapor, setSimRapor] = useState<SimulationReport | null>(null);
  const [simGecmis, setSimGecmis] = useState<KaskadSimRunRow[]>([]);
  const simIptal = useRef(false);

  // Ayarlar
  const [ayarlar, setAyarlar] = useState<KaskadGameSettings | null>(null);
  const [ayarMinBet, setAyarMinBet] = useState('');
  const [ayarMaxBet, setAyarMaxBet] = useState('');
  const [ayarPresets, setAyarPresets] = useState('');
  const [ayarGunlukBahis, setAyarGunlukBahis] = useState('');
  const [ayarGunlukKayip, setAyarGunlukKayip] = useState('');
  const [ayarGunlukRound, setAyarGunlukRound] = useState('');
  const [ayarBakimMesaj, setAyarBakimMesaj] = useState('');
  const [ayarSebep, setAyarSebep] = useState('');

  // Müzik playlist
  const [muzikState, setMuzikState] = useState<KaskadMusicAdminState | null>(null);
  const [muzikBusy, setMuzikBusy] = useState(false);

  // RTP Takvim
  const [takvim, setTakvim] = useState<KaskadScheduleRow[]>([]);
  const [takvimProfil, setTakvimProfil] = useState<string | null>(null);
  const [takvimBaslangic, setTakvimBaslangic] = useState('');
  const [takvimSure, setTakvimSure] = useState<number>(24);
  const [takvimSebep, setTakvimSebep] = useState('');

  const aktifMath = useMemo(
    () => mathList.find((m) => m.isActive) ?? null,
    [mathList],
  );

  const yukle = useCallback(async (hedef: Sekme, days = gun) => {
    setYukleniyor(true);
    try {
      if (hedef === 'analitik') setStats(await kaskadAdminStats(days));
      if (hedef === 'math') setMathList(await kaskadAdminMathList());
      if (hedef === 'roundlar') {
        setRoundlar(
          await kaskadAdminRoundList(30, kullaniciFiltre.trim() || undefined),
        );
      }
      if (hedef === 'audit') setAuditler(await kaskadAdminAuditList(50));
      if (hedef === 'simulasyon') {
        const [liste, math] = await Promise.all([
          kaskadAdminSimList(10),
          kaskadAdminMathList(),
        ]);
        setSimGecmis(liste);
        setMathList(math);
      }
      if (hedef === 'ayarlar') {
        const s = await kaskadAdminSettingsGet();
        setAyarlar(s);
        setAyarMinBet(s.minBet != null ? String(s.minBet) : '');
        setAyarMaxBet(s.maxBet != null ? String(s.maxBet) : '');
        setAyarPresets(s.betPresets != null ? s.betPresets.join(',') : '');
        setAyarGunlukBahis(s.maxDailyWager != null ? String(s.maxDailyWager) : '');
        setAyarGunlukKayip(s.maxDailyLoss != null ? String(s.maxDailyLoss) : '');
        setAyarGunlukRound(
          s.maxRoundsPerDay != null ? String(s.maxRoundsPerDay) : '',
        );
        setAyarBakimMesaj(s.maintenanceMessage);
      }
      if (hedef === 'muzik') {
        setMuzikState(await kaskadAdminMuzikList());
      }
      if (hedef === 'takvim') {
        const [liste, math] = await Promise.all([
          kaskadAdminScheduleList(20),
          kaskadAdminMathList(),
        ]);
        setTakvim(liste);
        setMathList(math);
        setTakvimProfil((prev) => prev ?? math[0]?.mathVersion ?? null);
      }
    } catch (e) {
      Alert.alert('Kaskad Yönetim', e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, [gun, kullaniciFiltre]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)');
        return;
      }
      void yukle(sekme);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admin, sekme]),
  );

  useEffect(() => () => {
    simIptal.current = true;
  }, []);

  const mathAktifle = (versiyon: string) => {
    Alert.alert(
      'Math profili aktifle',
      `${versiyon} tüm oyuncular için aktif edilecek. Devam?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Aktifle',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await kaskadAdminMathActivate(
                  versiyon,
                  mathSebep || 'admin panel aktivasyonu',
                );
                await yukle('math');
                Alert.alert('Tamam', `${versiyon} aktif edildi (audit log yazıldı).`);
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'Aktifleme başarısız');
              }
            })();
          },
        },
      ],
    );
  };

  const mathOlustur = async () => {
    const ad = yeniVersiyon.trim();
    if (ad.length < 3) {
      Alert.alert('Math Profil', 'Versiyon adı en az 3 karakter olmalı (örn. storm-v2).');
      return;
    }
    let parsed: KaskadMathConfig;
    try {
      parsed = JSON.parse(yeniConfigJson) as KaskadMathConfig;
    } catch {
      Alert.alert('Math Profil', 'Config JSON geçersiz.');
      return;
    }
    try {
      await kaskadAdminMathCreate({
        mathVersion: ad,
        config: parsed,
        activate: false,
        reason: mathSebep || 'yeni math versiyonu',
      });
      setYeniVersiyon('');
      await yukle('math');
      Alert.alert(
        'Oluşturuldu',
        `${ad} kaydedildi (pasif). Aktiflemeden önce simülasyon koşmanız önerilir.`,
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Oluşturma başarısız');
    }
  };

  const refundYap = (round: KaskadAdminRoundRow) => {
    const sebep = refundSebep.trim();
    if (sebep.length < 3) {
      Alert.alert('Refund', 'Önce gerekçe yazın (audit log için zorunlu).');
      return;
    }
    Alert.alert(
      'Bahis iadesi',
      `${sayi(round.betAmount)} coin, ${round.userId.slice(0, 8)}… kullanıcısına iade edilecek. Devam?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İade et',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const r = await kaskadAdminRefund(round.id, sebep);
                if (!r.ok) {
                  Alert.alert('Refund', r.error === 'already_refunded'
                    ? 'Bu round zaten iade edilmiş.'
                    : r.error === 'bonus_spin_has_no_bet'
                      ? 'Bonus spin — iade edilecek bahis yok.'
                      : 'İade yapılamadı.');
                  return;
                }
                await yukle('roundlar');
                Alert.alert('Tamam', `${sayi(r.refund ?? 0)} coin iade edildi.`);
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'İade başarısız');
              }
            })();
          },
        },
      ],
    );
  };

  const simKos = async () => {
    if (!aktifMath) {
      Alert.alert('Simülasyon', 'Aktif math profili bulunamadı.');
      return;
    }
    setSimKosuyor(true);
    setSimIlerleme(0);
    setSimRapor(null);
    simIptal.current = false;
    const bet = aktifMath.config.betPresets[0] ?? 20;
    try {
      const rapor = await runBatchSimulationAsync(
        aktifMath.config,
        simRounds,
        bet,
        {
          seedPrefix: `admin-${Date.now()}`,
          onProgress: (done, total) => setSimIlerleme(done / total),
          shouldCancel: () => simIptal.current,
        },
      );
      setSimRapor(rapor);
      await kaskadAdminSimSave({
        mathVersion: aktifMath.mathVersion,
        rounds: rapor.rounds,
        betAmount: bet,
        report: rapor,
      });
      setSimGecmis(await kaskadAdminSimList(10));
      if (rapor.observedRtp < RTP_HEDEF_ALT || rapor.observedRtp > RTP_HEDEF_UST) {
        Alert.alert(
          'RTP Uyarısı',
          `Simüle RTP ${yuzde(rapor.observedRtp)} — hedef bant ${yuzde(RTP_HEDEF_ALT)}–${yuzde(RTP_HEDEF_UST)} dışında. Bu profili aktiflemeden önce kalibre edin.`,
        );
      }
    } catch (e) {
      Alert.alert('Simülasyon', e instanceof Error ? e.message : 'Simülasyon başarısız');
    } finally {
      setSimKosuyor(false);
    }
  };

  const ayarGonder = async (
    patch: Record<string, unknown>,
    sebep?: string,
  ) => {
    const gerekce = sebep ?? ayarSebep.trim();
    if (gerekce.length < 3) {
      Alert.alert('Ayarlar', 'Önce gerekçe yazın (audit log için zorunlu).');
      return;
    }
    try {
      const s = await kaskadAdminSettingsUpdate(patch, gerekce);
      setAyarlar(s);
      Alert.alert('Kaydedildi', 'Ayar güncellendi (audit log yazıldı).');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt başarısız');
    }
  };

  const ayarLimitleriKaydet = () => {
    const sayiVeyaNull = (v: string): number | null => {
      const t = v.trim();
      if (!t) return null;
      const n = Math.floor(Number(t));
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    let presets: number[] | null = null;
    const presetText = ayarPresets.trim();
    if (presetText) {
      presets = presetText
        .split(',')
        .map((p) => Math.floor(Number(p.trim())))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (presets.length === 0) presets = null;
    }
    void ayarGonder({
      minBet: sayiVeyaNull(ayarMinBet),
      maxBet: sayiVeyaNull(ayarMaxBet),
      betPresets: presets,
      maxDailyWager: sayiVeyaNull(ayarGunlukBahis),
      maxDailyLoss: sayiVeyaNull(ayarGunlukKayip),
      maxRoundsPerDay: sayiVeyaNull(ayarGunlukRound),
      maintenanceMessage: ayarBakimMesaj,
    });
  };

  const takvimOlustur = async () => {
    if (!takvimProfil) {
      Alert.alert('RTP Takvim', 'Önce bir math profili seçin.');
      return;
    }
    const sebep = takvimSebep.trim();
    if (sebep.length < 3) {
      Alert.alert('RTP Takvim', 'Gerekçe zorunlu (audit log).');
      return;
    }
    let baslangic: Date;
    const bText = takvimBaslangic.trim();
    if (!bText) {
      baslangic = new Date();
    } else {
      baslangic = new Date(bText.replace(' ', 'T'));
      if (Number.isNaN(baslangic.getTime())) {
        Alert.alert(
          'RTP Takvim',
          'Başlangıç formatı geçersiz. Örn: 2026-09-20 18:00 (boş bırak → şimdi)',
        );
        return;
      }
    }
    const bitis = new Date(baslangic.getTime() + takvimSure * 3_600_000);
    try {
      await kaskadAdminScheduleCreate({
        mathVersion: takvimProfil,
        startsAt: baslangic.toISOString(),
        endsAt: bitis.toISOString(),
        reason: sebep,
      });
      setTakvimSebep('');
      setTakvimBaslangic('');
      await yukle('takvim');
      Alert.alert(
        'Planlandı',
        `${takvimProfil} → ${baslangic.toLocaleString('tr-TR')} – ${bitis.toLocaleString('tr-TR')}`,
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Takvim oluşturulamadı');
    }
  };

  const takvimIptalEt = (kayit: KaskadScheduleRow) => {
    Alert.alert(
      'Takvimi iptal et',
      `${kayit.mathVersion} penceresi iptal edilecek. Devam?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal et',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await kaskadAdminScheduleCancel(kayit.id, 'admin panel iptali');
                await yukle('takvim');
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'İptal başarısız');
              }
            })();
          },
        },
      ],
    );
  };

  /** Profil etiketinde simüle RTP göster */
  const profilEtiket = (m: KaskadMathVersionRow): string => {
    const rtp = m.lastSimRtp != null ? ` · RTP ${yuzde(Number(m.lastSimRtp))}` : '';
    return `${m.mathVersion}${rtp}`;
  };

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi
        title="Realm of Storms Yönetimi"
        subtitle="Ayarlar · müzik · RTP · math · refund · simülasyon"
      />

      <View style={styles.tabs}>
        {SEKMELER.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.tab, sekme === s.id && styles.tabOn]}
            onPress={() => setSekme(s.id)}
          >
            <Text style={[styles.tabText, sekme === s.id && styles.tabTextOn]}>
              {s.ad}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {yukleniyor ? <ActivityIndicator color={RenkTokenlari.accent} /> : null}

        {sekme === 'analitik' ? (
          <View style={styles.card}>
            <Text style={styles.title}>Observed metrikler</Text>
            <Text style={styles.hint}>
              Gerçek roundlardan hesaplanır (admin test roundları hariç). Theoretical
              RTP için Simülasyon sekmesini kullanın — ikisi farklı şeydir.
            </Text>
            <View style={styles.chips}>
              {[1, 7, 30].map((d) => (
                <Pressable
                  key={d}
                  style={[styles.chip, gun === d && styles.chipOn]}
                  onPress={() => {
                    setGun(d);
                    void yukle('analitik', d);
                  }}
                >
                  <Text style={[styles.chipText, gun === d && styles.chipTextOn]}>
                    {d} gün
                  </Text>
                </Pressable>
              ))}
            </View>
            {stats ? (
              <View style={styles.statGrid}>
                <Stat ad="Aktif oyuncu" deger={sayi(stats.activePlayers)} />
                <Stat ad="Round" deger={sayi(stats.roundCount)} />
                <Stat ad="Toplam bahis" deger={sayi(stats.totalWager)} />
                <Stat ad="Toplam ödeme" deger={sayi(stats.totalPayout)} />
                <Stat ad="Observed RTP" deger={yuzde(stats.observedRtp)} vurgu />
                <Stat ad="Hit rate" deger={yuzde(stats.hitRate)} />
                <Stat ad="Bonus rate" deger={yuzde(stats.bonusRate)} />
                <Stat ad="Ort. bahis" deger={sayi(stats.averageBet)} />
                <Stat ad="Ort. kazanç" deger={sayi(stats.averageWin)} />
                <Stat ad="Ort. cascade" deger={stats.averageCascades.toFixed(2)} />
                <Stat ad="Max kazanç" deger={sayi(stats.maxWin)} />
              </View>
            ) : null}
            {stats && Object.keys(stats.multiplierDistribution).length > 0 ? (
              <>
                <Text style={styles.section}>Multiplier dağılımı</Text>
                {Object.entries(stats.multiplierDistribution).map(([k, v]) => (
                  <Text key={k} style={styles.meta}>
                    {k}× → {sayi(v)} round
                  </Text>
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        {sekme === 'ayarlar' && ayarlar ? (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Acil kontroller</Text>
              <Text style={styles.hint}>
                Değişiklikler anında tüm oyunculara uygulanır ve audit log'a yazılır.
                Gerekçe alanı zorunludur.
              </Text>
              <View style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <Text style={styles.gameName}>Yeni roundları durdur</Text>
                  <Text style={styles.meta}>
                    Başlamış bonus spinleri adil şekilde tamamlanır
                  </Text>
                </View>
                <Pressable
                  style={[styles.smallBtn, ayarlar.gamePaused && styles.smallBtnDanger]}
                  onPress={() =>
                    void ayarGonder(
                      { gamePaused: !ayarlar.gamePaused },
                      ayarlar.gamePaused ? 'oyunu tekrar aç' : 'acil durdurma',
                    )
                  }
                >
                  <Text style={styles.smallBtnText}>
                    {ayarlar.gamePaused ? 'DURDURULDU — Aç' : 'Durdur'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <Text style={styles.gameName}>Bakım modu</Text>
                  <Text style={styles.meta}>Oyun tamamen kapanır (admin test hariç)</Text>
                </View>
                <Pressable
                  style={[
                    styles.smallBtn,
                    ayarlar.maintenanceMode && styles.smallBtnDanger,
                  ]}
                  onPress={() =>
                    void ayarGonder(
                      { maintenanceMode: !ayarlar.maintenanceMode },
                      ayarlar.maintenanceMode ? 'bakım bitti' : 'bakım modu',
                    )
                  }
                >
                  <Text style={styles.smallBtnText}>
                    {ayarlar.maintenanceMode ? 'BAKIMDA — Kapat' : 'Bakıma al'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.label}>Bakım mesajı (oyuncuya gösterilir)</Text>
              <TextInput
                style={styles.input}
                value={ayarBakimMesaj}
                onChangeText={setAyarBakimMesaj}
                placeholder="Örn: Kısa bakım — 30 dk sonra buradayız"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <View style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <Text style={styles.gameName}>Autoplay</Text>
                </View>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() =>
                    void ayarGonder(
                      { autoplayEnabled: !(ayarlar.autoplayEnabled ?? true) },
                      'autoplay toggle',
                    )
                  }
                >
                  <Text style={styles.smallBtnText}>
                    {(ayarlar.autoplayEnabled ?? true) ? 'Açık — Kapat' : 'Kapalı — Aç'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <Text style={styles.gameName}>Turbo (hızlı mod)</Text>
                </View>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() =>
                    void ayarGonder(
                      { turboEnabled: !(ayarlar.turboEnabled ?? true) },
                      'turbo toggle',
                    )
                  }
                >
                  <Text style={styles.smallBtnText}>
                    {(ayarlar.turboEnabled ?? true) ? 'Açık — Kapat' : 'Kapalı — Aç'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Bahis ve günlük limitler</Text>
              <Text style={styles.hint}>
                Boş bırakılan alan math profili değerini kullanır. Günlük limitler
                kullanıcı başınadır (UTC günü) ve oyuncu koruması içindir.
              </Text>
              <Text style={styles.label}>Min bet</Text>
              <TextInput
                style={styles.input}
                value={ayarMinBet}
                onChangeText={setAyarMinBet}
                keyboardType="number-pad"
                placeholder="math profili: 10"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Text style={styles.label}>Max bet</Text>
              <TextInput
                style={styles.input}
                value={ayarMaxBet}
                onChangeText={setAyarMaxBet}
                keyboardType="number-pad"
                placeholder="math profili: 5000"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Text style={styles.label}>Bet seçenekleri (virgülle)</Text>
              <TextInput
                style={styles.input}
                value={ayarPresets}
                onChangeText={setAyarPresets}
                placeholder="10,20,50,100,250,500"
                autoCapitalize="none"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Text style={styles.label}>Günlük max bahis (kullanıcı başına)</Text>
              <TextInput
                style={styles.input}
                value={ayarGunlukBahis}
                onChangeText={setAyarGunlukBahis}
                keyboardType="number-pad"
                placeholder="boş = limitsiz"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Text style={styles.label}>Günlük max kayıp (kullanıcı başına)</Text>
              <TextInput
                style={styles.input}
                value={ayarGunlukKayip}
                onChangeText={setAyarGunlukKayip}
                keyboardType="number-pad"
                placeholder="boş = limitsiz"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Text style={styles.label}>Günlük max round (kullanıcı başına)</Text>
              <TextInput
                style={styles.input}
                value={ayarGunlukRound}
                onChangeText={setAyarGunlukRound}
                keyboardType="number-pad"
                placeholder="boş = limitsiz"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Text style={styles.label}>Gerekçe (audit — zorunlu)</Text>
              <TextInput
                style={styles.input}
                value={ayarSebep}
                onChangeText={setAyarSebep}
                placeholder="Örn: hafta sonu limit düzenlemesi"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Pressable style={styles.btn} onPress={ayarLimitleriKaydet}>
                <Text style={styles.btnText}>Limitleri kaydet</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {sekme === 'muzik' ? (
          <KaskadAdminMuzikPaneli
            state={muzikState}
            onChange={setMuzikState}
            busy={muzikBusy || yukleniyor}
            setBusy={setMuzikBusy}
          />
        ) : null}

        {sekme === 'takvim' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>RTP takvimi planla</Text>
              <Text style={styles.hint}>
                Seçilen tarih aralığında TÜM oyunculara seçilen profil uygulanır —
                kullanıcı bazlı gizli müdahale yoktur, her pencere audit log'a yazılır.
                Pencere dışında aktif profil (storm-v1) geçerlidir.
              </Text>
              <Text style={styles.label}>Profil (simüle RTP ile)</Text>
              <View style={styles.chips}>
                {mathList.map((m) => (
                  <Pressable
                    key={m.mathVersion}
                    style={[
                      styles.chip,
                      takvimProfil === m.mathVersion && styles.chipOn,
                    ]}
                    onPress={() => setTakvimProfil(m.mathVersion)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        takvimProfil === m.mathVersion && styles.chipTextOn,
                      ]}
                    >
                      {profilEtiket(m)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>
                Başlangıç (boş = şimdi · format: 2026-09-20 18:00)
              </Text>
              <TextInput
                style={styles.input}
                value={takvimBaslangic}
                onChangeText={setTakvimBaslangic}
                placeholder="şimdi"
                autoCapitalize="none"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Text style={styles.label}>Süre</Text>
              <View style={styles.chips}>
                {SURE_SECENEKLERI.map((s) => (
                  <Pressable
                    key={s.saat}
                    style={[styles.chip, takvimSure === s.saat && styles.chipOn]}
                    onPress={() => setTakvimSure(s.saat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        takvimSure === s.saat && styles.chipTextOn,
                      ]}
                    >
                      {s.ad}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Gerekçe (audit — zorunlu)</Text>
              <TextInput
                style={styles.input}
                value={takvimSebep}
                onChangeText={setTakvimSebep}
                placeholder="Örn: hafta sonu kampanyası — cömert profil"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Pressable style={styles.btn} onPress={() => void takvimOlustur()}>
                <Text style={styles.btnText}>Takvime ekle</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Planlanan pencereler</Text>
              {takvim.map((t) => (
                <View key={t.id} style={styles.rowBetween}>
                  <View style={styles.flex1}>
                    <Text
                      style={[styles.gameName, t.isLive && styles.gameNameOn]}
                    >
                      {t.mathVersion}
                      {t.isLive ? ' · ŞU AN AKTİF' : ''}
                      {t.status === 'cancelled' ? ' · iptal' : ''}
                    </Text>
                    <Text style={styles.meta}>
                      {new Date(t.startsAt).toLocaleString('tr-TR')} →{' '}
                      {new Date(t.endsAt).toLocaleString('tr-TR')}
                    </Text>
                    <Text style={styles.meta}>{t.reason}</Text>
                  </View>
                  {t.status === 'active' ? (
                    <Pressable
                      style={styles.smallBtn}
                      onPress={() => takvimIptalEt(t)}
                    >
                      <Text style={styles.smallBtnText}>İptal</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {takvim.length === 0 && !yukleniyor ? (
                <Text style={styles.meta}>Planlanmış pencere yok.</Text>
              ) : null}
            </View>
          </>
        ) : null}

        {sekme === 'math' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Math versiyonları (immutable)</Text>
              <Text style={styles.hint}>
                Var olan versiyon değiştirilemez; değişiklik için yeni versiyon
                oluşturup aktifleyin. Geçmiş roundlar kendi versiyonuna bağlı kalır.
              </Text>
              {mathList.map((m) => (
                <View key={m.mathVersion} style={styles.rowBetween}>
                  <View style={styles.flex1}>
                    <Text style={[styles.gameName, m.isActive && styles.gameNameOn]}>
                      {m.mathVersion} {m.isActive ? '· AKTİF' : ''}
                    </Text>
                    <Text style={styles.meta}>
                      {m.lastSimRtp != null
                        ? `Simüle RTP ${yuzde(Number(m.lastSimRtp))} · `
                        : ''}
                      {new Date(m.createdAt).toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  {!m.isActive ? (
                    <Pressable
                      style={styles.smallBtn}
                      onPress={() => mathAktifle(m.mathVersion)}
                    >
                      <Text style={styles.smallBtnText}>Aktifle</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              <Text style={styles.label}>Gerekçe (audit)</Text>
              <TextInput
                style={styles.input}
                value={mathSebep}
                onChangeText={setMathSebep}
                placeholder="Örn: RTP kalibrasyonu v2"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Yeni versiyon oluştur</Text>
              <Text style={styles.label}>Versiyon adı</Text>
              <TextInput
                style={styles.input}
                value={yeniVersiyon}
                onChangeText={setYeniVersiyon}
                placeholder="storm-v2"
                autoCapitalize="none"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Text style={styles.label}>Config JSON</Text>
              <View style={styles.rowBetween}>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => {
                    if (aktifMath) {
                      setYeniConfigJson(JSON.stringify(aktifMath.config, null, 2));
                    }
                  }}
                >
                  <Text style={styles.smallBtnText}>Aktif config'i kopyala</Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, styles.jsonInput]}
                value={yeniConfigJson}
                onChangeText={setYeniConfigJson}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                placeholder='{"symbolWeights": {...}, "paytable": {...}}'
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Pressable style={styles.btn} onPress={() => void mathOlustur()}>
                <Text style={styles.btnText}>Versiyonu oluştur (pasif)</Text>
              </Pressable>
              <Text style={styles.hint}>
                Oluşturulan versiyon pasiftir. Önce Simülasyon sekmesinden RTP testi
                koşun, sonra aktifleyin.
              </Text>
            </View>
          </>
        ) : null}

        {sekme === 'roundlar' ? (
          <View style={styles.card}>
            <Text style={styles.title}>Son roundlar</Text>
            <Text style={styles.label}>Kullanıcı ID filtresi (opsiyonel)</Text>
            <TextInput
              style={styles.input}
              value={kullaniciFiltre}
              onChangeText={setKullaniciFiltre}
              placeholder="uuid"
              autoCapitalize="none"
              placeholderTextColor={RenkTokenlari.textMuted}
              onSubmitEditing={() => void yukle('roundlar')}
            />
            <Text style={styles.label}>Refund gerekçesi (zorunlu)</Text>
            <TextInput
              style={styles.input}
              value={refundSebep}
              onChangeText={setRefundSebep}
              placeholder="Örn: sunucu hatası, round yarım kaldı"
              placeholderTextColor={RenkTokenlari.textMuted}
            />
            {roundlar.map((r) => (
              <View key={r.id} style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <Text style={styles.gameName}>
                    {sayi(r.betAmount)} → {sayi(r.winAmount)}
                    {r.totalMultiplier > 1 ? ` (${r.totalMultiplier}×)` : ''}
                    {r.isBonusSpin ? ' · bonus' : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {r.status} · {r.mathVersion} · {r.userId.slice(0, 8)}… ·{' '}
                    {new Date(r.createdAt).toLocaleString('tr-TR')}
                  </Text>
                </View>
                {r.status !== 'failed' && !r.isBonusSpin ? (
                  <Pressable style={styles.smallBtn} onPress={() => refundYap(r)}>
                    <Text style={styles.smallBtnText}>İade</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {roundlar.length === 0 && !yukleniyor ? (
              <Text style={styles.meta}>Round bulunamadı.</Text>
            ) : null}
          </View>
        ) : null}

        {sekme === 'simulasyon' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Theoretical RTP simülasyonu</Text>
              <Text style={styles.hint}>
                Aktif math profili ({aktifMath?.mathVersion ?? '—'}) üzerinde
                deterministik seed'li batch simülasyon. Bonuslar (retrigger +
                persistent multiplier dahil) hesaba katılır. Rapor sunucuya kaydedilir.
              </Text>
              <View style={styles.chips}>
                {SIM_ROUND_SECENEKLERI.map((n) => (
                  <Pressable
                    key={n}
                    style={[styles.chip, simRounds === n && styles.chipOn]}
                    onPress={() => setSimRounds(n)}
                  >
                    <Text style={[styles.chipText, simRounds === n && styles.chipTextOn]}>
                      {sayi(n)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[styles.btn, simKosuyor && styles.btnDisabled]}
                disabled={simKosuyor}
                onPress={() => void simKos()}
              >
                <Text style={styles.btnText}>
                  {simKosuyor
                    ? `Koşuyor… ${Math.round(simIlerleme * 100)}%`
                    : 'Simülasyonu başlat'}
                </Text>
              </Pressable>
              {simKosuyor ? (
                <Pressable
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={() => {
                    simIptal.current = true;
                  }}
                >
                  <Text style={styles.btnText}>Durdur</Text>
                </Pressable>
              ) : null}
            </View>

            {simRapor ? (
              <View style={styles.card}>
                <Text style={styles.title}>Rapor — {sayi(simRapor.rounds)} round</Text>
                <View style={styles.statGrid}>
                  <Stat ad="RTP" deger={yuzde(simRapor.observedRtp)} vurgu />
                  <Stat ad="Base RTP" deger={yuzde(simRapor.baseGameRtp)} />
                  <Stat ad="Bonus RTP" deger={yuzde(simRapor.bonusRtp)} />
                  <Stat ad="Hit rate" deger={yuzde(simRapor.hitRate)} />
                  <Stat ad="Sıfır kazanç" deger={yuzde(simRapor.zeroWinRate)} />
                  <Stat ad="Bonus frekansı" deger={yuzde(simRapor.bonusFrequency)} />
                  <Stat ad="Ort. kazanç" deger={simRapor.averageWin.toFixed(1)} />
                  <Stat ad="Medyan" deger={simRapor.medianWin.toFixed(1)} />
                  <Stat
                    ad="Max kazanç"
                    deger={`${sayi(simRapor.maxWin)} (${simRapor.maxWinMultiple.toFixed(0)}×)`}
                  />
                  <Stat ad="Ort. bonus ödemesi" deger={simRapor.averageBonusPayout.toFixed(0)} />
                  <Stat ad="Ort. cascade" deger={simRapor.averageCascades.toFixed(2)} />
                  <Stat ad="Std sapma" deger={simRapor.standardDeviation.toFixed(1)} />
                  <Stat ad="Max multiplier" deger={`${simRapor.maxMultiplier}×`} />
                  <Stat ad="Mult. frekansı" deger={yuzde(simRapor.multiplierFrequency)} />
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.title}>Geçmiş simülasyonlar</Text>
              {simGecmis.map((s) => (
                <View key={s.id} style={styles.rowBetween}>
                  <View style={styles.flex1}>
                    <Text style={styles.gameName}>
                      {s.mathVersion} · {sayi(s.rounds)} round
                    </Text>
                    <Text style={styles.meta}>
                      RTP {yuzde(s.report.observedRtp)} · hit {yuzde(s.report.hitRate)} ·{' '}
                      {new Date(s.createdAt).toLocaleString('tr-TR')}
                    </Text>
                  </View>
                </View>
              ))}
              {simGecmis.length === 0 && !yukleniyor ? (
                <Text style={styles.meta}>Kayıtlı simülasyon yok.</Text>
              ) : null}
            </View>
          </>
        ) : null}

        {sekme === 'audit' ? (
          <View style={styles.card}>
            <Text style={styles.title}>Audit log</Text>
            {auditler.map((a) => (
              <View key={a.id} style={styles.auditRow}>
                <Text style={styles.gameName}>{a.action}</Text>
                <Text style={styles.meta}>
                  admin {a.adminUserId?.slice(0, 8) ?? '—'}… ·{' '}
                  {a.roundId ? `round ${a.roundId.slice(0, 8)}… · ` : ''}
                  {new Date(a.createdAt).toLocaleString('tr-TR')}
                </Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {JSON.stringify(a.payload)}
                </Text>
              </View>
            ))}
            {auditler.length === 0 && !yukleniyor ? (
              <Text style={styles.meta}>Audit kaydı yok.</Text>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => router.push('/admin/kaskad-animasyon-lab' as never)}
        >
          <Text style={styles.btnText}>Animation Lab (görsel test)</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Stat({ ad, deger, vurgu }: { ad: string; deger: string; vurgu?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{ad}</Text>
      <Text style={[styles.statValue, vurgu && styles.statValueOn]}>{deger}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: BoslukTokenlari.md,
    gap: BoslukTokenlari.md,
    paddingBottom: 48,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: BoslukTokenlari.md,
    paddingBottom: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  tabOn: {
    backgroundColor: RenkTokenlari.violet,
    borderColor: RenkTokenlari.violet,
  },
  tabText: { color: RenkTokenlari.textMuted, fontSize: 12, fontWeight: '600' },
  tabTextOn: { color: '#fff' },
  card: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: 16,
    padding: BoslukTokenlari.md,
    gap: 10,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  title: {
    color: RenkTokenlari.text,
    fontSize: TipografiTokenlari.h2.fontSize,
    fontWeight: '700',
  },
  meta: {
    color: RenkTokenlari.textMuted,
    fontSize: TipografiTokenlari.caption.fontSize,
  },
  hint: {
    color: RenkTokenlari.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    marginTop: 8,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
  label: {
    color: RenkTokenlari.text,
    fontSize: TipografiTokenlari.caption.fontSize,
  },
  input: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.bg,
  },
  jsonInput: {
    minHeight: 140,
    textAlignVertical: 'top',
    fontSize: 11,
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
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    minWidth: '45%',
    flexGrow: 1,
    backgroundColor: RenkTokenlari.bg,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  statLabel: { color: RenkTokenlari.textMuted, fontSize: 11 },
  statValue: { color: RenkTokenlari.text, fontWeight: '700', fontSize: 15 },
  statValueOn: { color: RenkTokenlari.accent },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  flex1: { flex: 1, gap: 2 },
  gameName: {
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: TipografiTokenlari.body.fontSize,
  },
  gameNameOn: { color: RenkTokenlari.accent },
  auditRow: {
    gap: 2,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bg,
  },
  smallBtnDanger: {
    borderColor: '#E84091',
    backgroundColor: 'rgba(232,64,145,0.15)',
  },
  smallBtnText: { color: RenkTokenlari.text, fontWeight: '600', fontSize: 12 },
  btn: {
    marginTop: 4,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnSecondary: {
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  btnText: {
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
