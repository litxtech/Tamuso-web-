import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { KonusmaciSesSeviyesi } from '../../livekit/ses/KonusmaciSesSeviyesi';

type Props = {
  userId: string | null;
  size?: number;
  hostMu?: boolean;
  children: React.ReactNode;
};

const FADE = { duration: 200, easing: Easing.out(Easing.quad) };
const ACIK = 0.08;
const KAPALI = 0.04;
/** Halkanın avatardan taşması (clip olmasın diye wrap büyütülür) */
const TASMA = 26;

/**
 * Konuşurken avatar etrafında soluk halka.
 * Scale ve sürekli yeniden başlayan timing sahneyi kasıyordu.
 */
export function KonusmaciAktiflikEfekti({
  userId,
  size = 72,
  hostMu = false,
  children,
}: Props) {
  const aktif = useSharedValue(0);

  useEffect(() => {
    let calisiyor = false;

    const durdur = () => {
      if (!calisiyor) {
        aktif.value = 0;
        return;
      }
      calisiyor = false;
      aktif.value = withTiming(0, FADE);
    };

    if (!userId) {
      durdur();
      return;
    }

    const baslat = () => {
      if (calisiyor) return;
      calisiyor = true;
      aktif.value = withTiming(1, FADE);
    };

    const baslangic = KonusmaciSesSeviyesi.seviyeGetir(userId);
    if (baslangic > ACIK) baslat();
    else aktif.value = 0;

    return KonusmaciSesSeviyesi.dinleKullanici(userId, (lvl) => {
      if (lvl > ACIK) baslat();
      else if (lvl <= KAPALI) durdur();
    });
  }, [userId, aktif]);

  const renk = hostMu ? RenkTokenlari.accent : RenkTokenlari.mint;
  const halkaBoy = size + 10;
  const wrapBoy = size + TASMA * 2;

  const glow = useAnimatedStyle(() => ({
    opacity: aktif.value * 0.35,
  }));

  const cember = useAnimatedStyle(() => ({
    opacity: aktif.value * 0.85,
  }));

  return (
    <View
      style={{
        width: wrapBoy,
        height: wrapBoy,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}
    >
      {userId ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                width: size + 18,
                height: size + 18,
                borderRadius: (size + 18) / 2,
                backgroundColor: renk,
              },
              glow,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cember,
              {
                width: halkaBoy,
                height: halkaBoy,
                borderRadius: halkaBoy / 2,
                borderColor: renk,
              },
              cember,
            ]}
          />
        </>
      ) : null}
      <View style={styles.icerik}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  cember: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  glow: {
    position: 'absolute',
  },
  icerik: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
