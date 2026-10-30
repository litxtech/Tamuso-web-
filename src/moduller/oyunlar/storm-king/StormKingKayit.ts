import { registerGame } from '../cekirdek/OyunKayitSistemi';

export const STORM_KING_CODE = 'storm_king' as const;
export const STORM_KING_NAME = 'Fırtına Kralı';

export function registerStormKing(): void {
  registerGame({
    code: STORM_KING_CODE,
    name: STORM_KING_NAME,
    description: '6×5 tumble kristal slot — çarpan küreleri, sunucu sonucu',
    minPlayers: 1,
    maxPlayers: 1,
    defaultDurationSeconds: 0,
    economy: true,
    leaderboard: false,
    multiplayer: false,
    version: 'storm-king-v1',
  });
}

registerStormKing();
