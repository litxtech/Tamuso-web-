import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';

export type Gorev = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  goal_type: string;
  goal_target: number;
  reward_coins: number;
  badge_code: string | null;
};

export type GorevIlerleme = {
  user_id: string;
  mission_id: string;
  progress: number;
  completed_at: string | null;
  claimed_at: string | null;
};

export async function AktifGorevleriGetir(): Promise<Gorev[]> {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Gorev[]) ?? [];
}

export async function GorevIlerlemelerimiGetir(): Promise<GorevIlerleme[]> {
  const { data, error } = await supabase.from('user_mission_progress').select('*');
  if (error) throw error;
  return (data as GorevIlerleme[]) ?? [];
}

export async function GorevIlerlet(missionCode: string, delta = 1) {
  if (!(await OzellikBayragiAktifMiSunucu('missions_enabled'))) {
    return { ok: false as const, hata: i18n.t('platform.gorevKapaliBody') };
  }
  const { error } = await supabase.rpc('gorev_ilerlet', {
    p_mission_code: missionCode,
    p_delta: delta,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function GorevOdulAl(missionCode: string) {
  if (!(await OzellikBayragiAktifMiSunucu('missions_enabled'))) {
    return { ok: false as const, hata: i18n.t('platform.gorevKapaliBody') };
  }
  const { error } = await supabase.rpc('gorev_odul_al', {
    p_mission_code: missionCode,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}
