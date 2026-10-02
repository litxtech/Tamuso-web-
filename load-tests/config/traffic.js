/**
 * Trafik dağılımı — mixed senaryo (toplam 100).
 * Env: LOADTEST_WEIGHT_* ile override edilebilir.
 */
export const TRAFFIC_WEIGHTS = {
  home: Number(__ENV.LOADTEST_WEIGHT_HOME || 30),
  status: Number(__ENV.LOADTEST_WEIGHT_STATUS || 20),
  profile: Number(__ENV.LOADTEST_WEIGHT_PROFILE || 15),
  messages: Number(__ENV.LOADTEST_WEIGHT_MESSAGES || 10),
  leaderboard: Number(__ENV.LOADTEST_WEIGHT_LEADERBOARD || 10),
  follow: Number(__ENV.LOADTEST_WEIGHT_FOLLOW || 5),
  notifications: Number(__ENV.LOADTEST_WEIGHT_NOTIFICATIONS || 5),
  other: Number(__ENV.LOADTEST_WEIGHT_OTHER || 5),
};

export function pickAction(random) {
  const entries = Object.entries(TRAFFIC_WEIGHTS);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = random() * total;
  for (const [name, w] of entries) {
    r -= w;
    if (r <= 0) return name;
  }
  return entries[0][0];
}
