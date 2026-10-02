import { registerGame } from '../cekirdek/OyunKayitSistemi';
import {
  GAME_CODE,
  GAME_DISPLAY_NAME,
  GAME_VERSION,
} from './sabitler/AstralFallsSabitleri';

export function registerAstralFalls(): void {
  registerGame({
    code: GAME_CODE,
    name: GAME_DISPLAY_NAME,
    description:
      '6×5 kozmik kristal cascade — 8+ mühür, çarpan, 4 geçit = 15 ücretsiz tur',
    minPlayers: 1,
    maxPlayers: 1,
    defaultDurationSeconds: 0,
    economy: true,
    leaderboard: false,
    multiplayer: false,
    version: GAME_VERSION,
  });
}

registerAstralFalls();
