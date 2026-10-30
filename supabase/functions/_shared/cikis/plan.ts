/**
 * Çarpanlı oyunlar bu iki çağrıyı kullanır.
 * Yeni oyun: game_cikis_oyun.tur = 'carpan' ve öğe anahtarları pozitif sayı.
 * Tek sonuçlu oyunlar bunun yerine veritabanında game_cikis_cek çağırır.
 */

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type CikisCarpanOge = {
  deger: number;
  agirlik: number;
  taban: number;
  kalan: number | null;
  kural: string | null;
};

export type CikisCarpanPlan = {
  token: string | null;
  bps: number;
  ogeler: CikisCarpanOge[];
  kuyruk: number[];
};

function tamSayi(value: unknown, min: number, max: number): number | null {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function planCoz(raw: unknown): CikisCarpanPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.ok === false) return null;
  const ogeler = Array.isArray(row.ogeler) ? row.ogeler : [];
  const kuyruk = Array.isArray(row.kuyruk) ? row.kuyruk : [];
  return {
    token: typeof row.token === 'string' ? row.token : null,
    bps: tamSayi(row.bps, 0, 10_000) ?? 350,
    ogeler: ogeler.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const o = item as Record<string, unknown>;
      const deger = tamSayi(o.deger, 1, 100_000);
      const agirlik = tamSayi(o.agirlik, 0, 100_000);
      const taban = tamSayi(o.taban, 0, 100_000);
      if (deger === null || agirlik === null || taban === null) return [];
      const kalan = o.kalan == null ? null : tamSayi(o.kalan, 0, 100_000);
      if (o.kalan != null && kalan === null) return [];
      return [{
        deger,
        agirlik,
        taban,
        kalan,
        kural: typeof o.kural === 'string' ? o.kural : null,
      }];
    }),
    kuyruk: kuyruk.flatMap((value) => {
      const n = tamSayi(value, 1, 100_000);
      return n === null ? [] : [n];
    }),
  };
}

export async function cikisCarpanBaslat(
  admin: RpcClient,
  gameCode: string,
): Promise<CikisCarpanPlan | null> {
  try {
    const { data, error } = await admin.rpc('game_cikis_storm_baslat', {
      p_game: gameCode,
      p_adet: 40,
    });
    if (error) return null;
    return planCoz(data);
  } catch {
    return null;
  }
}

export async function cikisCarpanBitir(
  admin: RpcClient,
  token: string | null,
  queueUsed: number,
  rules: Record<string, number>,
): Promise<void> {
  if (!token && Object.keys(rules).length === 0) return;
  try {
    await admin.rpc('game_cikis_storm_bitir', {
      p_token: token,
      p_kuyruk: queueUsed,
      p_kurallar: rules,
    });
  } catch {
    // Rezerv iki dakika sonra kendiliğinden sıraya döner.
  }
}
