/**
 * k6 Realtime senaryosu — placeholder.
 * Supabase Phoenix protokolü için tercih: node realtime/harness.mjs
 * Bu dosya k6 run ile açılırsa bilgi verip çıkar.
 */
export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  console.warn(
    '[11_realtime] k6 native Supabase Realtime doğrulaması sınırlı. node realtime/harness.mjs kullan.',
  );
}
