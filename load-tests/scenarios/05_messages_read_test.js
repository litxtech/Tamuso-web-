import { makeOptions } from '../lib/options.js';
import { vuToken } from '../lib/auth.js';
import { messagesInboxRead } from '../lib/client.js';
import { think } from '../lib/think.js';

const { options } = makeOptions();
export { options };

export default function () {
  // READ only — gerçek kullanıcılara mesaj yok
  messagesInboxRead(vuToken());
  think(2, 5);
}
