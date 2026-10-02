import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { IliskiEtiketi } from './IliskiEtiketi';
import { TakipButonu } from './TakipButonu';
import type { TakipKullaniciKarti } from '../TakipTipleri';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { DogrulanmisTik } from '../../kullanici-profili/bilesenler/DogrulanmisTik';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  kart: TakipKullaniciKarti;
  onPress?: () => void;
  onFollowPress?: () => void;
  /** Üç nokta menüsü (kaldır / engelle / bildir) */
  onMenuPress?: () => void;
  followLoading?: boolean;
  hideFollow?: boolean;
};

export function TakipciKarti({
  kart,
  onPress,
  onFollowPress,
  onMenuPress,
  followLoading,
  hideFollow,
}: Props) {
  const { t } = useCeviri();
  const ad = kart.display_name;
  const handle = kart.username ? `@${kart.username}` : null;
  const avatar = MedyaUriGuvenli(kart.avatar_url);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={ad}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <LinearGradient
          colors={[...RenkTokenlari.gradientPrimary]}
          style={styles.avatar}
        >
          <Text style={styles.harf}>{(ad[0] ?? 'K').toUpperCase()}</Text>
        </LinearGradient>
      )}
      <View style={styles.copy}>
        <View style={styles.adSatir}>
          <Text style={styles.ad} numberOfLines={1}>
            {ad}
          </Text>
          {kart.is_verified ? (
            <DogrulanmisTik size={14} />
          ) : null}
          {kart.level > 1 ? (
            <View style={styles.lvl}>
              <Text style={styles.lvlYazi}>Lv {kart.level}</Text>
            </View>
          ) : null}
        </View>
        {handle ? (
          <Text style={styles.handle} numberOfLines={1}>
            {handle}
          </Text>
        ) : null}
        <IliskiEtiketi
          state={kart.state}
          followsYou={kart.follows_you}
          isMutual={kart.is_mutual}
        />
      </View>
      <View style={styles.aksiyon}>
        {!hideFollow && kart.state !== 'SELF' && onFollowPress ? (
          <TakipButonu
            state={kart.state}
            displayName={ad}
            loading={followLoading}
            onPress={onFollowPress}
            compact
          />
        ) : null}
        {onMenuPress ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onMenuPress();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('takip.menuA11y', { ad })}
            style={styles.menuBtn}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={RenkTokenlari.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  harf: { ...TipografiTokenlari.title, color: '#fff' },
  copy: { flex: 1, gap: 3 },
  adSatir: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ad: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '800', flexShrink: 1 },
  handle: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  lvl: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  lvlYazi: { ...TipografiTokenlari.caption, fontSize: 10, color: RenkTokenlari.primarySoft },
  aksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
