/**
 * Kişiler kartı — fotoğraf alanı + tema yüzeyinde aksiyon şeridi.
 */

import React, { memo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  HeaderTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { KisilerKesifKarti } from '../tipler';
import { ulkeBayragi } from '../utils/KisilerYardimcilar';
import { useCeviri } from '../../../i18n/useCeviri';
import { basHarfler, harfRenkleri } from './KisilerKartYuz';

type Props = {
  kart: KisilerKesifKarti;
  genislik: number;
  showPrices: boolean;
  showOnline: boolean;
  canli?: boolean;
  /** Kapalı aramada da basılabilir — sheet mesaj + bildirim gösterir */
  sesEnabled: boolean;
  videoEnabled: boolean;
  onProfil: (userId: string) => void;
  onMesaj: (userId: string) => void;
  onSesli: (userId: string) => void;
  onGoruntulu: (userId: string) => void;
};

function KisilerKartIc({
  kart,
  genislik,
  showPrices,
  showOnline,
  canli = false,
  sesEnabled,
  videoEnabled,
  onProfil,
  onMesaj,
  onSesli,
  onGoruntulu,
}: Props) {
  const { t } = useCeviri();
  const bayrak = ulkeBayragi(kart.public_country_code);
  const isim = kart.display_name?.trim() || kart.username || t('ortak.kullanici');
  const kullanici = kart.username ?? '—';
  const sesCoin = coinTamSayi(kart.voice_price);
  const gorCoin = coinTamSayi(kart.video_price);

  return (
    <View style={[styles.kart, { width: genislik }]}>
      <Pressable
        onPress={() => onProfil(kart.user_id)}
        accessibilityRole="button"
        accessibilityLabel={t('kisilerX.profilA11y', { isim })}
        style={styles.fotoWrap}
      >
        {kart.avatar_url ? (
          <Image
            source={{ uri: kart.avatar_url }}
            style={styles.foto}
            resizeMode="cover"
            accessibilityLabel={isim}
          />
        ) : (
          <LinearGradient
            colors={harfRenkleri(kart.user_id)}
            style={styles.fotoBos}
            accessibilityLabel={t('kisilerX.profilA11y', { isim })}
          >
            <Text style={styles.harf}>{basHarfler(isim)}</Text>
          </LinearGradient>
        )}

        {canli ? (
          <View style={styles.canliRozet} accessibilityLabel={t('kisiler.canliRozet')}>
            <View style={styles.canliNokta} />
            <Text style={styles.canliYazi}>{t('kisiler.canliRozet')}</Text>
          </View>
        ) : showOnline && kart.online_display ? (
          <View style={styles.online} accessibilityLabel={t('kisilerX.cevrimici')} />
        ) : null}

        <LinearGradient
          colors={[...RenkTokenlari.overlayGradient]}
          style={styles.grad}
          pointerEvents="none"
        />

        <View style={styles.meta} pointerEvents="none">
          <View style={styles.isimSatir}>
            <Text style={styles.isim} numberOfLines={1}>
              {isim}
            </Text>
            {kart.is_verified ? (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={RenkTokenlari.mint}
              />
            ) : null}
            {bayrak ? <Text style={styles.bayrak}>{bayrak}</Text> : null}
          </View>
          <Text style={styles.alt} numberOfLines={1}>
            @{kullanici}
            {kart.level != null ? ` · ${t('kisilerX.seviye', { n: kart.level })}` : ''}
          </Text>
          {showPrices && (sesCoin != null || gorCoin != null) ? (
            <View
              style={styles.fiyatSatir}
              accessibilityLabel={[
                sesCoin != null ? t('kisilerX.coinDk', { n: sesCoin }) : null,
                gorCoin != null ? t('kisilerX.coinDk', { n: gorCoin }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            >
              {sesCoin != null ? (
                <View style={styles.fiyatParca}>
                  <Ionicons name="call" size={11} color={RenkTokenlari.mint} />
                  <Text style={styles.fiyat}>{sesCoin}</Text>
                </View>
              ) : null}
              {gorCoin != null ? (
                <View style={styles.fiyatParca}>
                  <Ionicons name="videocam" size={11} color={RenkTokenlari.primarySoft} />
                  <Text style={styles.fiyat}>{gorCoin}</Text>
                </View>
              ) : null}
              <Text style={styles.fiyatBirim} numberOfLines={1}>
                {t('kisilerX.coinDkBirim')}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.aksiyonlar}>
        <Pressable
          onPress={kart.message_enabled ? () => onMesaj(kart.user_id) : undefined}
          disabled={!kart.message_enabled}
          accessibilityRole="button"
          accessibilityLabel={t('kisiler.tanis')}
          accessibilityState={{ disabled: !kart.message_enabled }}
          hitSlop={BoslukTokenlari.xs}
          style={({ pressed }) => [
            styles.tanis,
            { opacity: kart.message_enabled ? (pressed ? 0.7 : 1) : 0.35 },
          ]}
        >
          <Text style={styles.tanisYazi} numberOfLines={1}>
            {t('kisiler.tanis')}
          </Text>
        </Pressable>
        <Aksiyon
          icon="call"
          label={t('kisilerX.sesliAra')}
          enabled={sesEnabled}
          onPress={() => onSesli(kart.user_id)}
          tint={RenkTokenlari.mint}
        />
        <Aksiyon
          icon="videocam"
          label={t('kisilerX.goruntuluAra')}
          enabled={videoEnabled}
          onPress={() => onGoruntulu(kart.user_id)}
          tint={RenkTokenlari.magenta}
        />
      </View>
    </View>
  );
}

function coinTamSayi(deger: number | null): number | null {
  if (deger == null) return null;
  const n = Number(deger);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function Aksiyon({
  icon,
  label,
  enabled,
  onPress,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  enabled: boolean;
  onPress: () => void;
  tint: string;
}) {
  return (
    <Pressable
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={BoslukTokenlari.xs}
      style={({ pressed }) => [
        styles.btn,
        { opacity: enabled ? (pressed ? 0.7 : 1) : 0.35 },
      ]}
    >
      <Ionicons name={icon} size={16} color={tint} />
    </Pressable>
  );
}

export const KisilerKart = memo(KisilerKartIc);

const styles = StyleSheet.create({
  kart: {
    borderRadius: YaricapTokenlari.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  fotoWrap: {
    aspectRatio: 0.72,
  },
  foto: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  fotoBos: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  harf: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: RenkTokenlari.textOnOverlay,
  },
  canliRozet: {
    position: 'absolute',
    top: BoslukTokenlari.sm,
    left: BoslukTokenlari.sm,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.scrim,
  },
  canliNokta: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.magenta,
  },
  canliYazi: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: RenkTokenlari.textOnOverlay,
  },
  online: {
    position: 'absolute',
    top: BoslukTokenlari.sm,
    right: BoslukTokenlari.sm,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RenkTokenlari.mint,
    borderWidth: 1.5,
    borderColor: RenkTokenlari.textOnOverlay,
    zIndex: 2,
  },
  grad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
  },
  meta: {
    position: 'absolute',
    left: BoslukTokenlari.sm,
    right: BoslukTokenlari.sm,
    bottom: BoslukTokenlari.sm,
    gap: 2,
  },
  isimSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.xs,
  },
  isim: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnOverlay,
    fontWeight: '700',
    flexShrink: 1,
  },
  bayrak: {
    fontSize: TipografiTokenlari.micro.fontSize,
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnOverlay,
  },
  fiyatSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    marginTop: 2,
  },
  fiyatParca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  fiyat: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: RenkTokenlari.textOnOverlay,
  },
  fiyatBirim: {
    flexShrink: 1,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    color: RenkTokenlari.textOnOverlay,
    opacity: 0.9,
  },
  aksiyonlar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.sm,
    gap: BoslukTokenlari.sm,
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.divider,
  },
  tanis: {
    flex: 1,
    minHeight: HeaderTokenlari.touchTarget - BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.sm,
    borderRadius: YaricapTokenlari.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primary,
  },
  tanisYazi: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: RenkTokenlari.textOnPrimary,
  },
  btn: {
    width: HeaderTokenlari.touchTarget - BoslukTokenlari.sm,
    height: HeaderTokenlari.touchTarget - BoslukTokenlari.sm,
    borderRadius: (HeaderTokenlari.touchTarget - BoslukTokenlari.sm) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.pressFill,
  },
});
