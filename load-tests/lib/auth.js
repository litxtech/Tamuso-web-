/**
 * Test JWT / profil havuzu.
 * open() yalnızca init context'te çağrılmalı (k6 kuralı).
 *
 * tokens.json format:
 * { "tokens": ["eyJ..."], "profileIds": ["uuid", ...] }
 * veya { "users": [{ "token": "...", "userId": "..." }] }
 */

function readRaw() {
  const candidates = [
    __ENV.LOADTEST_TOKENS_FILE,
    './fixtures/tokens.json',
    'fixtures/tokens.json',
    'load-tests/fixtures/tokens.json',
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      return open(p);
    } catch (_) {
      /* try next */
    }
  }
  return '{}';
}

// Init-time open — VU context'te open() yasak
const RAW = readRaw();

let cache = null;

export function loadFixtures() {
  if (cache) return cache;
  let data = {};
  try {
    data = JSON.parse(RAW || '{}');
  } catch (_) {
    data = {};
  }

  const tokens = [];
  const profileIds = [];

  if (Array.isArray(data.tokens)) tokens.push(...data.tokens.filter(Boolean));
  if (Array.isArray(data.profileIds)) profileIds.push(...data.profileIds.filter(Boolean));
  if (Array.isArray(data.users)) {
    for (const u of data.users) {
      if (u.token) tokens.push(u.token);
      if (u.userId) profileIds.push(u.userId);
    }
  }

  const envProfiles = String(__ENV.LOADTEST_PROFILE_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  profileIds.push(...envProfiles);

  if (__ENV.LOADTEST_ACCESS_TOKEN) tokens.push(__ENV.LOADTEST_ACCESS_TOKEN);

  cache = {
    tokens: [...new Set(tokens)],
    profileIds: [...new Set(profileIds)],
  };
  return cache;
}

// Eager init so init-context errors surface early
const _boot = loadFixtures();
if (!_boot.tokens.length) {
  console.warn(
    '[LOADTEST] UYARI: token havuzu boş — fixtures/tokens.json veya LOADTEST_ACCESS_TOKEN gerekli.',
  );
}

export function vuToken() {
  const { tokens } = loadFixtures();
  if (!tokens.length) {
    throw new Error(
      '[LOADTEST] Token yok. fixtures/tokens.json veya LOADTEST_ACCESS_TOKEN ayarla. Login flood yapma.',
    );
  }
  const i = (__VU - 1) % tokens.length;
  return tokens[i];
}

export function vuProfileId() {
  const { profileIds } = loadFixtures();
  if (!profileIds.length) return null;
  const i = (__VU - 1) % profileIds.length;
  return profileIds[i];
}
