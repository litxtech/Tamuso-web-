import type { OyunKartKimligi } from '../ortak/katalog/OyunKartKatalogu';

type Props = {
  roomId?: string | null;
  onClose: () => void;
  embedded?: boolean;
};

export function StormKingScreen(_props: Props): null {
  return null;
}

export function registerStormKing(): void {}

export const STORM_KING_KART: OyunKartKimligi | null = null;
