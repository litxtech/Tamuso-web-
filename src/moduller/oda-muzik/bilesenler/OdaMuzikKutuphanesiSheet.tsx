import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import {
  MusicFavoriteToggle,
  MusicLibraryList,
  msMetni,
  type MusicLibraryItem,
  type RoomMusicSession,
} from '../islemler/OdaMuzikApi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { supabase } from '../../../lib/supabase';
import { AiMuzikOdaKutuphanesi } from '../../ai-muzik/islemler/AiMuzikApi';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { router, type Href } from 'expo-router';
import { OdaMuzikPozisyonMs } from '../oynatici/OdaMuzikOynatici';
import { OdaMuzikSeekCubugu } from './OdaMuzikSeekCubugu';
import { useCeviri } from '../../../i18n/useCeviri';

type Tab = 'all' | 'popular' | 'new' | 'favorites' | 'mine';

type Props = {
  visible: boolean;
  onClose: () => void;
  canManage: boolean;
  session?: RoomMusicSession | null;
  onSelect: (trackId: string) => void | Promise<void>;
  onQueue?: (trackId: string) => void | Promise<void>;
  onPause?: () => void;
  onResume?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onStop?: () => void;
  onSeek?: (positionMs: number) => void;
  onVolume?: (volume: number) => void;
};

const EKRAN_H = Dimensions.get('window').height;

/** Alt sheet — tam kullanışlı oda müzik paneli */
export function OdaMuzikKutuphanesiSheet({
  visible,
  onClose,
  canManage,
  session,
  onSelect,
  onQueue,
  onPause,
  onResume,
  onPrev,
  onNext,
  onStop,
  onSeek,
  onVolume,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const tabs = useMemo(
    () =>
      [
        { key: 'all' as const, label: t('odaMuzik.tabTumu') },
        { key: 'popular' as const, label: t('odaMuzik.tabPopuler') },
        { key: 'new' as const, label: t('odaMuzik.tabYeni') },
        { key: 'favorites' as const, label: t('odaMuzik.tabFavori') },
        ...(OzellikBayragiAktifMi('ai_music_voice_room_enabled')
          ? [{ key: 'mine' as const, label: t('odaMuzik.tabBenim') }]
          : []),
      ] as Array<{ key: Tab; label: string }>,
    [t],
  );
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [liste, setListe] = useState<MusicLibraryItem[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [islemde, setIslemde] = useState<string | null>(null);
  const [, tick] = useState(0);

  const aktifCalıyor =
    session?.state === 'PLAYING' || session?.state === 'PAUSED';
  const aktifTrackId = session?.track?.id ?? session?.track_id ?? null;
  const kuyruk = session?.queue ?? [];

  useEffect(() => {
    if (!visible) return;
    if (session?.state !== 'PLAYING') return;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [visible, session?.state]);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      if (tab === 'mine') {
        const aiRows = await AiMuzikOdaKutuphanesi(query.trim() || undefined, 80);
        setListe(
          aiRows.map((t) => ({
            id: t.id,
            title: t.title,
            artist_name: t.artist_name,
            description: null,
            cover_url: t.cover_url,
            audio_url: t.audio_url,
            duration_ms: t.duration_ms,
            category_id: t.category_id,
            tags: t.tags ?? [],
            is_featured: t.is_featured,
            sort_order: t.sort_order,
            is_favorite: t.is_favorite,
          })),
        );
        return;
      }
      const rows = await MusicLibraryList({
        query: query.trim() || undefined,
        tab,
        limit: 80,
      });
      setListe(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setListe([]);
      if (visible) {
        Alert.alert(
          t('odaMuzik.alertMuzik'),
          e instanceof Error ? e.message : t('odaMuzik.kutuphaneYuklenemedi'),
        );
      }
    } finally {
      setYukleniyor(false);
    }
  }, [query, tab, visible, t]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => void yukle(), query ? 280 : 0);
    return () => clearTimeout(timer);
  }, [visible, yukle, query]);

  useEffect(() => {
    if (!visible) return;
    const ch = supabase
      .channel(`music-library-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'music_tracks' },
        () => void yukle(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [visible, yukle]);

  const caldir = useCallback(
    async (trackId: string) => {
      if (!canManage || islemde) return;
      setIslemde(trackId);
      try {
        await onSelect(trackId);
      } catch (e) {
        Alert.alert(
          t('odaMuzik.alertMuzik'),
          e instanceof Error ? e.message : t('odaMuzik.parcaBaslatilamadi'),
        );
      } finally {
        setIslemde(null);
      }
    },
    [canManage, islemde, onSelect, t],
  );

  const kuyrugaEkle = useCallback(
    async (trackId: string) => {
      if (!canManage || !onQueue || islemde) return;
      setIslemde(`q:${trackId}`);
      try {
        await onQueue(trackId);
      } catch (e) {
        Alert.alert(
          t('odaMuzik.alertMuzik'),
          e instanceof Error ? e.message : t('odaMuzik.kuyrugaEklenemedi'),
        );
      } finally {
        setIslemde(null);
      }
    },
    [canManage, onQueue, islemde, t],
  );

  const volumePct = Math.round(Math.min(1, Math.max(0, session?.volume ?? 0.7)) * 100);

  const listHeader = useMemo(
    () => (
      <View>
        {aktifCalıyor && session?.track ? (
          <View style={styles.nowPlaying}>
            <View style={styles.nowUst}>
              {MedyaUriGuvenli(session.track.cover_url) ? (
                <Image
                  source={{ uri: MedyaUriGuvenli(session.track.cover_url)! }}
                  style={styles.nowCover}
                />
              ) : (
                <View style={[styles.nowCover, styles.coverBos]}>
                  <Ionicons
                    name="musical-notes"
                    size={18}
                    color={RenkTokenlari.primarySoft}
                  />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.nowTitle} numberOfLines={1}>
                  {session.track.title}
                </Text>
                <Text style={styles.nowArtist} numberOfLines={1}>
                  {session.track.artist_name || 'Tamuso'}
                  {session.state === 'PAUSED' ? t('odaMuzik.duraklatildi') : t('odaMuzik.caliyor')}
                </Text>
              </View>
              {canManage ? (
                <Pressable
                  onPress={onStop}
                  hitSlop={10}
                  style={styles.stopBtn}
                  accessibilityLabel={t('odaMuzik.muzigiKapat')}
                >
                  <Ionicons name="stop" size={18} color={RenkTokenlari.danger} />
                </Pressable>
              ) : null}
            </View>

            {canManage ? (
              <>
                <OdaMuzikSeekCubugu
                  positionMs={
                    session.state === 'PLAYING'
                      ? OdaMuzikPozisyonMs()
                      : session.position_ms || 0
                  }
                  durationMs={session.track.duration_ms || 0}
                  playing={session.state === 'PLAYING'}
                  onSeek={(ms) => onSeek?.(ms)}
                  onSkip={(delta) => {
                    const cur =
                      session.state === 'PLAYING'
                        ? OdaMuzikPozisyonMs()
                        : session.position_ms || 0;
                    const dur = session.track?.duration_ms || 0;
                    onSeek?.(
                      Math.min(Math.max(0, cur + delta), Math.max(dur - 250, 0)),
                    );
                  }}
                  onPlayPause={() => {
                    if (session.state === 'PLAYING') onPause?.();
                    else onResume?.();
                  }}
                />
                <View style={styles.nowCtrls}>
                  <Pressable
                    onPress={onPrev}
                    hitSlop={10}
                    style={styles.ctrlBtn}
                    accessibilityLabel={t('odaMuzik.onceki')}
                  >
                    <Ionicons
                      name="play-skip-back"
                      size={22}
                      color={RenkTokenlari.text}
                    />
                  </Pressable>
                  <Pressable
                    onPress={onNext}
                    hitSlop={10}
                    style={styles.ctrlBtn}
                    accessibilityLabel={t('odaMuzik.sonraki')}
                  >
                    <Ionicons
                      name="play-skip-forward"
                      size={22}
                      color={RenkTokenlari.text}
                    />
                  </Pressable>
                </View>
                {onVolume ? (
                  <View style={styles.volRow}>
                    <Ionicons
                      name="volume-low"
                      size={18}
                      color={RenkTokenlari.textDim}
                    />
                    <Pressable
                      onPress={() =>
                        onVolume(Math.max(0, (session.volume ?? 0.7) - 0.1))
                      }
                      style={styles.volBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.volBtnYazi}>−</Text>
                    </Pressable>
                    <View style={styles.volBar}>
                      <View
                        style={[styles.volFill, { width: `${volumePct}%` }]}
                      />
                    </View>
                    <Pressable
                      onPress={() =>
                        onVolume(Math.min(1, (session.volume ?? 0.7) + 0.1))
                      }
                      style={styles.volBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.volBtnYazi}>+</Text>
                    </Pressable>
                    <Text style={styles.volPct}>{volumePct}%</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {kuyruk.length > 0 ? (
          <View style={styles.kuyrukBlokk}>
            <Text style={styles.bolumBaslik}>
              {t('odaMuzik.kuyruk', { count: kuyruk.length })}
            </Text>
            {kuyruk.slice(0, 30).map((q, i) => (
              <View key={q.id} style={styles.kuyrukSatir}>
                <Text style={styles.kuyrukSure}>{i + 1}</Text>
                <Text style={styles.kuyrukAd} numberOfLines={1}>
                  {q.title}
                </Text>
                <Text style={styles.kuyrukSure}>
                  {msMetni(q.duration_ms)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.araSatir}>
          <Ionicons
            name="search"
            size={16}
            color={RenkTokenlari.textDim}
            style={styles.araIkon}
          />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t('odaMuzik.araPlaceholder')}
            placeholderTextColor={RenkTokenlari.textDim}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={16}
                color={RenkTokenlari.textDim}
              />
            </Pressable>
          ) : null}
        </View>

        {OzellikBayragiAktifMi('ai_music_enabled') ? (
          <Pressable
            style={styles.aiLink}
            onPress={() => {
              onClose();
              router.push('/ai-muzik' as Href);
            }}
          >
            <Ionicons
              name="sparkles-outline"
              size={16}
              color={RenkTokenlari.primarySoft}
            />
            <Text style={styles.aiLinkYazi}>{t('odaMuzik.aiStudio')}</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={RenkTokenlari.primarySoft}
            />
          </Pressable>
        ) : null}

        <View style={styles.tabs}>
          {tabs.map((tabItem) => (
            <Pressable
              key={tabItem.key}
              style={[styles.tab, tab === tabItem.key && styles.tabAktif]}
              onPress={() => setTab(tabItem.key)}
            >
              <Text
                style={[styles.tabYazi, tab === tabItem.key && styles.tabYaziAktif]}
              >
                {tabItem.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.bolumBaslik}>
          {canManage ? t('odaMuzik.kutuphaneSec') : t('odaMuzik.kutuphane')}
        </Text>
      </View>
    ),
    [
      aktifCalıyor,
      session,
      canManage,
      kuyruk,
      query,
      tab,
      tabs,
      volumePct,
      t,
      onClose,
      onNext,
      onPause,
      onPrev,
      onResume,
      onSeek,
      onStop,
      onVolume,
    ],
  );

  const sheetH = Math.min(EKRAN_H * 0.78, 640);

  return (
    <TamusoModal
      visible={visible}
      onClose={onClose}
      placement="bottom"
      animationType="slide"
    >
      <View
        style={[
          styles.kart,
          {
            height: sheetH,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        <BlurView
          intensity={48}
          tint="dark"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(32,26,42,0.98)', 'rgba(12,10,18,0.99)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.tutamac} pointerEvents="none" />

        <View style={styles.ustSatir}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.baslik}>{t('odaMuzik.alertMuzik')}</Text>
            <Text style={styles.alt}>
              {canManage
                ? t('odaMuzik.yonetHint')
                : t('odaMuzik.dinleHint')}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.kapat}
            hitSlop={8}
            accessibilityLabel={t('ortak.kapat')}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={18} color={RenkTokenlari.text} />
          </Pressable>
        </View>

        {yukleniyor && liste.length === 0 ? (
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginVertical: 40 }}
          />
        ) : (
          <FlatList
            data={liste}
            keyExtractor={(i) => i.id}
            style={styles.liste}
            contentContainerStyle={styles.listeIcerik}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <Text style={styles.bos}>
                {yukleniyor ? t('ortak.yukleniyor') : t('odaMuzik.bosSekme')}
              </Text>
            }
            renderItem={({ item }) => {
              const cover = MedyaUriGuvenli(item.cover_url);
              const aktif = aktifTrackId === item.id;
              const busy = islemde === item.id || islemde === `q:${item.id}`;
              return (
                <Pressable
                  style={[styles.satir, aktif && styles.satirAktif]}
                  onPress={() => void caldir(item.id)}
                  disabled={!canManage || !!islemde}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}`}
                >
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.cover} />
                  ) : (
                    <View style={[styles.cover, styles.coverBos]}>
                      <Ionicons
                        name="musical-notes"
                        size={16}
                        color={RenkTokenlari.primarySoft}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.ad, aktif && styles.adAktif]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.artist_name || 'Tamuso'} ·{' '}
                      {msMetni(item.duration_ms)}
                      {item.category_name ? ` · ${item.category_name}` : ''}
                      {aktif ? t('odaMuzik.simdi') : ''}
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator
                      size="small"
                      color={RenkTokenlari.primarySoft}
                    />
                  ) : (
                    <>
                      {tab !== 'mine' ? (
                        <Pressable
                          hitSlop={10}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            void MusicFavoriteToggle(item.id).then(() =>
                              void yukle(),
                            );
                          }}
                          accessibilityLabel="Favori"
                        >
                          <Ionicons
                            name={item.is_favorite ? 'heart' : 'heart-outline'}
                            size={20}
                            color={
                              item.is_favorite
                                ? RenkTokenlari.primarySoft
                                : RenkTokenlari.textDim
                            }
                          />
                        </Pressable>
                      ) : null}
                      {canManage && onQueue ? (
                        <Pressable
                          hitSlop={10}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            void kuyrugaEkle(item.id);
                          }}
                          accessibilityLabel={t('odaMuzik.kuyrugaEkle')}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={22}
                            color={RenkTokenlari.text}
                          />
                        </Pressable>
                      ) : null}
                      {canManage ? (
                        <Ionicons
                          name={aktif ? 'musical-notes' : 'play-circle'}
                          size={28}
                          color={RenkTokenlari.primarySoft}
                        />
                      ) : null}
                    </>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  kart: {
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderBottomWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: BoslukTokenlari.sm,
  },
  tutamac: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginBottom: 10,
  },
  ustSatir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: BoslukTokenlari.sm,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  kapat: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  nowPlaying: {
    marginBottom: BoslukTokenlari.sm,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(232, 64, 145, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 64, 145, 0.35)',
    gap: 8,
  },
  nowUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nowCover: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: RenkTokenlari.surface,
  },
  nowTitle: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  nowArtist: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,80,80,0.12)',
  },
  nowCtrls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  volRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  volBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  volBtnYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 20,
  },
  volBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  volFill: {
    height: '100%',
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: 3,
  },
  volPct: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    minWidth: 36,
    textAlign: 'right',
  },
  kuyrukBlokk: {
    marginBottom: BoslukTokenlari.sm,
    gap: 4,
  },
  kuyrukSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  kuyrukAd: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flex: 1,
  },
  kuyrukSure: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  bolumBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 2,
  },
  araSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 10,
    backgroundColor: RenkTokenlari.surface,
    marginBottom: 8,
    gap: 6,
  },
  araIkon: { marginRight: 2 },
  input: {
    flex: 1,
    paddingVertical: 11,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  aiLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(232,64,145,0.1)',
  },
  aiLinkYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  tabAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  tabYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  tabYaziAktif: { color: RenkTokenlari.text, fontWeight: '700' },
  liste: { flex: 1 },
  listeIcerik: { paddingBottom: 12, flexGrow: 1 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.divider,
    minHeight: 58,
  },
  satirAktif: {
    backgroundColor: 'rgba(232,64,145,0.1)',
    borderRadius: 10,
    borderBottomWidth: 0,
    marginVertical: 2,
    paddingHorizontal: 8,
  },
  cover: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: RenkTokenlari.surface,
  },
  coverBos: { alignItems: 'center', justifyContent: 'center' },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  adAktif: { color: RenkTokenlari.primarySoft },
  meta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    paddingVertical: 28,
  },
});
