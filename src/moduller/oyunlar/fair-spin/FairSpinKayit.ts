import { registerGame } from '../cekirdek/OyunKayitSistemi';
import {
  GAME_CODE,
  GAME_DISPLAY_NAME,
  GAME_VERSION,
} from './sabitler/FairSpinSabitleri';

export function registerFairSpin(): void {
  registerGame({
    code: GAME_CODE,
    name: GAME_DISPLAY_NAME,
    description: '8 dilimli adil çark — sunucu RNG, coin bahis',
    minPlayers: 1,
    maxPlayers: 1,
    defaultDurationSeconds: 0,
    economy: true,
    leaderboard: false,
    multiplayer: false,
    version: GAME_VERSION,
  });
}

registerFairSpin();
