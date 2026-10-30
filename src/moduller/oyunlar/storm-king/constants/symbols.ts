import type { ImageSourcePropType } from 'react-native';
import { Image } from 'react-native';
import type { GemId } from '../types';

export const StormBackground = {
  temple: require('../../../../../assets/games/storm-king/background/temple-background.webp') as ImageSourcePropType,
  leftCurtain: require('../../../../../assets/games/storm-king/background/left-curtain.webp') as ImageSourcePropType,
  rightCurtain: require('../../../../../assets/games/storm-king/background/right-curtain.webp') as ImageSourcePropType,
  leftPillar: require('../../../../../assets/games/storm-king/background/left-pillar.webp') as ImageSourcePropType,
  rightPillar: require('../../../../../assets/games/storm-king/background/right-pillar.webp') as ImageSourcePropType,
  foreground: require('../../../../../assets/games/storm-king/background/foreground.webp') as ImageSourcePropType,
};

export const StormFrames = {
  slot: require('../../../../../assets/games/storm-king/frames/slot-frame.webp') as ImageSourcePropType,
  ornament: require('../../../../../assets/games/storm-king/frames/top-ornament.webp') as ImageSourcePropType,
  console: require('../../../../../assets/games/storm-king/frames/bottom-console.webp') as ImageSourcePropType,
  multiplier: require('../../../../../assets/games/storm-king/frames/multiplier-frame.webp') as ImageSourcePropType,
  cardTl: require('../../../../../assets/games/storm-king/frames/card-tl.webp') as ImageSourcePropType,
  cardTr: require('../../../../../assets/games/storm-king/frames/card-tr.webp') as ImageSourcePropType,
  cardBl: require('../../../../../assets/games/storm-king/frames/card-bl.webp') as ImageSourcePropType,
  cardBr: require('../../../../../assets/games/storm-king/frames/card-br.webp') as ImageSourcePropType,
  cardTop: require('../../../../../assets/games/storm-king/frames/card-top.webp') as ImageSourcePropType,
  cardBottom: require('../../../../../assets/games/storm-king/frames/card-bottom.webp') as ImageSourcePropType,
  cardLeft: require('../../../../../assets/games/storm-king/frames/card-left.webp') as ImageSourcePropType,
  cardRight: require('../../../../../assets/games/storm-king/frames/card-right.webp') as ImageSourcePropType,
};

export const StormGems: Record<GemId, ImageSourcePropType> = {
  ruby: require('../../../../../assets/games/storm-king/symbols/ruby.webp'),
  sapphire: require('../../../../../assets/games/storm-king/symbols/sapphire.webp'),
  emerald: require('../../../../../assets/games/storm-king/symbols/emerald.webp'),
  amethyst: require('../../../../../assets/games/storm-king/symbols/amethyst.webp'),
  topaz: require('../../../../../assets/games/storm-king/symbols/topaz.webp'),
  aqua: require('../../../../../assets/games/storm-king/symbols/aqua.webp'),
};

export const StormOrbs = {
  purple: require('../../../../../assets/games/storm-king/multipliers/orb-purple.webp') as ImageSourcePropType,
  pink: require('../../../../../assets/games/storm-king/multipliers/orb-pink.webp') as ImageSourcePropType,
  gold: require('../../../../../assets/games/storm-king/multipliers/orb-gold.webp') as ImageSourcePropType,
};

export const StormButtons = {
  spin: require('../../../../../assets/games/storm-king/buttons/spin-normal.webp') as ImageSourcePropType,
  spinPressed: require('../../../../../assets/games/storm-king/buttons/spin-pressed.webp') as ImageSourcePropType,
  control: require('../../../../../assets/games/storm-king/buttons/control-button.webp') as ImageSourcePropType,
};

export const StormEffectsArt = {
  lightning: require('../../../../../assets/games/storm-king/effects/lightning.webp') as ImageSourcePropType,
  sparkle: require('../../../../../assets/games/storm-king/effects/sparkle.webp') as ImageSourcePropType,
  explosion: require('../../../../../assets/games/storm-king/effects/explosion.webp') as ImageSourcePropType,
  glow: require('../../../../../assets/games/storm-king/effects/glow.webp') as ImageSourcePropType,
};

export const STORM_KING_ASSET_MODULES: ImageSourcePropType[] = [
  StormBackground.temple,
  StormBackground.leftCurtain,
  StormBackground.rightCurtain,
  StormBackground.leftPillar,
  StormBackground.rightPillar,
  StormBackground.foreground,
  StormFrames.slot,
  StormFrames.ornament,
  StormFrames.console,
  StormFrames.multiplier,
  StormGems.ruby,
  StormGems.sapphire,
  StormGems.emerald,
  StormGems.amethyst,
  StormGems.topaz,
  StormGems.aqua,
  StormOrbs.purple,
  StormOrbs.pink,
  StormOrbs.gold,
  StormButtons.spin,
  StormButtons.spinPressed,
  StormButtons.control,
  StormEffectsArt.lightning,
  StormEffectsArt.sparkle,
  StormEffectsArt.explosion,
  StormEffectsArt.glow,
];

export function orbArt(value: number): ImageSourcePropType {
  if (value >= 15) return StormOrbs.gold;
  if (value >= 6) return StormOrbs.pink;
  return StormOrbs.purple;
}

const WARM_SOURCES: readonly ImageSourcePropType[] = [
  StormGems.ruby,
  StormGems.sapphire,
  StormGems.emerald,
  StormGems.amethyst,
  StormGems.topaz,
  StormGems.aqua,
  StormOrbs.purple,
  StormOrbs.pink,
  StormOrbs.gold,
  StormFrames.slot,
];

for (const source of WARM_SOURCES) {
  const resolved = Image.resolveAssetSource(source);
  if (resolved?.uri) void Image.prefetch(resolved.uri);
}

export const GEM_ORDER: readonly GemId[] = [
  'ruby',
  'sapphire',
  'emerald',
  'amethyst',
  'topaz',
  'aqua',
];

export const GEM_BASE_LABEL: Record<GemId, string> = {
  ruby: '5×',
  sapphire: '4×',
  emerald: '2.5×',
  amethyst: '2×',
  topaz: '1.2×',
  aqua: '1×',
};
