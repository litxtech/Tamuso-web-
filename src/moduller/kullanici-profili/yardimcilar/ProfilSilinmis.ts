import i18n from '../../../i18n';

/** Platform tombstone display name for deleted accounts. */
export function HesapSilindiAdi(): string {
  return i18n.t('hesapSil.silindi');
}

/** @deprecated use HesapSilindiAdi() for locale-aware display */
export const HESAP_SILINDI_ADI = 'Hesap sil\u0131ndi';

export function ProfilSilinmisMi(p: {
  deleted_at?: string | null;
  display_name?: string | null;
} | null | undefined): boolean {
  if (!p) return false;
  if (p.deleted_at) return true;
  const ad = p.display_name?.trim().toLocaleLowerCase('tr-TR') ?? '';
  const silindi = i18n.t('hesapSil.silindi').toLocaleLowerCase();
  return (
    ad === 'hesap sil\u0131ndi' ||
    ad === 'silinmi\u015f hesap' ||
    ad === 'silinmis hesap' ||
    ad === silindi
  );
}

export function ProfilGorunenAd(
  p: {
    deleted_at?: string | null;
    display_name?: string | null;
    username?: string | null;
  } | null | undefined,
  yedek?: string,
): string {
  if (ProfilSilinmisMi(p)) return HesapSilindiAdi();
  return (
    p?.display_name?.trim() ||
    p?.username?.trim() ||
    yedek ||
    i18n.t('ortak.kullanici')
  );
}
