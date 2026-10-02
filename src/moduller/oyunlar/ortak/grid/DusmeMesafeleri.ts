/**
 * Cascade düşme mesafeleri — taşlar tünelde tek istif olarak iner.
 * Patlama sonrası yeni taşlar düşen grubun tepesine yapışır; sütun içi boşluk
 * animasyon boyunca açılmaz, geç gelen kolon olmaz.
 */

export type DusmeHucre = {
  instanceId: string;
  row: number;
  column?: number;
};

/** Sabit hız: her hücre aynı sürede kat edilir, istif dağılmaz. */
export const DUSME_MS_PER_CELL = 18;
export const DUSME_BOUNCE_MS = 24;

function herHucre(
  grid: readonly (readonly DusmeHucre[])[],
  isEmpty: (id: string) => boolean,
  fn: (cell: DusmeHucre, col: number) => void,
): void {
  for (const row of grid) {
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (!cell || isEmpty(cell.instanceId)) continue;
      const col =
        typeof cell.column === 'number' && Number.isFinite(cell.column)
          ? cell.column
          : c;
      fn(cell, col);
    }
  }
}

/**
 * İlk drop: her kolon kendi sırasını koruyarak tahtanın tam üstünden iner.
 * Mesafe = görünür satır sayısı — istif dağılmaz, tünelde kayarak görünür.
 */
export function dropDistancesFromAbove(
  grid: readonly (readonly DusmeHucre[])[],
  isEmpty: (id: string) => boolean,
): Record<string, number> {
  const out: Record<string, number> = {};
  const visibleRows = Math.max(1, grid.length);
  herHucre(grid, isEmpty, (cell) => {
    out[cell.instanceId] = visibleRows;
  });
  return out;
}

type ColCell = DusmeHucre & { col: number };

/**
 * Gravity sonrası:
 * hayatta kalanlar eski satırdan yeni satıra,
 * yeni taşlar düşen istifin tepesine yapışık (ayrı hopper'dan geç gelmez).
 * Böylece patlayan sütun boş kaymaz.
 */
export function dropDistancesBetween(
  before: readonly (readonly DusmeHucre[])[],
  after: readonly (readonly DusmeHucre[])[],
  isEmpty: (id: string) => boolean,
): Record<string, number> {
  const prev = new Map<string, number>();
  herHucre(before, isEmpty, (cell) => {
    prev.set(cell.instanceId, cell.row);
  });

  const afterByCol = new Map<number, ColCell[]>();
  herHucre(after, isEmpty, (cell, col) => {
    const list = afterByCol.get(col) ?? [];
    list.push({ instanceId: cell.instanceId, row: cell.row, column: col, col });
    afterByCol.set(col, list);
  });

  const out: Record<string, number> = {};

  for (const cells of afterByCol.values()) {
    const survivors: { id: string; oldRow: number; newRow: number }[] = [];
    const newcomers: ColCell[] = [];

    for (const cell of cells) {
      const oldRow = prev.get(cell.instanceId);
      if (oldRow == null) {
        newcomers.push(cell);
        continue;
      }
      survivors.push({ id: cell.instanceId, oldRow, newRow: cell.row });
      const d = cell.row - oldRow;
      if (d > 0) out[cell.instanceId] = d;
    }

    if (newcomers.length === 0) continue;

    newcomers.sort((a, b) => a.row - b.row);
    const k = newcomers.length;

    let newDist = k;
    if (survivors.length > 0) {
      let top = survivors[0]!;
      for (let i = 1; i < survivors.length; i += 1) {
        const s = survivors[i]!;
        if (s.newRow < top.newRow) top = s;
      }
      const packDist = k - top.oldRow;
      if (packDist > 0) newDist = packDist;
    }

    for (const cell of newcomers) {
      out[cell.instanceId] = newDist;
    }
  }

  return out;
}

export function maxDusmeMesafesi(dropping: Record<string, number>): number {
  let max = 0;
  for (const v of Object.values(dropping)) {
    if (v > max) max = v;
  }
  return max;
}

export function dusmeSuresiMs(mesafeHucre: number, speedFactor = 1): number {
  const d = Math.max(0, mesafeHucre);
  if (d <= 0) return 0;
  return Math.round(d * DUSME_MS_PER_CELL * speedFactor);
}

export function dusmeToplamMs(mesafeHucre: number, speedFactor = 1): number {
  if (mesafeHucre <= 0) return Math.round(40 * speedFactor);
  return (
    dusmeSuresiMs(mesafeHucre, speedFactor) +
    Math.round(DUSME_BOUNCE_MS * speedFactor)
  );
}
