/**
 * Staging WRITE senaryosu — production'da abort.
 * like/follow toggle; IAP/gift/wallet/push YOK.
 */
import { makeOptions } from '../lib/options.js';
import { vuToken, vuProfileId } from '../lib/auth.js';
import { rpc } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions({ write: true, ccu: Number(__ENV.LOADTEST_CCU || 50) });
export { options };

export default function () {
  const token = vuToken();
  const target = vuProfileId();
  // Soft write — staging only (safety gate)
  if (target && Math.random() < 0.3) {
    rpc(token, 'takip_et', { p_target_id: target }, 'rpc:takip_et');
    think(1, 2);
    rpc(token, 'takibi_birak', { p_target_id: target }, 'rpc:takibi_birak');
  }
  think(2, 5);
}
