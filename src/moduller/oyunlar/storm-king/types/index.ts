export type GemId =
  | 'ruby'
  | 'sapphire'
  | 'emerald'
  | 'amethyst'
  | 'topaz'
  | 'aqua';

export type Cell =
  | { type: 'gem'; id: GemId }
  | { type: 'multiplier'; value: number };

export interface SymbolData {
  uid: number;
  col: number;
  row: number;
  cell: Cell;
}

export interface WinGroup {
  id: GemId;
  count: number;
  amount: number;
  uids: number[];
}

export interface TumbleStep {
  wins: WinGroup[];
  removed: number[];
  moved: Array<{ uid: number; row: number }>;
  spawned: SymbolData[];
  stepWin: number;
}

export interface SpinResult {
  initial: SymbolData[];
  steps: TumbleStep[];
  baseWin: number;
  multipliers: Array<{ uid: number; value: number }>;
  multiplierSum: number;
  finalWin: number;
  capped: boolean;
  finalBoard: SymbolData[];
}

export type StormKingStatus = 'idle' | 'requesting' | 'animating' | 'error';

export interface StormKingState {
  bet: number;
  balance: number;
  /** Oyun kazançlarının yazıldığı ayrı bakiye */
  gameBalance: number | null;
  lastWin: number;
  multiplier: number;
  status: StormKingStatus;
  turbo: boolean;
  auto: boolean;
  error: string | null;
}
