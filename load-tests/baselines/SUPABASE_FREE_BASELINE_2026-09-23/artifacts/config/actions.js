import { pickAction } from '../config/traffic.js';
import { think } from './think.js';
import { vuToken, vuProfileId } from './auth.js';
import * as api from './client.js';

/**
 * Yalnızca doğrulanmış READ RPC/SELECT.
 * HARİÇ: takip_et, takibi_birak, liderlik_siralamasi_yenile, gift, coin, write messaging
 */
export function runMixedIteration() {
  const token = vuToken();
  const profileId = vuProfileId();
  const action = pickAction(Math.random);

  switch (action) {
    case 'home':
      api.homeFeedRead(token);
      think(3, 8);
      break;
    case 'status':
      if (Math.random() < 0.55) api.statusFeedRead(token);
      else api.statusFollowingFeedRead(token);
      think(2, 6);
      break;
    case 'profile':
      api.profileRead(token, profileId);
      think(2, 5);
      break;
    case 'messages': {
      const inbox = api.messagesInboxRead(token);
      // İlk thread varsa mesajları da oku (READ)
      try {
        const rows = JSON.parse(inbox.body || '[]');
        const tid = Array.isArray(rows) && rows[0]?.id ? rows[0].id : null;
        if (tid && Math.random() < 0.5) api.messagesThreadRead(token, tid);
      } catch (_) {
        /* ignore */
      }
      think(2, 5);
      break;
    }
    case 'leaderboard':
      api.leaderboardRead(token);
      think(2, 5);
      break;
    case 'follow':
      api.followListRead(token, profileId);
      think(2, 5);
      break;
    case 'notifications':
      api.notificationsRead(token);
      think(2, 4);
      break;
    default:
      api.roomMetadataRead(token);
      think(2, 5);
  }
}
