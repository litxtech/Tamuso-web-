import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type OdaBilgiGuncelleGirdi = {
  roomId: string;
  title?: string;
  topic?: string | null;
  coverUrl?: string | null;
  themeCode?: string | null;
  layoutCode?: string | null;
};

/**
 * Oda sahibi veya yönetici (cohost): başlık / açıklama / kapak / tema.
 * Başlık: security definer RPC (cohost RLS dışı).
 * Diğer alanlar: host RLS (cover/topic/theme).
 */
export async function OdaBilgileriniGuncelle(
  girdi: OdaBilgiGuncelleGirdi,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  if (girdi.title !== undefined) {
    const t = girdi.title.trim();
    if (!t) return { ok: false, hata: i18n.t('sesOda.baslikBosOlmaz') };
    if (t.length > 40) return { ok: false, hata: i18n.t('sesOda.baslikMax40') };
    const { error } = await supabase.rpc('oda_basligini_guncelle', {
      p_room_id: girdi.roomId,
      p_title: t,
    });
    if (error) return { ok: false, hata: error.message };
  }

  const patch: Record<string, string | null> = {};
  if (girdi.topic !== undefined) {
    const topic = girdi.topic?.trim() || null;
    if (topic && topic.length > 120) {
      return { ok: false, hata: i18n.t('sesOda.aciklamaMax120') };
    }
    patch.topic = topic;
  }
  if (girdi.coverUrl !== undefined) {
    patch.cover_url = girdi.coverUrl;
  }
  if (girdi.themeCode !== undefined) {
    const kod = girdi.themeCode?.trim() || null;
    if (kod && kod.length > 40) {
      return { ok: false, hata: i18n.t('sesOda.temaKoduGecersiz') };
    }
    patch.theme_code = kod;
  }
  if (girdi.layoutCode !== undefined) {
    const kod = girdi.layoutCode?.trim() || null;
    if (kod && kod.length > 40) {
      return { ok: false, hata: i18n.t('sesOda.duzenKoduGecersiz') };
    }
    patch.layout_code = kod;
  }

  if (Object.keys(patch).length === 0) {
    if (girdi.title !== undefined) return { ok: true };
    return { ok: false, hata: i18n.t('sesOda.guncellenecekAlanYok') };
  }

  const { error } = await supabase
    .from('rooms')
    .update(patch)
    .eq('id', girdi.roomId);

  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}
