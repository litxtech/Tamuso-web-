import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCeviri } from '../../../i18n/useCeviri';
import { SayiKisaBicim } from '../../../tasarim-sistemi/premium/SeviyeXpHesap';
import { OdaIslemOzetiGetir } from '../okuma/OdaIslemOzeti';

type Props = {
  roomId: string;
  onPress: () => void;
};

const ALTIN = ['#FFF1B8', '#F0B429', '#C99214'] as const;

/** Profil çubuğunun altı: toplam hediye ve oyun coin. */
export function OdaIslemGostergesi({ roomId, onPress }: Props) {
  const { t } = useCeviri();
  const [ozet, setOzet] = useState({ hediye: 0, oyun: 0 });

  useEffect(() => {
    let iptal = false;
    void OdaIslemOzetiGetir(roomId).then((sonuc) => {
      if (!iptal) setOzet(sonuc);
    });
    return () => {
      iptal = true;
    };
  }, [roomId]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('sesOda.katkiA11y')}
      style={styles.hit}
    >
      <LinearGradient
        colors={[...ALTIN]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cerceve}
      >
        <View style={styles.ic}>
          <View style={styles.hucre}>
            <Ionicons name="gift" size={11} color="#FFE08A" />
            <Text style={styles.yazi}>{SayiKisaBicim(ozet.hediye)}</Text>
          </View>
          <View style={styles.ayir} />
          <View style={styles.hucre}>
            <Ionicons name="game-controller" size={11} color="#E4D4FF" />
            <Text style={styles.yazi}>{SayiKisaBicim(ozet.oyun)}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignSelf: 'stretch',
  },
  cerceve: {
    borderRadius: 14,
    padding: 1,
  },
  ic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 13,
    backgroundColor: 'rgba(28, 18, 6, 0.92)',
  },
  hucre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ayir: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 224, 138, 0.35)',
  },
  yazi: {
    color: '#FFE08A',
    fontSize: 11,
    fontWeight: '800',
  },
});
