import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import i18n from '../../../i18n';

/** Oda tema kategori grupları — seçicide filtre */
export type OdaTemaKategori =
  | 'gece'
  | 'neon'
  | 'vip'
  | 'doga'
  | 'romantik'
  | 'uzay'
  | 'metal'
  | 'platform';

/** Sahne atmosfer stili — OdaSahneArkaPlan katmanları */
export type OdaTemaAtmosfer =
  | 'soft_orbs'
  | 'aurora'
  | 'mesh'
  | 'glow'
  | 'silk'
  | 'vignette'
  | 'crystal';

export type OdaTemaTanim = {
  kod: string;
  ad: string;
  alt: string;
  renkler: readonly [string, string, string];
  vurgu: string;
  kategori: OdaTemaKategori;
  atmosfer: OdaTemaAtmosfer;
};

type OdaTemaSabit = Omit<OdaTemaTanim, 'ad' | 'alt'> & {
  adKey: string;
  altKey: string;
};

export const ODA_TEMA_KATEGORILERI: readonly {
  kod: OdaTemaKategori | 'hepsi';
  adKey: string;
}[] = [
  { kod: 'hepsi', adKey: 'odaTema.kategoriHepsi' },
  { kod: 'gece', adKey: 'odaTema.kategoriGece' },
  { kod: 'neon', adKey: 'odaTema.kategoriNeon' },
  { kod: 'vip', adKey: 'odaTema.kategoriVip' },
  { kod: 'doga', adKey: 'odaTema.kategoriDoga' },
  { kod: 'romantik', adKey: 'odaTema.kategoriRomantik' },
  { kod: 'uzay', adKey: 'odaTema.kategoriUzay' },
  { kod: 'metal', adKey: 'odaTema.kategoriMetal' },
  { kod: 'platform', adKey: 'odaTema.kategoriPlatform' },
] as const;

/**
 * Oda arka plan temaları — modern / premium gradient sahneler.
 * DB `room_themes.code` ile uyumlu; özel kapak yoksa sahne bunları kullanır.
 */
const ODA_TEMA_SABITLERI: OdaTemaSabit[] = [
  // —— Mevcut 12 (sıra korunur) ——
  {
    kod: 'midnight_plum',
    adKey: 'odaTema.midnight_plum',
    altKey: 'odaTema.midnight_plumAlt',
    renkler: ['#4A1A48', '#1E1230', '#0A0612'] as const,
    vurgu: RenkTokenlari.primary,
    kategori: 'gece',
    atmosfer: 'soft_orbs',
  },
  {
    kod: 'neon_aurora',
    adKey: 'odaTema.neon_aurora',
    altKey: 'odaTema.neon_auroraAlt',
    renkler: ['#5C1A5A', '#2E1848', '#100E1C'] as const,
    vurgu: RenkTokenlari.magenta,
    kategori: 'neon',
    atmosfer: 'aurora',
  },
  {
    kod: 'royal_gold',
    adKey: 'odaTema.royal_gold',
    altKey: 'odaTema.royal_goldAlt',
    renkler: ['#4A3418', '#2A1C10', '#100C08'] as const,
    vurgu: RenkTokenlari.accent,
    kategori: 'vip',
    atmosfer: 'glow',
  },
  {
    kod: 'cosmic_void',
    adKey: 'odaTema.cosmic_void',
    altKey: 'odaTema.cosmic_voidAlt',
    renkler: ['#1E1A58', '#121038', '#080814'] as const,
    vurgu: RenkTokenlari.violet,
    kategori: 'uzay',
    atmosfer: 'mesh',
  },
  {
    kod: 'arctic_mist',
    adKey: 'odaTema.arctic_mist',
    altKey: 'odaTema.arctic_mistAlt',
    renkler: ['#1A3A52', '#0E2438', '#060E18'] as const,
    vurgu: '#5EC8F0',
    kategori: 'doga',
    atmosfer: 'silk',
  },
  {
    kod: 'cherry_noir',
    adKey: 'odaTema.cherry_noir',
    altKey: 'odaTema.cherry_noirAlt',
    renkler: ['#4A1220', '#2A0C14', '#0E0608'] as const,
    vurgu: '#FF4D6D',
    kategori: 'romantik',
    atmosfer: 'vignette',
  },
  {
    kod: 'emerald_haze',
    adKey: 'odaTema.emerald_haze',
    altKey: 'odaTema.emerald_hazeAlt',
    renkler: ['#0E3A32', '#0A2420', '#061210'] as const,
    vurgu: RenkTokenlari.mint,
    kategori: 'doga',
    atmosfer: 'soft_orbs',
  },
  {
    kod: 'sunset_pulse',
    adKey: 'odaTema.sunset_pulse',
    altKey: 'odaTema.sunset_pulseAlt',
    renkler: ['#5A2818', '#301810', '#120A08'] as const,
    vurgu: '#FF7A45',
    kategori: 'neon',
    atmosfer: 'aurora',
  },
  {
    kod: 'electric_lilac',
    adKey: 'odaTema.electric_lilac',
    altKey: 'odaTema.electric_lilacAlt',
    renkler: ['#3A1A68', '#201040', '#0C0818'] as const,
    vurgu: '#B794FF',
    kategori: 'neon',
    atmosfer: 'glow',
  },
  {
    kod: 'ocean_depth',
    adKey: 'odaTema.ocean_depth',
    altKey: 'odaTema.ocean_depthAlt',
    renkler: ['#0E2E48', '#0A1C30', '#060E18'] as const,
    vurgu: '#3DB8E8',
    kategori: 'doga',
    atmosfer: 'silk',
  },
  {
    kod: 'velvet_rose',
    adKey: 'odaTema.velvet_rose',
    altKey: 'odaTema.velvet_roseAlt',
    renkler: ['#4A2038', '#2A1424', '#100810'] as const,
    vurgu: '#F0A0C0',
    kategori: 'romantik',
    atmosfer: 'soft_orbs',
  },
  {
    kod: 'cyber_mint',
    adKey: 'odaTema.cyber_mint',
    altKey: 'odaTema.cyber_mintAlt',
    renkler: ['#0E2E2A', '#0A1C1C', '#060E10'] as const,
    vurgu: '#3DFFC8',
    kategori: 'neon',
    atmosfer: 'crystal',
  },

  // —— Premium genişleme ——
  {
    kod: 'obsidian_noir',
    adKey: 'odaTema.obsidian_noir',
    altKey: 'odaTema.obsidian_noirAlt',
    renkler: ['#1A1A22', '#0E0E14', '#050508'] as const,
    vurgu: '#A8A8B8',
    kategori: 'gece',
    atmosfer: 'vignette',
  },
  {
    kod: 'amethyst_dusk',
    adKey: 'odaTema.amethyst_dusk',
    altKey: 'odaTema.amethyst_duskAlt',
    renkler: ['#3A1858', '#1E0E38', '#0A0618'] as const,
    vurgu: '#C9A0FF',
    kategori: 'gece',
    atmosfer: 'soft_orbs',
  },
  {
    kod: 'noir_sapphire',
    adKey: 'odaTema.noir_sapphire',
    altKey: 'odaTema.noir_sapphireAlt',
    renkler: ['#122048', '#0A1430', '#040810'] as const,
    vurgu: '#4A7CFF',
    kategori: 'gece',
    atmosfer: 'mesh',
  },
  {
    kod: 'graphite_smoke',
    adKey: 'odaTema.graphite_smoke',
    altKey: 'odaTema.graphite_smokeAlt',
    renkler: ['#2A2A32', '#16161C', '#08080C'] as const,
    vurgu: '#8E8E9A',
    kategori: 'gece',
    atmosfer: 'silk',
  },
  {
    kod: 'indigo_velvet',
    adKey: 'odaTema.indigo_velvet',
    altKey: 'odaTema.indigo_velvetAlt',
    renkler: ['#1C1848', '#100E30', '#060612'] as const,
    vurgu: '#7B6CFF',
    kategori: 'gece',
    atmosfer: 'glow',
  },
  {
    kod: 'plasma_pink',
    adKey: 'odaTema.plasma_pink',
    altKey: 'odaTema.plasma_pinkAlt',
    renkler: ['#5A1040', '#2E0A28', '#120810'] as const,
    vurgu: '#FF5AB8',
    kategori: 'neon',
    atmosfer: 'glow',
  },
  {
    kod: 'laser_violet',
    adKey: 'odaTema.laser_violet',
    altKey: 'odaTema.laser_violetAlt',
    renkler: ['#2E0A5A', '#180838', '#080414'] as const,
    vurgu: '#A855FF',
    kategori: 'neon',
    atmosfer: 'crystal',
  },
  {
    kod: 'hologram_teal',
    adKey: 'odaTema.hologram_teal',
    altKey: 'odaTema.hologram_tealAlt',
    renkler: ['#0A3A42', '#062428', '#041012'] as const,
    vurgu: '#2EE6D6',
    kategori: 'neon',
    atmosfer: 'aurora',
  },
  {
    kod: 'neon_citrus',
    adKey: 'odaTema.neon_citrus',
    altKey: 'odaTema.neon_citrusAlt',
    renkler: ['#3A3410', '#221E0A', '#0E0C06'] as const,
    vurgu: '#D4FF3D',
    kategori: 'neon',
    atmosfer: 'glow',
  },
  {
    kod: 'synthwave_dusk',
    adKey: 'odaTema.synthwave_dusk',
    altKey: 'odaTema.synthwave_duskAlt',
    renkler: ['#4A1848', '#281038', '#100818'] as const,
    vurgu: '#FF6AD5',
    kategori: 'neon',
    atmosfer: 'aurora',
  },
  {
    kod: 'volt_blue',
    adKey: 'odaTema.volt_blue',
    altKey: 'odaTema.volt_blueAlt',
    renkler: ['#0A2858', '#061838', '#040C18'] as const,
    vurgu: '#3D9CFF',
    kategori: 'neon',
    atmosfer: 'mesh',
  },
  {
    kod: 'champagne_suite',
    adKey: 'odaTema.champagne_suite',
    altKey: 'odaTema.champagne_suiteAlt',
    renkler: ['#3A3020', '#221C14', '#100E0A'] as const,
    vurgu: '#E8C878',
    kategori: 'vip',
    atmosfer: 'silk',
  },
  {
    kod: 'black_diamond',
    adKey: 'odaTema.black_diamond',
    altKey: 'odaTema.black_diamondAlt',
    renkler: ['#1C1C24', '#101018', '#060608'] as const,
    vurgu: '#E8E8F0',
    kategori: 'vip',
    atmosfer: 'crystal',
  },
  {
    kod: 'platinum_lounge',
    adKey: 'odaTema.platinum_lounge',
    altKey: 'odaTema.platinum_loungeAlt',
    renkler: ['#2E3038', '#1A1C22', '#0A0C10'] as const,
    vurgu: '#C8D0DC',
    kategori: 'vip',
    atmosfer: 'silk',
  },
  {
    kod: 'amber_throne',
    adKey: 'odaTema.amber_throne',
    altKey: 'odaTema.amber_throneAlt',
    renkler: ['#4A2810', '#2A180A', '#120A06'] as const,
    vurgu: '#FFB04A',
    kategori: 'vip',
    atmosfer: 'glow',
  },
  {
    kod: 'ruby_vip',
    adKey: 'odaTema.ruby_vip',
    altKey: 'odaTema.ruby_vipAlt',
    renkler: ['#481018', '#2A0A10', '#100608'] as const,
    vurgu: '#FF3D5C',
    kategori: 'vip',
    atmosfer: 'vignette',
  },
  {
    kod: 'jade_palace',
    adKey: 'odaTema.jade_palace',
    altKey: 'odaTema.jade_palaceAlt',
    renkler: ['#0E3428', '#0A221C', '#060E0C'] as const,
    vurgu: '#5CFFB0',
    kategori: 'vip',
    atmosfer: 'soft_orbs',
  },
  {
    kod: 'forest_whisper',
    adKey: 'odaTema.forest_whisper',
    altKey: 'odaTema.forest_whisperAlt',
    renkler: ['#143828', '#0C2418', '#060E0A'] as const,
    vurgu: '#6BCF8E',
    kategori: 'doga',
    atmosfer: 'soft_orbs',
  },
  {
    kod: 'lagoon_breeze',
    adKey: 'odaTema.lagoon_breeze',
    altKey: 'odaTema.lagoon_breezeAlt',
    renkler: ['#0E3840', '#0A2428', '#041012'] as const,
    vurgu: '#40D4C8',
    kategori: 'doga',
    atmosfer: 'silk',
  },
  {
    kod: 'moss_temple',
    adKey: 'odaTema.moss_temple',
    altKey: 'odaTema.moss_templeAlt',
    renkler: ['#243818', '#162410', '#0A1008'] as const,
    vurgu: '#A8D060',
    kategori: 'doga',
    atmosfer: 'vignette',
  },
  {
    kod: 'glacier_peak',
    adKey: 'odaTema.glacier_peak',
    altKey: 'odaTema.glacier_peakAlt',
    renkler: ['#1A3850', '#102838', '#081018'] as const,
    vurgu: '#A8E0FF',
    kategori: 'doga',
    atmosfer: 'mesh',
  },
  {
    kod: 'desert_mirage',
    adKey: 'odaTema.desert_mirage',
    altKey: 'odaTema.desert_mirageAlt',
    renkler: ['#4A3420', '#2C2014', '#120E08'] as const,
    vurgu: '#E8B878',
    kategori: 'doga',
    atmosfer: 'aurora',
  },
  {
    kod: 'tropical_night',
    adKey: 'odaTema.tropical_night',
    altKey: 'odaTema.tropical_nightAlt',
    renkler: ['#0E3840', '#1A2840', '#080E18'] as const,
    vurgu: '#FF8A5C',
    kategori: 'doga',
    atmosfer: 'aurora',
  },
  {
    kod: 'blush_satin',
    adKey: 'odaTema.blush_satin',
    altKey: 'odaTema.blush_satinAlt',
    renkler: ['#4A2838', '#2E1828', '#120A12'] as const,
    vurgu: '#FFB0C8',
    kategori: 'romantik',
    atmosfer: 'silk',
  },
  {
    kod: 'crimson_silk',
    adKey: 'odaTema.crimson_silk',
    altKey: 'odaTema.crimson_silkAlt',
    renkler: ['#4A1428', '#2A0C18', '#100608'] as const,
    vurgu: '#FF5A7A',
    kategori: 'romantik',
    atmosfer: 'silk',
  },
  {
    kod: 'peach_glow',
    adKey: 'odaTema.peach_glow',
    altKey: 'odaTema.peach_glowAlt',
    renkler: ['#4A3028', '#2E1C18', '#120C0A'] as const,
    vurgu: '#FFA078',
    kategori: 'romantik',
    atmosfer: 'glow',
  },
  {
    kod: 'lavender_dream',
    adKey: 'odaTema.lavender_dream',
    altKey: 'odaTema.lavender_dreamAlt',
    renkler: ['#382858', '#241838', '#0E0A18'] as const,
    vurgu: '#D0B0FF',
    kategori: 'romantik',
    atmosfer: 'soft_orbs',
  },
  {
    kod: 'bordeaux_night',
    adKey: 'odaTema.bordeaux_night',
    altKey: 'odaTema.bordeaux_nightAlt',
    renkler: ['#3A1020', '#220A14', '#0C0608'] as const,
    vurgu: '#C04060',
    kategori: 'romantik',
    atmosfer: 'vignette',
  },
  {
    kod: 'nebula_rose',
    adKey: 'odaTema.nebula_rose',
    altKey: 'odaTema.nebula_roseAlt',
    renkler: ['#3A1848', '#241028', '#0C0814'] as const,
    vurgu: '#FF80B0',
    kategori: 'uzay',
    atmosfer: 'aurora',
  },
  {
    kod: 'starlight_indigo',
    adKey: 'odaTema.starlight_indigo',
    altKey: 'odaTema.starlight_indigoAlt',
    renkler: ['#141848', '#0C0E30', '#040610'] as const,
    vurgu: '#8090FF',
    kategori: 'uzay',
    atmosfer: 'mesh',
  },
  {
    kod: 'galaxy_teal',
    adKey: 'odaTema.galaxy_teal',
    altKey: 'odaTema.galaxy_tealAlt',
    renkler: ['#0A2840', '#0E1838', '#060C18'] as const,
    vurgu: '#40E0C0',
    kategori: 'uzay',
    atmosfer: 'soft_orbs',
  },
  {
    kod: 'pulsar_purple',
    adKey: 'odaTema.pulsar_purple',
    altKey: 'odaTema.pulsar_purpleAlt',
    renkler: ['#2A1050', '#180A38', '#080414'] as const,
    vurgu: '#B060FF',
    kategori: 'uzay',
    atmosfer: 'glow',
  },
  {
    kod: 'comet_trail',
    adKey: 'odaTema.comet_trail',
    altKey: 'odaTema.comet_trailAlt',
    renkler: ['#182848', '#101C38', '#060C18'] as const,
    vurgu: '#80D0FF',
    kategori: 'uzay',
    atmosfer: 'aurora',
  },
  {
    kod: 'void_ember',
    adKey: 'odaTema.void_ember',
    altKey: 'odaTema.void_emberAlt',
    renkler: ['#281018', '#180A10', '#080406'] as const,
    vurgu: '#FF6040',
    kategori: 'uzay',
    atmosfer: 'vignette',
  },
  {
    kod: 'chrome_frost',
    adKey: 'odaTema.chrome_frost',
    altKey: 'odaTema.chrome_frostAlt',
    renkler: ['#2A3038', '#181C22', '#0A0C10'] as const,
    vurgu: '#B8C8D8',
    kategori: 'metal',
    atmosfer: 'crystal',
  },
  {
    kod: 'copper_wire',
    adKey: 'odaTema.copper_wire',
    altKey: 'odaTema.copper_wireAlt',
    renkler: ['#3A2418', '#221610', '#100C08'] as const,
    vurgu: '#D4884A',
    kategori: 'metal',
    atmosfer: 'mesh',
  },
  {
    kod: 'titanium_edge',
    adKey: 'odaTema.titanium_edge',
    altKey: 'odaTema.titanium_edgeAlt',
    renkler: ['#282C34', '#16181E', '#080A0C'] as const,
    vurgu: '#9AA4B0',
    kategori: 'metal',
    atmosfer: 'crystal',
  },
  {
    kod: 'bronze_mirror',
    adKey: 'odaTema.bronze_mirror',
    altKey: 'odaTema.bronze_mirrorAlt',
    renkler: ['#3A2C1C', '#221A10', '#100C08'] as const,
    vurgu: '#C89858',
    kategori: 'metal',
    atmosfer: 'silk',
  },
  {
    kod: 'mercury_glass',
    adKey: 'odaTema.mercury_glass',
    altKey: 'odaTema.mercury_glassAlt',
    renkler: ['#242830', '#14161C', '#08090C'] as const,
    vurgu: '#D0D8E0',
    kategori: 'metal',
    atmosfer: 'glow',
  },
  {
    kod: 'steel_neon',
    adKey: 'odaTema.steel_neon',
    altKey: 'odaTema.steel_neonAlt',
    renkler: ['#1A2430', '#101820', '#060A10'] as const,
    vurgu: '#40B8FF',
    kategori: 'metal',
    atmosfer: 'crystal',
  },

  // —— Platform esintili temalar ——
  {
    kod: 'club_cream',
    adKey: 'odaTema.club_cream',
    altKey: 'odaTema.club_creamAlt',
    renkler: ['#F5EDE3', '#E8DCCE', '#D4C4B0'] as const,
    vurgu: '#5C4033',
    kategori: 'platform',
    atmosfer: 'silk',
  },
  {
    kod: 'blurple_night',
    adKey: 'odaTema.blurple_night',
    altKey: 'odaTema.blurple_nightAlt',
    renkler: ['#313338', '#1E1F22', '#111214'] as const,
    vurgu: '#5865F2',
    kategori: 'platform',
    atmosfer: 'mesh',
  },
  {
    kod: 'spaces_sky',
    adKey: 'odaTema.spaces_sky',
    altKey: 'odaTema.spaces_skyAlt',
    renkler: ['#1A2836', '#0F1720', '#060A0E'] as const,
    vurgu: '#1D9BF0',
    kategori: 'platform',
    atmosfer: 'aurora',
  },
  {
    kod: 'party_neon',
    adKey: 'odaTema.party_neon',
    altKey: 'odaTema.party_neonAlt',
    renkler: ['#6A1488', '#2A0840', '#0C0418'] as const,
    vurgu: '#FF4DC4',
    kategori: 'platform',
    atmosfer: 'glow',
  },
  {
    kod: 'greenroom_dark',
    adKey: 'odaTema.greenroom_dark',
    altKey: 'odaTema.greenroom_darkAlt',
    renkler: ['#181818', '#0C0C0C', '#000000'] as const,
    vurgu: '#1DB954',
    kategori: 'platform',
    atmosfer: 'vignette',
  },
  {
    kod: 'salon_warm',
    adKey: 'odaTema.salon_warm',
    altKey: 'odaTema.salon_warmAlt',
    renkler: ['#FFF6EC', '#F0E0D0', '#E0C8B0'] as const,
    vurgu: '#C45C26',
    kategori: 'platform',
    atmosfer: 'soft_orbs',
  },
];

function temaCevir(s: OdaTemaSabit): OdaTemaTanim {
  return {
    kod: s.kod,
    ad: i18n.t(s.adKey),
    alt: i18n.t(s.altKey),
    renkler: s.renkler,
    vurgu: s.vurgu,
    kategori: s.kategori,
    atmosfer: s.atmosfer,
  };
}

/** Canlı dilde oda temaları (her okumada çevrilir) */
export function OdaTemalariAl(): OdaTemaTanim[] {
  return ODA_TEMA_SABITLERI.map(temaCevir);
}

export function OdaTemalariniFiltrele(
  kategori?: OdaTemaKategori | 'hepsi' | null,
): OdaTemaTanim[] {
  const hepsi = OdaTemalariAl();
  if (!kategori || kategori === 'hepsi') return hepsi;
  return hepsi.filter((t) => t.kategori === kategori);
}

/** Geriye dönük — her okumada canlı dil */
export const ODA_TEMALAR: OdaTemaTanim[] = new Proxy([] as OdaTemaTanim[], {
  get(_t, prop, receiver) {
    const live = OdaTemalariAl();
    if (prop === 'length') return live.length;
    if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return live[Number(prop)];
    }
    const v = Reflect.get(live, prop, receiver);
    return typeof v === 'function' ? v.bind(live) : v;
  },
  ownKeys() {
    return Reflect.ownKeys(OdaTemalariAl());
  },
  getOwnPropertyDescriptor(_t, prop) {
    const live = OdaTemalariAl();
    const desc = Reflect.getOwnPropertyDescriptor(live, prop);
    if (desc) desc.configurable = true;
    return desc;
  },
});

export function OdaTemasiniCoz(kod?: string | null): OdaTemaTanim {
  const sabit =
    ODA_TEMA_SABITLERI.find((t) => t.kod === kod) ?? ODA_TEMA_SABITLERI[0];
  return temaCevir(sabit);
}

export function OdaTemaKoduGecerliMi(kod?: string | null): boolean {
  if (!kod?.trim()) return true;
  return ODA_TEMA_SABITLERI.some((t) => t.kod === kod.trim());
}
