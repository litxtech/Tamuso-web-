CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  coins BIGINT DEFAULT 8400,
  gems INTEGER DEFAULT 0,
  energy INTEGER DEFAULT 10,
  spins INTEGER DEFAULT 22,
  multiplier DECIMAL DEFAULT 1,
  level INTEGER DEFAULT 1,
  xp BIGINT DEFAULT 0,
  daily_spins_used INTEGER DEFAULT 0,
  last_spin_time TIMESTAMP,
  last_daily_bonus TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_value BIGINT NOT NULL,
  multiplier DECIMAL DEFAULT 1,
  final_value BIGINT NOT NULL DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_own" ON players FOR ALL USING (auth.uid() = id);
CREATE POLICY "history_own" ON spin_history FOR ALL USING (auth.uid() = player_id);
