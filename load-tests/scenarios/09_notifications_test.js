import { makeOptions } from '../lib/options.js';
import { vuToken } from '../lib/auth.js';
import { notificationsRead } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions();
export { options };

export default function () {
  notificationsRead(vuToken());
  think(2, 4);
}
