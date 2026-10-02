import { supabase } from '../../../lib/supabase';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';

/**
 * notification_outbox pending → edge worker.
 * Gönderen cihaz tetikler; alıcıya APNs/FCM + badge gider.
 */
export function PushWorkerTetikle(limit = 40): void {
  const base = OrtamDegiskenleri.supabaseUrl;
  const anon = OrtamDegiskenleri.supabaseAnonAnahtari;
  if (!base || !anon) return;

  void (async () => {
    const { data } = await supabase.auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt) return;
    await fetch(`${base}/functions/v1/notification-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        apikey: anon,
      },
      body: JSON.stringify({ limit }),
    });
  })().catch(() => undefined);
}
