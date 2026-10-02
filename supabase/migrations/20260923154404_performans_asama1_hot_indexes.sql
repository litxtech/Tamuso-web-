-- Aşama 1: yalnızca doğrulanmış hot-path composite indexler.
-- Mevcut veriyi silmez.

-- Gifter leaderboard / hediye geçmişi (sender tarafı)
create index if not exists gift_tx_sender_created_idx
  on public.gift_transactions (sender_id, created_at desc);

-- Cüzdan ledger geçmişi (CuzdanLedgeriniGetir ORDER BY created_at)
create index if not exists wallet_ledger_user_created_idx
  on public.wallet_ledger (user_id, created_at desc);

-- Profil "aktif oda" / üyelik sorguları (user_id + joined_at)
create index if not exists room_members_user_joined_idx
  on public.room_members (user_id, joined_at desc);

-- Top recharge dönem aggregate (status + created_at)
create index if not exists coin_purchases_completed_created_idx
  on public.coin_purchases (created_at desc)
  where status = 'completed';
