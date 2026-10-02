import { RenkTokenlari } from './RenkTokenlari';
import { temaAcikMi, temaKodunuAl } from './tema/TemaDurumu';
import { TipografiTokenlari } from './TipografiTokenlari';
import {
  AnimasyonTokenlari,
  BoslukTokenlari,
  GolgeTokenlari,
  HeaderTokenlari,
  screenPaddingHorizontal,
  YaricapTokenlari,
} from './BoslukVeYaricapTokenlari';

/**
 * Design System public export.
 * Eski `src/theme/colors` uyumluluk katmani buraya baglanir.
 */
export const TasarimSistemi = {
  renkler: RenkTokenlari,
  tipografi: TipografiTokenlari,
  bosluklar: BoslukTokenlari,
  header: HeaderTokenlari,
  screenPaddingHorizontal,
  yaricaplar: YaricapTokenlari,
  golgeler: GolgeTokenlari,
  animasyonlar: AnimasyonTokenlari,
  get tema() {
    const kod = temaKodunuAl();
    if (temaAcikMi(kod)) return 'light-premium' as const;
    if (kod === 'kadife') return 'velvet-rose' as const;
    if (kod === 'sampanya') return 'champagne-noir' as const;
    if (kod === 'kozmik') return 'cosmic-plum' as const;
    if (kod === 'zumrut') return 'emerald-vip' as const;
    return 'dark-premium' as const;
  },
};

export {
  RenkTokenlari,
  TipografiTokenlari,
  BoslukTokenlari,
  HeaderTokenlari,
  screenPaddingHorizontal,
  YaricapTokenlari,
  GolgeTokenlari,
  AnimasyonTokenlari,
};
