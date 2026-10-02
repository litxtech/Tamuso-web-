import { registerGame } from '../cekirdek/OyunKayitSistemi';
import { GAME_CODE, GAME_DISPLAY_NAME, GAME_VERSION } from './sabitler/FruitWheelSabitleri';

export function registerFruitWheel(): void {
  registerGame({
    code: GAME_CODE,
    name: GAME_DISPLAY_NAME,
    description: '8 meyveli canlı çark — global tur, sunucu sonucu',
    minPlayers: 1,
    maxPlayers: 5000,
    defaultDurationSeconds: 12,
    economy: true,
    leaderboard: false,
    multiplayer: true,
    version: GAME_VERSION,
  });
}

registerFruitWheel();
