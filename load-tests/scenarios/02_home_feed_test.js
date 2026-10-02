import { makeOptions } from '../lib/options.js';
import { vuToken } from '../lib/auth.js';
import { homeFeedRead } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions();
export { options };

export default function () {
  homeFeedRead(vuToken());
  think(3, 8);
}
