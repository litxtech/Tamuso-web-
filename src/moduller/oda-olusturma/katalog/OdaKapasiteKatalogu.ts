import i18n from '../../../i18n';

export type OdaKapasiteTanim = {
  kod: string;
  ad: string;
  alt: string;
  dinleyici: number;
  mikrofon: number;
};

type OdaKapasiteSabit = Omit<OdaKapasiteTanim, 'ad' | 'alt'> & {
  adKey:
    | 'odaKapasite.mini'
    | 'odaKapasite.social'
    | 'odaKapasite.community'
    | 'odaKapasite.stage'
    | 'odaKapasite.event';
  altKey:
    | 'odaKapasite.miniAlt'
    | 'odaKapasite.socialAlt'
    | 'odaKapasite.communityAlt'
    | 'odaKapasite.stageAlt'
    | 'odaKapasite.eventAlt';
};

const ODA_KAPASITE_SABITLERI: OdaKapasiteSabit[] = [
  {
    kod: 'mini',
    adKey: 'odaKapasite.mini',
    altKey: 'odaKapasite.miniAlt',
    dinleyici: 50,
    mikrofon: 6,
  },
  {
    kod: 'social',
    adKey: 'odaKapasite.social',
    altKey: 'odaKapasite.socialAlt',
    dinleyici: 250,
    mikrofon: 10,
  },
  {
    kod: 'community',
    adKey: 'odaKapasite.community',
    altKey: 'odaKapasite.communityAlt',
    dinleyici: 1000,
    mikrofon: 12,
  },
  {
    kod: 'stage',
    adKey: 'odaKapasite.stage',
    altKey: 'odaKapasite.stageAlt',
    dinleyici: 5000,
    mikrofon: 16,
  },
  {
    kod: 'event',
    adKey: 'odaKapasite.event',
    altKey: 'odaKapasite.eventAlt',
    dinleyici: 10000,
    mikrofon: 20,
  },
];

function kapasiteCevir(s: OdaKapasiteSabit): OdaKapasiteTanim {
  return {
    kod: s.kod,
    ad: i18n.t(s.adKey),
    alt: i18n.t(s.altKey),
    dinleyici: s.dinleyici,
    mikrofon: s.mikrofon,
  };
}

/** Canlı dilde kapasite katmanları */
export function OdaKapasiteleriniAl(): OdaKapasiteTanim[] {
  return ODA_KAPASITE_SABITLERI.map(kapasiteCevir);
}

/** Kapasite katmanları — DB kodlarıyla uyumlu (her okumada canlı dil) */
export const ODA_KAPASITELER: OdaKapasiteTanim[] = new Proxy(
  [] as OdaKapasiteTanim[],
  {
    get(_t, prop, receiver) {
      const live = OdaKapasiteleriniAl();
      if (prop === 'length') return live.length;
      if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return live[Number(prop)];
      }
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      return Reflect.ownKeys(OdaKapasiteleriniAl());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = OdaKapasiteleriniAl();
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
  },
);

export function OdaKapasitesiniCoz(kod?: string | null): OdaKapasiteTanim {
  const sabit =
    ODA_KAPASITE_SABITLERI.find((k) => k.kod === kod) ?? ODA_KAPASITE_SABITLERI[1];
  return kapasiteCevir(sabit);
}
