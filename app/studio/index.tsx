import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi, guvenliGeriDon } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import {
  StudioDurumAl,
  StudioKabulEt,
  StudioOyunlarim,
  type StudioDurum,
  type StudioOyun,
} from '../../src/moduller/studio/StudioApi';
import { StudioV2Kapaklar, StudioV2Kaydet } from '../../src/moduller/studio/v2/StudioV2Api';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { StudioEv } from '../../src/moduller/studio/v2/ui/StudioEv';
import { StudioOnay } from '../../src/moduller/studio/v2/ui/Bilesenler';
import { uretimArkaPlan } from '../../src/moduller/studio/v2/ui/uretimKuyrugu';
import {
  StudioProjeAdlandir,
  StudioProjeArsivle,
  StudioProjeCogalt,
  StudioProjeSil,
} from '../../src/moduller/studio/v2/ui/projeIslem';
import { AnalyticsOlayEkle } from '../../src/moduller/guvenlik/analytics/AnalyticsOlayEkle';

type Secim = { kind: string; dimension: 'auto' | '2d' | '3d'; players: 'auto' | '1' | '4' };

export default function StudioEkrani() {
  const { t, dil, rtl } = useCeviri();
  const router = useRouter();
  const [durum, setDurum] = useState<StudioDurum | null>(null);
  const [oyunlar, setOyunlar] = useState<StudioOyun[]>([]);
  const [prompt, setPrompt] = useState('');
  const [secim, setSecim] = useState<Secim>({ kind: 'auto', dimension: 'auto', players: 'auto' });
  const [silinecek, setSilinecek] = useState<StudioOyun[]>([]);
  const [kabul, setKabul] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kapaklar, setKapaklar] = useState<Record<string, string>>({});
  const hizala = rtl ? 'right' : 'left';

  const yukle = useCallback(async () => {
    const d = await StudioDurumAl(dil);
    if ('kod' in d) {
      setDurum(null);
      setHata(t('studio.kapali'));
      return;
    }
    setDurum(d);
    if (d.studio_enabled && d.accepted) {
      const liste = await StudioOyunlarim();
      setOyunlar(liste);
      liste.filter((o) => o.runtime_type === 'tamuso_game_v2' && ['PLANNING', 'GENERATING_ASSETS', 'BUILDING_SCENE', 'BUILDING_GAMEPLAY', 'SCANNING'].includes(o.status)).forEach((o) => uretimArkaPlan(o.id));
      const kapak = await StudioV2Kapaklar();
      if (kapak.ok && kapak.urls) setKapaklar(kapak.urls);
    }
  }, [dil, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const olustur = async () => {
    if (!durum || busy) return;
    setHata(null);
    setBusy(true);
    const kayit = await StudioV2Kaydet({
      prompt: prompt.trim(),
      title: '',
      options: { ...secim, hintsOnly: true },
    });
    if (kayit.error || !kayit.data || !(kayit.data as { id?: string }).id) {
      setBusy(false);
      const mesaj = kayit.error?.message ?? '';
      setHata(
        mesaj.includes('CREATE_DISABLED')
          ? t('studio.olusturmaKapali')
          : mesaj.includes('TERMS_REQUIRED')
            ? t('studio.sartGerekli')
            : t('ortak.birHataOlustu'),
      );
      return;
    }
    const id = (kayit.data as { id: string }).id;
    void AnalyticsOlayEkle('STUDIO_CREATE_PROMPT_SUBMIT', { gameId: id });
    setBusy(false);
    router.push(`/studio/${id}` as never);
  };

  const sil = async () => {
    const liste = silinecek;
    setSilinecek([]);
    const aktif = liste.some((o) => ['PLANNING', 'GENERATING_ASSETS', 'BUILDING_SCENE', 'BUILDING_GAMEPLAY', 'SCANNING'].includes(o.status));
    if (aktif) {
      setHata(t('studio.uretimAktif'));
      return;
    }
    for (const oyun of liste) {
      const sonuc = await StudioProjeSil(oyun.id);
      if (!sonuc.ok && sonuc.code.includes('GENERATION_ACTIVE')) setHata(t('studio.uretimAktif'));
    }
    void yukle();
  };

  const kabulEt = async () => {
    if (!kabul || busy) return;
    setBusy(true);
    const r = await StudioKabulEt();
    setBusy(false);
    if (!r.ok) {
      setHata(t('ortak.birHataOlustu'));
      return;
    }
    void yukle();
  };

  if (!durum) {
    return (
      <Screen>
        <EkranBasligi title={t('studio.baslik')} fallbackHref={'/' as never} />
        <View style={styles.orta}>
          {hata ? <Text style={[styles.metin, { textAlign: hizala }]}>{hata}</Text> : <ActivityIndicator color={RenkTokenlari.primarySoft} />}
        </View>
      </Screen>
    );
  }

  if (!durum.studio_enabled) {
    return (
      <Screen>
        <EkranBasligi title={t('studio.baslik')} fallbackHref={'/' as never} />
        <View style={styles.orta}>
          <Text style={[styles.baslik, { textAlign: hizala }]}>{t('studio.kapali')}</Text>
        </View>
      </Screen>
    );
  }

  if (!durum.accepted) {
    return (
      <Screen>
        <EkranBasligi title={t('studio.baslik')} fallbackHref={'/' as never} />
        <ScrollView contentContainerStyle={styles.icerik}>
          <Text style={[styles.baslik, { textAlign: hizala }]}>{t('studio.hosgeldin')}</Text>
          <Text style={[styles.metin, { textAlign: hizala }]}>{durum.terms || t('studio.hosgeldinMetin')}</Text>
          <Pressable style={styles.kutu} onPress={() => setKabul((v) => !v)}>
            <View style={[styles.tik, kabul && styles.tikAcik]} />
            <Text style={[styles.metin, { textAlign: hizala, flex: 1 }]}>{t('studio.sart')}</Text>
          </Pressable>
          {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          <Pressable style={[styles.birincil, !kabul && styles.kapali]} disabled={!kabul || busy} onPress={() => void kabulEt()}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.birincilYazi}>{t('studio.gir')}</Text>}
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen koyuSahne>
      <StudioEv
        t={t}
        rtl={rtl}
        prompt={prompt}
        setPrompt={setPrompt}
        secim={secim}
        setSecim={setSecim}
        hata={hata}
        busy={busy}
        durum={durum}
        oyunlar={oyunlar}
        kapaklar={kapaklar}
        onOlustur={() => void olustur()}
        onGeri={() => guvenliGeriDon('/(tabs)')}
        onProfil={() => router.push('/(tabs)/profile' as never)}
        onAyar={() => router.push('/ayarlar' as never)}
        onAc={(id) => router.push(`/studio/${id}` as never)}
        onAdKaydet={(oyun, title, description) => {
          void StudioProjeAdlandir(oyun.id, title, description).then(() => yukle());
        }}
        onCogalt={(oyun) => {
          void StudioProjeCogalt(oyun.id).then(() => yukle());
        }}
        onArsiv={(oyun) => {
          void StudioProjeArsivle(oyun.id, oyun.status !== 'ARCHIVED').then(() => yukle());
        }}
        onSil={(oyun) => setSilinecek([oyun])}
        onTopluSil={(idler) => setSilinecek(oyunlar.filter((o) => idler.includes(o.id)))}
        onTopluArsiv={(idler) => {
          void Promise.all(idler.map((id) => StudioProjeArsivle(id, true))).then(() => yukle());
        }}
        onDede={() => router.push('/studio/dede')}
      />
      <StudioOnay
        visible={silinecek.length > 0}
        baslik={t('studio.silSoru', { ad: silinecek[0]?.title || t('studio.taslak') })}
        govde={silinecek.some((o) => ['PLANNING', 'GENERATING_ASSETS', 'BUILDING_SCENE', 'BUILDING_GAMEPLAY', 'SCANNING'].includes(o.status)) ? t('studio.uretimAktif') : t('studio.silAciklama')}
        vazgec={t('studio.vazgec')}
        onay={t('studio.projeyiSil')}
        tehlike
        onVazgec={() => setSilinecek([])}
        onOnay={() => void sil()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: BoslukTokenlari.lg, gap: BoslukTokenlari.md, paddingBottom: 48 },
  orta: { padding: BoslukTokenlari.xl, gap: BoslukTokenlari.md },
  baslik: { ...TipografiTokenlari.title, color: RenkTokenlari.text, fontSize: 26 },
  soru: { ...TipografiTokenlari.title, color: RenkTokenlari.text, fontSize: 24 },
  alt: { ...TipografiTokenlari.body, color: RenkTokenlari.textMuted },
  creator: { color: RenkTokenlari.primarySoft, fontWeight: '800', letterSpacing: 1 },
  metin: { ...TipografiTokenlari.body, color: RenkTokenlari.text, lineHeight: 22 },
  etiket: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, fontWeight: '700' },
  not: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, lineHeight: 18 },
  hata: { ...TipografiTokenlari.caption, color: RenkTokenlari.danger },
  girdi: {
    minHeight: 120,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.bgCard,
    color: RenkTokenlari.text,
    padding: BoslukTokenlari.md,
    ...TipografiTokenlari.body,
  },
  cipSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cip: {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: RenkTokenlari.bgCard,
  },
  cipSecili: { borderColor: RenkTokenlari.primary, backgroundColor: RenkTokenlari.primary },
  cipYazi: { color: RenkTokenlari.text, fontWeight: '600' },
  cipYaziSecili: { color: '#fff' },
  birincil: {
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kapali: { opacity: 0.45 },
  birincilYazi: { color: '#fff', fontWeight: '700' },
  kutu: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tik: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    marginTop: 2,
  },
  tikAcik: { backgroundColor: RenkTokenlari.primary, borderColor: RenkTokenlari.primary },
  bolum: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700', marginTop: 8 },
  kart: {
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    overflow: 'hidden',
  },
  kapak: { width: '100%', height: 140, backgroundColor: '#120c16' },
  kapakBos: { width: '100%', height: 88, backgroundColor: '#120c16' },
  kartGovde: { padding: BoslukTokenlari.md, gap: 4 },
  onizle: { color: RenkTokenlari.primarySoft, fontWeight: '800', marginTop: 6 },
  kartBaslik: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
});
