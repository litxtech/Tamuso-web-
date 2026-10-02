/**
 * Fruit Wheel ekonomi yüzeyi.
 * Bakiye yalnız sunucudan gelir. Bu modül cüzdan yazmaz.
 */

export type FruitWheelEconomyMode =
  | 'TEST_BALANCE'
  | 'CLOSED_LOOP_GAME_BALANCE'
  | 'PLATFORM_APPROVED_COIN';

export type AuthoritativeBalance = {
  amount: number;
  mode: FruitWheelEconomyMode;
};

export function readAuthoritativeBalance(
  amount: number,
  mode: FruitWheelEconomyMode,
): AuthoritativeBalance {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  return { amount: safe, mode };
}

export function economyModeLabel(mode: FruitWheelEconomyMode): string {
  if (mode === 'PLATFORM_APPROVED_COIN') return 'Tamuso Coin';
  if (mode === 'CLOSED_LOOP_GAME_BALANCE') return 'Oyun bakiyesi';
  return 'Test bakiyesi';
}
