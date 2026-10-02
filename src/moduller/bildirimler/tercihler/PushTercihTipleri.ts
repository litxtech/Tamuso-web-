import i18n from '../../../i18n';

export type PushTercihleri = {
  user_id: string;
  all_enabled: boolean;
  messages: boolean;
  gifts: boolean;
  live: boolean;
  rooms: boolean;
  social: boolean;
  wallet: boolean;
  system: boolean;
  calls: boolean;
  agency: boolean;
  updated_at: string;
};

export type BildirimAnahtari = {
  kod: string;
  grup: string;
  baslik: string;
  aciklama: string;
  acik: boolean;
  sira: number;
};

export type PushTercihAnahtari =
  | 'all_enabled'
  | 'messages'
  | 'calls'
  | 'gifts'
  | 'live'
  | 'rooms'
  | 'social'
  | 'wallet'
  | 'agency'
  | 'system';

export const PUSH_TERCIH_KATALOGU: {
  key: PushTercihAnahtari;
  readonly baslik: string;
  readonly alt: string;
}[] = [
  {
    key: 'all_enabled',
    get baslik() {
      return i18n.t('bildirimAyar.tumu');
    },
    get alt() {
      return i18n.t('bildirimAyar.tumuAlt');
    },
  },
  {
    key: 'messages',
    get baslik() {
      return i18n.t('bildirimAyar.mesajlar');
    },
    get alt() {
      return i18n.t('bildirimAyar.mesajlarAlt');
    },
  },
  {
    key: 'calls',
    get baslik() {
      return i18n.t('bildirimAyar.aramalar');
    },
    get alt() {
      return i18n.t('bildirimAyar.aramalarAlt');
    },
  },
  {
    key: 'gifts',
    get baslik() {
      return i18n.t('bildirimAyar.hediyeler');
    },
    get alt() {
      return i18n.t('bildirimAyar.hediyelerAlt');
    },
  },
  {
    key: 'live',
    get baslik() {
      return i18n.t('bildirimAyar.canli');
    },
    get alt() {
      return i18n.t('bildirimAyar.canliAlt');
    },
  },
  {
    key: 'rooms',
    get baslik() {
      return i18n.t('bildirimAyar.odalar');
    },
    get alt() {
      return i18n.t('bildirimAyar.odalarAlt');
    },
  },
  {
    key: 'social',
    get baslik() {
      return i18n.t('bildirimAyar.sosyal');
    },
    get alt() {
      return i18n.t('bildirimAyar.sosyalAlt');
    },
  },
  {
    key: 'wallet',
    get baslik() {
      return i18n.t('bildirimAyar.cuzdan');
    },
    get alt() {
      return i18n.t('bildirimAyar.cuzdanAlt');
    },
  },
  {
    key: 'agency',
    get baslik() {
      return i18n.t('bildirimAyar.ajans');
    },
    get alt() {
      return i18n.t('bildirimAyar.ajansAlt');
    },
  },
  {
    key: 'system',
    get baslik() {
      return i18n.t('bildirimAyar.sistem');
    },
    get alt() {
      return i18n.t('bildirimAyar.sistemAlt');
    },
  },
];
