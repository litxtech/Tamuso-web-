import i18n from '../../i18n';

export type GirisLobisiMedyaTur = 'video' | 'image';

export type GirisLobisiMedya = {
  id: string;
  tur: GirisLobisiMedyaTur;
  public_url: string;
  storage_path?: string | null;
  mime_type?: string | null;
  aktif?: boolean;
  sira?: number;
  created_at?: string;
};

export type GirisLobisiAyar = {
  logo_goster: boolean;
  logo_url: string | null;
  logo_harf: string;
  marka_goster: boolean;
  marka_adi: string | null;
  slogan_goster: boolean;
  slogan: string | null;
  form_baslik: string;
  form_alt: string | null;
  ust_metin: string | null;
  /** Spotify / Twitch / X / Google / Apple giriş butonlarını gizle */
  sosyal_medya_gizle: boolean;
  /** Lobideki tüm giriş/kayıt/misafir butonlarını gizle */
  tum_butonlar_gizle: boolean;
  updated_at?: string;
};

export type GirisLobisiPublic = {
  ayar: GirisLobisiAyar;
  medya: GirisLobisiMedya[];
};

export const GIRIS_LOBISI_BUCKET = 'giris-lobisi-media';

export function VarsayilanGirisLobisiAyar(): GirisLobisiAyar {
  return {
    logo_goster: false,
    logo_url: null,
    logo_harf: 'M',
    marka_goster: false,
    marka_adi: null,
    slogan_goster: false,
    slogan: null,
    form_baslik: i18n.t('lobi.formBaslik') as string,
    form_alt: null,
    ust_metin: null,
    sosyal_medya_gizle: false,
    tum_butonlar_gizle: false,
  };
}

/** Geriye dönük — her okumada canlı dil */
export const VARSAYILAN_GIRIS_LOBISI_AYAR: GirisLobisiAyar = new Proxy(
  {} as GirisLobisiAyar,
  {
    get(_t, prop, receiver) {
      if (prop === Symbol.toStringTag) return 'Object';
      if (prop === 'then') return undefined;
      const live = VarsayilanGirisLobisiAyar();
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      return Reflect.ownKeys(VarsayilanGirisLobisiAyar());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = VarsayilanGirisLobisiAyar();
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
    has(_t, prop) {
      return prop in VarsayilanGirisLobisiAyar();
    },
  },
);
