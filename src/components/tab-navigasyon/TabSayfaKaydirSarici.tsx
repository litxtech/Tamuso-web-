import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useNavigation, useRoute } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GORUNUR_TAB_SIRASI, gorunurTabMu } from './GorunurTabSirasi';

type Props = ViewProps & {
  children: React.ReactNode;
  /** Kapalıysa jest bağlanmaz (varsayılan: açık). */
  etkin?: boolean;
};

const KAYDIR_ESIK = 72;
const HIZ_ESIK = 620;

/**
 * Ana sekme ekranlarında yatay kaydırma ile komşu taba geçiş.
 * Ana sayfada sağa kaydırma çekmeceye bırakılır; profilde sola kaydırma yok.
 */
export function TabSayfaKaydirSarici({
  children,
  etkin = true,
  style,
  ...rest
}: Props) {
  const navigation = useNavigation();
  const route = useRoute();
  const routeAd = route.name;

  const komsuyaGit = useCallback(
    (yon: -1 | 1) => {
      if (!gorunurTabMu(routeAd)) return;
      const idx = GORUNUR_TAB_SIRASI.indexOf(routeAd);
      const sonraki = GORUNUR_TAB_SIRASI[idx + yon];
      if (!sonraki) return;
      void Haptics.selectionAsync().catch(() => undefined);
      navigation.navigate(sonraki as never);
    },
    [navigation, routeAd],
  );

  const pan = useMemo(() => {
    const kaydirAcik = etkin && gorunurTabMu(routeAd);
    /** Ana: yalnızca sola (sonraki tab). Profil: yalnızca sağa (önceki). */
    const activeX: [number, number] =
      routeAd === 'index'
        ? [-40, 10000]
        : routeAd === 'profile'
          ? [-10000, 40]
          : [-40, 40];

    return Gesture.Pan()
      .enabled(kaydirAcik)
      .activeOffsetX(activeX)
      .failOffsetY([-18, 18])
      .onEnd((e) => {
        const sola =
          e.translationX < -KAYDIR_ESIK || e.velocityX < -HIZ_ESIK;
        const saga =
          e.translationX > KAYDIR_ESIK || e.velocityX > HIZ_ESIK;
        if (sola) runOnJS(komsuyaGit)(1);
        else if (saga) runOnJS(komsuyaGit)(-1);
      });
  }, [etkin, komsuyaGit, routeAd]);

  // Webde üst jest, hikâye ve sekme tıklamasını yutuyor (Safari / Chrome).
  if (!etkin || Platform.OS === 'web') {
    return (
      <View style={[styles.fill, style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false} style={[styles.fill, style]} {...rest}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
