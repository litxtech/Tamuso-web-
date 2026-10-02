import type { RenkPaleti, TemaKodu } from './TemaTipleri';
import {
  RenkTokenlariAcik,
  RenkTokenlariKadife,
  RenkTokenlariKoyu,
  RenkTokenlariKozmik,
  RenkTokenlariSampanya,
  RenkTokenlariZumrut,
} from './RenkPaletleriTemel';

export {
  RenkTokenlariAcik,
  RenkTokenlariKadife,
  RenkTokenlariKoyu,
  RenkTokenlariKozmik,
  RenkTokenlariSampanya,
  RenkTokenlariZumrut,
};

type Tohum = {
  bg: string;
  bgElevated: string;
  bgCard: string;
  surface: string;
  text: string;
  primary: string;
  primarySoft: string;
  magenta: string;
  violet: string;
  deepPlum: string;
  accent: string;
  mint: string;
  light?: boolean;
};

function rgbaFromHex(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Marka tohumundan tam RenkPaleti uretir — acik/koyu otomatik. */
export function paletUret(t: Tohum): RenkPaleti {
  const light = !!t.light;
  const ink = t.text;
  return {
    bg: t.bg,
    bgElevated: t.bgElevated,
    bgCard: t.bgCard,
    bgGlass: light ? 'rgba(255, 255, 255, 0.88)' : rgbaFromHex(t.bgCard, 0.82),
    surface: t.surface,
    border: light ? rgbaFromHex(t.deepPlum, 0.12) : rgbaFromHex(ink, 0.09),
    borderAccent: rgbaFromHex(t.primary, 0.42),
    borderHot: rgbaFromHex(t.primary, 0.42),

    text: ink,
    textMuted: light ? rgbaFromHex(ink, 0.68) : rgbaFromHex(ink, 0.64),
    textDim: light ? rgbaFromHex(ink, 0.48) : rgbaFromHex(ink, 0.4),
    textOnPrimary: light ? '#FFFFFF' : '#12040C',
    textOnOverlay: '#F7F2F8',

    primary: t.primary,
    primarySoft: t.primarySoft,
    magenta: t.magenta,
    violet: t.violet,
    deepPlum: t.deepPlum,
    accent: t.accent,
    mint: t.mint,

    danger: light ? '#B81A38' : '#E84B6A',
    success: t.mint,
    warning: t.accent,

    gradientPrimary: [t.primary, t.magenta] as const,
    gradientNight: [t.bg, t.bgElevated, t.deepPlum] as const,
    gradientRoom: [t.surface, t.bgElevated, t.bg] as const,
    gradientGold: [t.accent, t.primary] as const,
    gradientDiamond: [t.violet, t.mint] as const,
    gradientCard: light
      ? (['#FFFFFF', t.bgElevated] as const)
      : ([rgbaFromHex(t.surface, 0.98), rgbaFromHex(t.bg, 0.99)] as const),
    gradientPlaceholder: [t.deepPlum, t.bgElevated, t.bg] as const,
    overlayGradient: light
      ? ([
          'rgba(12, 8, 18, 0.1)',
          'rgba(12, 8, 18, 0.52)',
          'rgba(8, 4, 14, 0.94)',
        ] as const)
      : ([
          rgbaFromHex(t.bg, 0.08),
          rgbaFromHex(t.bg, 0.5),
          rgbaFromHex(t.bg, 0.96),
        ] as const),

    pressFill: rgbaFromHex(ink, 0.06),
    divider: rgbaFromHex(ink, 0.1),
    chipFill: light ? 'rgba(12, 8, 18, 0.55)' : rgbaFromHex(t.bg, 0.62),
    scrim: light ? rgbaFromHex(ink, 0.32) : 'rgba(0, 0, 0, 0.55)',

    micOn: t.mint,
    micOff: light ? rgbaFromHex(ink, 0.22) : rgbaFromHex(ink, 0.25),
    live: t.primary,
    seatEmpty: rgbaFromHex(ink, 0.06),

    blurTint: light ? ('light' as const) : ('dark' as const),
    statusBar: light ? ('dark' as const) : ('light' as const),
    tabBarOverlay: light
      ? 'rgba(255, 255, 255, 0.72)'
      : rgbaFromHex(t.bg, 0.42),
    tabBarFallback: light
      ? 'rgba(255, 255, 255, 0.94)'
      : rgbaFromHex(t.bg, 0.96),
  };
}

const Yeniler = {
  obsidyen: paletUret({
    bg: '#0A0A0C',
    bgElevated: '#121214',
    bgCard: '#1A1A1E',
    surface: '#26262C',
    text: '#F0F0F4',
    primary: '#A8A8B8',
    primarySoft: '#C8C8D4',
    magenta: '#8888A0',
    violet: '#6A6A80',
    deepPlum: '#2A2A32',
    accent: '#E8E8F0',
    mint: '#7AB8A8',
  }),
  ametist: paletUret({
    bg: '#12081C',
    bgElevated: '#1A0E28',
    bgCard: '#241438',
    surface: '#321C4A',
    text: '#F4ECFA',
    primary: '#B794FF',
    primarySoft: '#CDB4FF',
    magenta: '#A060FF',
    violet: '#7B4CD4',
    deepPlum: '#2A1048',
    accent: '#E8C878',
    mint: '#6BCFB0',
  }),
  safir: paletUret({
    bg: '#060E1C',
    bgElevated: '#0C1628',
    bgCard: '#142038',
    surface: '#1C2E4A',
    text: '#E8F0FA',
    primary: '#4A8CFF',
    primarySoft: '#7AADFF',
    magenta: '#3A6AD4',
    violet: '#2A4AB0',
    deepPlum: '#0E2448',
    accent: '#F0B429',
    mint: '#3DCFB0',
  }),
  yakut: paletUret({
    bg: '#14080A',
    bgElevated: '#1E0C10',
    bgCard: '#2A1218',
    surface: '#3A1A22',
    text: '#FAECEE',
    primary: '#FF3D5C',
    primarySoft: '#FF6A80',
    magenta: '#E03050',
    violet: '#A02848',
    deepPlum: '#3A1018',
    accent: '#F0B429',
    mint: '#3DCFB0',
  }),
  grafit: paletUret({
    bg: '#101014',
    bgElevated: '#18181E',
    bgCard: '#222228',
    surface: '#2E2E36',
    text: '#EEF0F4',
    primary: '#8E8E9A',
    primarySoft: '#AEAEB8',
    magenta: '#6E6E7A',
    violet: '#5A5A68',
    deepPlum: '#2A2A32',
    accent: '#D4AF6A',
    mint: '#6BB8A0',
  }),
  neon_sehir: paletUret({
    bg: '#0A0614',
    bgElevated: '#120A22',
    bgCard: '#1A1030',
    surface: '#281848',
    text: '#F8F0FF',
    primary: '#FF5AB8',
    primarySoft: '#FF80CC',
    magenta: '#C43BFF',
    violet: '#6A4CFF',
    deepPlum: '#2A1050',
    accent: '#3DFFC8',
    mint: '#3DFFC8',
  }),
  lavanta: paletUret({
    bg: '#100C1A',
    bgElevated: '#181228',
    bgCard: '#221A38',
    surface: '#302850',
    text: '#F2ECFA',
    primary: '#D0B0FF',
    primarySoft: '#E0C8FF',
    magenta: '#B080F0',
    violet: '#8860D0',
    deepPlum: '#2A1A48',
    accent: '#F0A0C0',
    mint: '#7AD4C0',
  }),
  bordo: paletUret({
    bg: '#12080C',
    bgElevated: '#1C0C12',
    bgCard: '#281018',
    surface: '#381820',
    text: '#F8ECEE',
    primary: '#C04060',
    primarySoft: '#D46078',
    magenta: '#A03050',
    violet: '#702038',
    deepPlum: '#2A1018',
    accent: '#E8C878',
    mint: '#6BB8A0',
  }),
  buzul: paletUret({
    bg: '#061018',
    bgElevated: '#0A1824',
    bgCard: '#102030',
    surface: '#182C40',
    text: '#E8F4FA',
    primary: '#5EC8F0',
    primarySoft: '#8AD8F8',
    magenta: '#3AA8D0',
    violet: '#2A7898',
    deepPlum: '#0E2840',
    accent: '#A8E0FF',
    mint: '#40D4C8',
  }),
  bakir: paletUret({
    bg: '#120C08',
    bgElevated: '#1C1410',
    bgCard: '#281C14',
    surface: '#382818',
    text: '#F8F0E8',
    primary: '#D4884A',
    primarySoft: '#E4A870',
    magenta: '#B46838',
    violet: '#8A5030',
    deepPlum: '#2A1C10',
    accent: '#F0D9A8',
    mint: '#6BB8A0',
  }),
  titanyum: paletUret({
    bg: '#0C0E12',
    bgElevated: '#14181E',
    bgCard: '#1C222A',
    surface: '#2A323C',
    text: '#E8ECF0',
    primary: '#9AA4B0',
    primarySoft: '#B8C0CA',
    magenta: '#7A8490',
    violet: '#5A6470',
    deepPlum: '#1A2228',
    accent: '#C8D0DC',
    mint: '#6BB8A0',
  }),
  gunbatimi: paletUret({
    bg: '#140A08',
    bgElevated: '#1E100C',
    bgCard: '#2A1810',
    surface: '#3A2418',
    text: '#FAF0E8',
    primary: '#FF7A45',
    primarySoft: '#FF9A6A',
    magenta: '#E05030',
    violet: '#A03828',
    deepPlum: '#2A140C',
    accent: '#F0B429',
    mint: '#3DCFB0',
  }),
  plasma: paletUret({
    bg: '#100610',
    bgElevated: '#1A0A1A',
    bgCard: '#281028',
    surface: '#3A1840',
    text: '#FAF0FA',
    primary: '#FF5AB8',
    primarySoft: '#FF80CC',
    magenta: '#E040A0',
    violet: '#A02880',
    deepPlum: '#2A1030',
    accent: '#B794FF',
    mint: '#3DFFC8',
  }),
  orman: paletUret({
    bg: '#081208',
    bgElevated: '#0E1A0E',
    bgCard: '#162416',
    surface: '#223022',
    text: '#EAF4EA',
    primary: '#6BCF8E',
    primarySoft: '#8ADFA8',
    magenta: '#4AA870',
    violet: '#3A7858',
    deepPlum: '#142814',
    accent: '#C9A227',
    mint: '#6BCF8E',
  }),
  gece_mavisi: paletUret({
    bg: '#060C18',
    bgElevated: '#0C1424',
    bgCard: '#141E34',
    surface: '#1C2A44',
    text: '#E8F0FA',
    primary: '#3D9CFF',
    primarySoft: '#6AB4FF',
    magenta: '#2A78D4',
    violet: '#1A5898',
    deepPlum: '#0C2040',
    accent: '#F0B429',
    mint: '#3DCFB0',
  }),
  mercana: paletUret({
    bg: '#140A0C',
    bgElevated: '#1E1014',
    bgCard: '#2A181C',
    surface: '#3A2428',
    text: '#FAF0F0',
    primary: '#FF6B6B',
    primarySoft: '#FF9090',
    magenta: '#E05050',
    violet: '#A03848',
    deepPlum: '#2A1014',
    accent: '#FFA078',
    mint: '#3DCFB0',
  }),
  indigo: paletUret({
    bg: '#080A18',
    bgElevated: '#101428',
    bgCard: '#181C38',
    surface: '#242850',
    text: '#EEF0FA',
    primary: '#7B6CFF',
    primarySoft: '#9A90FF',
    magenta: '#5A4CD4',
    violet: '#4038B0',
    deepPlum: '#141848',
    accent: '#F0B429',
    mint: '#3DCFB0',
  }),
  krom: paletUret({
    bg: '#0E1014',
    bgElevated: '#161A20',
    bgCard: '#1E242C',
    surface: '#2C343E',
    text: '#F0F2F4',
    primary: '#B8C8D8',
    primarySoft: '#D0DCE8',
    magenta: '#8898A8',
    violet: '#687888',
    deepPlum: '#1A2228',
    accent: '#E8C878',
    mint: '#6BB8A0',
  }),
  inci: paletUret({
    bg: '#FBF8FC',
    bgElevated: '#FFFFFF',
    bgCard: 'rgba(255,255,255,0.94)',
    surface: '#F3EEF6',
    text: '#1A1420',
    primary: '#D62E82',
    primarySoft: '#B8246E',
    magenta: '#7A1AB8',
    violet: '#4F28C4',
    deepPlum: '#4A3558',
    accent: '#8F640E',
    mint: '#0F7A62',
    light: true,
  }),
  bulut: paletUret({
    bg: '#F4F6F9',
    bgElevated: '#FFFFFF',
    bgCard: 'rgba(255,255,255,0.95)',
    surface: '#E8ECF2',
    text: '#141820',
    primary: '#3A6AD4',
    primarySoft: '#2A58B8',
    magenta: '#4A48A8',
    violet: '#3A3890',
    deepPlum: '#2A3040',
    accent: '#8F640E',
    mint: '#0F7A62',
    light: true,
  }),
  krem: paletUret({
    bg: '#F8F4EC',
    bgElevated: '#FFFCFA',
    bgCard: 'rgba(255,252,248,0.96)',
    surface: '#EFE8DC',
    text: '#1C1410',
    primary: '#B8882A',
    primarySoft: '#9A7018',
    magenta: '#8A6030',
    violet: '#6A4828',
    deepPlum: '#3A3020',
    accent: '#8F640E',
    mint: '#0F7A62',
    light: true,
  }),
  mint_sabah: paletUret({
    bg: '#F2F8F6',
    bgElevated: '#FFFFFF',
    bgCard: 'rgba(255,255,255,0.95)',
    surface: '#E4F0EC',
    text: '#0E1A16',
    primary: '#0F7A62',
    primarySoft: '#0A6450',
    magenta: '#1A6A58',
    violet: '#184A40',
    deepPlum: '#1A3A30',
    accent: '#8F640E',
    mint: '#0F7A62',
    light: true,
  }),
  gumus: paletUret({
    bg: '#F5F6F8',
    bgElevated: '#FFFFFF',
    bgCard: 'rgba(255,255,255,0.96)',
    surface: '#E8EAEE',
    text: '#16181C',
    primary: '#5A6470',
    primarySoft: '#484E58',
    magenta: '#4A5058',
    violet: '#3A4048',
    deepPlum: '#2A3038',
    accent: '#8F640E',
    mint: '#0F7A62',
    light: true,
  }),
  seker: paletUret({
    bg: '#FBF4F7',
    bgElevated: '#FFFFFF',
    bgCard: 'rgba(255,255,255,0.95)',
    surface: '#F4E6EC',
    text: '#1A1014',
    primary: '#D45A8A',
    primarySoft: '#B84872',
    magenta: '#A03868',
    violet: '#782850',
    deepPlum: '#3A2030',
    accent: '#8F640E',
    mint: '#0F7A62',
    light: true,
  }),
} as const satisfies Record<string, RenkPaleti>;

/** Tum uygulama gorunum paletleri */
export const RENK_PALET_HARITASI: Record<TemaKodu, RenkPaleti> = {
  koyu: RenkTokenlariKoyu,
  acik: RenkTokenlariAcik,
  kadife: RenkTokenlariKadife,
  sampanya: RenkTokenlariSampanya,
  kozmik: RenkTokenlariKozmik,
  zumrut: RenkTokenlariZumrut,
  ...Yeniler,
};

export function temaAcikMi(kod: TemaKodu): boolean {
  return RENK_PALET_HARITASI[kod]?.statusBar === 'dark';
}
