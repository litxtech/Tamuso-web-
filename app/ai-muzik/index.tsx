import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import { CamArkaplan } from '../../src/bilesenler/yuzey/CamArkaplan';
import { AiMuzikBeklemeAnimasyonu } from '../../src/moduller/ai-muzik/bilesenler/AiMuzikBeklemeAnimasyonu';
import { AiMuzikSatinAlmaSheet } from '../../src/moduller/ai-muzik/bilesenler/AiMuzikSatinAlmaSheet';
import {
  AiMuzikReferansKart,
  type AiMuzikReferansSecim,
} from '../../src/moduller/ai-muzik/bilesenler/AiMuzikReferansKart';
import {
  GelismisAyarlarSheet,
  type GelismisAyarlar,
} from '../../src/moduller/ai-muzik/bilesenler/GelismisAyarlarSheet';
import { useAiMuzikBakiye } from '../../src/moduller/ai-muzik/kancalar/useAiMuzikBakiye';
import {
  AiMuzikConfigGetir,
  AiMuzikHaklariDurumu,
  AiMuzikHaklariKabul,
  AiMuzikIdempotencyAnahtari,
  AiMuzikModerasyonum,
  AiMuzikOlustur,
  AiMuzikReferansYukle,
  AiMuzikTatGetir,
  AiMuzikTurAra,
  AiMuzikUrunOnbellekIsit,
} from '../../src/moduller/ai-muzik/islemler/AiMuzikApi';
import type { AiMuzikTaste } from '../../src/moduller/ai-muzik/tipler';
import { SureFormat } from '../../src/moduller/ai-muzik/utils/SureFormat';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { yuzenTabBarToplamYukseklik } from '../../src/components/YuzenTabBosluk';
import {
  KlavyeFocusKaydir,
  KlavyeScrollView,
  type KlavyeScrollHandle,
} from '../../src/bilesenler/klavye/KlavyeScrollView';

const SURE_PRESET = [60, 120, 180, 240, 300];
/** API’ye giden sabit değerler (TR); etiketler i18n */
const MOODS = [
  { value: 'Neşeli', key: 'aiMuzik.moodNeseli' as const },
  { value: 'Hüzünlü', key: 'aiMuzik.moodHuzunlu' as const },
  { value: 'Enerjik', key: 'aiMuzik.moodEnerjik' as const },
  { value: 'Rahat', key: 'aiMuzik.moodRahat' as const },
  { value: 'Epik', key: 'aiMuzik.moodEpik' as const },
];
const TEMPOS = [
  { value: 'Yavaş', key: 'aiMuzik.tempoYavas' as const },
  { value: 'Orta', key: 'aiMuzik.tempoOrta' as const },
  { value: 'Hızlı', key: 'aiMuzik.tempoHizli' as const },
];
const SESLER = [
  { id: 'female', key: 'aiMuzik.vokalKadin' as const },
  { id: 'male', key: 'aiMuzik.vokalErkek' as const },
  { id: 'choir', key: 'aiMuzik.vokalKoro' as const },
  { id: 'instrumental', key: 'aiMuzik.vokalEnstr' as const },
] as const;
type SesId = (typeof SESLER)[number]['id'];
const DILLER = [
  { kod: 'tr', key: 'aiMuzik.dilTr' as const },
  { kod: 'en', key: 'aiMuzik.dilEn' as const },
  { kod: 'es', key: 'aiMuzik.dilEs' as const },
];
const ORNEK_PROMPT_KEYS = [
  'aiMuzik.ornekPrompt1',
  'aiMuzik.ornekPrompt2',
  'aiMuzik.ornekPrompt3',
  'aiMuzik.ornekPrompt4',
] as const;

const MOOD_LABEL_KEYS: Record<string, (typeof MOODS)[number]['key']> = Object.fromEntries(
  MOODS.map((m) => [m.value, m.key]),
);

type ChipKey =
  | 'tur'
  | 'ruh'
  | 'dil'
  | 'sure'
  | 'tempo'
  | 'enstruman'
  | 'sozler'
  | 'gelismis';

const CHIP_SIRASI: ChipKey[] = [
  'sure',
  'tur',
  'ruh',
  'dil',
  'tempo',
  'enstruman',
  'sozler',
  'gelismis',
];

export default function AiMuzikStudioEkrani() {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { bakiye, yenile } = useAiMuzikBakiye();
  const promptRef = useRef<TextInput>(null);
  const kaydirRef = useRef<KlavyeScrollHandle>(null);
  const [prompt, setPrompt] = useState('');
  const [promptOdak, setPromptOdak] = useState(false);
  const [sureSn, setSureSn] = useState(120);
  const [genre, setGenre] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [tempo, setTempo] = useState<string | null>(null);
  const [ses, setSes] = useState<SesId | null>(null);
  const [dil, setDil] = useState<string | null>(null);
  const [turler, setTurler] = useState<Array<{ code: string; name: string }>>([]);
  const [aktifChip, setAktifChip] = useState<ChipKey | null>('sure');
  const [gelismis, setGelismis] = useState<GelismisAyarlar>({
    structure_hint: '',
    bpm: '',
    instruments: '',
    lyrics_mode: 'ai',
    lyrics: '',
    force_instrumental: false,
  });
  const [satinAl, setSatinAl] = useState(false);
  const [gelismisAcik, setGelismisAcik] = useState(false);
  const [bekle, setBekle] = useState(false);
  const [olusturuyor, setOlusturuyor] = useState(false);
  const [promptMax, setPromptMax] = useState(2000);
  const [lyricsMax, setLyricsMax] = useState(4000);
  const [hakKabul, setHakKabul] = useState(true);
  const [referans, setReferans] = useState<AiMuzikReferansSecim | null>(null);
  const [tat, setTat] = useState<AiMuzikTaste | null>(null);
  /** Opt-in: null = hafıza yok, yalnızca yazılan yeni prompt uygulanır */
  const [hafizaSecim, setHafizaSecim] = useState<
    null | 'last_prompt' | { kind: 'title'; title: string }
  >(null);
  const [createBlocked, setCreateBlocked] = useState(false);

  const bayrakAcik = OzellikBayragiAktifMi('ai_music_enabled');
  const altPad = yuzenTabBarToplamYukseklik(insets.bottom) + 16;

  useEffect(() => {
    AiMuzikUrunOnbellekIsit();
    void AiMuzikTurAra(undefined, 24).then(setTurler).catch(() => setTurler([]));
    void AiMuzikConfigGetir()
      .then((c) => {
        setPromptMax(c.prompt_max_length ?? 2000);
        setLyricsMax(c.lyrics_max_length ?? 4000);
      })
      .catch(() => undefined);
    void AiMuzikHaklariDurumu()
      .then((r) => setHakKabul(r.accepted))
      .catch(() => undefined);
    void AiMuzikTatGetir()
      .then(setTat)
      .catch(() => setTat(null));
    void AiMuzikModerasyonum()
      .then((m) => setCreateBlocked(!!m.create_blocked))
      .catch(() => undefined);
  }, []);

  const yeterliSure = bakiye.available_seconds >= sureSn;
  const promptDoluyor = prompt.trim().length > 0;

  const chipEtiket = useMemo(() => {
    const turAd = turler.find((x) => x.code === genre)?.name;
    const dilAd = dil ? DILLER.find((d) => d.kod === dil) : null;
    const moodAd = mood ? MOOD_LABEL_KEYS[mood] : null;
    const tempoAd = tempo
      ? TEMPOS.find((x) => x.value === tempo)?.key
      : null;
    return {
      tur: turAd ? turAd : t('aiMuzik.chipTur'),
      ruh: moodAd ? t(moodAd) : t('aiMuzik.chipRuh'),
      dil: dilAd ? t(dilAd.key) : t('aiMuzik.chipDil'),
      sure: t('aiMuzik.dk', { n: Math.round(sureSn / 60) }),
      tempo: tempoAd ? t(tempoAd) : t('aiMuzik.chipTempo'),
      enstruman: gelismis.instruments.trim()
        ? t('aiMuzik.chipEnstrumanOk')
        : t('aiMuzik.chipEnstruman'),
      sozler:
        gelismis.lyrics_mode === 'user'
          ? t('aiMuzik.chipSozlerOk')
          : gelismis.lyrics_mode === 'instrumental' || ses === 'instrumental'
            ? t('aiMuzik.vokalEnstr')
            : t('aiMuzik.chipSozler'),
      gelismis: t('aiMuzik.chipGelismis'),
    } as Record<ChipKey, string>;
  }, [genre, mood, dil, sureSn, tempo, gelismis, turler, ses, t]);

  const chipSecili = useCallback(
    (k: ChipKey) => {
      if (k === 'sure') return true;
      if (k === 'tur') return !!genre;
      if (k === 'ruh') return !!mood;
      if (k === 'dil') return !!dil;
      if (k === 'tempo') return !!tempo;
      if (k === 'enstruman') return !!gelismis.instruments.trim();
      if (k === 'sozler') return gelismis.lyrics_mode !== 'ai';
      if (k === 'gelismis') {
        return !!(gelismis.structure_hint || gelismis.bpm || gelismis.instruments);
      }
      return false;
    },
    [genre, mood, dil, tempo, gelismis],
  );

  const olustur = useCallback(async () => {
    if (olusturuyor || bekle) return;
    if (createBlocked) {
      Alert.alert(t('aiMuzik.kapaliBaslik'), t('aiMuzik.olusturmaKapali'));
      return;
    }
    const metin = prompt.trim();
    if (metin.length < 3) {
      Alert.alert(t('aiMuzik.promptKisaBaslik'), t('aiMuzik.promptKisaBody'));
      promptRef.current?.focus();
      return;
    }
    if (!dil) {
      Alert.alert(t('aiMuzik.chipDil'), t('aiMuzik.dilSecBody'));
      setAktifChip('dil');
      return;
    }
    if (!ses) {
      Alert.alert(t('aiMuzik.sesBaslik'), t('aiMuzik.sesSecBody'));
      return;
    }
    if (!yeterliSure) {
      setSatinAl(true);
      return;
    }
    if (!hakKabul) {
      try {
        const cfg = await AiMuzikConfigGetir();
        await AiMuzikHaklariKabul(cfg.rights_policy_version);
        setHakKabul(true);
      } catch {
        Alert.alert(t('aiMuzik.haklarBaslik'), t('aiMuzik.haklarBody'));
        return;
      }
    }

    setOlusturuyor(true);
    setBekle(true);
    const idem = AiMuzikIdempotencyAnahtari();
    const instruments = gelismis.instruments
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const bpm = gelismis.bpm ? Number(gelismis.bpm) : null;

    let enrichedPrompt = metin;
    // Hafıza yalnızca açık seçimde. last_prompt seçildiyse metin zaten alanda.
    // Title seçildiyse tarz ipucunu yeni prompta ekle — eski last_prompt gömülmez.
    if (hafizaSecim && typeof hafizaSecim === 'object' && hafizaSecim.kind === 'title') {
      const hint = t('aiMuzik.hafizaHint', { title: hafizaSecim.title });
      if (!metin.toLowerCase().includes(hafizaSecim.title.toLowerCase())) {
        enrichedPrompt = `${metin}\n${hint}`.slice(0, promptMax);
      }
    }

    let referencePath: string | null = null;
    if (referans && OzellikBayragiAktifMi('ai_music_reference_enabled')) {
      const up = await AiMuzikReferansYukle({
        uri: referans.uri,
        mime: referans.mime,
        name: referans.name,
      });
      if (!up.ok) {
        setBekle(false);
        setOlusturuyor(false);
        Alert.alert(t('aiMuzik.referansAlert'), up.hata);
        return;
      }
      referencePath = up.path;
    }

    const sonuc = await AiMuzikOlustur({
      prompt: enrichedPrompt,
      duration_seconds: sureSn,
      genre_code: genre,
      mood,
      tempo,
      bpm: Number.isFinite(bpm) ? bpm : null,
      language_code: dil,
      instruments: instruments.length ? instruments : null,
      structure_hint: gelismis.structure_hint || null,
      lyrics_mode: gelismis.force_instrumental || ses === 'instrumental'
        ? 'instrumental'
        : gelismis.lyrics_mode,
      lyrics: gelismis.lyrics_mode === 'user' ? gelismis.lyrics : null,
      voice_gender: ses === 'instrumental' ? null : ses,
      idempotency_key: idem,
      reference_storage_path: referencePath,
    });

    setBekle(false);
    setOlusturuyor(false);
    void yenile();

    if (!sonuc.ok) {
      if (sonuc.error === 'INSUFFICIENT_ENTITLEMENT') {
        setSatinAl(true);
        return;
      }
      if (sonuc.error === 'CREATE_BLOCKED') {
        setCreateBlocked(true);
        Alert.alert(t('aiMuzik.kapaliBaslik'), sonuc.message ?? t('aiMuzik.olusturmaKapali'));
        return;
      }
      Alert.alert(
        t('aiMuzik.uretimBaslik'),
        sonuc.message ?? sonuc.error ?? t('aiMuzik.uretimBasarisiz'),
      );
      return;
    }

    void AiMuzikTatGetir().then(setTat).catch(() => undefined);

    if (sonuc.track_id && sonuc.status === 'READY') {
      router.push(`/ai-muzik/${sonuc.track_id}` as Href);
      return;
    }
    Alert.alert(t('aiMuzik.uretimBasladiBaslik'), t('aiMuzik.uretimBasladiBody'), [
      { text: t('ortak.tamam'), onPress: () => router.push('/ai-muzik/kutuphane' as Href) },
    ]);
  }, [
    olusturuyor,
    bekle,
    prompt,
    yeterliSure,
    hakKabul,
    sureSn,
    genre,
    mood,
    tempo,
    dil,
    gelismis,
    ses,
    yenile,
    referans,
    createBlocked,
    hafizaSecim,
    promptMax,
    t,
  ]);

  if (!bayrakAcik || createBlocked) {
    return (
      <Screen>
        <EkranBasligi title={t('aiMuzik.baslik')} fallbackHref="/" />
        <View style={styles.bos}>
          <Ionicons name="musical-notes-outline" size={40} color={RenkTokenlari.textDim} />
          <Text style={styles.bosYazi}>
            {createBlocked ? t('aiMuzik.olusturmaKapali') : t('aiMuzik.bakimda')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} style={styles.screen}>
      <LinearGradient
        colors={[
          RenkTokenlari.primarySoft + '33',
          RenkTokenlari.violet + '18',
          'transparent',
          RenkTokenlari.bg,
        ]}
        locations={[0, 0.22, 0.55, 1]}
        style={styles.ambiyans}
        pointerEvents="none"
      />
      <EkranBasligi
        title={t('aiMuzik.baslik')}
        fallbackHref="/"
        right={
          <Pressable
            onPress={() => router.push('/ai-muzik/kutuphane' as Href)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('aiMuzik.kutuphaneA11y')}
            style={styles.ustKutuphane}
          >
            <Ionicons name="library" size={18} color={RenkTokenlari.primarySoft} />
            <Text style={styles.ustKutuphaneYazi}>{t('aiMuzik.kutuphane')}</Text>
          </Pressable>
        }
      />
      <KlavyeScrollView
        ref={kaydirRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: altPad }]}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
      >
          <Pressable
            style={styles.bakiyeKart}
            onPress={() => setSatinAl(true)}
            accessibilityRole="button"
            accessibilityLabel={t('aiMuzik.hakA11y', {
              sure: SureFormat(bakiye.available_seconds),
            })}
          >
            <CamArkaplan intensity={64} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={[
                RenkTokenlari.primarySoft + '38',
                RenkTokenlari.violet + '1A',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.bakiyeSol}>
              <Text style={styles.bakiyeEtiket}>{t('aiMuzik.hakEtiket')}</Text>
              <Text style={styles.bakiyeDeger}>
                {SureFormat(bakiye.available_seconds)}
              </Text>
              {bakiye.reserved_seconds > 0 ? (
                <Text style={styles.rezerve}>
                  {t('aiMuzik.rezerve', { sure: SureFormat(bakiye.reserved_seconds) })}
                </Text>
              ) : (
                <Text style={styles.bakiyeIpucu}>{t('aiMuzik.sureEkleIpucu')}</Text>
              )}
            </View>
            <View style={styles.bakiyeSag}>
              <Ionicons name="add-circle" size={28} color={RenkTokenlari.primarySoft} />
            </View>
          </Pressable>

          <Text style={styles.baslik}>{t('aiMuzik.promptKisaBaslik')}</Text>
          <Text style={styles.altBaslik}>
            {referans ? t('aiMuzik.altBaslikReferans') : t('aiMuzik.altBaslikNormal')}
          </Text>

          {OzellikBayragiAktifMi('ai_music_reference_enabled') ? (
            <AiMuzikReferansKart value={referans} onChange={setReferans} />
          ) : null}

          <View style={styles.promptKutu}>
            <CamArkaplan
              intensity={52}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <TextInput
              ref={promptRef}
              style={styles.prompt}
              multiline
              scrollEnabled={false}
              blurOnSubmit={false}
              value={prompt}
              onFocus={(e) => {
                setPromptOdak(true);
                KlavyeFocusKaydir(kaydirRef.current, e);
              }}
              onBlur={() => setPromptOdak(false)}
              onChangeText={(txt) => {
                const next = txt.slice(0, promptMax);
                setPrompt(next);
                if (!next.trim() && hafizaSecim === 'last_prompt') {
                  setHafizaSecim(null);
                }
              }}
              placeholder={
                referans
                  ? t('aiMuzik.promptPlaceholderReferans')
                  : t('aiMuzik.promptPlaceholder')
              }
              placeholderTextColor={RenkTokenlari.textDim}
              accessibilityLabel={t('aiMuzik.promptA11y')}
            />
            <View style={styles.promptAlt}>
              <Text style={styles.karakterSayaci}>
                {prompt.length}/{promptMax}
              </Text>
              {promptDoluyor ? (
                <Pressable
                  onPress={() => {
                    setPrompt('');
                    setHafizaSecim(null);
                  }}
                  hitSlop={8}
                  accessibilityLabel={t('aiMuzik.promptTemizle')}
                >
                  <Text style={styles.temizle}>{t('aiMuzik.temizle')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Text style={styles.sesBaslik}>{t('aiMuzik.sesBaslik')}</Text>
          <View style={styles.sesSatir}>
            {SESLER.map((v) => {
              const secili = ses === v.id;
              return (
                <Pressable
                  key={v.id}
                  style={[styles.sesSecenek, secili && styles.sesSecenekAktif]}
                  onPress={() => {
                    const next = secili ? null : v.id;
                    setSes(next);
                    if (next === 'instrumental') {
                      setGelismis((g) => ({
                        ...g,
                        lyrics_mode: 'instrumental',
                        force_instrumental: true,
                      }));
                    } else if (next) {
                      setGelismis((g) => ({
                        ...g,
                        lyrics_mode: g.lyrics_mode === 'instrumental' ? 'ai' : g.lyrics_mode,
                        force_instrumental: false,
                      }));
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: secili }}
                  accessibilityLabel={t('aiMuzik.sesA11y', { ad: t(v.key) })}
                >
                  <Text style={[styles.sesYazi, secili && styles.sesYaziAktif]}>
                    {t(v.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tat &&
          (tat.last_prompt ||
            (tat.recent_titles?.length ?? 0) > 0 ||
            (tat.recent_moods?.length ?? 0) > 0) ? (
            <View style={styles.tatBlok}>
              <Text style={styles.tatBaslik}>{t('aiMuzik.oncekiTercih')}</Text>
              <Text style={styles.tatIpucu}>{t('aiMuzik.hafizaIpucu')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ornekSerit}
              >
                {tat.last_prompt ? (
                  <Pressable
                    style={[
                      styles.tatChip,
                      hafizaSecim === 'last_prompt' && styles.tatChipAktif,
                    ]}
                    onPress={() => {
                      if (hafizaSecim === 'last_prompt') {
                        setHafizaSecim(null);
                        const eski = tat.last_prompt?.trim() ?? '';
                        if (
                          eski &&
                          (prompt.trim() === eski.slice(0, promptMax) ||
                            prompt.trim().startsWith(eski.slice(0, 48)))
                        ) {
                          setPrompt('');
                        }
                        return;
                      }
                      setHafizaSecim('last_prompt');
                      setPrompt(tat.last_prompt!.slice(0, promptMax));
                      const s = tat.last_settings ?? {};
                      if (typeof s.duration_seconds === 'number') {
                        setSureSn(s.duration_seconds as number);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: hafizaSecim === 'last_prompt' }}
                    accessibilityLabel={t('aiMuzik.oncekiPromptA11y')}
                  >
                    <Ionicons
                      name="sparkles"
                      size={14}
                      color={RenkTokenlari.primarySoft}
                    />
                    <Text style={styles.tatYazi} numberOfLines={2}>
                      {t('aiMuzik.oncekiPromptChip')}
                    </Text>
                  </Pressable>
                ) : null}
                {(tat.recent_titles ?? []).slice(0, 4).map((row, i) => {
                  const ad = row.title?.trim() || t('aiMuzik.parca');
                  const secili =
                    !!hafizaSecim &&
                    typeof hafizaSecim === 'object' &&
                    hafizaSecim.kind === 'title' &&
                    hafizaSecim.title === ad;
                  return (
                    <Pressable
                      key={`${row.track_id ?? i}-${ad}`}
                      style={[styles.tatChip, secili && styles.tatChipAktif]}
                      onPress={() => {
                        if (secili) {
                          setHafizaSecim(null);
                          return;
                        }
                        setHafizaSecim({ kind: 'title', title: ad });
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: secili }}
                      accessibilityLabel={t('aiMuzik.gibi', { ad })}
                    >
                      <Ionicons
                        name="musical-note"
                        size={14}
                        color={RenkTokenlari.primarySoft}
                      />
                      <Text style={styles.tatYazi} numberOfLines={2}>
                        {t('aiMuzik.gibi', { ad })}
                      </Text>
                    </Pressable>
                  );
                })}
                {(tat.recent_moods ?? []).slice(0, 3).map((m) => (
                  <Pressable
                    key={`mood-${m}`}
                    style={[styles.tatChip, mood === m && styles.tatChipAktif]}
                    onPress={() => setMood(mood === m ? null : m)}
                    accessibilityRole="button"
                    accessibilityLabel={t('aiMuzik.ruhA11y', {
                      m: MOOD_LABEL_KEYS[m] ? t(MOOD_LABEL_KEYS[m]) : m,
                    })}
                  >
                    <Text style={styles.tatYazi}>
                      {MOOD_LABEL_KEYS[m] ? t(MOOD_LABEL_KEYS[m]) : m}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {!promptDoluyor || promptOdak ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ornekSerit}
            >
              {ORNEK_PROMPT_KEYS.map((key) => {
                const o = t(key);
                return (
                <Pressable
                  key={key}
                  style={styles.ornekChip}
                  onPress={() => setPrompt(o)}
                  accessibilityRole="button"
                  accessibilityLabel={t('aiMuzik.ornekA11y', { o })}
                >
                  <Text style={styles.ornekYazi} numberOfLines={2}>
                    {o}
                  </Text>
                </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipSerit}
          >
            {CHIP_SIRASI.map((k) => {
              const aktif = aktifChip === k;
              const dolu = chipSecili(k);
              return (
                <Pressable
                  key={k}
                  style={[
                    styles.chip,
                    dolu && styles.chipDolu,
                    aktif && styles.chipAktif,
                  ]}
                  onPress={() => {
                    if (k === 'gelismis') {
                      setGelismisAcik(true);
                      return;
                    }
                    if (k === 'enstruman' || k === 'sozler') {
                      setGelismisAcik(true);
                      return;
                    }
                    setAktifChip((prev) => (prev === k ? null : k));
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: aktif || dolu }}
                >
                  <Text
                    style={[
                      styles.chipYazi,
                      (aktif || dolu) && styles.chipYaziAktif,
                    ]}
                  >
                    {chipEtiket[k]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {aktifChip && aktifChip !== 'gelismis' && aktifChip !== 'enstruman' && aktifChip !== 'sozler' ? (
            <View style={styles.panel}>
              <CamArkaplan intensity={48} style={StyleSheet.absoluteFill} />
              {aktifChip === 'tur'
                ? turler.map((row) => (
                    <Pressable
                      key={row.code}
                      style={[styles.secenek, genre === row.code && styles.secenekAktif]}
                      onPress={() => setGenre(genre === row.code ? null : row.code)}
                    >
                      <Text
                        style={[
                          styles.secenekYazi,
                          genre === row.code && styles.secenekYaziAktif,
                        ]}
                      >
                        {row.name}
                      </Text>
                    </Pressable>
                  ))
                : null}
              {aktifChip === 'ruh'
                ? MOODS.map((m) => (
                    <Pressable
                      key={m.value}
                      style={[styles.secenek, mood === m.value && styles.secenekAktif]}
                      onPress={() => setMood(mood === m.value ? null : m.value)}
                    >
                      <Text
                        style={[
                          styles.secenekYazi,
                          mood === m.value && styles.secenekYaziAktif,
                        ]}
                      >
                        {t(m.key)}
                      </Text>
                    </Pressable>
                  ))
                : null}
              {aktifChip === 'tempo'
                ? TEMPOS.map((row) => (
                    <Pressable
                      key={row.value}
                      style={[styles.secenek, tempo === row.value && styles.secenekAktif]}
                      onPress={() => setTempo(tempo === row.value ? null : row.value)}
                    >
                      <Text
                        style={[
                          styles.secenekYazi,
                          tempo === row.value && styles.secenekYaziAktif,
                        ]}
                      >
                        {t(row.key)}
                      </Text>
                    </Pressable>
                  ))
                : null}
              {aktifChip === 'dil'
                ? DILLER.map((d) => (
                    <Pressable
                      key={d.kod}
                      style={[styles.secenek, dil === d.kod && styles.secenekAktif]}
                      onPress={() => setDil(d.kod)}
                    >
                      <Text
                        style={[
                          styles.secenekYazi,
                          dil === d.kod && styles.secenekYaziAktif,
                        ]}
                      >
                        {t(d.key)}
                      </Text>
                    </Pressable>
                  ))
                : null}
              {aktifChip === 'sure'
                ? SURE_PRESET.map((s) => {
                    const yetmez = bakiye.available_seconds < s;
                    return (
                      <Pressable
                        key={s}
                        style={[
                          styles.secenek,
                          sureSn === s && styles.secenekAktif,
                          yetmez && styles.secenekZayif,
                        ]}
                        onPress={() => {
                          setSureSn(s);
                          if (yetmez) setSatinAl(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.secenekYazi,
                            sureSn === s && styles.secenekYaziAktif,
                          ]}
                        >
                          {t('aiMuzik.dk', { n: s / 60 })}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}
            </View>
          ) : null}

          {!yeterliSure ? (
            <Pressable style={styles.uyari} onPress={() => setSatinAl(true)}>
              <Ionicons name="flash-outline" size={18} color={RenkTokenlari.primarySoft} />
              <Text style={styles.uyariYazi}>{t('aiMuzik.yetersizSureUyari')}</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[
              styles.olustur,
              (!promptDoluyor || olusturuyor) && styles.olusturPasif,
            ]}
            onPress={() => void olustur()}
            disabled={olusturuyor}
            accessibilityRole="button"
            accessibilityLabel={t('aiMuzik.olusturA11y')}
            accessibilityState={{ disabled: olusturuyor }}
          >
            <LinearGradient
              colors={
                !promptDoluyor || olusturuyor
                  ? [RenkTokenlari.border, RenkTokenlari.border]
                  : yeterliSure
                    ? [RenkTokenlari.primarySoft, RenkTokenlari.violet]
                    : [RenkTokenlari.accent, RenkTokenlari.primarySoft]
              }
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.olusturGrad}
            >
              <Ionicons
                name={yeterliSure ? 'sparkles' : 'cart-outline'}
                size={20}
                color="#fff"
              />
              <Text style={styles.olusturYazi}>
                {olusturuyor
                  ? t('aiMuzik.olusturuluyor')
                  : yeterliSure
                    ? t('ortak.olustur')
                    : t('aiMuzik.sureEkleVeOlustur')}
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.yasal}>{t('aiMuzik.yasal')}</Text>

          <Pressable
            style={styles.kutuphaneCta}
            onPress={() => router.push('/ai-muzik/kutuphane' as Href)}
            accessibilityRole="button"
            accessibilityLabel={t('aiMuzik.kutuphaneCtaA11y')}
          >
            <CamArkaplan intensity={50} style={StyleSheet.absoluteFill} />
            <Ionicons name="library" size={22} color={RenkTokenlari.primarySoft} />
            <View style={{ flex: 1 }}>
              <Text style={styles.kutuphaneCtaBaslik}>{t('aiMuzik.kutuphaneCtaBaslik')}</Text>
              <Text style={styles.kutuphaneCtaAlt}>{t('aiMuzik.kutuphaneCtaAlt')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={RenkTokenlari.textDim} />
          </Pressable>

          <View style={styles.altLinkler}>
            <Pressable
              style={styles.altLink}
              onPress={() => router.push('/ai-muzik/islemler' as Href)}
              hitSlop={8}
            >
              <Ionicons name="receipt-outline" size={16} color={RenkTokenlari.primarySoft} />
              <Text style={styles.link}>{t('aiMuzik.islemlerim')}</Text>
            </Pressable>
          </View>
      </KlavyeScrollView>

      <AiMuzikBeklemeAnimasyonu
        visible={bekle}
        alt={t('aiMuzik.bekleAlt', { sure: SureFormat(sureSn) })}
        onKapat={() => setBekle(false)}
      />
      <AiMuzikSatinAlmaSheet
        visible={satinAl}
        kalanSn={bakiye.available_seconds}
        onClose={() => setSatinAl(false)}
        onBasarili={() => void yenile()}
      />
      <GelismisAyarlarSheet
        visible={gelismisAcik}
        value={gelismis}
        lyricsMax={lyricsMax}
        onChange={setGelismis}
        onClose={() => setGelismisAcik(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'relative',
  },
  ambiyans: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    zIndex: 0,
  },
  scroll: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    zIndex: 1,
  },
  bos: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: BoslukTokenlari.xl,
  },
  bosYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  ustKutuphane: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  ustKutuphaneYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  bakiyeKart: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: YaricapTokenlari.xl,
    padding: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: RenkTokenlari.bgGlass,
    overflow: 'hidden',
    minHeight: 88,
  },
  bakiyeSol: { flex: 1, minWidth: 0, zIndex: 1 },
  bakiyeSag: { marginLeft: 12, zIndex: 1 },
  bakiyeEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    letterSpacing: 0.3,
  },
  bakiyeDeger: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  rezerve: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 4,
  },
  bakiyeIpucu: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    marginTop: 4,
  },
  baslik: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    marginBottom: 4,
  },
  altBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginBottom: BoslukTokenlari.md,
  },
  sesBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: 8,
  },
  sesSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: BoslukTokenlari.md,
  },
  sesSecenek: {
    flexGrow: 1,
    minWidth: '22%',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sesSecenekAktif: {
    backgroundColor: RenkTokenlari.primarySoft + '28',
    borderColor: RenkTokenlari.primarySoft,
  },
  sesYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  sesYaziAktif: {
    color: RenkTokenlari.primarySoft,
  },
  promptKutu: {
    backgroundColor: RenkTokenlari.bgGlass,
    borderRadius: YaricapTokenlari.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    marginBottom: BoslukTokenlari.md,
    overflow: 'hidden',
  },
  prompt: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    minHeight: 140,
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: BoslukTokenlari.md,
    paddingBottom: BoslukTokenlari.sm,
    textAlignVertical: 'top',
    zIndex: 1,
  },
  promptAlt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.md,
    paddingBottom: BoslukTokenlari.sm,
    zIndex: 1,
  },
  karakterSayaci: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontVariant: ['tabular-nums'],
  },
  temizle: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
  },
  ornekSerit: {
    gap: 8,
    paddingBottom: BoslukTokenlari.md,
  },
  ornekChip: {
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  ornekYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  tatBlok: {
    marginBottom: BoslukTokenlari.sm,
  },
  tatBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginBottom: 4,
  },
  tatIpucu: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: 8,
  },
  tatChip: {
    maxWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  tatChipAktif: {
    backgroundColor: RenkTokenlari.primarySoft + '22',
    borderColor: RenkTokenlari.primarySoft,
  },
  tatYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flexShrink: 1,
  },
  chipSerit: {
    gap: 8,
    paddingBottom: BoslukTokenlari.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: RenkTokenlari.bgGlass,
    justifyContent: 'center',
  },
  chipDolu: {
    borderColor: RenkTokenlari.primarySoft + '88',
    backgroundColor: RenkTokenlari.primarySoft + '18',
  },
  chipAktif: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: RenkTokenlari.primarySoft + '28',
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  chipYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  panel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: BoslukTokenlari.md,
    padding: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.bgGlass,
    borderRadius: YaricapTokenlari.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  secenek: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    zIndex: 1,
  },
  secenekAktif: {
    backgroundColor: RenkTokenlari.primarySoft + '40',
  },
  secenekZayif: {
    opacity: 0.55,
  },
  secenekYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
  },
  secenekYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  uyari: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.primarySoft + '18',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.primarySoft + '44',
    marginBottom: BoslukTokenlari.md,
  },
  uyariYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flex: 1,
  },
  olustur: {
    borderRadius: YaricapTokenlari.xl,
    overflow: 'hidden',
    marginTop: BoslukTokenlari.xs,
  },
  olusturPasif: {
    opacity: 0.55,
  },
  olusturGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    minHeight: 52,
  },
  olusturYazi: {
    ...TipografiTokenlari.h2,
    color: '#fff',
  },
  yasal: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    marginTop: BoslukTokenlari.lg,
    lineHeight: 18,
  },
  kutuphaneCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: BoslukTokenlari.lg,
    padding: BoslukTokenlari.md,
    minHeight: 72,
    borderRadius: YaricapTokenlari.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: RenkTokenlari.bgGlass,
  },
  kutuphaneCtaBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  kutuphaneCtaAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  altLinkler: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: BoslukTokenlari.md,
  },
  altLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  link: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
  },
});
