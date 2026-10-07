import { supabase } from '../../../lib/supabase';
import { UygulamaKimligi } from '../../../yapilandirma/UygulamaKimligi';
import i18n from '../../../i18n';

export type PlatformIletisimAyar = {
  support_email: string;
  whatsapp_e164: string;
  whatsapp_gorunen: string;
  baslik: string;
  alt_metin: string;
  adres: string;
  instagram_url: string;
  tiktok_url: string;
  x_url: string;
  youtube_url: string;
  facebook_url: string;
  linkedin_url: string;
  telegram_url: string;
  updated_at?: string;
};

export function VarsayilanPlatformIletisim(): PlatformIletisimAyar {
  return {
    support_email: UygulamaKimligi.SUPPORT_EMAIL,
    whatsapp_e164: '905330483061',
    whatsapp_gorunen: '0533 048 30 61',
    baslik: i18n.t('platform.iletisimBaslik'),
    alt_metin: i18n.t('platform.iletisimAlt'),
    adres: '15442 VENTURA BLVD STE 201-183, USA',
    instagram_url: '',
    tiktok_url: '',
    x_url: '',
    youtube_url: '',
    facebook_url: '',
    linkedin_url: '',
    telegram_url: '',
  };
}

/** Localized defaults — prefer VarsayilanPlatformIletisim() at call time. */
export const VARSAYILAN_PLATFORM_ILETISIM = VarsayilanPlatformIletisim();

let onbellek: PlatformIletisimAyar | null = null;
let onbellekTs = 0;
const TTL_MS = 60_000;

export async function PlatformIletisimAyariniGetir(
  zorla = false,
): Promise<PlatformIletisimAyar> {
  const varsayilan = VarsayilanPlatformIletisim();
  if (!zorla && onbellek && Date.now() - onbellekTs < TTL_MS) {
    return onbellek;
  }
  try {
    const { data, error } = await supabase.rpc('platform_iletisim_ayari_get');
    if (error || !data) {
      return onbellek ?? varsayilan;
    }
    const row = data as Partial<PlatformIletisimAyar>;
    onbellek = {
      support_email: row.support_email?.trim() || varsayilan.support_email,
      whatsapp_e164:
        (row.whatsapp_e164 ?? '').replace(/\D/g, '') || varsayilan.whatsapp_e164,
      whatsapp_gorunen:
        row.whatsapp_gorunen?.trim() || varsayilan.whatsapp_gorunen,
      baslik: row.baslik?.trim() || varsayilan.baslik,
      alt_metin: row.alt_metin?.trim() || varsayilan.alt_metin,
      adres: row.adres?.trim() || varsayilan.adres,
      instagram_url: row.instagram_url?.trim() || '',
      tiktok_url: row.tiktok_url?.trim() || '',
      x_url: row.x_url?.trim() || '',
      youtube_url: row.youtube_url?.trim() || '',
      facebook_url: row.facebook_url?.trim() || '',
      linkedin_url: row.linkedin_url?.trim() || '',
      telegram_url: row.telegram_url?.trim() || '',
      updated_at: row.updated_at,
    };
    onbellekTs = Date.now();
    return onbellek;
  } catch {
    return onbellek ?? varsayilan;
  }
}

export async function AdminPlatformIletisimAyarla(input: {
  support_email?: string;
  whatsapp_e164?: string;
  whatsapp_gorunen?: string;
  baslik?: string;
  alt_metin?: string;
  adres?: string;
  instagram_url?: string;
  tiktok_url?: string;
  x_url?: string;
  youtube_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
  telegram_url?: string;
}): Promise<{ ok: true; veri: PlatformIletisimAyar } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('admin_platform_iletisim_ayarla', {
    p_support_email: input.support_email ?? null,
    p_whatsapp_e164: input.whatsapp_e164 ?? null,
    p_whatsapp_gorunen: input.whatsapp_gorunen ?? null,
    p_baslik: input.baslik ?? null,
    p_alt_metin: input.alt_metin ?? null,
    p_adres: input.adres ?? null,
    p_instagram_url: input.instagram_url ?? null,
    p_tiktok_url: input.tiktok_url ?? null,
    p_x_url: input.x_url ?? null,
    p_youtube_url: input.youtube_url ?? null,
    p_facebook_url: input.facebook_url ?? null,
    p_linkedin_url: input.linkedin_url ?? null,
    p_telegram_url: input.telegram_url ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  onbellek = null;
  onbellekTs = 0;
  const veri = await PlatformIletisimAyariniGetir(true);
  return { ok: true, veri: (data as PlatformIletisimAyar) ?? veri };
}
