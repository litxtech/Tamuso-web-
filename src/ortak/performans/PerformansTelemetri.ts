/**
 * Development-only hafif performans ölçümü.
 * Production'da no-op (console spam yok).
 */

type Esik = { warnMs: number; criticalMs: number };

const VARSAYILAN: Esik = { warnMs: 500, criticalMs: 1000 };

let esik: Esik = { ...VARSAYILAN };
const gelistirme =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.EXPO_PUBLIC_APP_ENV !== 'production';

export const PerformansTelemetri = {
  esikleriAyarla(next: Partial<Esik>) {
    esik = { ...esik, ...next };
  },

  esikleriAl(): Esik {
    return { ...esik };
  },

  async olc<T>(
    etiket: string,
    islem: () => Promise<T>,
    meta?: Record<string, unknown>,
  ): Promise<T> {
    if (!gelistirme) return islem();
    const t0 = Date.now();
    try {
      return await islem();
    } finally {
      const ms = Date.now() - t0;
      const seviye =
        ms >= esik.criticalMs
          ? 'critical'
          : ms >= esik.warnMs
            ? 'warn'
            : 'ok';
      if (seviye !== 'ok') {
        const ek = meta ? ` ${JSON.stringify(meta)}` : '';
        const msg = `[Perf:${seviye}] ${etiket} ${ms}ms${ek}`;
        if (seviye === 'critical') console.warn(msg);
        else console.log(msg);
      }
    }
  },

  /** Senkron blok süresi (render dışı) */
  olcSync(etiket: string, islem: () => void) {
    if (!gelistirme) {
      islem();
      return;
    }
    const t0 = Date.now();
    try {
      islem();
    } finally {
      const ms = Date.now() - t0;
      if (ms >= esik.warnMs) {
        console.log(`[Perf] ${etiket} ${ms}ms`);
      }
    }
  },
};
