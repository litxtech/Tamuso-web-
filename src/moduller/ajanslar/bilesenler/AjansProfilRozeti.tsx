import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import type { AjansUyelikAjans } from '../okuma/AjansUyelikGetir';

type Varyant = 'uye' | 'basvur' | 'beklemede';

type Props = {
  varyant: Varyant;
  ajans?: AjansUyelikAjans | null;
  onPress: () => void;
  /** Profil aksiyon satırında ortalı tam genişlik */
  tamGenislik?: boolean;
};

const GOLD = ['#F5E6A8', '#D4AF37', '#C49A2A'] as const;

export function AjansProfilRozeti({
  varyant,
  ajans,
  onPress,
  tamGenislik,
}: Props) {
  const { t } = useCeviri();
  const uye = varyant === 'uye';
  const beklemede = varyant === 'beklemede';
  const ad = ajans?.name?.trim() || t('ajans.baslik');
  const alt = uye
    ? t('ajans.aksiyonProfil')
    : beklemede
      ? t('ajans.basvuruInceleniyor')
      : t('ajans.ajansaKatil');
  const baslik = uye
    ? ad
    : beklemede
      ? t('ajans.basvuruInceleniyor')
      : t('ajans.ajansaBasvur');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.hit,
        tamGenislik && styles.hitTam,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={uye ? ad : beklemede ? alt : t('ajans.ajansaBasvur')}
    >
      <LinearGradient
        colors={
          uye
            ? [...GOLD]
            : beklemede
              ? ['#3B1F4A', '#2A2438']
              : ['#2A2438', '#1E1A28']
        }
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.pill, !uye && styles.pillKenar]}
      >
        {uye &&
        typeof ajans?.logo_url === 'string' &&
        /^https?:\/\//i.test(ajans.logo_url.trim()) ? (
          <Image source={{ uri: ajans.logo_url.trim() }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoBos, uye && styles.logoUye]}>
            <Ionicons
              name={
                uye
                  ? 'briefcase'
                  : beklemede
                    ? 'time-outline'
                    : 'business-outline'
              }
              size={15}
              color={uye ? '#3A2A08' : RenkTokenlari.accent}
            />
          </View>
        )}
        <View style={styles.metin}>
          <Text
            style={[styles.baslik, uye && styles.baslikUye]}
            numberOfLines={1}
          >
            {baslik}
          </Text>
          <Text style={[styles.alt, uye && styles.altUye]} numberOfLines={1}>
            {alt}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={uye ? 'rgba(58,42,8,0.7)' : RenkTokenlari.textDim}
        />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignSelf: 'center',
    maxWidth: '100%',
    borderRadius: YaricapTokenlari.pill,
    overflow: 'hidden',
  },
  hitTam: {
    alignSelf: 'stretch',
    width: '100%',
  },
  pressed: { opacity: 0.88 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: YaricapTokenlari.pill,
    minHeight: 48,
  },
  pillKenar: {
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(18,4,12,0.18)',
  },
  logoBos: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  logoUye: { backgroundColor: 'rgba(58,42,8,0.18)' },
  metin: { flex: 1, gap: 1, minWidth: 0 },
  baslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  baslikUye: { color: '#3A2A08' },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  altUye: { color: 'rgba(58,42,8,0.62)' },
});
