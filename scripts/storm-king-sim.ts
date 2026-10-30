/**
 * Fırtına Kralı — 200.000 spin. Ödeme tablosu değiştirilmez.
 * Çalıştır: npm run sim:storm-king
 */

import { createSeededRng, playStormKingSpin } from '../supabase/functions/_shared/storm-king/engine.ts';

const SPINS = Number(process.argv[2] ?? 200_000);
const BET = 100;
const started = Date.now();
const rng = createSeededRng(20261012);

let wagered = 0n;
let returned = 0n;
let wins = 0;
let tumbles = 0;
let maxWin = 0;
let capped = 0;
const bands = {
  zero: 0,
  underBet: 0,
  under5: 0,
  under20: 0,
  under100: 0,
  big: 0,
};

for (let index = 0; index < SPINS; index += 1) {
  const result = playStormKingSpin({ bet: BET, rng });
  wagered += BigInt(BET);
  returned += BigInt(result.finalWin);
  tumbles += result.steps.length;
  if (result.finalWin > 0) wins += 1;
  if (result.finalWin > maxWin) maxWin = result.finalWin;
  if (result.capped) capped += 1;
  const ratio = result.finalWin / BET;
  if (result.finalWin === 0) bands.zero += 1;
  else if (ratio < 1) bands.underBet += 1;
  else if (ratio < 5) bands.under5 += 1;
  else if (ratio < 20) bands.under20 += 1;
  else if (ratio < 100) bands.under100 += 1;
  else bands.big += 1;
}

const elapsed = (Date.now() - started) / 1000;
const rtp = Number(returned) / Number(wagered);
const report = {
  spins: SPINS,
  bet: BET,
  rtp,
  hitRate: wins / SPINS,
  averageTumbles: tumbles / SPINS,
  maxWin,
  maxWinX: maxWin / BET,
  capped,
  bands,
  elapsedSec: elapsed,
  averageSpinMs: (elapsed * 1000) / SPINS,
};

console.log(JSON.stringify(report, null, 2));
