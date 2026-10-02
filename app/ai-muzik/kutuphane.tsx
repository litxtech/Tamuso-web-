import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import { CamArkaplan } from '../../src/bilesenler/yuzey/CamArkaplan';
import {
  AiMuzikKutuphanedenCikar,
  AiMuzikParcaSil,
  AiMuzikParcalariGetir,
} from '../../src/moduller/ai-muzik/islemler/AiMuzikApi';
import {
  AiMuzikCaliyorTrackId,
  AiMuzikDurdur,
} from '../../src/moduller/ai-muzik/oynatici/AiMuzikOynatici';
import type { AiMuzikTrackOzet } from '../../src/moduller/ai-muzik/tipler';
import { MsSureFormat } from '../../src/moduller/ai-muzik/utils/SureFormat';
import { MedyaUriGuvenli } from '../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { yuzenTabBarToplamYukseklik } from '../../src/components/YuzenTabBosluk';

const TAB_KEYS = [
  { key: 'generated', labelKey: 'aiMuzik.tabUretilenler' as const },
  { key: 'all', labelKey: 'aiMuzik.kutuphane' as const },
  { key: 'ready', labelKey: 'aiMuzik.tabHazir' as const },
  { key: 'generating', labelKey: 'aiMuzik.tabUretiliyor' as const },
  { key: 'favorites', labelKey: 'aiMuzik.tabFavoriler' as const },
] as const;

const ORNEK_KEYS = [
  'aiMuzik.ornekTur1',
  'aiMuzik.ornekTur2',
  'aiMuzik.ornekTur3',
  'aiMuzik.ornekTur4',
  'aiMuzik.ornekTur5',
  'aiMuzik.ornekTur6',
] as const;

export default function AiMuzikKutuphaneEkrani() {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]['key']>('generated');
  const [query, setQuery] = useState('');
  const [liste, setListe] = useState<AiMuzikTrackOzet[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const durumEtiket = useCallback(
    (status: string): string => {
      switch (status) {
        case 'READY':
          return t('aiMuzik.durumHazir');
        case 'PROCESSING':
        case 'UPLOADING':
          return t('aiMuzik.durumOlusturuluyor');
        case 'FAILED':
          return t('aiMuzik.durumBasarisiz');
        default:
          return status;
      }
    },
    [t],
  );

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const rows = await AiMuzikParcalariGetir({
        tab,
        query: query.trim() || undefined,
      });
      setListe(rows);
    } catch {
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, [tab, query]);

  const parcaSil = useCallback(
    (item: AiMuzikTrackOzet) => {
      const kutuphanede = !!item.in_user_library || tab === 'all' || tab === 'ready' || tab === 'favorites';
      const secenekler: {
        text: string;
        style?: 'cancel' | 'destructive';
        onPress?: () => void;
      }[] = [{ text: t('ortak.vazgec'), style: 'cancel' }];

      if (kutuphanede) {
        secenekler.push({
          text: t('aiMuzik.kutuphanedenCikar'),
          onPress: () => {
            void (async () => {
              const r = await AiMuzikKutuphanedenCikar(item.id);
              if (!r.ok) {
                Alert.alert(t('aiMuzik.kutuphane'), r.hata ?? t('aiMuzik.kaldirilamadi'));
                return;
              }
              if (tab === 'generated') {
                setListe((prev) =>
                  prev.map((x) =>
                    x.id === item.id ? { ...x, in_user_library: false } : x,
                  ),
                );
              } else {
                setListe((prev) => prev.filter((x) => x.id !== item.id));
              }
            })();
          },
        });
      }

      secenekler.push({
        text: t('aiMuzik.parcaSil'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await AiMuzikParcaSil(item.id);
            if (!r.ok) {
              Alert.alert(t('aiMuzik.silBaslik'), r.hata ?? t('aiMuzik.silinemedi'));
              return;
            }
            if (AiMuzikCaliyorTrackId() === item.id) {
              void AiMuzikDurdur();
            }
            setListe((prev) => prev.filter((x) => x.id !== item.id));
          })();
        },
      });

      Alert.alert(
        item.title,
        kutuphanede ? t('aiMuzik.cikarVeyaSilBody') : t('aiMuzik.kaliciSilBody'),
        secenekler,
      );
    },
    [tab, t],
  );

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void yukle();
    }, query.trim() ? 320 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]); // tab değişince useFocusEffect / yukle deps hallede

  const altPad = yuzenTabBarToplamYukseklik(insets.bottom) + 16;

  const bosBaslik =
    tab === 'generated'
      ? t('aiMuzik.bosHenuzMuzik')
      : tab === 'all'
        ? t('aiMuzik.bosKutuphaneBos')
        : t('aiMuzik.bosSonucYok');
  const bosBody =
    tab === 'generated'
      ? t('aiMuzik.bosGeneratedBody')
      : tab === 'all'
        ? t('aiMuzik.bosAllBody')
        : t('aiMuzik.bosTabBody');

  return (
    <Screen edges={['top']} style={styles.screen}>
      <LinearGradient
        colors={[
          RenkTokenlari.primarySoft + '2A',
          RenkTokenlari.violet + '14',
          'transparent',
        ]}
        style={styles.ambiyans}
        pointerEvents="none"
      />
      <EkranBasligi title={t('aiMuzik.kutuphane')} fallbackHref={'/ai-muzik' as Href} />
      <View style={styles.ust}>
        <View style={styles.ara}>
          <CamArkaplan intensity={48} style={StyleSheet.absoluteFill} />
          <Ionicons name="search" size={16} color={RenkTokenlari.textDim} />
          <TextInput
            style={styles.araInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('aiMuzik.araPlaceholder')}
            placeholderTextColor={RenkTokenlari.textDim}
            returnKeyType="search"
            accessibilityLabel={t('aiMuzik.araA11y')}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={RenkTokenlari.textDim} />
            </Pressable>
          ) : null}
        </View>
        <ScrollTabs tab={tab} onTab={setTab} />
      </View>

      {yukleniyor && liste.length === 0 ? (
        <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{
            padding: BoslukTokenlari.lg,
            paddingBottom: altPad,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View style={styles.bosWrap}>
              <View style={styles.bosIkon}>
                <Ionicons name="musical-notes" size={32} color={RenkTokenlari.primarySoft} />
              </View>
              <Text style={styles.bosBaslik}>{bosBaslik}</Text>
              <Text style={styles.bos}>{bosBody}</Text>
              <Pressable
                style={styles.cta}
                onPress={() => router.push('/ai-muzik' as Href)}
                accessibilityRole="button"
              >
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.ctaYazi}>{t('aiMuzik.studyoyaGit')}</Text>
              </Pressable>
              <View style={styles.ornekWrap}>
                {ORNEK_KEYS.map((key) => (
                  <Pressable
                    key={key}
                    style={styles.ornek}
                    onPress={() => router.push('/ai-muzik' as Href)}
                  >
                    <Text style={styles.ornekYazi}>{t(key)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const cover = MedyaUriGuvenli(item.cover_thumb_url ?? item.cover_url);
            const hazir = item.status === 'READY';
            return (
              <Pressable
                style={styles.satir}
                onPress={() => router.push(`/ai-muzik/${item.id}` as Href)}
                onLongPress={() => parcaSil(item)}
                delayLongPress={350}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityHint={t('aiMuzik.silHint')}
              >
                <CamArkaplan intensity={40} style={StyleSheet.absoluteFill} hafif />
                {cover ? (
                  <Image source={{ uri: cover }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.coverBos]}>
                    <Ionicons
                      name="musical-notes"
                      size={20}
                      color={RenkTokenlari.primarySoft}
                    />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.baslik} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {durumEtiket(item.status)}
                    {hazir ? ` · ${MsSureFormat(item.duration_ms)}` : ''}
                    {item.genre_code ? ` · ${item.genre_code}` : ''}
                    {tab === 'generated' && !item.in_user_library
                      ? ` · ${t('aiMuzik.kutuphanedeDegil')}`
                      : ''}
                  </Text>
                </View>
                {item.is_favorite ? (
                  <Ionicons name="heart" size={18} color={RenkTokenlari.primarySoft} />
                ) : null}
                <Pressable
                  onPress={() => parcaSil(item)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} ${t('ortak.sil')}`}
                  style={styles.silBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={RenkTokenlari.textDim} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        style={[styles.fab, { bottom: altPad - 8 }]}
        onPress={() => router.push('/ai-muzik' as Href)}
        accessibilityRole="button"
        accessibilityLabel={t('aiMuzik.yeniMuzikA11y')}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </Screen>
  );
}

function ScrollTabs({
  tab,
  onTab,
}: {
  tab: (typeof TAB_KEYS)[number]['key'];
  onTab: (k: (typeof TAB_KEYS)[number]['key']) => void;
}) {
  const { t } = useCeviri();
  return (
    <View style={styles.tabs}>
      {TAB_KEYS.map((row) => (
        <Pressable
          key={row.key}
          style={[styles.tab, tab === row.key && styles.tabAktif]}
          onPress={() => onTab(row.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === row.key }}
        >
          <Text style={[styles.tabYazi, tab === row.key && styles.tabYaziAktif]}>
            {t(row.labelKey)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'relative' },
  ambiyans: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    zIndex: 0,
  },
  ust: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
    zIndex: 1,
  },
  ara: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: RenkTokenlari.bgGlass,
    borderRadius: YaricapTokenlari.xl,
    paddingHorizontal: BoslukTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    minHeight: 48,
    overflow: 'hidden',
  },
  araInput: {
    flex: 1,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    paddingVertical: 10,
    zIndex: 1,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: BoslukTokenlari.sm,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: RenkTokenlari.bgGlass,
    justifyContent: 'center',
  },
  tabAktif: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: RenkTokenlari.primarySoft + '28',
  },
  tabYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  tabYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.sm,
    minHeight: 72,
    marginBottom: 8,
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: RenkTokenlari.bgGlass,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: YaricapTokenlari.md,
  },
  coverBos: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  silBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  meta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  bosWrap: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: BoslukTokenlari.md,
  },
  bosIkon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: RenkTokenlari.primarySoft + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BoslukTokenlari.md,
  },
  bosBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: 6,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    marginBottom: BoslukTokenlari.lg,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: RenkTokenlari.primarySoft,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.pill,
    minHeight: 44,
  },
  ctaYazi: {
    ...TipografiTokenlari.h2,
    color: '#fff',
  },
  ornekWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: BoslukTokenlari.xl,
  },
  ornek: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
  },
  ornekYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  fab: {
    position: 'absolute',
    right: BoslukTokenlari.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: RenkTokenlari.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
