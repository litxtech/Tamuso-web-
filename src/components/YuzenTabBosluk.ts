/**
 * Tab bar ölçüleri — root absolute chrome (Tabs navigator dışında).
 * iOS: yüzen liquid-glass kapsül (yeni iPhone tab menü).
 * Android: kenardan kenara kabuk.
 */

import { Platform } from 'react-native';

/** Web de iOS gibi yüzen oval kapsül kullanır. Android kenardan kenara kalır. */
export const YUZEN_OVAL_TAB = Platform.OS === 'ios' || Platform.OS === 'web';

/** İkon satırı yüksekliği (safe-area / float hariç) */
export const YUZEN_TAB_SHELL_H = YUZEN_OVAL_TAB ? 52 : 50;

/** iOS kapsülün home indicator üstünde boşluğu */
export const IOS_TAB_FLOAT_GAP = 8;

/** iOS yatay kenar boşluğu — yüzen pill */
export const IOS_TAB_H_MARGIN = 16;

/**
 * Android sistem navigasyonu (gesture / 3-tuş) ile tab ikonları çakışmasın.
 * insets.bottom 0 gelirse (edge-to-edge / ölçüm gecikmesi) minimum pay.
 */
export const ANDROID_NAV_MIN_INSET = 24;

/**
 * Tab ekranı scroll alt boşluğu — absolute chrome için kabuk + tipik nav payı.
 */
export const YUZEN_TAB_ICERIK_BOSLUGU =
  YUZEN_TAB_SHELL_H +
  (YUZEN_OVAL_TAB ? IOS_TAB_FLOAT_GAP + 34 : 56);

/** Son bilinen güvenli alt inset */
let sonGuvenliAlt = YUZEN_OVAL_TAB ? 34 : ANDROID_NAV_MIN_INSET;

export function guvenliTabAltInset(safeBottom: number): number {
  if (safeBottom > 0) {
    sonGuvenliAlt = safeBottom;
    return safeBottom;
  }
  if (YUZEN_OVAL_TAB) {
    return sonGuvenliAlt > 0 ? sonGuvenliAlt : 12;
  }
  return Math.max(sonGuvenliAlt, ANDROID_NAV_MIN_INSET);
}

/** Toplam tab bar yüksekliği — overlay / mini-bar / scroll pad */
export function yuzenTabBarToplamYukseklik(safeBottom: number): number {
  const inset = guvenliTabAltInset(safeBottom);
  if (YUZEN_OVAL_TAB) {
    return YUZEN_TAB_SHELL_H + IOS_TAB_FLOAT_GAP + inset;
  }
  return YUZEN_TAB_SHELL_H + inset;
}
