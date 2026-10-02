import { makeOptions } from '../lib/options.js';
import { vuToken } from '../lib/auth.js';
import { authHealth } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions({ ccu: Number(__ENV.LOADTEST_CCU || 100) });
export { options };

export default function () {
  authHealth(vuToken());
  think(2, 5);
}
