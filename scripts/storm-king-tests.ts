/**
 * Fırtına Kralı motor testleri.
 * Çalıştır: npx tsx scripts/storm-king-tests.ts
 */

import { applyRecordedStep } from '../src/moduller/oyunlar/storm-king/timeline/applyStep.ts';
import {
  GEM_IDS,
  STORM_KING_CELLS,
  STORM_KING_MAX_STEPS,
  STORM_KING_MAX_WIN_MULT,
  applyTumble,
  boardsMatch,
  clusterAmount,
  createSeededRng,
  findWins,
  nextInt,
  emptyDropUsage,
  playStormKingSpin,
  replaySpin,
  rollCell,
  roundMulDiv,
  type Cell,
  type GemId,
  type SymbolData,
} from '../supabase/functions/_shared/storm-king/engine.ts';

let passed = 0;
let failed = 0;
const failures: string[] = [];
const queue: Array<Promise<void>> = [];

function test(name: string, fn: () => void | Promise<void>): void {
  queue.push(
    Promise.resolve()
      .then(fn)
      .then(() => {
        passed += 1;
        console.log(`  ok ${name}`);
      })
      .catch((error: unknown) => {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${name}: ${message}`);
        console.error(`  FAIL ${name} — ${message}`);
      }),
  );
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEq(actual: number, expected: number, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} (beklenen ${expected}, gelen ${actual})`);
  }
}

function gem(id: GemId): Cell {
  return { type: 'gem', id };
}

function orb(value: number): Cell {
  return { type: 'multiplier', value };
}

function fill(cells: Cell[]): Cell[] {
  if (cells.length !== STORM_KING_CELLS) {
    throw new Error(`tahta ${cells.length}`);
  }
  return cells;
}

function quietRefill(count: number): Cell[] {
  const ids: GemId[] = ['sapphire', 'emerald', 'amethyst', 'topaz', 'aqua'];
  return Array.from({ length: count }, (_, index) => gem(ids[index % ids.length] ?? 'aqua'));
}

test('8 taş temel ödeme', () => {
  const cells = fill([
    ...Array.from({ length: 8 }, () => gem('ruby')),
    ...Array.from({ length: 5 }, () => gem('sapphire')),
    ...Array.from({ length: 5 }, () => gem('emerald')),
    ...Array.from({ length: 4 }, () => gem('amethyst')),
    ...Array.from({ length: 4 }, () => gem('topaz')),
    ...Array.from({ length: 4 }, () => gem('aqua')),
  ]);
  const result = playStormKingSpin({ bet: 100, cells: [...cells, ...quietRefill(8)] });
  assertEq(result.steps.length, 1, 'adım');
  assertEq(result.steps[0]?.wins.length ?? 0, 1, 'tek grup');
  assertEq(result.steps[0]?.wins[0]?.count ?? 0, 8, 'sayı');
  assertEq(result.steps[0]?.stepWin ?? 0, 500, 'kazanç');
  assertEq(result.finalWin, 500, 'final');
  assert(result.capped === false, 'sınır yok');
});

test('10 taş katmanı', () => {
  const cells = fill([
    ...Array.from({ length: 10 }, () => gem('ruby')),
    ...Array.from({ length: 5 }, () => gem('sapphire')),
    ...Array.from({ length: 5 }, () => gem('emerald')),
    ...Array.from({ length: 5 }, () => gem('amethyst')),
    ...Array.from({ length: 5 }, () => gem('topaz')),
  ]);
  const result = playStormKingSpin({ bet: 100, cells: [...cells, ...quietRefill(10)] });
  assertEq(result.baseWin, 1500, '10 ruby');
  assertEq(result.finalWin, 1500, 'çarpan yok');
});

test('12 taş katmanı', () => {
  const cells = fill([
    ...Array.from({ length: 12 }, () => gem('ruby')),
    ...Array.from({ length: 6 }, () => gem('sapphire')),
    ...Array.from({ length: 6 }, () => gem('emerald')),
    ...Array.from({ length: 6 }, () => gem('amethyst')),
  ]);
  const result = playStormKingSpin({
    bet: 100,
    cells: [
      ...cells,
      gem('sapphire'),
      gem('emerald'),
      gem('amethyst'),
      ...Array.from({ length: 5 }, () => gem('topaz')),
      ...Array.from({ length: 4 }, () => gem('aqua')),
    ],
  });
  assertEq(result.steps.length, 1, 'tek adım');
  assertEq(result.baseWin, 5000, '12 ruby');
});

test('birden fazla kazanan grup', () => {
  const cells = fill([
    ...Array.from({ length: 8 }, () => gem('ruby')),
    ...Array.from({ length: 10 }, () => gem('sapphire')),
    ...Array.from({ length: 3 }, () => gem('emerald')),
    ...Array.from({ length: 3 }, () => gem('amethyst')),
    ...Array.from({ length: 3 }, () => gem('topaz')),
    ...Array.from({ length: 3 }, () => gem('aqua')),
  ]);
  const refill = [
    ...Array.from({ length: 4 }, () => gem('emerald')),
    ...Array.from({ length: 4 }, () => gem('amethyst')),
    ...Array.from({ length: 4 }, () => gem('topaz')),
    ...Array.from({ length: 4 }, () => gem('aqua')),
    orb(5),
    orb(10),
  ];
  const result = playStormKingSpin({ bet: 100, cells: [...cells, ...refill] });
  assertEq(result.steps.length, 1, 'tek adım');
  assertEq(result.steps[0]?.wins.length ?? 0, 2, 'iki grup');
  assertEq(result.baseWin, 1700, '500+1200');
  assertEq(result.multiplierSum, 15, 'küre toplamı');
  assertEq(result.finalWin, 25500, 'çarpanlı');
  assertEq(result.finalBoard.length, 30, '30 hücre');
});

test('tumble sonrası 30 hücre ve benzersiz uid', () => {
  const result = playStormKingSpin({
    bet: 100,
    rng: createSeededRng(42),
  });
  const uids = new Set<number>();
  for (const symbol of result.initial) uids.add(symbol.uid);
  for (const step of result.steps) {
    for (const symbol of step.spawned) {
      assert(!uids.has(symbol.uid), 'uid çakışması');
      uids.add(symbol.uid);
    }
    assertEq(step.removed.length > 0 ? result.finalBoard.length : 30, 30, 'tahta');
  }
  assertEq(result.finalBoard.length, 30, 'final');
  assert(boardsMatch(replaySpin(result), result.finalBoard), 'oynatma');
  const positions = new Set(result.finalBoard.map((symbol) => `${symbol.col}:${symbol.row}`));
  assertEq(positions.size, 30, 'konum');
});

test('taban kazanç sıfırsa ödeme sıfır', () => {
  const cells = fill(GEM_IDS.flatMap((id) => Array.from({ length: 5 }, () => gem(id))));
  const result = playStormKingSpin({ bet: 100, cells });
  assertEq(result.steps.length, 0, 'adım yok');
  assertEq(result.baseWin, 0, 'taban');
  assertEq(result.multiplierSum, 1, 'çarpan');
  assertEq(result.finalWin, 0, 'ödeme');
});

test('küreler kazanan taşla silinmez', () => {
  const cells: Cell[] = [
    ...Array.from({ length: 8 }, () => gem('ruby')),
    orb(4),
    orb(4),
    ...Array.from({ length: 5 }, () => gem('sapphire')),
    ...Array.from({ length: 5 }, () => gem('emerald')),
    ...Array.from({ length: 5 }, () => gem('amethyst')),
    ...Array.from({ length: 5 }, () => gem('topaz')),
  ];
  const result = playStormKingSpin({
    bet: 50,
    cells: [...cells, ...quietRefill(8)],
  });
  const orbs = result.finalBoard.filter((symbol) => symbol.cell.type === 'multiplier');
  assertEq(orbs.length, 2, 'küre kaldı');
  assertEq(result.baseWin, 250, '8 ruby * 5');
  assertEq(result.multiplierSum, 8, '4+4');
  assertEq(result.finalWin, 2000, 'toplam');
});

test('maksimum kazanç sınırı', () => {
  const cells: Cell[] = [
    ...Array.from({ length: 8 }, () => gem('ruby')),
    ...Array.from({ length: 22 }, () => orb(50)),
    ...Array.from({ length: 8 }, () => orb(50)),
  ];
  const result = playStormKingSpin({ bet: 100, cells });
  assertEq(result.baseWin, 500, 'taban');
  assert(result.multiplierSum > 1, 'küre');
  assertEq(result.finalWin, 100 * STORM_KING_MAX_WIN_MULT, 'tavan');
  assert(result.capped, 'işaret');
});

test('40 zincir sınırı son tahtayı bırakır', () => {
  const cells = Array.from({ length: 30 + 40 * 30 }, () => gem('ruby'));
  const result = playStormKingSpin({ bet: 100, cells, maxSteps: 40 });
  assertEq(result.steps.length, 40, 'adım');
  assertEq(result.baseWin, 40 * 5000, '40 ödeme');
  assertEq(result.finalBoard.length, 30, 'tahta');
  const still = findWins(result.finalBoard, 100);
  assert(still.length > 0, 'devam edebilirdi');
  assert(boardsMatch(replaySpin(result), result.finalBoard), 'tutarlı');
  assertEq(result.finalWin, 200_000, 'çarpan 1');
});

test('ondalıklı çarpan yuvarlama', () => {
  assertEq(roundMulDiv(1, 5, 2, 1), 3, '2.5 -> 3');
  assertEq(roundMulDiv(1, 6, 5, 1), 1, '1.2 -> 1');
  assertEq(roundMulDiv(1, 6, 5, 3), 4, '3.6 -> 4');
  assertEq(roundMulDiv(3, 6, 5, 1), 4, '3.6 -> 4');
  assertEq(clusterAmount(100, 'emerald', 8), 250, 'emerald 8');
  assertEq(clusterAmount(100, 'topaz', 10), 360, 'topaz 10');
  assertEq(clusterAmount(100, 'aqua', 12), 1000, 'aqua 12');
});

test('yerçekimi alttaki boşluğu kapatır', () => {
  const board: SymbolData[] = [];
  let uid = 1;
  const filler: GemId[] = ['sapphire', 'emerald', 'amethyst', 'topaz', 'aqua'];
  let fillerIndex = 0;
  for (let col = 0; col < 6; col += 1) {
    for (let row = 0; row < 5; row += 1) {
      const ruby = row === 4 || (row === 3 && col < 2);
      const id = ruby ? 'ruby' : (filler[fillerIndex++ % filler.length] ?? 'aqua');
      if (col === 0 && row < 3) {
        board.push({ uid, col, row, cell: gem('aqua') });
      } else {
        board.push({ uid, col, row, cell: gem(id) });
      }
      uid += 1;
    }
  }
  const wins = findWins(board, 10);
  assertEq(wins[0]?.count ?? 0, 8, '8 ruby');
  const removed = wins[0]?.uids ?? [];
  const tumbled = applyTumble(
    board,
    removed,
    Array.from({ length: removed.length }, () => gem('topaz')),
    uid,
  );
  const col0 = tumbled.board
    .filter((symbol) => symbol.col === 0)
    .sort((a, b) => a.row - b.row);
  assertEq(col0.length, 5, 'sütun');
  assert(col0[0]?.cell.type === 'gem' && col0[0].cell.id === 'topaz', 'üst');
  assert(col0[4]?.cell.type === 'gem' && col0[4].cell.id === 'aqua', 'alt');
  const movedFromTop = tumbled.moved.find((move) => move.uid === 1);
  assertEq(movedFromTop?.row ?? -1, 2, 'eski satır 0');
});

test('rng modulo yanlılığı sınırda kalır', () => {
  const rng = createSeededRng(7);
  const counts = [0, 0, 0];
  for (let index = 0; index < 30_000; index += 1) {
    counts[nextInt(rng, 3)] += 1;
  }
  for (const count of counts) {
    assert(count > 9_400 && count < 10_600, `dağılım ${counts.join(',')}`);
  }
});

test('çarpan ağırlıkları tükenmez', () => {
  const rng = createSeededRng(99);
  let orbs = 0;
  const seen = new Set<number>();
  for (let index = 0; index < 20_000; index += 1) {
    const cell = rollCell(rng);
    if (cell.type === 'multiplier') {
      orbs += 1;
      seen.add(cell.value);
    }
  }
  assert(orbs > 400 && orbs < 1_000, `küre sıklığı ${orbs}`);
  assert(seen.has(2) && seen.has(10), 'değerler');
});

test('negatif ve taşan bahis reddedilir', () => {
  let threw = false;
  try {
    playStormKingSpin({ bet: 0, cells: fill(Array.from({ length: 30 }, () => gem('aqua'))) });
  } catch {
    threw = true;
  }
  assert(threw, 'sıfır bahis');
  threw = false;
  try {
    roundMulDiv(-1, 5, 1, 1);
  } catch {
    threw = true;
  }
  assert(threw, 'negatif');
});

type SpinRow = {
  requestId: string;
  bet: number;
  win: number;
};

type Book = {
  balance: number;
  rows: Map<string, SpinRow>;
};

const locks = new Map<string, Promise<void>>();

async function withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(userId) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(
    userId,
    previous.then(() => gate),
  );
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function settle(
  book: Book,
  userId: string,
  requestId: string,
  bet: number,
  win: number,
): Promise<{ balance: number; duplicate: boolean; win: number }> {
  return withLock(userId, async () => {
    const existing = book.rows.get(`${userId}:${requestId}`);
    if (existing) {
      return { balance: book.balance, duplicate: true, win: existing.win };
    }
    if (book.balance < bet) throw new Error('insufficient');
    book.balance = book.balance - bet + win;
    book.rows.set(`${userId}:${requestId}`, { requestId, bet, win });
    return { balance: book.balance, duplicate: false, win };
  });
}

test('aynı requestId tekrar tahsil etmez', async () => {
  const book: Book = { balance: 1_000, rows: new Map() };
  const first = await settle(book, 'u1', 'req-1', 100, 500);
  const second = await settle(book, 'u1', 'req-1', 100, 9999);
  assertEq(first.balance, 1400, 'ilk');
  assert(second.duplicate, 'kopya');
  assertEq(second.win, 500, 'ilk kazanç');
  assertEq(book.balance, 1400, 'bakiye');
});

test('eşzamanlı spinler bakiyeyi bir kez düşer', async () => {
  const book: Book = { balance: 300, rows: new Map() };
  const [a, b] = await Promise.all([
    settle(book, 'u2', 'a', 100, 0),
    settle(book, 'u2', 'b', 100, 40),
  ]);
  assert(a.duplicate === false && b.duplicate === false, 'ayrı istek');
  assertEq(book.balance, 140, '300-100-100+40');
  assertEq(book.rows.size, 2, 'iki kayıt');
});

test('eşzamanlı aynı istek tek kayıt', async () => {
  const book: Book = { balance: 500, rows: new Map() };
  const [a, b] = await Promise.all([
    settle(book, 'u3', 'same', 100, 20),
    settle(book, 'u3', 'same', 100, 20),
  ]);
  const duplicates = Number(a.duplicate) + Number(b.duplicate);
  assertEq(duplicates, 1, 'biri kopya');
  assertEq(book.balance, 420, 'tek tahsil');
  assertEq(book.rows.size, 1, 'tek satır');
});

test('yetersiz bakiye bakiyeyi değiştirmez', async () => {
  const book: Book = { balance: 50, rows: new Map() };
  let threw = false;
  try {
    await settle(book, 'u4', 'poor', 100, 0);
  } catch (error) {
    threw = error instanceof Error && error.message === 'insufficient';
  }
  assert(threw, 'red');
  assertEq(book.balance, 50, 'aynı');
  assertEq(book.rows.size, 0, 'kayıt yok');
});

test('çıkış planı sıradaki çarpanı sırayla kullanır', () => {
  const usage = emptyDropUsage();
  const result = playStormKingSpin({
    bet: 100,
    rng: createSeededRng(7),
    drop: {
      orbChanceBps: 10_000,
      items: [{ value: 2, weight: 1, base: 1, left: null, rule: null }],
      queue: [50, 25, 10],
      usage,
    },
  });
  const ilk = result.initial.slice(0, 3).map((symbol) =>
    symbol.cell.type === 'multiplier' ? symbol.cell.value : 0,
  );
  assertEq(ilk[0], 50, 'ilk');
  assertEq(ilk[1], 25, 'ikinci');
  assertEq(ilk[2], 10, 'üçüncü');
  assertEq(usage.queueUsed, 3, 'kuyruk');
});

test('çarpan yüzdesi sıfırsa küre çıkmaz', () => {
  const usage = emptyDropUsage();
  const result = playStormKingSpin({
    bet: 100,
    rng: createSeededRng(9),
    maxSteps: 0,
    drop: {
      orbChanceBps: 0,
      items: [{ value: 50, weight: 1, base: 1, left: null, rule: null }],
      queue: [50, 50, 50],
      usage,
    },
  });
  const kure = result.initial.filter((symbol) => symbol.cell.type === 'multiplier').length;
  assertEq(kure, 0, 'küre yok');
  assertEq(usage.queueUsed, 0, 'sıra durur');
});

test('çarpan sınırı dolunca normal sıklığa döner', () => {
  const usage = emptyDropUsage();
  playStormKingSpin({
    bet: 100,
    rng: createSeededRng(11),
    drop: {
      orbChanceBps: 10_000,
      items: [
        { value: 50, weight: 100, base: 0, left: 1, rule: 'r1' },
        { value: 2, weight: 0, base: 100, left: null, rule: null },
      ],
      queue: [],
      usage,
    },
  });
  assertEq(usage.rules.r1, 1, 'tek boosted');
});

test('animasyon adımları motor tahtasıyla aynı', () => {
  const result = playStormKingSpin({ bet: 100, rng: createSeededRng(1234) });
  let board = result.initial;
  for (const step of result.steps) board = applyRecordedStep(board, step);
  assert(boardsMatch(board, result.finalBoard), 'adım kaydı');
});

test('bağlantı kopunca aynı istek sonucu korunur', async () => {
  const book: Book = { balance: 800, rows: new Map() };
  const first = await settle(book, 'u5', 'drop', 100, 250);
  const lost = { ...first };
  assertEq(lost.balance, 950, 'sunucu yazdı');
  const retry = await settle(book, 'u5', 'drop', 100, 250);
  assert(retry.duplicate, 'yeniden');
  assertEq(retry.balance, 950, 'ikinci düşüm yok');
  assertEq(retry.win, 250, 'aynı sonuç');
});

async function main(): Promise<void> {
  await Promise.all(queue);
  if (failed > 0) {
    console.error(`\n${failed} başarısız / ${passed} geçti`);
    for (const failure of failures) console.error(failure);
    process.exit(1);
  }
  console.log(`\n${passed} test geçti`);
}

void main();
