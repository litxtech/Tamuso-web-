/**
 * Storm King'e uygulamanın geri kalanından tek giriş noktası.
 * iOS paketinde StormKingGiris.ios.tsx kullanılır ve oyun koda dahil edilmez.
 */
import type { OyunKartKimligi } from '../ortak/katalog/OyunKartKatalogu';
import { StormBackground, StormGems, StormOrbs } from './constants/symbols';
import { STORM_KING_NAME } from './StormKingKayit';

export { StormKingScreen } from './components/StormKingScreen';
export { registerStormKing } from './StormKingKayit';

export const STORM_KING_KART: OyunKartKimligi | null = {
  kod: 'storm_king',
  baslik: STORM_KING_NAME,
  eyebrow: 'FIRTINA',
  slogan: '6×5 tumble · çarpan küreleri',
  kapak: StormBackground.temple,
  karakter: StormGems.ruby,
  semboller: [StormGems.ruby, StormGems.sapphire, StormGems.emerald, StormOrbs.gold],
  aura: ['#E6C36A', '#7C3AED', '#1A0B2E'],
  cta: ['#7C3AED', '#3B0764'],
  href: '/oyun/storm-king',
};
