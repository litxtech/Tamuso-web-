import { makeOptions } from '../lib/options.js';
import { vuToken } from '../lib/auth.js';
import { roomMetadataRead } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions();
export { options };

export default function () {
  roomMetadataRead(vuToken());
  think(2, 5);
}
