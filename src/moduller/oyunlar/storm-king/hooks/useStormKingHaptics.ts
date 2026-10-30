import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

export function useStormKingHaptics(enabled: boolean) {
  const tap = useCallback(() => {
    if (!enabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [enabled]);

  const spin = useCallback(() => {
    if (!enabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, [enabled]);

  const bigWin = useCallback(() => {
    if (!enabled) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [enabled]);

  return { tap, spin, bigWin };
}
