import { supabase } from '../../../lib/supabase';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import i18n from '../../../i18n';

export async function SehirDestekle(input: {
  cityId: string;
  isPrimary?: boolean;
}): Promise<{ ok: boolean; hata?: string }> {
  if (!(await OzellikBayragiAktifMiSunucu('city_league_enabled'))) {
    return { ok: false, hata: i18n.t('sehir.alertLigKapali') };
  }
  const { error } = await supabase.rpc('sehir_destekle', {
    p_city_id: input.cityId,
    p_is_primary: input.isPrimary ?? false,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}
