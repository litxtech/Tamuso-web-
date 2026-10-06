import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  HIKAYE_TEPSI_AVATAR,
  HIKAYE_TEPSI_HALKA,
} from '../sabitler';
import { useCeviri } from '../../../i18n/useCeviri';
import { HikayeAvatarDaireUri } from '../yardimcilar/HikayeAvatarDaireUri';
import { HikayeCanliHalka } from './HikayeCanliHalka';

type Props = {
  /** Profil resmi — story yokken */
  avatarUrl: string | null;
  /** Story önizleme — story varken tercih edilir */
  previewUrl?: string | null;
  etiket: string;
  hasUnseen: boolean;
  isMine: boolean;
  bosMu?: boolean;
  onPress: () => void;
  onCreatePress?: () => void;
  onLongPress?: () => void;
};

const ONIZLEME_PX = Math.round(HIKAYE_TEPSI_AVATAR * 3);

/**
 * Instagram tepsi halkası.
 * Story yok: profil resmi. Story var: kare cover önizleme + canlı/cansız halka.
 */
export function HikayeTepsiAvatar({
  avatarUrl,
  previewUrl,
  etiket,
  hasUnseen,
  isMine,
  bosMu,
  onPress,
  onCreatePress,
  onLongPress,
}: Props) {
  const { t } = useCeviri();
  const gorselUri = HikayeAvatarDaireUri(
    bosMu ? null : previewUrl,
    avatarUrl,
    ONIZLEME_PX,
  );
  const [bozuk, setBozuk] = useState(false);
  useEffect(() => {
    setBozuk(false);
  }, [gorselUri]);
  const goster = !!gorselUri && !bozuk;
  const halkaGoster = !bosMu;

  const avatarNode = goster ? (
    <Image
      source={{ uri: gorselUri! }}
      style={styles.gorsel}
      resizeMode="cover"
      onError={() => setBozuk(true)}
    />
  ) : (
    <View style={[styles.gorsel, styles.avatarBos]}>
      <Ionicons name="person" size={28} color={RenkTokenlari.textDim} />
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={280}
        style={styles.halkaDis}
        accessibilityRole="button"
        accessibilityLabel={
          isMine
            ? bosMu
              ? t('hikaye.olusturA11y')
              : t('hikaye.benimHikayem')
            : t('hikaye.kullaniciHikayeA11y', { ad: etiket })
        }
      >
        {halkaGoster ? (
          <HikayeCanliHalka
            size={HIKAYE_TEPSI_HALKA}
            hasUnseen={hasUnseen}
            thickness={2.5}
          >
            {avatarNode}
          </HikayeCanliHalka>
        ) : (
          <View style={styles.halkaDuz}>{avatarNode}</View>
        )}
      </Pressable>

      {isMine && onCreatePress ? (
        <Pressable
          onPress={onCreatePress}
          hitSlop={10}
          style={styles.arti}
          accessibilityRole="button"
          accessibilityLabel={t('hikaye.olusturA11y')}
        >
          <Ionicons name="add" size={14} color="#fff" />
        </Pressable>
      ) : null}

      <Text style={styles.etiket} numberOfLines={1}>
        {isMine ? t('hikaye.sen') : etiket}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: HIKAYE_TEPSI_HALKA + 8,
    alignItems: 'center',
    gap: 4,
  },
  halkaDis: {
    width: HIKAYE_TEPSI_HALKA,
    height: HIKAYE_TEPSI_HALKA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halkaDuz: {
    width: HIKAYE_TEPSI_AVATAR + 6,
    height: HIKAYE_TEPSI_AVATAR + 6,
    borderRadius: (HIKAYE_TEPSI_AVATAR + 6) / 2,
    borderWidth: 1.5,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bg,
    overflow: 'hidden',
  },
  /** Daire içini tamamen doldur — cover kırpma */
  gorsel: {
    width: '100%',
    height: '100%',
  },
  avatarBos: {
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arti: {
    position: 'absolute',
    right: 2,
    top: HIKAYE_TEPSI_HALKA - 22,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: RenkTokenlari.primary,
    borderWidth: 2,
    borderColor: RenkTokenlari.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    maxWidth: HIKAYE_TEPSI_HALKA + 4,
    textAlign: 'center',
  },
});
