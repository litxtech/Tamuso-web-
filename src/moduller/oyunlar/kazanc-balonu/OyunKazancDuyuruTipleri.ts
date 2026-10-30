export type OyunKazancDuyurusu = {
  id: string;
  user_id: string;
  room_id: string | null;
  game_code: string;
  game_title: string;
  win_amount: number;
  bet_amount: number;
  multiplier: number | null;
  round_id: string | null;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
};
