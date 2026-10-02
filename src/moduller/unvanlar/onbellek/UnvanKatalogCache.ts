import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UnvanKatalogKaydi } from '../tipler';
import {
  UnvanKatalogKaydiParse,
  UnvanKatalogSurumunuYukle,
  UnvanKatalogunuYukle,
  type UnvanKatalogSurum,
} from '../okuma/UnvanKatalogunuYukle';

const STORAGE_KEY = '@tamuso/unvan_katalog_v1';

type Snapshot = {
  surum: UnvanKatalogSurum;
  items: UnvanKatalogKaydi[];
  savedAt: string;
};

let mapById = new Map<string, UnvanKatalogKaydi>();
let sonSurum: UnvanKatalogSurum | null = null;
let yukleniyor = false;
let yuklemePromise: Promise<UnvanKatalogKaydi[]> | null = null;

function mapDoldur(items: UnvanKatalogKaydi[]) {
  const next = new Map<string, UnvanKatalogKaydi>();
  for (const it of items) next.set(it.id, it);
  mapById = next;
}

async function snapShotYaz(items: UnvanKatalogKaydi[], surum: UnvanKatalogSurum) {
  try {
    const snap: Snapshot = {
      surum,
      items,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* offline snapshot best-effort */
  }
}

async function snapShotOku(): Promise<Snapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    const items = parsed.items
      .map(UnvanKatalogKaydiParse)
      .filter((r): r is UnvanKatalogKaydi => r !== null);
    return {
      surum: parsed.surum ?? {
        max_updated_at: '1970-01-01T00:00:00Z',
        max_version: 0,
        count: items.length,
      },
      items,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

function surumAyni(a: UnvanKatalogSurum | null, b: UnvanKatalogSurum): boolean {
  if (!a) return false;
  return (
    a.max_version === b.max_version &&
    a.count === b.count &&
    a.max_updated_at === b.max_updated_at
  );
}

export const UnvanKatalogCache = {
  al(id: string): UnvanKatalogKaydi | null {
    return mapById.get(id) ?? null;
  },

  tumu(): UnvanKatalogKaydi[] {
    return [...mapById.values()].sort(
      (a, b) => b.priority - a.priority || a.name.localeCompare(b.name),
    );
  },

  surum(): UnvanKatalogSurum | null {
    return sonSurum;
  },

  invalidate() {
    mapById = new Map();
    sonSurum = null;
  },

  /** Belleğe yaz (realtime / admin sonrası) */
  yaz(items: UnvanKatalogKaydi[], surum?: UnvanKatalogSurum | null) {
    mapDoldur(items);
    if (surum) sonSurum = surum;
  },

  /**
   * Catalog yükle — sürüm aynıysa bellek/snapshot yeter.
   * force=true ile her zaman RPC.
   */
  async yukle(opts?: { force?: boolean }): Promise<UnvanKatalogKaydi[]> {
    if (yuklemePromise) return yuklemePromise;

    yuklemePromise = (async () => {
      yukleniyor = true;
      try {
        // Bellek dolu + force yok → sürüm kontrolü
        if (!opts?.force && mapById.size > 0 && sonSurum) {
          try {
            const remote = await UnvanKatalogSurumunuYukle();
            if (surumAyni(sonSurum, remote)) {
              return UnvanKatalogCache.tumu();
            }
          } catch {
            return UnvanKatalogCache.tumu();
          }
        }

        // Offline snapshot bootstrap
        if (!opts?.force && mapById.size === 0) {
          const snap = await snapShotOku();
          if (snap?.items.length) {
            mapDoldur(snap.items);
            sonSurum = snap.surum;
          }
        }

        try {
          if (!opts?.force && sonSurum && mapById.size > 0) {
            const remote = await UnvanKatalogSurumunuYukle();
            if (surumAyni(sonSurum, remote)) {
              return UnvanKatalogCache.tumu();
            }
          }

          const [items, surum] = await Promise.all([
            UnvanKatalogunuYukle(),
            UnvanKatalogSurumunuYukle(),
          ]);
          mapDoldur(items);
          sonSurum = surum;
          void snapShotYaz(items, surum);
          return items;
        } catch (err) {
          if (mapById.size > 0) return UnvanKatalogCache.tumu();
          throw err;
        }
      } finally {
        yukleniyor = false;
        yuklemePromise = null;
      }
    })();

    return yuklemePromise;
  },

  /** Sürüm watermark farkı varsa invalidate + reload */
  async surumKontrolEt(): Promise<boolean> {
    try {
      const remote = await UnvanKatalogSurumunuYukle();
      if (surumAyni(sonSurum, remote)) return false;
      await UnvanKatalogCache.yukle({ force: true });
      return true;
    } catch {
      return false;
    }
  },

  get yukleniyor() {
    return yukleniyor;
  },
};
