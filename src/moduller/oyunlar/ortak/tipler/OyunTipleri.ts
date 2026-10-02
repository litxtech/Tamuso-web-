/**
 * Tamuso Games — paylaşılan oturum / ekonomi / kayıt tipleri.
 */

export type GameCode = 'kozmik_kaskad' | 'zeus' | 'nox_reels' | 'fair_spin' | 'astral_falls' | (string & {});

export type GameSessionStatus =
  | 'waiting'
  | 'countdown'
  | 'playing'
  | 'finished'
  | 'cancelled';

export type GamePlayerStatus =
  | 'joined'
  | 'ready'
  | 'playing'
  | 'finished'
  | 'disconnected'
  | 'dnf'
  | 'left';

export type EconomyMode =
  | 'NORMAL'
  | 'PROMOTION'
  | 'LOW_REWARD'
  | 'NO_REWARD'
  | 'MAINTENANCE';

export type PlayerTier =
  | 'NEW'
  | 'NORMAL'
  | 'ACTIVE'
  | 'VIP'
  | 'EXPERT'
  | 'RESTRICTED';

export type LeagueTierCode =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'legend';

export type LeagueDivision = 1 | 2 | 3;

export type GameControlConfig = {
  id: string;
  game_code: GameCode;
  is_enabled: boolean;
  mode: EconomyMode;
  min_entry: number;
  max_entry: number;
  reward_multiplier: number;
  xp_multiplier: number;
  trophy_multiplier: number;
  reward_factor: number;
  new_player_games: number;
  new_player_max_entry: number;
  daily_reward_cap: number;
  player_daily_reward_cap: number;
  min_players: number;
  max_players: number;
  default_duration_seconds: number;
  /** Şeffaf coin havuz ödülü — gizli sonuç müdahalesi yok */
  coin_rewards_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
};

export type GameControlOverride = {
  id: string;
  game_code: GameCode;
  mode: EconomyMode | null;
  reward_multiplier: number | null;
  xp_multiplier: number | null;
  trophy_multiplier: number | null;
  reward_factor: number | null;
  min_entry: number | null;
  max_entry: number | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type EffectiveEconomyPolicy = {
  mode: EconomyMode;
  minEntry: number;
  maxEntry: number;
  rewardMultiplier: number;
  xpMultiplier: number;
  trophyMultiplier: number;
  rewardFactor: number;
  newPlayerProtection: boolean;
  dailyRewardCap: number;
  playerDailyRewardCap: number;
  isEnabled: boolean;
};

export type ConfigSnapshot = {
  mode: EconomyMode;
  entry: number;
  rewardMultiplier: number;
  xpMultiplier: number;
  trophyMultiplier: number;
  rewardFactor: number;
  newPlayerProtection: boolean;
  dailyRewardCap: number;
  playerDailyRewardCap: number;
  version: string;
  capturedAt: string;
};

export type GameDefinition = {
  code: GameCode;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  defaultDurationSeconds: number;
  economy: boolean;
  leaderboard: boolean;
  multiplayer: boolean;
  version: string;
};

export type GameSession = {
  id: string;
  game_code: GameCode;
  room_id: string;
  host_user_id: string;
  seed: number;
  status: GameSessionStatus;
  max_players: number;
  duration_seconds: number;
  started_at: string | null;
  ends_at: string | null;
  finished_at: string | null;
  config_snapshot: ConfigSnapshot | null;
  created_at: string;
};

export type GameSessionPlayer = {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: GamePlayerStatus;
  score: number;
  combo_max: number;
  move_count: number;
  final_rank: number | null;
  joined_at: string;
  finished_at: string | null;
  disconnected_at: string | null;
};

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  comboMax: number;
  rank: number;
  xpEarned?: number;
  trophyChange?: number;
  coinReward?: number;
};

export type GameRealtimeEvent =
  | { type: 'player_joined'; player: GameSessionPlayer }
  | { type: 'player_left'; userId: string }
  | { type: 'countdown_started'; endsAt: string }
  | { type: 'game_started'; startedAt: string; endsAt: string; seed: number }
  | {
      type: 'score_update';
      userId: string;
      score: number;
      comboMax: number;
      moveCount: number;
    }
  | { type: 'combo'; userId: string; combo: number }
  | { type: 'leader_changed'; userId: string; displayName: string; score: number }
  | { type: 'player_finished'; userId: string; score: number }
  | {
      type: 'game_finished';
      rankings: LeaderboardEntry[];
    };

export type RoomGameMeta = {
  roomId: string;
  roomName: string;
  participantCount: number;
  micEnabled: boolean;
};

export type CreateGameSessionParams = {
  roomId: string;
  gameCode: GameCode;
  durationSeconds?: number;
  maxPlayers?: number;
  entryAmount?: number;
};

export type JoinGameSessionParams = {
  sessionId: string;
  entryAmount?: number;
};

export type SubmitGameScoreParams = {
  sessionId: string;
  score: number;
  moveCount: number;
  highestCombo: number;
  specialTilesUsed?: number;
  boardHash?: string;
};

export type RpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; hata: string };
