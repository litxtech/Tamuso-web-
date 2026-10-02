import { makeOptions } from '../lib/options.js';
import { vuToken, vuProfileId } from '../lib/auth.js';
import { followListRead } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions();
export { options };

export default function () {
  // READ list — follow/unfollow write staging + ALLOW_WRITE gerekir
  followListRead(vuToken(), vuProfileId());
  think(2, 5);
}
