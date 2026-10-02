import { makeOptions } from '../lib/options.js';
import { vuToken } from '../lib/auth.js';
import { statusFeedRead, statusFollowingFeedRead } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions();
export { options };

export default function () {
  if (Math.random() < 0.6) statusFeedRead(vuToken());
  else statusFollowingFeedRead(vuToken());
  think(2, 6);
}
