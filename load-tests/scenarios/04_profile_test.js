import { makeOptions } from '../lib/options.js';
import { vuToken, vuProfileId } from '../lib/auth.js';
import { profileRead } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions();
export { options };

export default function () {
  profileRead(vuToken(), vuProfileId());
  think(2, 5);
}
