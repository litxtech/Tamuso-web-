/** Satın alma itiraz (geri dönüş) tipleri */

import i18n from '../../../i18n';

export type SatinAlmaItirazDurum = 'pending' | 'approved' | 'rejected';

export type SatinAlmaItirazNeden =
  | 'not_received'
  | 'wrong_amount'
  | 'duplicate'
  | 'unauthorized'
  | 'other';

export type SatinAlmaItirazOzet = {
  id: string;
  status: SatinAlmaItirazDurum;
  reason_code: SatinAlmaItirazNeden | string;
  user_note: string | null;
  admin_note: string | null;
  resolution_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type AdminSatinAlmaItiraz = {
  id: string;
  user_id: string;
  purchase_kind: 'coin' | 'ai_music' | string;
  purchase_id: string;
  reason_code: SatinAlmaItirazNeden | string;
  user_note: string | null;
  status: SatinAlmaItirazDurum;
  purchase_snapshot: Record<string, unknown>;
  admin_note: string | null;
  resolution_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    public_user_id: string | number | null;
  } | null;
  reviewer: {
    id: string;
    username: string | null;
    display_name: string | null;
  } | null;
};

const ITIRAZ_NEDEN_ANAHTAR: Record<SatinAlmaItirazNeden, string> = {
  not_received: 'satinAlma.nedenGelmedi',
  wrong_amount: 'satinAlma.nedenYanlisTutar',
  duplicate: 'satinAlma.nedenCift',
  unauthorized: 'satinAlma.nedenIzinsiz',
  other: 'satinAlma.nedenDiger',
};

/** Canlı dil — etiket okuması her seferinde i18n.t */
export const ITIRAZ_NEDEN_ETIKET: Record<SatinAlmaItirazNeden, string> = new Proxy(
  {} as Record<SatinAlmaItirazNeden, string>,
  {
    get(_t, code: string | symbol) {
      if (typeof code !== 'string') return undefined;
      const key = ITIRAZ_NEDEN_ANAHTAR[code as SatinAlmaItirazNeden];
      return key ? (i18n.t(key) as string) : undefined;
    },
    has(_t, code: string | symbol) {
      return typeof code === 'string' && code in ITIRAZ_NEDEN_ANAHTAR;
    },
    ownKeys() {
      return Object.keys(ITIRAZ_NEDEN_ANAHTAR);
    },
    getOwnPropertyDescriptor(_t, code) {
      if (typeof code === 'string' && code in ITIRAZ_NEDEN_ANAHTAR) {
        return { enumerable: true, configurable: true };
      }
      return undefined;
    },
  },
);

export function ItirazNedenEtiket(code: string): string {
  return ITIRAZ_NEDEN_ETIKET[code as SatinAlmaItirazNeden] ?? code;
}

export function ItirazDurumEtiket(status: string): string {
  switch (status) {
    case 'pending':
      return i18n.t('satinAlma.incelemede') as string;
    case 'approved':
      return i18n.t('satinAlma.itirazOnaylandi') as string;
    case 'rejected':
      return i18n.t('satinAlma.itirazReddedildi') as string;
    default:
      return status;
  }
}
