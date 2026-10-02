/**
 * Fair Spin — paylaşılan tipler.
 */

export type FairSpinSegment = {
  id: string;
  multiplier: number;
  color: string;
  label: string;
};

export type FairSpinMathConfig = {
  mathVersion: string;
  configVersion: string;
  paytableVersion: string;
  segments: Array<{
    id: string;
    multiplier: number;
    weight: number;
    color: string;
    label: string;
  }>;
  betPresets: number[];
  minBet: number;
  maxBet: number;
  highWinMult: number;
  highWinPayoutMult: number;
};

export type FairSpinResult = {
  roundId: string;
  sessionId: string;
  betAmount: number;
  segmentId: string;
  multiplier: number;
  payout: number;
  balanceBefore: number;
  balanceAfter: number;
  rngSeed: string;
  mathVersion: string;
  configVersion: string;
  paytableVersion: string;
  adminTest?: boolean;
};

export type FairSpinConfigPayload = {
  segments: FairSpinSegment[];
  minBet: number;
  maxBet: number;
  betPresets: number[];
  mathVersion: string;
  balance: number;
  gamePaused: boolean;
  maintenance: boolean;
  maintenanceMessage: string;
};
