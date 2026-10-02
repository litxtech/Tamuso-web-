/**
 * Realtime event yolları için hafif profil önbelleği.
 * display_name / username / avatar / level — hediye, seviye giriş, kazanç balonu.
 */

import { supabase } from '../../../lib/supabase';
import { TtlInflightCacheOlustur } from '../../../ortak/onbellek/TtlInflightCache';

export type ProfilMini = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
};

const SELECT =
  'id, display_name, username, avatar_url, level' as const;

/** Avatar/isim değişikliklerinin makul sürede yenilenmesi */
const TTL_MS = 90_000;

const cache = TtlInflightCacheOlustur<ProfilMini | null>(TTL_MS);

async function dbdenAl(userId: string): Promise<ProfilMini | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(SELECT)
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    display_name: (data.display_name as string | null) ?? null,
    username: (data.username as string | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
    level: typeof data.level === 'number' ? data.level : 1,
  };
}

export const ProfilMiniCache = {
  ttlMs: TTL_MS,

  async al(userId: string): Promise<ProfilMini | null> {
    if (!userId) return null;
    return cache.getOrFetch(userId, () => dbdenAl(userId));
  },

  /** Birden fazla id — cache hit + tek .in sorgusu eksikler için */
  async topluAl(userIds: string[]): Promise<Map<string, ProfilMini>> {
    const out = new Map<string, ProfilMini>();
    const eksik: string[] = [];
    const uniq = [...new Set(userIds.filter(Boolean))];
    for (const id of uniq) {
      const hit = cache.get(id);
      if (hit) out.set(id, hit);
      else if (hit === null) {
        /* bilerek boş — tekrar sorma bu turda */
      } else {
        eksik.push(id);
      }
    }
    if (eksik.length === 0) return out;

    // In-flight: her eksik için getOrFetch (aynı id tek SELECT)
    await Promise.all(
      eksik.map(async (id) => {
        const p = await cache.getOrFetch(id, () => dbdenAl(id));
        if (p) out.set(id, p);
      }),
    );
    return out;
  },

  yaz(profil: ProfilMini) {
    cache.set(profil.id, profil);
  },

  invalidate(userId: string) {
    cache.invalidate(userId);
  },

  temizle() {
    cache.clear();
  },

  gosterimAdi(p: ProfilMini | null | undefined, fallback = 'Birisi'): string {
    return p?.display_name?.trim() || p?.username?.trim() || fallback;
  },
};
