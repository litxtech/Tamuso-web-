import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type { AppPaylasimLinki, PaylasimLinkGirdi } from '../tipler';

export type AdminLinkSonucu =
  | { ok: true; veri: AppPaylasimLinki }
  | { ok: false; hata: string };

function normalizeGirdi(girdi: PaylasimLinkGirdi): PaylasimLinkGirdi | { hata: string } {
  const code = girdi.code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const title = girdi.title.trim();
  const url = girdi.url.trim();
  if (!code || code.length < 2) return { hata: i18n.t('paylasim.admin.kodMin') };
  if (!title) return { hata: i18n.t('paylasim.admin.baslikGerekli') };
  if (!/^https?:\/\//i.test(url)) return { hata: i18n.t('paylasim.admin.urlHttps') };
  return {
    code,
    title,
    description: girdi.description?.trim() || null,
    platform: girdi.platform,
    url,
    is_active: girdi.is_active ?? true,
    sort_order: girdi.sort_order ?? 100,
  };
}

export async function PaylasimLinkiOlustur(
  girdi: PaylasimLinkGirdi,
): Promise<AdminLinkSonucu> {
  const n = normalizeGirdi(girdi);
  if ('hata' in n) return { ok: false, hata: n.hata };

  const { data, error } = await supabase
    .from('app_share_links')
    .insert({
      code: n.code,
      title: n.title,
      description: n.description,
      platform: n.platform,
      url: n.url,
      is_active: n.is_active,
      sort_order: n.sort_order,
    })
    .select('*')
    .single();

  if (error) return { ok: false, hata: error.message };
  return { ok: true, veri: data as AppPaylasimLinki };
}

export async function PaylasimLinkiGuncelle(
  id: string,
  girdi: PaylasimLinkGirdi,
): Promise<AdminLinkSonucu> {
  const n = normalizeGirdi(girdi);
  if ('hata' in n) return { ok: false, hata: n.hata };

  const { data, error } = await supabase
    .from('app_share_links')
    .update({
      code: n.code,
      title: n.title,
      description: n.description,
      platform: n.platform,
      url: n.url,
      is_active: n.is_active,
      sort_order: n.sort_order,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { ok: false, hata: error.message };
  return { ok: true, veri: data as AppPaylasimLinki };
}

export async function PaylasimLinkiSil(
  id: string,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.from('app_share_links').delete().eq('id', id);
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function PaylasimLinkiAktiflikDegistir(
  id: string,
  is_active: boolean,
): Promise<AdminLinkSonucu> {
  const { data, error } = await supabase
    .from('app_share_links')
    .update({ is_active })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return { ok: false, hata: error.message };
  return { ok: true, veri: data as AppPaylasimLinki };
}
