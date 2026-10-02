/**
 * Ana sayfa keşif araması — kullanıcı + ajans + canlı ses odası + canlı yayın.
 * Mevcut RPC'ler: kullanici_ara, takas_ajans_ara
 * Odalar / yayınlar: doğrudan rooms + live_sessions (is_live).
 */

import { supabase } from '../../../lib/supabase';
import { KullanicilariAra, type ArananKullanici } from '../../mesajlasma/okuma/KullanicilariAra';
import {
  TakasAjansAra,
  type TakasAjansSatir,
} from '../../cuzdan/takas/CuzdanTakasIslemleri';

export type KesfetAramaKullanici = ArananKullanici;
export type KesfetAramaAjans = TakasAjansSatir;

export type KesfetAramaOda = {
  id: string;
  title: string;
  topic: string | null;
  cover_url: string | null;
  listener_count: number;
  host_display_name: string | null;
  host_username: string | null;
  host_avatar_url: string | null;
};

export type KesfetAramaCanli = {
  id: string;
  title: string;
  viewer_count: number;
  host_display_name: string | null;
  host_username: string | null;
  host_avatar_url: string | null;
};

export type AnaSayfaKesfetAramaSonuc = {
  kullanicilar: KesfetAramaKullanici[];
  ajanslar: KesfetAramaAjans[];
  odalar: KesfetAramaOda[];
  canlilar: KesfetAramaCanli[];
};

type HostEmbed = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type OdaSatir = {
  id: string;
  title: string | null;
  topic: string | null;
  cover_url: string | null;
  listener_count: number | null;
  host: HostEmbed | HostEmbed[] | null;
};

type CanliSatir = {
  id: string;
  title: string | null;
  viewer_count: number | null;
  host_id: string;
};

function metinHazirla(ham: string): string {
  return ham
    .trim()
    .replace(/[%_,]/g, '')
    .slice(0, 40);
}

function hostTek(h: HostEmbed | HostEmbed[] | null | undefined): HostEmbed | null {
  if (!h) return null;
  return Array.isArray(h) ? h[0] ?? null : h;
}

function prefixOncelikSirala<T>(
  items: T[],
  qLower: string,
  adAl: (x: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const an = adAl(a).toLocaleLowerCase('tr');
    const bn = adAl(b).toLocaleLowerCase('tr');
    const aPref = an.startsWith(qLower) ? 0 : 1;
    const bPref = bn.startsWith(qLower) ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    return an.localeCompare(bn, 'tr');
  });
}

async function odalariAra(q: string, limit: number): Promise<KesfetAramaOda[]> {
  const desen = `"%${q}%"`;
  const { data, error } = await supabase
    .from('rooms')
    .select(
      'id, title, topic, cover_url, listener_count, host:profiles!rooms_host_id_fkey(id, display_name, username, avatar_url)',
    )
    .eq('is_live', true)
    .or(`title.ilike.${desen},topic.ilike.${desen}`)
    .order('listener_count', { ascending: false })
    .limit(Math.max(limit * 2, 12));

  if (error) {
    console.warn('[KESFET_ARA] rooms', error.message);
    return [];
  }

  const qLower = q.toLocaleLowerCase('tr');
  const mapped: KesfetAramaOda[] = ((data as OdaSatir[]) ?? [])
    .filter((r) => (r.title ?? '').trim().length > 0)
    .map((r) => {
      const host = hostTek(r.host);
      return {
        id: r.id,
        title: (r.title ?? '').trim(),
        topic: r.topic ?? null,
        cover_url: r.cover_url ?? host?.avatar_url ?? null,
        listener_count: r.listener_count ?? 0,
        host_display_name: host?.display_name ?? null,
        host_username: host?.username ?? null,
        host_avatar_url: host?.avatar_url ?? null,
      };
    });

  return prefixOncelikSirala(mapped, qLower, (o) => o.title).slice(0, limit);
}

async function canlilariAra(q: string, limit: number): Promise<KesfetAramaCanli[]> {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('id, title, viewer_count, host_id')
    .eq('is_live', true)
    .ilike('title', `%${q}%`)
    .order('viewer_count', { ascending: false })
    .limit(Math.max(limit * 2, 12));

  if (error) {
    console.warn('[KESFET_ARA] live_sessions', error.message);
    return [];
  }

  const rows = ((data as CanliSatir[]) ?? []).filter(
    (r) => (r.title ?? '').trim().length > 0,
  );
  if (rows.length === 0) return [];

  const hostIds = [...new Set(rows.map((r) => r.host_id).filter(Boolean))];
  const hostMap = new Map<string, HostEmbed>();
  if (hostIds.length > 0) {
    const { data: hostlar, error: hostErr } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', hostIds);
    if (hostErr) {
      console.warn('[KESFET_ARA] live hosts', hostErr.message);
    } else {
      for (const h of (hostlar as HostEmbed[]) ?? []) {
        hostMap.set(h.id, h);
      }
    }
  }

  const qLower = q.toLocaleLowerCase('tr');
  const mapped: KesfetAramaCanli[] = rows.map((r) => {
    const host = hostMap.get(r.host_id) ?? null;
    return {
      id: r.id,
      title: (r.title ?? '').trim(),
      viewer_count: r.viewer_count ?? 0,
      host_display_name: host?.display_name ?? null,
      host_username: host?.username ?? null,
      host_avatar_url: host?.avatar_url ?? null,
    };
  });

  return prefixOncelikSirala(mapped, qLower, (c) => c.title).slice(0, limit);
}

/** İlk harften itibaren paralel kullanıcı + ajans + oda + canlı önerisi */
export async function AnaSayfaKesfetAra(input: {
  sorgu: string;
  haricUserId?: string | null;
  kullaniciLimit?: number;
  ajansLimit?: number;
  odaLimit?: number;
  canliLimit?: number;
}): Promise<AnaSayfaKesfetAramaSonuc> {
  const q = metinHazirla(input.sorgu);
  if (q.length < 1) {
    return { kullanicilar: [], ajanslar: [], odalar: [], canlilar: [] };
  }

  const odaLimit = input.odaLimit ?? 6;
  const canliLimit = input.canliLimit ?? 6;

  const [kullanicilar, ajanslarHam, odalar, canlilar] = await Promise.all([
    KullanicilariAra({
      sorgu: q,
      haricUserId: input.haricUserId,
      limit: input.kullaniciLimit ?? 8,
    }).catch(() => [] as KesfetAramaKullanici[]),
    TakasAjansAra(q).catch(() => [] as KesfetAramaAjans[]),
    odalariAra(q, odaLimit).catch(() => [] as KesfetAramaOda[]),
    canlilariAra(q, canliLimit).catch(() => [] as KesfetAramaCanli[]),
  ]);

  const ajansLimit = input.ajansLimit ?? 6;
  const qLower = q.toLocaleLowerCase('tr');
  const ajanslar = prefixOncelikSirala(
    ajanslarHam,
    qLower,
    (a) => a.name ?? '',
  ).slice(0, ajansLimit);

  return { kullanicilar, ajanslar, odalar, canlilar };
}
