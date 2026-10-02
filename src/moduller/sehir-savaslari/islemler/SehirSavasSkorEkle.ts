import { supabase } from '../../../lib/supabase';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import i18n from '../../../i18n';

export async function SehirSavasSkorEkle(input: {
  battleId: string;
  cityId: string;
  delta: number;
}): Promise<{ ok: boolean; hata?: string }> {
  if (!(await OzellikBayragiAktifMiSunucu('city_battles_enabled'))) {
    return { ok: false, hata: i18n.t('sehir.alertSavasKapali') };
  }
  const { error } = await supabase.rpc('sehir_savas_skor_ekle', {
    p_battle_id: input.battleId,
    p_city_id: input.cityId,
    p_delta: input.delta,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}
