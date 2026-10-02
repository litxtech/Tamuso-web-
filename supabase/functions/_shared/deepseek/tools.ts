/**
 * Tamuso asistan araçları — gerçek DB listeleri (oda / canlı / arama / kişi).
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { ToolDef } from './helpers.ts';

export type AsistanKart = {
  type: 'room' | 'live' | 'user' | 'agency';
  id: string;
  title: string;
  subtitle?: string | null;
  cover_url?: string | null;
  href: string;
  meta?: Record<string, string | number | boolean | null>;
};

export type ToolResult = {
  ok: boolean;
  summary: string;
  cards: AsistanKart[];
  count: number;
  error?: string;
};

type HostEmbed = {
  id?: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

function hostTek(h: HostEmbed | HostEmbed[] | null | undefined): HostEmbed | null {
  if (!h) return null;
  return Array.isArray(h) ? h[0] ?? null : h;
}

function clampLimit(n: unknown, def = 12, max = 24): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.min(Math.max(Math.floor(v), 1), max);
}

function cleanQuery(q: unknown): string {
  if (typeof q !== 'string') return '';
  return q.trim().replace(/[%_,]/g, '').slice(0, 40);
}

export const ASSISTANT_TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'list_voice_rooms',
      description:
        'List LIVE voice rooms from Tamuso. Use when user asks for rooms, ses odası, popular/oldest/newest/trending rooms, or rooms by mode (party/dating/karaoke/game). Returns real rooms to open.',
      parameters: {
        type: 'object',
        properties: {
          sort: {
            type: 'string',
            enum: ['popular', 'coins', 'newest', 'oldest', 'trending'],
            description:
              'popular=most listeners; coins/trending=most gift coins; newest=created_at desc; oldest=created_at asc',
          },
          mode: {
            type: 'string',
            enum: ['party', 'dating', 'karaoke', 'game', 'private'],
            description: 'Optional room mode filter',
          },
          query: {
            type: 'string',
            description: 'Optional title/topic search text',
          },
          limit: { type: 'integer', description: '1-24, default 12' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_live_streams',
      description:
        'List LIVE video streams (canlı yayın). Use for live streams, yayınlar, most viewers, newest lives.',
      parameters: {
        type: 'object',
        properties: {
          sort: {
            type: 'string',
            enum: ['popular', 'newest', 'engagement'],
            description:
              'popular=viewer_count; newest=started_at; engagement=score+gifts+likes',
          },
          query: { type: 'string', description: 'Optional title search' },
          limit: { type: 'integer', description: '1-24, default 12' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_everything',
      description:
        'Unified search across live rooms, live streams, and users by name/title. Use when user searches for a name or keyword.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search text (required)' },
          limit: { type: 'integer', description: 'Per category limit 1-12, default 6' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_users',
      description: 'Search people/users by display name or username.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'integer' },
        },
        required: ['query'],
      },
    },
  },
];

async function listVoiceRooms(
  db: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const sort = String(args.sort ?? 'popular');
  const mode = typeof args.mode === 'string' ? args.mode : null;
  const query = cleanQuery(args.query);
  const limit = clampLimit(args.limit, 12, 24);

  let q = db
    .from('rooms')
    .select(
      'id, title, topic, cover_url, mode, listener_count, total_coins_earned, created_at, host:profiles!rooms_host_id_fkey(id, display_name, username, avatar_url)',
    )
    .eq('is_live', true)
    .limit(limit);

  if (mode) q = q.eq('mode', mode);
  if (query) {
    const desen = `"%${query}%"`;
    q = q.or(`title.ilike.${desen},topic.ilike.${desen}`);
  }

  switch (sort) {
    case 'oldest':
      q = q.order('created_at', { ascending: true });
      break;
    case 'newest':
      q = q.order('created_at', { ascending: false });
      break;
    case 'coins':
    case 'trending':
      q = q.order('total_coins_earned', { ascending: false });
      break;
    case 'popular':
    default:
      q = q.order('listener_count', { ascending: false });
      break;
  }

  const { data, error } = await q;
  if (error) {
    return { ok: false, summary: 'Rooms query failed', cards: [], count: 0, error: error.message };
  }

  const cards: AsistanKart[] = ((data as Array<Record<string, unknown>>) ?? [])
    .map((r) => {
      const host = hostTek(r.host as HostEmbed | HostEmbed[] | null);
      const title = String(r.title ?? '').trim() || 'Ses odası';
      const listeners = Number(r.listener_count ?? 0);
      const coins = Number(r.total_coins_earned ?? 0);
      return {
        type: 'room' as const,
        id: String(r.id),
        title,
        subtitle: `${host?.display_name || host?.username || 'Host'} · ${listeners} dinleyici · ${coins} coin`,
        cover_url: (r.cover_url as string | null) ?? host?.avatar_url ?? null,
        href: `/room/${r.id}`,
        meta: {
          mode: (r.mode as string) ?? null,
          listener_count: listeners,
          total_coins_earned: coins,
          sort,
        },
      };
    })
    .filter((c) => !!c.id);

  return {
    ok: true,
    summary: cards.length
      ? `Found ${cards.length} live voice rooms (sort=${sort}${mode ? `, mode=${mode}` : ''}${query ? `, q=${query}` : ''}).`
      : 'No live voice rooms matched.',
    cards,
    count: cards.length,
  };
}

async function listLiveStreams(
  db: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const sort = String(args.sort ?? 'popular');
  const query = cleanQuery(args.query);
  const limit = clampLimit(args.limit, 12, 24);

  let q = db
    .from('live_sessions')
    .select(
      'id, title, viewer_count, like_count, gift_count, score, total_coins_earned, started_at, host_id, host:profiles!live_sessions_host_id_fkey(id, display_name, username, avatar_url)',
    )
    .eq('is_live', true)
    .limit(Math.max(limit * 2, limit));

  if (query) {
    q = q.ilike('title', `%${query}%`);
  }

  switch (sort) {
    case 'newest':
      q = q.order('started_at', { ascending: false });
      break;
    case 'engagement':
      q = q.order('score', { ascending: false });
      break;
    case 'popular':
    default:
      q = q.order('viewer_count', { ascending: false });
      break;
  }

  const { data, error } = await q;
  if (error) {
    return { ok: false, summary: 'Lives query failed', cards: [], count: 0, error: error.message };
  }

  let rows = ((data as Array<Record<string, unknown>>) ?? []).slice();
  if (sort === 'engagement') {
    rows.sort((a, b) => {
      const sa =
        Number(a.score ?? 0) +
        Number(a.gift_count ?? 0) * 10 +
        Number(a.like_count ?? 0) * 3;
      const sb =
        Number(b.score ?? 0) +
        Number(b.gift_count ?? 0) * 10 +
        Number(b.like_count ?? 0) * 3;
      return sb - sa;
    });
  }
  rows = rows.slice(0, limit);

  const cards: AsistanKart[] = rows.map((r) => {
    const host = hostTek(r.host as HostEmbed | HostEmbed[] | null);
    const viewers = Number(r.viewer_count ?? 0);
    const title = String(r.title ?? '').trim() || 'Canlı yayın';
    return {
      type: 'live' as const,
      id: String(r.id),
      title,
      subtitle: `${host?.display_name || host?.username || 'Yayıncı'} · ${viewers} izleyici`,
      cover_url: host?.avatar_url ?? null,
      href: `/canli/${r.id}`,
      meta: {
        viewer_count: viewers,
        gift_count: Number(r.gift_count ?? 0),
        sort,
      },
    };
  });

  return {
    ok: true,
    summary: cards.length
      ? `Found ${cards.length} live streams (sort=${sort}).`
      : 'No live streams matched.',
    cards,
    count: cards.length,
  };
}

async function searchUsers(
  db: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const query = cleanQuery(args.query);
  const limit = clampLimit(args.limit, 8, 16);
  if (!query) {
    return { ok: false, summary: 'query required', cards: [], count: 0, error: 'empty_query' };
  }

  const { data, error } = await db.rpc('kullanici_ara', {
    p_q: query,
    p_limit: limit,
  });
  if (error) {
    // Fallback: profiles ilike
    const { data: fb, error: fbErr } = await db
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(limit);
    if (fbErr) {
      return { ok: false, summary: 'User search failed', cards: [], count: 0, error: error.message };
    }
    const cards: AsistanKart[] = ((fb as Array<Record<string, unknown>>) ?? []).map((u) => ({
      type: 'user' as const,
      id: String(u.id),
      title: String(u.display_name || u.username || 'Kullanıcı'),
      subtitle: u.username ? `@${u.username}` : null,
      cover_url: (u.avatar_url as string | null) ?? null,
      href: `/kullanici/${u.id}`,
    }));
    return {
      ok: true,
      summary: `Found ${cards.length} users for "${query}".`,
      cards,
      count: cards.length,
    };
  }

  const cards: AsistanKart[] = ((data as Array<Record<string, unknown>>) ?? []).map((u) => ({
    type: 'user' as const,
    id: String(u.id),
    title: String(u.display_name || u.username || 'Kullanıcı'),
    subtitle: u.username ? `@${u.username}` : null,
    cover_url: (u.avatar_url as string | null) ?? null,
    href: `/kullanici/${u.id}`,
  }));

  return {
    ok: true,
    summary: `Found ${cards.length} users for "${query}".`,
    cards,
    count: cards.length,
  };
}

async function searchEverything(
  db: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const query = cleanQuery(args.query);
  const limit = clampLimit(args.limit, 6, 12);
  if (!query) {
    return { ok: false, summary: 'query required', cards: [], count: 0, error: 'empty_query' };
  }

  const [rooms, lives, users] = await Promise.all([
    listVoiceRooms(db, { sort: 'popular', query, limit }),
    listLiveStreams(db, { sort: 'popular', query, limit }),
    searchUsers(db, { query, limit }),
  ]);

  const cards = [...rooms.cards, ...lives.cards, ...users.cards];
  return {
    ok: true,
    summary: `Search "${query}": ${rooms.count} rooms, ${lives.count} lives, ${users.count} users.`,
    cards,
    count: cards.length,
  };
}

export async function executeAssistantTool(
  db: SupabaseClient,
  name: string,
  rawArgs: string,
): Promise<ToolResult> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    args = {};
  }

  switch (name) {
    case 'list_voice_rooms':
      return listVoiceRooms(db, args);
    case 'list_live_streams':
      return listLiveStreams(db, args);
    case 'search_everything':
      return searchEverything(db, args);
    case 'search_users':
      return searchUsers(db, args);
    default:
      return {
        ok: false,
        summary: `Unknown tool: ${name}`,
        cards: [],
        count: 0,
        error: 'unknown_tool',
      };
  }
}
