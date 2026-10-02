import { SEGMENT_DEG } from '../sabitler/FruitWheelSabitleri';

/**
 * Pointer tepede sabittir. Dilim i, dönüş 0 iken tepededir (i=0).
 * Pozitif dönüş saat yönüdür. Sonuç açısı dilim merkezine oturur.
 */
export function wheelRestDegrees(index: number, fullTurns: number): number {
  const turns = Math.max(1, Math.floor(fullTurns));
  const slot = ((360 - index * SEGMENT_DEG) % 360 + 360) % 360;
  return turns * 360 + slot;
}

export function wheelSpinPlan(
  index: number,
  roundNo: number,
): { peak: number; rest: number; turns: number; overshoot: number } {
  const turns = 5 + (Math.abs(roundNo) % 3);
  const overshoot = 6 + (Math.abs(roundNo) % 5);
  const rest = wheelRestDegrees(index, turns);
  return { peak: rest + overshoot, rest, turns, overshoot };
}

export function landedSegment(rotationDeg: number): number {
  const mod = ((rotationDeg % 360) + 360) % 360;
  const pointerLocal = ((360 - mod) % 360 + 360) % 360;
  return Math.round(pointerLocal / SEGMENT_DEG) % 8;
}
