/**
 * Uygulama görünüm kodları — tüm app paleti.
 * Ses odası temalarından (OdaTemaKatalogu) bağımsızdır.
 */

export type TemaKategori =
  | 'klasik'
  | 'gece'
  | 'vip'
  | 'neon'
  | 'doga'
  | 'acik';

export type TemaKodu =
  | 'koyu'
  | 'acik'
  | 'kadife'
  | 'sampanya'
  | 'kozmik'
  | 'zumrut'
  | 'obsidyen'
  | 'ametist'
  | 'safir'
  | 'yakut'
  | 'grafit'
  | 'neon_sehir'
  | 'lavanta'
  | 'bordo'
  | 'buzul'
  | 'bakir'
  | 'titanyum'
  | 'gunbatimi'
  | 'plasma'
  | 'orman'
  | 'gece_mavisi'
  | 'mercana'
  | 'indigo'
  | 'krom'
  | 'inci'
  | 'bulut'
  | 'krem'
  | 'mint_sabah'
  | 'gumus'
  | 'seker';

export const TEMA_KODLARI: readonly TemaKodu[] = [
  'koyu',
  'acik',
  'kadife',
  'sampanya',
  'kozmik',
  'zumrut',
  'obsidyen',
  'ametist',
  'safir',
  'yakut',
  'grafit',
  'neon_sehir',
  'lavanta',
  'bordo',
  'buzul',
  'bakir',
  'titanyum',
  'gunbatimi',
  'plasma',
  'orman',
  'gece_mavisi',
  'mercana',
  'indigo',
  'krom',
  'inci',
  'bulut',
  'krem',
  'mint_sabah',
  'gumus',
  'seker',
] as const;

export const TEMA_KATEGORILERI: readonly {
  kod: TemaKategori | 'hepsi';
  adKey: string;
}[] = [
  { kod: 'hepsi', adKey: 'gorunum.kategoriHepsi' },
  { kod: 'klasik', adKey: 'gorunum.kategoriKlasik' },
  { kod: 'gece', adKey: 'gorunum.kategoriGece' },
  { kod: 'vip', adKey: 'gorunum.kategoriVip' },
  { kod: 'neon', adKey: 'gorunum.kategoriNeon' },
  { kod: 'doga', adKey: 'gorunum.kategoriDoga' },
  { kod: 'acik', adKey: 'gorunum.kategoriAcik' },
] as const;

export const TEMA_META: Record<
  TemaKodu,
  { kategori: TemaKategori; adKey: string; altKey: string }
> = {
  koyu: { kategori: 'klasik', adKey: 'gorunum.koyu', altKey: 'gorunum.koyuAlt' },
  acik: { kategori: 'acik', adKey: 'gorunum.acik', altKey: 'gorunum.acikAlt' },
  kadife: { kategori: 'klasik', adKey: 'gorunum.kadife', altKey: 'gorunum.kadifeAlt' },
  sampanya: { kategori: 'vip', adKey: 'gorunum.sampanya', altKey: 'gorunum.sampanyaAlt' },
  kozmik: { kategori: 'klasik', adKey: 'gorunum.kozmik', altKey: 'gorunum.kozmikAlt' },
  zumrut: { kategori: 'doga', adKey: 'gorunum.zumrut', altKey: 'gorunum.zumrutAlt' },
  obsidyen: { kategori: 'gece', adKey: 'gorunum.obsidyen', altKey: 'gorunum.obsidyenAlt' },
  ametist: { kategori: 'gece', adKey: 'gorunum.ametist', altKey: 'gorunum.ametistAlt' },
  safir: { kategori: 'gece', adKey: 'gorunum.safir', altKey: 'gorunum.safirAlt' },
  yakut: { kategori: 'vip', adKey: 'gorunum.yakut', altKey: 'gorunum.yakutAlt' },
  grafit: { kategori: 'gece', adKey: 'gorunum.grafit', altKey: 'gorunum.grafitAlt' },
  neon_sehir: { kategori: 'neon', adKey: 'gorunum.neon_sehir', altKey: 'gorunum.neon_sehirAlt' },
  lavanta: { kategori: 'gece', adKey: 'gorunum.lavanta', altKey: 'gorunum.lavantaAlt' },
  bordo: { kategori: 'vip', adKey: 'gorunum.bordo', altKey: 'gorunum.bordoAlt' },
  buzul: { kategori: 'doga', adKey: 'gorunum.buzul', altKey: 'gorunum.buzulAlt' },
  bakir: { kategori: 'vip', adKey: 'gorunum.bakir', altKey: 'gorunum.bakirAlt' },
  titanyum: { kategori: 'gece', adKey: 'gorunum.titanyum', altKey: 'gorunum.titanyumAlt' },
  gunbatimi: { kategori: 'neon', adKey: 'gorunum.gunbatimi', altKey: 'gorunum.gunbatimiAlt' },
  plasma: { kategori: 'neon', adKey: 'gorunum.plasma', altKey: 'gorunum.plasmaAlt' },
  orman: { kategori: 'doga', adKey: 'gorunum.orman', altKey: 'gorunum.ormanAlt' },
  gece_mavisi: { kategori: 'gece', adKey: 'gorunum.gece_mavisi', altKey: 'gorunum.gece_mavisiAlt' },
  mercana: { kategori: 'neon', adKey: 'gorunum.mercana', altKey: 'gorunum.mercanaAlt' },
  indigo: { kategori: 'gece', adKey: 'gorunum.indigo', altKey: 'gorunum.indigoAlt' },
  krom: { kategori: 'vip', adKey: 'gorunum.krom', altKey: 'gorunum.kromAlt' },
  inci: { kategori: 'acik', adKey: 'gorunum.inci', altKey: 'gorunum.inciAlt' },
  bulut: { kategori: 'acik', adKey: 'gorunum.bulut', altKey: 'gorunum.bulutAlt' },
  krem: { kategori: 'acik', adKey: 'gorunum.krem', altKey: 'gorunum.kremAlt' },
  mint_sabah: { kategori: 'acik', adKey: 'gorunum.mint_sabah', altKey: 'gorunum.mint_sabahAlt' },
  gumus: { kategori: 'acik', adKey: 'gorunum.gumus', altKey: 'gorunum.gumusAlt' },
  seker: { kategori: 'acik', adKey: 'gorunum.seker', altKey: 'gorunum.sekerAlt' },
};

const TEMA_KOD_SET = new Set<string>(TEMA_KODLARI);

export function temaKoduMu(deger: string | null | undefined): deger is TemaKodu {
  return !!deger && TEMA_KOD_SET.has(deger);
}

export type RenkPaleti = {
  bg: string;
  bgElevated: string;
  bgCard: string;
  bgGlass: string;
  surface: string;
  border: string;
  borderAccent: string;
  borderHot: string;
  text: string;
  textMuted: string;
  textDim: string;
  textOnPrimary: string;
  /** Kapak / media overlay uzerindeki yazi — koyu scrim ustunde acik kalir. */
  textOnOverlay: string;
  primary: string;
  primarySoft: string;
  magenta: string;
  violet: string;
  deepPlum: string;
  accent: string;
  mint: string;
  danger: string;
  success: string;
  warning: string;
  gradientPrimary: readonly [string, string];
  gradientNight: readonly [string, string, string];
  gradientRoom: readonly [string, string, string];
  gradientGold: readonly [string, string];
  gradientDiamond: readonly [string, string];
  gradientCard: readonly [string, string];
  /** Kapak yokken kart zemini */
  gradientPlaceholder: readonly [string, string, string];
  /** Foto/kapak uzerine yazi okunurlugu — her temada koyu scrim */
  overlayGradient: readonly [string, string, string];
  pressFill: string;
  divider: string;
  chipFill: string;
  scrim: string;
  micOn: string;
  micOff: string;
  live: string;
  seatEmpty: string;
  blurTint: 'dark' | 'light' | 'default';
  statusBar: 'light' | 'dark';
  tabBarOverlay: string;
  tabBarFallback: string;
};
