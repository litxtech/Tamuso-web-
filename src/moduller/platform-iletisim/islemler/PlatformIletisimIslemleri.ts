import { supabase } from '../../../lib/supabase';
import { UygulamaKimligi } from '../../../yapilandirma/UygulamaKimligi';
import i18n from '../../../i18n';

export type PlatformIletisimAyar = {
  support_email: string;
  whatsapp_e164: string;
  whatsapp_gorunen: string;
  baslik: string;
  alt_metin: string;
  updated_at?: string;
};

export function VarsayilanPlatformIletisim(): PlatformIletisimAyar {
  return {
    support_email: UygulamaKimligi.SUPPORT_EMAIL,
    whatsapp_e164: '905330483061',
    whatsapp_gorunen: '0533 048 30 61',
    baslik: i18n.t('platform.iletisimBaslik'),
    alt_metin: i18n.t('platform.iletisimAlt'),
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
}): Promise<{ ok: true; veri: PlatformIletisimAyar } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('admin_platform_iletisim_ayarla', {
    p_support_email: input.support_email ?? null,
    p_whatsapp_e164: input.whatsapp_e164 ?? null,
    p_whatsapp_gorunen: input.whatsapp_gorunen ?? null,
    p_baslik: input.baslik ?? null,
    p_alt_metin: input.alt_metin ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  onbellek = null;
  onbellekTs = 0;
  const veri = await PlatformIletisimAyariniGetir(true);
  return { ok: true, veri: (data as PlatformIletisimAyar) ?? veri };
}
