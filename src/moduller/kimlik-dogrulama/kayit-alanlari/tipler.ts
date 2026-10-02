import i18n from '../../../i18n';

export type KayitAlanModu = 'required' | 'optional' | 'hidden';

export type YerlesikKayitAlani =
  | 'phone'
  | 'gender'
  | 'birth_date'
  | 'email'
  | 'avatar';

export type KayitOzelAlanTuru = 'text' | 'select' | 'number';

export type KayitOzelAlan = {
  id: string;
  anahtar: string;
  etiket: string;
  alan_turu: KayitOzelAlanTuru;
  secenekler: string[];
  mod: 'required' | 'optional';
  sira: number;
  aktif?: boolean;
  created_at?: string;
};

export type KayitAlanAyarlari = {
  alanlar: Record<YerlesikKayitAlani, KayitAlanModu>;
  ozel_alanlar: KayitOzelAlan[];
  updated_at?: string;
};

const YERLESIK_ETIKET_ANAHTAR: Record<
  YerlesikKayitAlani,
  | 'kayitAlan.phone'
  | 'kayitAlan.gender'
  | 'kayitAlan.birth_date'
  | 'kayitAlan.email'
  | 'kayitAlan.avatar'
> = {
  phone: 'kayitAlan.phone',
  gender: 'kayitAlan.gender',
  birth_date: 'kayitAlan.birth_date',
  email: 'kayitAlan.email',
  avatar: 'kayitAlan.avatar',
};

/** Canlı dilde yerleşik alan etiketleri */
export function YerlesikKayitAlanEtiketi(alan: YerlesikKayitAlani): string {
  return i18n.t(YERLESIK_ETIKET_ANAHTAR[alan]);
}

/** @deprecated Prefer YerlesikKayitAlanEtiketi() for live locale */
export const YERLESIK_KAYIT_ALAN_ETIKETLERI: Record<
  YerlesikKayitAlani,
  string
> = new Proxy({} as Record<YerlesikKayitAlani, string>, {
  get(_t, prop: string) {
    if (prop in YERLESIK_ETIKET_ANAHTAR) {
      return YerlesikKayitAlanEtiketi(prop as YerlesikKayitAlani);
    }
    return undefined;
  },
  ownKeys() {
    return Object.keys(YERLESIK_ETIKET_ANAHTAR);
  },
  getOwnPropertyDescriptor(_t, prop) {
    if (prop in YERLESIK_ETIKET_ANAHTAR) {
      return {
        enumerable: true,
        configurable: true,
        value: YerlesikKayitAlanEtiketi(prop as YerlesikKayitAlani),
      };
    }
    return undefined;
  },
});

export const VARSAYILAN_KAYIT_ALANLARI: Record<
  YerlesikKayitAlani,
  KayitAlanModu
> = {
  phone: 'optional',
  gender: 'optional',
  birth_date: 'optional',
  email: 'optional',
  avatar: 'optional',
};

export const VARSAYILAN_KAYIT_ALAN_AYARLARI: KayitAlanAyarlari = {
  alanlar: { ...VARSAYILAN_KAYIT_ALANLARI },
  ozel_alanlar: [],
};

export function KayitAlanModuEtiketi(mod: KayitAlanModu): string {
  if (mod === 'required') return i18n.t('kayitAlan.zorunlu');
  if (mod === 'hidden') return i18n.t('kayitAlan.gizli');
  return i18n.t('kayitAlan.istegeBagli');
}

export function AlanGorunurMu(mod: KayitAlanModu): boolean {
  return mod !== 'hidden';
}

export function AlanZorunluMu(mod: KayitAlanModu): boolean {
  return mod === 'required';
}
