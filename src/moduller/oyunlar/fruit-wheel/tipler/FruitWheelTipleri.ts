export type FruitId =
  | 'cherry'
  | 'lemon'
  | 'orange'
  | 'watermelon'
  | 'grape'
  | 'strawberry'
  | 'pineapple'
  | 'kiwi';

export type RoundStatus =
  | 'OPEN'
  | 'LOCKING'
  | 'LOCKED'
  | 'SPINNING'
  | 'SETTLING'
  | 'RESULT'
  | 'SETTLED'
  | 'NEXT_ROUND';

export type PresentationTier = 'NORMAL' | 'GOOD' | 'BIG' | 'RARE';

export type PublicFruit = {
  id: FruitId;
  multiplier: number;
  accent: string;
  enabled: boolean;
  tier: PresentationTier;
};

export type SelectionLine = {
  fruitId: FruitId;
  amount: number;
  status: string;
};

export type SettlementLine = {
  fruitId: FruitId;
  stake: number;
  matched: boolean;
  multiplier: number;
  payout: number;
};

export type FruitWheelState = {
  ok: true;
  serverNow: string;
  gameEnabled: boolean;
  devTools: boolean;
  displayName: string;
  economyMode: 'TEST_BALANCE' | 'CLOSED_LOOP_GAME_BALANCE' | 'PLATFORM_APPROVED_COIN';
  balance: number;
  activePlayers: number;
  avatars: { id: string; avatarUrl: string | null }[];
  recent: { roundNo: number; fruitId: FruitId }[];
  fruits: PublicFruit[];
  limits: {
    minimumSelection: number;
    maximumSelectionPerFruit: number;
    maximumTotalPerRound: number;
    quickAmounts: number[];
  };
  mySelections: SelectionLine[];
  mySettlement: SettlementLine[];
  round: {
    id: string;
    roundNo: number;
    status: RoundStatus;
    configVersion: number;
    opensAt: string;
    locksAt: string;
    resultAt: string;
    revealUntil: string;
    nextAt: string;
    winningFruitId: FruitId | null;
    segmentIndex: number | null;
    multiplier: number | null;
    presentationTier: PresentationTier | null;
  } | null;
};

export type ConfirmResult = {
  ok: boolean;
  code?: string;
  duplicate?: boolean;
  balance?: number;
  roundId?: string;
  total?: number;
};
