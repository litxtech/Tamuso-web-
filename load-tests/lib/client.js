import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { restHeaders } from './safety.js';
import { beginRequest, endRequest, recordLatency } from './diagnostics.js';

export const status_2xx = new Counter('status_2xx');
export const status_4xx = new Counter('status_4xx');
export const status_401 = new Counter('status_401');
export const status_403 = new Counter('status_403');
export const status_409 = new Counter('status_409');
export const status_429 = new Counter('status_429');
export const status_5xx = new Counter('status_5xx');
export const status_other = new Counter('status_other');
export const op_ok = new Counter('op_ok');
export const op_fail = new Counter('op_fail');
export const op_latency = new Trend('op_latency', true);

/** Per-op trends — summary-export tagged submetrics vermediği için ayrı metrikler */
const OP_NAMES = [
  'home:rooms',
  'home:live_sessions',
  'home:hosts',
  'home:blocks',
  'rpc:durum_akisi',
  'rpc:durum_akisi_takip',
  'profile:get',
  'profile:stats',
  'profile:fallback',
  'rpc:mesaj_konularini_getir',
  'rpc:mesajlari_getir',
  'rpc:takipcileri_listele',
  'rpc:takip_edilenleri_listele',
  'rpc:liderlik_siralamasi_listele',
  'rpc:bildirim_okunmamis_sayim',
  'rpc:bildirimlerimi_listele',
  'room:live_list',
  'live:live_list',
  'auth:user',
];

const opTrend = {};
const opOk = {};
const opFail = {};
for (const n of OP_NAMES) {
  const safe = n.replace(/[^a-zA-Z0-9_]/g, '_');
  opTrend[n] = new Trend(`lat_${safe}`, true);
  opOk[n] = new Counter(`ok_${safe}`);
  opFail[n] = new Counter(`fail_${safe}`);
}

function track(res, name) {
  const s = res.status;
  if (s >= 200 && s < 300) status_2xx.add(1);
  else if (s === 401) {
    status_401.add(1);
    status_4xx.add(1);
  } else if (s === 403) {
    status_403.add(1);
    status_4xx.add(1);
  } else if (s === 409) {
    status_409.add(1);
    status_4xx.add(1);
  } else if (s === 429) {
    status_429.add(1);
    status_4xx.add(1);
  } else if (s >= 400 && s < 500) status_4xx.add(1);
  else if (s >= 500) status_5xx.add(1);
  else status_other.add(1);

  const ok = s >= 200 && s < 400;
  if (ok) op_ok.add(1);
  else op_fail.add(1);
  op_latency.add(res.timings.duration);

  if (opTrend[name]) {
    opTrend[name].add(res.timings.duration);
    if (ok) opOk[name].add(1);
    else opFail[name].add(1);
  }
  recordLatency(res, name);
  return res;
}

function withInflight(fn) {
  beginRequest();
  try {
    return fn();
  } finally {
    endRequest();
  }
}

export function baseUrl() {
  return String(__ENV.LOADTEST_SUPABASE_URL || '').replace(/\/$/, '');
}

export function anonKey() {
  return String(__ENV.LOADTEST_SUPABASE_ANON_KEY || '');
}

function tag(name) {
  return { tags: { name } };
}

export function rpc(token, fn, body, name) {
  const op = name || `rpc:${fn}`;
  const url = `${baseUrl()}/rest/v1/rpc/${fn}`;
  return withInflight(() => {
    const res = http.post(url, JSON.stringify(body ?? {}), {
      headers: restHeaders(token, anonKey()),
      ...tag(op),
    });
    track(res, op);
    check(res, {
      [`${op} ok`]: (r) => r.status >= 200 && r.status < 400,
    });
    return res;
  });
}

export function select(token, table, query, name) {
  const op = name || `select:${table}`;
  const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  const url = `${baseUrl()}/rest/v1/${table}${q}`;
  return withInflight(() => {
    const res = http.get(url, {
      headers: {
        ...restHeaders(token, anonKey()),
        Prefer: 'count=exact',
      },
      ...tag(op),
    });
    track(res, op);
    check(res, {
      [`${op} ok`]: (r) => r.status >= 200 && r.status < 400,
    });
    return res;
  });
}

/** AnaSayfaIcerikleriniGetir — yalnızca GET SELECT */
export function homeFeedRead(token) {
  const headers = restHeaders(token, anonKey());
  const u = baseUrl();
  const reqs = [
    [
      'GET',
      `${u}/rest/v1/rooms?select=id,host_id,title,topic,cover_url,mode,listener_count,total_coins_earned,created_at,host:profiles!rooms_host_id_fkey(id,display_name,username,avatar_url,level)&is_live=eq.true&order=listener_count.desc&limit=40`,
      null,
      { headers, tags: { name: 'home:rooms' } },
    ],
    [
      'GET',
      `${u}/rest/v1/live_sessions?select=id,host_id,title,mode,viewer_count,like_count,gift_count,total_coins_earned,score,started_at&is_live=eq.true&order=started_at.desc&limit=24`,
      null,
      { headers, tags: { name: 'home:live_sessions' } },
    ],
  ];
  beginRequest();
  beginRequest();
  let res;
  try {
    res = http.batch(reqs);
  } finally {
    endRequest();
    endRequest();
  }
  track(res[0], 'home:rooms');
  track(res[1], 'home:live_sessions');
  for (const r of res) {
    check(r, { 'home batch ok': (x) => x.status >= 200 && x.status < 400 });
  }
  let hostIds = [];
  try {
    const lives = JSON.parse(res[1].body || '[]');
    hostIds = [
      ...new Set((lives || []).map((x) => x.host_id).filter(Boolean)),
    ].slice(0, 24);
  } catch (_) {
    /* ignore */
  }
  if (hostIds.length) {
    select(
      token,
      'profiles',
      `select=id,display_name,username,avatar_url,level&id=in.(${hostIds.join(',')})`,
      'home:hosts',
    );
  }
  select(token, 'user_blocks', 'select=blocked_id&limit=200', 'home:blocks');
  return res;
}

export function statusFeedRead(token) {
  return rpc(token, 'durum_akisi', { p_limit: 40, p_before: null }, 'rpc:durum_akisi');
}

export function statusFollowingFeedRead(token) {
  return rpc(
    token,
    'durum_akisi_takip',
    { p_limit: 40, p_before: null },
    'rpc:durum_akisi_takip',
  );
}

export function profileRead(token, profileId) {
  if (!profileId) {
    return select(
      token,
      'profiles',
      'select=id,username,display_name,avatar_url,level,bio,cover_url&limit=1',
      'profile:fallback',
    );
  }
  select(
    token,
    'profiles',
    `select=id,public_user_id,username,display_name,bio,avatar_url,cover_url,level,is_verified,created_at&id=eq.${profileId}`,
    'profile:get',
  );
  return select(
    token,
    'user_profile_stats',
    `select=user_id,followers_count,following_count,posts_count,likes_count,charm_level,vip_level,account_value,account_value_label,gifter_rank,recharge_rank&user_id=eq.${profileId}`,
    'profile:stats',
  );
}

export function messagesInboxRead(token) {
  return rpc(
    token,
    'mesaj_konularini_getir',
    { p_limit: 50, p_arsiv: false },
    'rpc:mesaj_konularini_getir',
  );
}

export function messagesThreadRead(token, threadId) {
  if (!threadId) return messagesInboxRead(token);
  return rpc(
    token,
    'mesajlari_getir',
    { p_thread_id: threadId, p_limit: 50, p_before: null },
    'rpc:mesajlari_getir',
  );
}

export function followListRead(token, userId) {
  if (!userId) return;
  rpc(
    token,
    'takipcileri_listele',
    {
      p_user_id: userId,
      p_limit: 24,
      p_cursor_created_at: null,
      p_cursor_id: null,
      p_q: null,
    },
    'rpc:takipcileri_listele',
  );
  return rpc(
    token,
    'takip_edilenleri_listele',
    {
      p_user_id: userId,
      p_limit: 24,
      p_cursor_created_at: null,
      p_cursor_id: null,
      p_q: null,
    },
    'rpc:takip_edilenleri_listele',
  );
}

export function leaderboardRead(token) {
  return rpc(
    token,
    'liderlik_siralamasi_listele',
    { p_board_type: 'gifter', p_period: 'weekly', p_limit: 50 },
    'rpc:liderlik_siralamasi_listele',
  );
}

export function notificationsRead(token) {
  rpc(token, 'bildirim_okunmamis_sayim', {}, 'rpc:bildirim_okunmamis_sayim');
  return rpc(
    token,
    'bildirimlerimi_listele',
    { p_limit: 30 },
    'rpc:bildirimlerimi_listele',
  );
}

export function roomMetadataRead(token) {
  select(
    token,
    'rooms',
    'select=id,title,host_id,is_live,listener_count,mode,cover_url&is_live=eq.true&order=listener_count.desc&limit=20',
    'room:live_list',
  );
  return select(
    token,
    'live_sessions',
    'select=id,host_id,title,is_live,viewer_count,started_at&is_live=eq.true&order=started_at.desc&limit=20',
    'live:live_list',
  );
}

export function authHealth(token) {
  const url = `${baseUrl()}/auth/v1/user`;
  const res = http.get(url, {
    headers: restHeaders(token, anonKey()),
    tags: { name: 'auth:user' },
  });
  track(res, 'auth:user');
  check(res, { 'auth user ok': (r) => r.status === 200 });
  return res;
}
