import { supabase } from '../../../lib/supabase';
import type { ProfilMedyaTuru } from './ProfilMedyasiYukle';
import i18n from '../../../i18n';

/**
 * profiles.avatar_url / cover_url alanını temizler.
 */
export async function ProfilMedyasiSil(
  tur: ProfilMedyaTuru,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') };

  const column = tur === 'avatar' ? 'avatar_url' : 'cover_url';
  const { error } = await supabase
    .from('profiles')
    .update({ [column]: null })
    .eq('id', uid);

  if (error) {
    return {
      ok: false,
      hata:
        column === 'cover_url' && error.message.includes('cover_url')
          ? i18n.t('profilDuzenle.kapakAlaniYok')
          : error.message,
    };
  }

  return { ok: true };
}
