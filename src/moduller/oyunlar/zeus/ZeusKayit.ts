import { registerGame } from '../cekirdek/OyunKayitSistemi';
import {
  GAME_CODE,
  GAME_DISPLAY_NAME,
  GAME_VERSION,
} from './config/ZeusSabitleri';

export function registerZeus(): void {
  registerGame({
    code: GAME_CODE,
    name: GAME_DISPLAY_NAME,
    description:
      '6×5 Olympus cascade — pay anywhere, çarpan, 4 Zeus = 15 ücretsiz tur · max 200',
    minPlayers: 1,
    maxPlayers: 1,
    defaultDurationSeconds: 0,
    economy: true,
    leaderboard: false,
    multiplayer: false,
    version: GAME_VERSION,
  });
}

registerZeus();
