import { OrtamDegiskenleri } from '../../yapilandirma/OrtamDegiskenleri';
import i18n from '../../i18n';

/** Paylaşılabilir HTTPS indirme/davet linki (edge function) */
export function PaylasimHttpsUrlOlustur(davetKodu?: string | null): string {
  const base =
    process.env.EXPO_PUBLIC_SHARE_BASE_URL?.replace(/\/$/, '') ||
    `${OrtamDegiskenleri.supabaseUrl.replace(/\/$/, '')}/functions/v1/share-redirect`;

  if (davetKodu?.trim()) {
    return `${base}?c=${encodeURIComponent(davetKodu.trim().toUpperCase())}`;
  }
  return base;
}

/** Uygulama içi deep link */
export function PaylasimDeepLinkOlustur(davetKodu: string): string {
  const scheme = OrtamDegiskenleri.uygulamaSemasi || 'muta';
  return `${scheme}://paylas/${encodeURIComponent(davetKodu.trim().toUpperCase())}`;
}

export function PaylasimMesajiOlustur(opts: {
  uygulamaAdi?: string;
  url: string;
  davetKodu?: string;
}): string {
  const ad = opts.uygulamaAdi ?? OrtamDegiskenleri.uygulamaAdi;
  const kodSatiri = opts.davetKodu
    ? i18n.t('paylasim.davetKoduSatiri', { kod: opts.davetKodu })
    : '';
  return i18n.t('paylasim.mesajKatil', { ad, kodSatiri, url: opts.url });
}
