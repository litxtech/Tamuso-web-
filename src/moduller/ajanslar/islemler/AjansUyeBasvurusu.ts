import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';

export async function AjansUyeBasvurusuOlustur(input: {
  agencyId?: string;
  inviteCode?: string;
}): Promise<{ ok: boolean; hata?: string }> {
  if (!(await OzellikBayragiAktifMiSunucu('agency_enabled'))) {
    return { ok: false, hata: i18n.t('ajans.ozellikKapali') };
  }
  const { error } = await supabase.rpc('ajans_uye_basvurusu_olustur', {
    p_agency_id: input.agencyId ?? null,
    p_invite_code: input.inviteCode ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}
