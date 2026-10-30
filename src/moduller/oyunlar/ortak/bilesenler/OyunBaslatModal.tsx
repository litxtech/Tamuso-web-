/**
 * Ses odası oyun seçim kartı — yalnızca Fruit Wheel.
 * Kabuk (yerleşim) OyunOdaAltKart'tadır; burada Modal yok.
 */

import React from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { GameCode } from '../tipler/OyunTipleri';
import { OyunAuraCerceve } from './OyunAuraCerceve';
import { useCeviri } from '../../../../i18n/useCeviri';
import { STORM_KING_KART } from '../../storm-king/StormKingGiris';

const FRUIT_WHEEL_COVER = require('../../../../../assets/oyunlar/fruit-wheel/fw-cover.jpg');

type Props = {
  visible: boolean;
  onClose: () => void;
  onBaslatFruitWheel?: () => void;
  onBaslatStormKing?: () => void;
  /** Admin'de açık oyun kodları — Fruit Wheel kapalıysa kart boş kalır. */
  visibleGameCodes?: readonly GameCode[];
};

export function OyunBaslatModal({
  visible,
  onClose,
  onBaslatFruitWheel,
  onBaslatStormKing,
  visibleGameCodes,
}: Props) {
  const { t } = useCeviri();
  const showFruitWheel =
    visibleGameCodes == null ? true : visibleGameCodes.includes('fruit_wheel');
  const showStormKing =
    STORM_KING_KART != null &&
    (visibleGameCodes == null ? true : visibleGameCodes.includes('storm_king'));

  if (!visible) return null;

  return (
    <View style={styles.root}>
      <View style={styles.baslikSatir}>
        <View style={styles.baslikMetin}>
          <Text style={styles.eyebrow}>TAMUSO</Text>
          <Text style={styles.heading}>{t('oyun.baslik')}</Text>
        </View>
        <Pressable
          onPress={onClose}
          style={styles.kapatBtn}
          accessibilityLabel={t('ortak.kapat')}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color="#F7F2E8" />
        </Pressable>
      </View>
      <Text style={styles.sub}>{t('oyun.odaAcikKalir')}</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.liste}
        style={styles.listeScroll}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {showFruitWheel ? (
          <OyunPosterKart
            cover={FRUIT_WHEEL_COVER}
            avatar={FRUIT_WHEEL_COVER}
            tint={['#12081C', '#E6CE92'] as const}
            eyebrow={t('oyun.fwEyebrow')}
            title={t('oyun.fwTitle')}
            body={t('oyun.fwBody')}
            meta={t('oyun.soloSunucu')}
            ctaLabel={t('oyun.oyna')}
            ctaDisabled={!onBaslatFruitWheel}
            onPress={() => onBaslatFruitWheel?.()}
          />
        ) : null}
        {showStormKing && STORM_KING_KART ? (
          <OyunPosterKart
            cover={STORM_KING_KART.kapak}
            avatar={STORM_KING_KART.karakter}
            tint={['#12081C', '#E6C36A'] as const}
            eyebrow="FIRTINA"
            title={t('stormKing.menuTitle')}
            body={t('stormKing.menuBody')}
            meta={t('oyun.soloSunucu')}
            ctaLabel={t('oyun.oyna')}
            ctaDisabled={!onBaslatStormKing}
            onPress={() => onBaslatStormKing?.()}
          />
        ) : null}
        {!showFruitWheel && !showStormKing ? (
          <View style={styles.bosKart}>
            <Text style={styles.bosBaslik}>{t('oyun.acikOyunYok')}</Text>
            <Text style={styles.bosGovde}>{t('oyun.acikOyunYokBody')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

type PosterProps = {
  cover: ImageSourcePropType;
  avatar: ImageSourcePropType;
  tint: readonly [string, string];
  eyebrow: string;
  title: string;
  body: string;
  meta: string;
  ctaLabel: string;
  ctaDisabled: boolean;
  onPress: () => void;
};

function OyunPosterKart({
  cover,
  avatar,
  tint,
  eyebrow,
  title,
  body,
  meta,
  ctaLabel,
  ctaDisabled,
  onPress,
}: PosterProps) {
  const { t } = useCeviri();
  return (
    <OyunAuraCerceve
      renkler={[tint[1], '#FFFFFF', tint[1]]}
      yaricap={24}
      kalinlik={1.5}
      hizMs={5600}
      aktif={!ctaDisabled}
      parlamaRengi={tint[1]}
    >
      <View style={[styles.poster, ctaDisabled && styles.posterDisabled]}>
        <Image
          source={cover}
          style={styles.posterCover}
          resizeMode="cover"
          fadeDuration={0}
        />
        <LinearGradient
          colors={[
            'transparent',
            'rgba(6,8,16,0.28)',
            'rgba(6,8,16,0.72)',
            'rgba(6,8,16,0.94)',
          ]}
          locations={[0, 0.35, 0.68, 1]}
          style={styles.posterFade}
          pointerEvents="none"
        />
        <View style={styles.tamusoNot} pointerEvents="none">
          <Text style={styles.tamusoMark}>TAMUSO</Text>
          <Text style={styles.tamusoAlt}>{t('oyun.tamusoGelistirdi')}</Text>
        </View>
        <View style={styles.posterBody}>
          <View style={[styles.avatarRing, { borderColor: tint[1] }]}>
            <Image
              source={avatar}
              style={styles.avatarImg}
              resizeMode="contain"
            />
          </View>
          <View style={styles.posterCopy}>
            <Text style={[styles.cardEyebrow, { color: tint[1] }]}>{eyebrow}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.cardBody} numberOfLines={2}>
              {body}
            </Text>
            <Text style={styles.cardMeta}>{meta}</Text>
          </View>
          <Pressable
            onPress={ctaDisabled ? undefined : onPress}
            disabled={ctaDisabled}
            delayPressIn={0}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={({ pressed }) => [
              styles.cta,
              ctaDisabled && styles.ctaDisabled,
              { shadowColor: tint[1] },
              pressed && !ctaDisabled && styles.ctaPressed,
            ]}
          >
            <LinearGradient
              colors={[tint[1], tint[0]]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.ctaFill}
            >
              <Ionicons name="play" size={13} color="#fff" />
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </OyunAuraCerceve>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.md,
    minHeight: 0,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  baslikMetin: { flex: 1, paddingRight: 12 },
  eyebrow: {
    color: 'rgba(232,197,71,0.85)',
    fontSize: TipografiTokenlari.micro.fontSize,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  heading: {
    color: '#F7F2E8',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  kapatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sub: {
    color: 'rgba(247,242,232,0.58)',
    fontSize: TipografiTokenlari.caption.fontSize,
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18,
  },
  listeScroll: {
    flex: 1,
    minHeight: 0,
  },
  liste: {
    gap: 10,
    paddingBottom: 16,
    flexGrow: 1,
  },
  bosKart: {
    backgroundColor: 'rgba(18,20,32,0.9)',
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bosBaslik: {
    color: '#F7F2E8',
    fontSize: TipografiTokenlari.h2.fontSize,
    fontWeight: '800',
  },
  bosGovde: {
    color: 'rgba(247,242,232,0.55)',
    marginTop: 8,
    fontSize: TipografiTokenlari.body.fontSize,
  },
  poster: {
    height: 156,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#121018',
  },
  posterDisabled: { opacity: 0.45 },
  posterCover: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  posterFade: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  tamusoNot: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(6,8,16,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  tamusoMark: {
    ...TipografiTokenlari.micro,
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: '800',
    color: 'rgba(255,248,236,0.9)',
  },
  tamusoAlt: {
    ...TipografiTokenlari.micro,
    fontSize: 7,
    letterSpacing: 0.15,
    fontWeight: '600',
    color: 'rgba(232,228,240,0.64)',
    marginTop: 1,
  },
  posterBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 10,
    zIndex: 2,
    elevation: 2,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#0B0D16',
    zIndex: 3,
  },
  avatarImg: {
    width: 52,
    height: 52,
    backgroundColor: 'transparent',
  },
  posterCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: '#F7F2E8',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 1,
  },
  cardBody: {
    color: 'rgba(247,242,232,0.72)',
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  cardMeta: {
    color: 'rgba(247,242,232,0.42)',
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
  },
  cta: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 18,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaFill: {
    minWidth: 84,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1.1,
    fontSize: 12,
  },
});
