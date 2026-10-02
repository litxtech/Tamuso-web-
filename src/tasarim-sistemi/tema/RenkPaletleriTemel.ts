import type { RenkPaleti } from './TemaTipleri';

/** Koyu premium — gece / kontrollü neon */
export const RenkTokenlariKoyu = {
  bg: '#080811',
  bgElevated: '#0D0D18',
  bgCard: '#141421',
  bgGlass: 'rgba(20, 20, 33, 0.82)',
  surface: '#1A1928',
  border: 'rgba(255, 255, 255, 0.08)',
  borderAccent: 'rgba(232, 64, 145, 0.4)',
  /** @deprecated borderAccent kullan */
  borderHot: 'rgba(232, 64, 145, 0.4)',

  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.65)',
  textDim: 'rgba(255, 255, 255, 0.4)',
  textOnPrimary: '#12040C',
  textOnOverlay: '#F7F2F8',

  /** Signature: premium pink / magenta / violet / deep plum */
  primary: '#E84091',
  primarySoft: '#F06BA8',
  magenta: '#C43BFF',
  violet: '#8B5CF6',
  deepPlum: '#3B1F4A',
  accent: '#F0B429',
  mint: '#3DCFB0',

  danger: '#E84B6A',
  success: '#3DCFB0',
  warning: '#F0B429',

  gradientPrimary: ['#E84091', '#C43BFF'] as const,
  gradientNight: ['#080811', '#0D0D18', '#1A1228'] as const,
  gradientRoom: ['#201E30', '#141421', '#080811'] as const,
  gradientGold: ['#F0B429', '#E87A3B'] as const,
  gradientDiamond: ['#8B5CF6', '#3DCFB0'] as const,
  gradientCard: ['rgba(32,30,48,0.98)', 'rgba(14,13,24,0.99)'] as const,
  gradientPlaceholder: ['#2A1A48', '#141428', '#0A0A14'] as const,
  overlayGradient: [
    'rgba(8,8,17,0.08)',
    'rgba(8,8,17,0.48)',
    'rgba(6,6,14,0.96)',
  ] as const,

  pressFill: 'rgba(255, 255, 255, 0.06)',
  divider: 'rgba(255, 255, 255, 0.10)',
  chipFill: 'rgba(8, 8, 17, 0.62)',
  scrim: 'rgba(0, 0, 0, 0.55)',

  micOn: '#3DCFB0',
  micOff: 'rgba(255, 255, 255, 0.25)',
  live: '#E84091',
  seatEmpty: 'rgba(255, 255, 255, 0.06)',

  blurTint: 'dark' as const,
  statusBar: 'light' as const,
  tabBarOverlay: 'rgba(8, 8, 17, 0.55)',
  tabBarFallback: 'rgba(13, 13, 24, 0.96)',
} satisfies RenkPaleti;

/**
 * Beyaz / Light Premium.
 * Sayfa tuvali açık, gövde yazısı koyu (yutulmaz).
 * Kapak/foto overlay her temada koyu scrim — üstündeki yazı açık kalır.
 */
export const RenkTokenlariAcik = {
  bg: '#F7F4FB',
  bgElevated: '#FFFFFF',
  bgCard: 'rgba(255, 255, 255, 0.94)',
  bgGlass: 'rgba(255, 255, 255, 0.88)',
  surface: '#EFEAF6',
  border: 'rgba(90, 60, 120, 0.12)',
  borderAccent: 'rgba(214, 46, 130, 0.4)',
  borderHot: 'rgba(214, 46, 130, 0.4)',

  text: '#14101C',
  textMuted: 'rgba(20, 16, 28, 0.68)',
  textDim: 'rgba(20, 16, 28, 0.48)',
  /**
   * Marka dolgu / degrade / aktif çip üstü.
   * Açık temada primary/violet/mint koyulaştırıldığı için açık mürekkep şart;
   * koyu mürekkep mor/pembe dolgularda harfleri yutuyordu.
   */
  textOnPrimary: '#FFFFFF',
  /** Medya overlay (koyu scrim) üstü — her temada açık */
  textOnOverlay: '#F7F2F8',

  /** Dolgular + beyaz zemin üstü metin — koyu, yutulmaz */
  primary: '#D62E82',
  primarySoft: '#B8246E',
  magenta: '#7A1AB8',
  violet: '#4F28C4',
  deepPlum: '#4A3558',
  accent: '#8F640E',
  mint: '#0F7A62',

  danger: '#B81A38',
  success: '#0F7A62',
  warning: '#8F640E',

  /** CTA degrade — beyaz textOnPrimary ile okunur */
  gradientPrimary: ['#D62E82', '#7A1AB8'] as const,
  gradientNight: ['#F7F4FB', '#FFFFFF', '#F3EAF8'] as const,
  gradientRoom: ['#FFFFFF', '#F7F4FB', '#EFEAF6'] as const,
  gradientGold: ['#C99214', '#C45E24'] as const,
  gradientDiamond: ['#5B2FD4', '#0F7A62'] as const,
  gradientCard: ['#FFFFFF', '#F7F4FA'] as const,
  gradientPlaceholder: ['#2A1A32', '#1A1224', '#120E1A'] as const,
  /** Foto okunurluğu — açık temada da koyu scrim (beyaz metin yutulmasın) */
  overlayGradient: [
    'rgba(12, 8, 18, 0.1)',
    'rgba(12, 8, 18, 0.52)',
    'rgba(8, 4, 14, 0.94)',
  ] as const,

  pressFill: 'rgba(18, 10, 28, 0.06)',
  divider: 'rgba(18, 10, 28, 0.1)',
  chipFill: 'rgba(12, 8, 18, 0.55)',
  scrim: 'rgba(18, 10, 28, 0.32)',

  micOn: '#0F7A62',
  micOff: 'rgba(20, 16, 28, 0.22)',
  live: '#D62E82',
  seatEmpty: 'rgba(18, 10, 28, 0.06)',

  blurTint: 'light' as const,
  statusBar: 'dark' as const,
  tabBarOverlay: 'rgba(255, 255, 255, 0.72)',
  tabBarFallback: 'rgba(255, 255, 255, 0.94)',
} satisfies RenkPaleti;

/** Kadife Rose — şarap / velvet premium gece */
export const RenkTokenlariKadife = {
  bg: '#1A0A14',
  bgElevated: '#241018',
  bgCard: '#2A1520',
  bgGlass: 'rgba(42, 21, 32, 0.8)',
  surface: '#3A1C28',
  border: 'rgba(248, 232, 240, 0.09)',
  borderAccent: 'rgba(232, 64, 145, 0.45)',
  borderHot: 'rgba(232, 64, 145, 0.45)',

  text: '#F8E8F0',
  textMuted: 'rgba(248, 232, 240, 0.64)',
  textDim: 'rgba(248, 232, 240, 0.4)',
  textOnPrimary: '#12040C',
  textOnOverlay: '#F8E8F0',

  primary: '#E84091',
  primarySoft: '#F06BA8',
  magenta: '#D44AB8',
  violet: '#9B4D7A',
  deepPlum: '#4A1830',
  accent: '#E8B4A0',
  mint: '#3DCFB0',

  danger: '#E84B6A',
  success: '#3DCFB0',
  warning: '#E8B4A0',

  gradientPrimary: ['#E84091', '#C43B8A'] as const,
  gradientNight: ['#1A0A14', '#2A1020', '#3A1830'] as const,
  gradientRoom: ['#3A1428', '#1E0C18', '#1A0A14'] as const,
  gradientGold: ['#E8B4A0', '#D4896A'] as const,
  gradientDiamond: ['#9B4D7A', '#3DCFB0'] as const,
  gradientCard: ['rgba(58,28,40,0.98)', 'rgba(26,10,20,0.99)'] as const,
  gradientPlaceholder: ['#4A1A32', '#2A1020', '#1A0A14'] as const,
  overlayGradient: [
    'rgba(16,4,10,0.08)',
    'rgba(16,4,10,0.5)',
    'rgba(12,2,8,0.96)',
  ] as const,

  pressFill: 'rgba(248, 232, 240, 0.06)',
  divider: 'rgba(248, 232, 240, 0.1)',
  chipFill: 'rgba(12, 4, 10, 0.62)',
  scrim: 'rgba(0, 0, 0, 0.55)',

  micOn: '#3DCFB0',
  micOff: 'rgba(248, 232, 240, 0.25)',
  live: '#E84091',
  seatEmpty: 'rgba(248, 232, 240, 0.06)',

  blurTint: 'dark' as const,
  statusBar: 'light' as const,
  tabBarOverlay: 'rgba(26, 10, 20, 0.42)',
  tabBarFallback: 'rgba(26, 10, 20, 0.96)',
} satisfies RenkPaleti;

/** Champagne Noir — mürekkep gece / VIP altın */
export const RenkTokenlariSampanya = {
  bg: '#0C0A0B',
  bgElevated: '#161210',
  bgCard: '#1C1816',
  bgGlass: 'rgba(28, 24, 22, 0.82)',
  surface: '#2A2420',
  border: 'rgba(244, 237, 227, 0.09)',
  borderAccent: 'rgba(212, 175, 106, 0.42)',
  borderHot: 'rgba(212, 175, 106, 0.42)',

  text: '#F4EDE3',
  textMuted: 'rgba(244, 237, 227, 0.64)',
  textDim: 'rgba(244, 237, 227, 0.4)',
  textOnPrimary: '#140E08',
  textOnOverlay: '#F4EDE3',

  primary: '#D4AF6A',
  primarySoft: '#E4C48A',
  magenta: '#B8885C',
  violet: '#8A6A4A',
  deepPlum: '#3A2A1C',
  accent: '#F0D9A8',
  mint: '#6BB8A0',

  danger: '#E07070',
  success: '#6BB8A0',
  warning: '#F0D9A8',

  gradientPrimary: ['#D4AF6A', '#C4894A'] as const,
  gradientNight: ['#0C0A0B', '#161210', '#241C16'] as const,
  gradientRoom: ['#2A2018', '#14100E', '#0C0A0B'] as const,
  gradientGold: ['#F0D9A8', '#D4AF6A'] as const,
  gradientDiamond: ['#8A6A4A', '#6BB8A0'] as const,
  gradientCard: ['rgba(42,36,32,0.98)', 'rgba(16,12,10,0.99)'] as const,
  gradientPlaceholder: ['#3A2A1C', '#1C1612', '#0C0A0B'] as const,
  overlayGradient: [
    'rgba(8,6,4,0.08)',
    'rgba(8,6,4,0.5)',
    'rgba(4,2,2,0.96)',
  ] as const,

  pressFill: 'rgba(244, 237, 227, 0.06)',
  divider: 'rgba(244, 237, 227, 0.1)',
  chipFill: 'rgba(8, 6, 4, 0.62)',
  scrim: 'rgba(0, 0, 0, 0.58)',

  micOn: '#6BB8A0',
  micOff: 'rgba(244, 237, 227, 0.25)',
  live: '#E84091',
  seatEmpty: 'rgba(244, 237, 227, 0.06)',

  blurTint: 'dark' as const,
  statusBar: 'light' as const,
  tabBarOverlay: 'rgba(12, 10, 11, 0.42)',
  tabBarFallback: 'rgba(12, 10, 11, 0.96)',
} satisfies RenkPaleti;

/** Cosmic Plum — kozmik indigo-mor gece */
export const RenkTokenlariKozmik = {
  bg: '#0E0B1A',
  bgElevated: '#16122A',
  bgCard: '#1A1630',
  bgGlass: 'rgba(26, 22, 48, 0.8)',
  surface: '#28224A',
  border: 'rgba(247, 242, 248, 0.09)',
  borderAccent: 'rgba(232, 64, 145, 0.42)',
  borderHot: 'rgba(232, 64, 145, 0.42)',

  text: '#F7F2F8',
  textMuted: 'rgba(247, 242, 248, 0.64)',
  textDim: 'rgba(247, 242, 248, 0.4)',
  textOnPrimary: '#12040C',
  textOnOverlay: '#F7F2F8',

  primary: '#E84091',
  primarySoft: '#F06BA8',
  magenta: '#C43BFF',
  violet: '#8B5CF6',
  deepPlum: '#2A1848',
  accent: '#F0B429',
  mint: '#3DCFB0',

  danger: '#E84B6A',
  success: '#3DCFB0',
  warning: '#F0B429',

  gradientPrimary: ['#E84091', '#C43BFF'] as const,
  gradientNight: ['#0E0B1A', '#16122A', '#2A1848'] as const,
  gradientRoom: ['#2A1848', '#141028', '#0E0B1A'] as const,
  gradientGold: ['#F0B429', '#E87A3B'] as const,
  gradientDiamond: ['#8B5CF6', '#3DCFB0'] as const,
  gradientCard: ['rgba(40,34,74,0.98)', 'rgba(14,11,26,0.99)'] as const,
  gradientPlaceholder: ['#3A1A48', '#1A122A', '#0E0B1A'] as const,
  overlayGradient: [
    'rgba(8,6,18,0.08)',
    'rgba(8,6,18,0.5)',
    'rgba(6,4,14,0.96)',
  ] as const,

  pressFill: 'rgba(247, 242, 248, 0.06)',
  divider: 'rgba(247, 242, 248, 0.1)',
  chipFill: 'rgba(8, 6, 18, 0.62)',
  scrim: 'rgba(0, 0, 0, 0.55)',

  micOn: '#3DCFB0',
  micOff: 'rgba(247, 242, 248, 0.25)',
  live: '#3DCFB0',
  seatEmpty: 'rgba(247, 242, 248, 0.06)',

  blurTint: 'dark' as const,
  statusBar: 'light' as const,
  tabBarOverlay: 'rgba(14, 11, 26, 0.42)',
  tabBarFallback: 'rgba(14, 11, 26, 0.96)',
} satisfies RenkPaleti;

/** Emerald VIP — orman mürekkebi / zümrüt lounge */
export const RenkTokenlariZumrut = {
  bg: '#0A1210',
  bgElevated: '#101A16',
  bgCard: '#14201C',
  bgGlass: 'rgba(20, 32, 28, 0.82)',
  surface: '#1E2E28',
  border: 'rgba(232, 242, 236, 0.09)',
  borderAccent: 'rgba(46, 196, 160, 0.42)',
  borderHot: 'rgba(46, 196, 160, 0.42)',

  text: '#E8F2EC',
  textMuted: 'rgba(232, 242, 236, 0.64)',
  textDim: 'rgba(232, 242, 236, 0.4)',
  textOnPrimary: '#061210',
  textOnOverlay: '#E8F2EC',

  primary: '#2EC4A0',
  primarySoft: '#4ED4B4',
  magenta: '#3A9A88',
  violet: '#2A6A5C',
  deepPlum: '#1A3A30',
  accent: '#C9A227',
  mint: '#2EC4A0',

  danger: '#E07070',
  success: '#2EC4A0',
  warning: '#C9A227',

  gradientPrimary: ['#2EC4A0', '#1A9A7A'] as const,
  gradientNight: ['#0A1210', '#101A16', '#1A2E28'] as const,
  gradientRoom: ['#1A2E28', '#0E1814', '#0A1210'] as const,
  gradientGold: ['#C9A227', '#A87820'] as const,
  gradientDiamond: ['#2A6A5C', '#2EC4A0'] as const,
  gradientCard: ['rgba(30,46,40,0.98)', 'rgba(10,18,16,0.99)'] as const,
  gradientPlaceholder: ['#1A3A30', '#101A16', '#0A1210'] as const,
  overlayGradient: [
    'rgba(4,10,8,0.08)',
    'rgba(4,10,8,0.5)',
    'rgba(2,8,6,0.96)',
  ] as const,

  pressFill: 'rgba(232, 242, 236, 0.06)',
  divider: 'rgba(232, 242, 236, 0.1)',
  chipFill: 'rgba(4, 10, 8, 0.62)',
  scrim: 'rgba(0, 0, 0, 0.55)',

  micOn: '#2EC4A0',
  micOff: 'rgba(232, 242, 236, 0.25)',
  live: '#2EC4A0',
  seatEmpty: 'rgba(232, 242, 236, 0.06)',

  blurTint: 'dark' as const,
  statusBar: 'light' as const,
  tabBarOverlay: 'rgba(10, 18, 16, 0.42)',
  tabBarFallback: 'rgba(10, 18, 16, 0.96)',
} satisfies RenkPaleti;
