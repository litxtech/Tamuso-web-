/**
 * DM medya önizleme — seçilen foto/videoları onaylamadan göndermez.
 * Çoklu öğe, kaldırma, ekleme, bir kez görüntüle.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { GALERI_COKLU_LIMIT } from '../../../ortak/medya/ImagePickerHazirMi';
import type { DmMedyaTaslak } from '../islemler/DmMedyasiYukle';

type Props = {
  visible: boolean;
  items: DmMedyaTaslak[];
  gonderiyor?: boolean;
  viewOnceEnabled?: boolean;
  viewOnce?: boolean;
  onViewOnceChange?: (v: boolean) => void;
  onItemsChange: (items: DmMedyaTaslak[]) => void;
  /** Galeriye ekleme — kalan kota ile */
  onEkle?: () => void;
  onVazgec: () => void;
  onGonder: () => void;
};

function YerelVideoOnizleme({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    try {
      p.loop = true;
      p.muted = true;
      if (typeof p.play === 'function') p.play();
    } catch {
      /* native henüz hazır değil */
    }
  });

  useEffect(() => {
    try {
      player.muted = true;
      player.loop = true;
      if (typeof player.play === 'function') player.play();
    } catch {
      /* native hazır değil */
    }
    return () => {
      try {
        if (typeof player.pause === 'function') player.pause();
      } catch {
        /* noop */
      }
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={styles.thumbMedya}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

function OnizlemeKarti({
  item,
  disabled,
  onKaldir,
}: {
  item: DmMedyaTaslak;
  disabled?: boolean;
  onKaldir: () => void;
}) {
  const { t } = useCeviri();
  return (
    <View style={styles.kart}>
      {item.tur === 'video' ? (
        <View style={[styles.thumbMedya, styles.videoThumbPlaceholder]}>
          <Ionicons name="videocam" size={22} color={RenkTokenlari.mint} />
        </View>
      ) : (
        <Image source={{ uri: item.uri }} style={styles.thumbMedya} />
      )}
      <Pressable
        style={styles.kaldir}
        onPress={onKaldir}
        disabled={disabled}
        hitSlop={8}
        accessibilityLabel={t('mesajV2.mediaRemove')}
      >
        <Ionicons name="close" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

export function MesajMedyaOnizlemePaneli({
  visible,
  items,
  gonderiyor,
  viewOnceEnabled,
  viewOnce,
  onViewOnceChange,
  onItemsChange,
  onEkle,
  onVazgec,
  onGonder,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [aktifId, setAktifId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setAktifId(null);
      return;
    }
    if (items.length === 0) {
      setAktifId(null);
      return;
    }
    if (!aktifId || !items.some((i) => i.id === aktifId)) {
      setAktifId(items[0]?.id ?? null);
    }
  }, [visible, items, aktifId]);

  const aktif = useMemo(
    () => items.find((i) => i.id === aktifId) ?? items[0] ?? null,
    [items, aktifId],
  );

  const ekleAcik =
    !!onEkle &&
    !gonderiyor &&
    items.length < GALERI_COKLU_LIMIT &&
    !viewOnce;

  return (
    <TamusoModal
      visible={visible && items.length > 0}
      onClose={gonderiyor ? () => undefined : onVazgec}
      placement="bottom"
      animationType="slide"
      contentStyle={styles.sheetWrap}
    >
      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, BoslukTokenlari.lg) },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.baslikSatir}>
          <View style={styles.baslikMetin}>
            <Text style={styles.fisilti}>{t('mesajV2.preview')}</Text>
            <Text style={styles.baslik}>
              {t('mesajV2.mediaCount', { n: items.length })}
            </Text>
          </View>
          <Pressable
            style={styles.kapat}
            onPress={onVazgec}
            disabled={gonderiyor}
            hitSlop={10}
            accessibilityLabel={t('ortak.kapat')}
          >
            <Ionicons name="close" size={20} color={RenkTokenlari.textMuted} />
          </Pressable>
        </View>

        {aktif ? (
          <View style={styles.buyuk}>
            {aktif.tur === 'video' ? (
              <YerelVideoOnizleme key={aktif.id} uri={aktif.uri} />
            ) : (
              <Image
                key={aktif.id}
                source={{ uri: aktif.uri }}
                style={styles.buyukMedya}
                resizeMode="contain"
              />
            )}
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setAktifId(item.id)}
              style={[
                styles.stripWrap,
                aktifId === item.id && styles.stripAktif,
              ]}
            >
              <OnizlemeKarti
                item={item}
                disabled={gonderiyor}
                onKaldir={() =>
                  onItemsChange(items.filter((x) => x.id !== item.id))
                }
              />
            </Pressable>
          ))}
          {ekleAcik ? (
            <Pressable
              style={styles.ekleKart}
              onPress={onEkle}
              accessibilityLabel={t('mesajV2.mediaAddMore')}
            >
              <Ionicons name="add" size={28} color={RenkTokenlari.mint} />
              <Text style={styles.ekleYazi}>{t('mesajV2.mediaAddMore')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {viewOnceEnabled ? (
          <View style={styles.viewOnceSatir}>
            <View style={styles.viewOnceMetin}>
              <Ionicons
                name="eye-outline"
                size={18}
                color={RenkTokenlari.primarySoft}
              />
              <Text style={styles.viewOnceBaslik}>{t('mesajV2.viewOnce')}</Text>
            </View>
            <Switch
              value={!!viewOnce}
              onValueChange={onViewOnceChange}
              disabled={gonderiyor || items.length > 1}
              trackColor={{
                false: RenkTokenlari.border,
                true: RenkTokenlari.primarySoft,
              }}
              thumbColor="#fff"
            />
          </View>
        ) : null}

        <View style={styles.aksiyonlar}>
          <Pressable
            style={styles.iptal}
            onPress={onVazgec}
            disabled={gonderiyor}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.vazgec')}
          >
            <Text style={styles.iptalYazi}>{t('ortak.vazgec')}</Text>
          </Pressable>
          <Pressable
            style={[styles.gonder, gonderiyor && styles.gonderDisabled]}
            onPress={onGonder}
            disabled={gonderiyor || items.length === 0}
            accessibilityRole="button"
            accessibilityLabel={t('mesajV2.sendN', { n: items.length })}
          >
            {gonderiyor ? (
              <ActivityIndicator color="#12040C" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#12040C" />
                <Text style={styles.gonderYazi}>
                  {t('mesajV2.sendN', { n: items.length })}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    gap: BoslukTokenlari.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: 4,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  baslikMetin: { flex: 1, gap: 2 },
  fisilti: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 18,
  },
  kapat: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  buyuk: {
    height: 220,
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    backgroundColor: '#0A0A12',
  },
  buyukMedya: {
    width: '100%',
    height: '100%',
  },
  strip: {
    gap: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  stripWrap: {
    borderRadius: YaricapTokenlari.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stripAktif: {
    borderColor: RenkTokenlari.mint,
  },
  kart: {
    width: 72,
    height: 72,
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.surface,
  },
  thumbMedya: {
    width: '100%',
    height: '100%',
  },
  videoThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12101A',
  },
  kaldir: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ekleKart: {
    width: 72,
    height: 72,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: RenkTokenlari.surface,
  },
  ekleYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  viewOnceSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  viewOnceMetin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewOnceBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  aksiyonlar: {
    flexDirection: 'row',
    gap: 10,
  },
  iptal: {
    flex: 1,
    height: 48,
    borderRadius: YaricapTokenlari.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  iptalYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  gonder: {
    flex: 1.4,
    height: 48,
    borderRadius: YaricapTokenlari.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  gonderDisabled: { opacity: 0.6 },
  gonderYazi: {
    ...TipografiTokenlari.body,
    color: '#12040C',
    fontWeight: '800',
  },
});
