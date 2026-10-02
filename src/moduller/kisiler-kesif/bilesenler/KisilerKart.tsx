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

type Props = {
  kart: KisilerKesifKarti;
  genislik: number;
  showPrices: boolean;
  showOnline: boolean;
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
          />
        ) : (
          <LinearGradient
            colors={[...RenkTokenlari.gradientPlaceholder]}
            style={styles.fotoBos}
          >
            <Ionicons name="person" size={40} color={RenkTokenlari.textOnOverlay} />
          </LinearGradient>
        )}

        {showOnline && kart.online_display ? (
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
          {showPrices && (kart.voice_price != null || kart.video_price != null) ? (
            <View style={styles.fiyatSatir}>
              {kart.voice_price != null ? (
                <Text style={styles.fiyat}>
                  <Ionicons name="call" size={10} color={RenkTokenlari.mint} />{' '}
                  {t('kisilerX.coinDk', { n: kart.voice_price })}
                </Text>
              ) : null}
              {kart.video_price != null ? (
                <Text style={styles.fiyat}>
                  <Ionicons name="videocam" size={10} color={RenkTokenlari.primarySoft} />{' '}
                  {t('kisilerX.coinDk', { n: kart.video_price })}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.aksiyonlar}>
        <Aksiyon
          icon="chatbubble"
          label={t('kisilerX.mesaj')}
          enabled={kart.message_enabled}
          onPress={() => onMesaj(kart.user_id)}
          tint={RenkTokenlari.primarySoft}
        />
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
    flexWrap: 'wrap',
    gap: BoslukTokenlari.sm,
    marginTop: BoslukTokenlari.xs,
  },
  fiyat: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnOverlay,
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
