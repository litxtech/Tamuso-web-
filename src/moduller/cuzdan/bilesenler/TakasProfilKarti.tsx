/**
 * Takas arama / teklif satırı — canlı altın parıltılı profil kartı.
 */

import React, { useEffect } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useCeviri } from '../../../i18n/useCeviri';

const GOLD = ['#F8E7A0', '#D4AF37', '#B8860B', '#F0D78C'] as const;

type Props = {
  baslik: string;
  altYazi?: string | null;
  avatarUrl?: string | null;
  secili?: boolean;
  onPress?: () => void;
  onProfil?: () => void;
  onMesaj?: () => void;
};

export function TakasProfilKarti({
  baslik,
  altYazi,
  avatarUrl,
  secili,
  onPress,
  onProfil,
  onMesaj,
}: Props) {
  const { t } = useCeviri();
  const parilti = useSharedValue(0.35);
  const safeAvatar = MedyaUriGuvenli(avatarUrl);

  useEffect(() => {
    parilti.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 1400 }),
        withTiming(0.35, { duration: 1400 }),
      ),
      -1,
      false,
    );
  }, [parilti]);

  const pariltiStil = useAnimatedStyle(() => ({
    opacity: parilti.value,
  }));

  const basHarf = (baslik.trim()[0] || '?').toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.dis, secili && styles.disSecili]}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[...GOLD]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cerceve}
      >
        <LinearGradient
          colors={['#2A2110', '#3D2E12', '#1F180C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ic}
        >
          <Animated.View style={[styles.parlama, pariltiStil]} pointerEvents="none" />
          <View style={styles.satir}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                (onProfil ?? onPress)?.();
              }}
              hitSlop={6}
              accessibilityLabel={t('takas.profiliAcA11y')}
            >
              <View style={styles.avatarHalka}>
                {safeAvatar ? (
                  <Image source={{ uri: safeAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarBos]}>
                    <Text style={styles.avatarHarf}>{basHarf}</Text>
                  </View>
                )}
                <View style={styles.sparkle} pointerEvents="none">
                  <Ionicons name="sparkles" size={11} color="#F8E7A0" />
                </View>
              </View>
            </Pressable>

            <View style={styles.metin}>
              <Text style={styles.baslik} numberOfLines={1}>
                {baslik}
              </Text>
              {altYazi ? (
                <Text style={styles.alt} numberOfLines={1}>
                  {altYazi}
                </Text>
              ) : null}
            </View>

            {onMesaj ? (
              <Pressable
                style={styles.mesajBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onMesaj();
                }}
                hitSlop={8}
                accessibilityLabel={t('takas.mesajGonderA11y')}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#3A2A08" />
              </Pressable>
            ) : null}
            {secili ? (
              <View style={styles.yesilTik} accessibilityLabel={t('takas.seciliA11y')}>
                <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
              </View>
            ) : onMesaj ? null : (
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgba(248,231,160,0.55)"
              />
            )}
          </View>
        </LinearGradient>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dis: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  disSecili: {
    shadowColor: '#22C55E',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.55)',
    borderRadius: 16,
  },
  cerceve: {
    padding: 2,
    borderRadius: 16,
  },
  ic: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  parlama: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(248,231,160,0.22)',
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarHalka: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#D4AF37',
    overflow: 'visible',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarBos: {
    backgroundColor: 'rgba(212,175,55,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHarf: {
    ...TipografiTokenlari.h2,
    color: '#F8E7A0',
    fontWeight: '900',
  },
  sparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  metin: { flex: 1, minWidth: 0, gap: 2 },
  baslik: {
    ...TipografiTokenlari.caption,
    color: '#F8E7A0',
    fontWeight: '800',
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: 'rgba(248,231,160,0.65)',
  },
  mesajBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesilTik: {
    marginLeft: 2,
  },
});
