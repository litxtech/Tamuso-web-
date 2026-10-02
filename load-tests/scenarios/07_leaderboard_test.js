import { makeOptions } from '../lib/options.js';
import { vuToken } from '../lib/auth.js';
import { leaderboardRead } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions();
export { options };

export default function () {
  // listele only — liderlik_siralamasi_yenile ÇAĞRILMAZ
  leaderboardRead(vuToken());
  think(2, 5);
}
