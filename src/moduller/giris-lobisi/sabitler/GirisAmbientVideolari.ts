/**
 * Giriş lobisi ambient video — gerçek insan stok klipleri (Mixkit Free License).
 * Auth giriş ekranında arka planda sessiz döngü.
 */

import i18n from '../../../i18n';

export type GirisAmbientKaynak = {
  id: string;
  kaynak: number;
  etiket: string;
};

type GirisAmbientSabit = Omit<GirisAmbientKaynak, 'etiket'> & {
  etiketKey: string;
};

const GIRIS_AMBIENT_SABITLERI: GirisAmbientSabit[] = [
  {
    id: 'cafe-ikili',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kaynak: require('../../../../assets/videos/lobi/cafe-ikili.mp4'),
    etiketKey: 'lobi.ambientCafeIkili',
  },
  {
    id: 'cafe-sohbet',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kaynak: require('../../../../assets/videos/lobi/cafe-sohbet.mp4'),
    etiketKey: 'lobi.ambientCafeSohbet',
  },
  {
    id: 'cafe-gulme',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kaynak: require('../../../../assets/videos/lobi/cafe-gulme.mp4'),
    etiketKey: 'lobi.ambientCafeGulme',
  },
];

function ambientCevir(s: GirisAmbientSabit): GirisAmbientKaynak {
  return {
    id: s.id,
    kaynak: s.kaynak,
    etiket: i18n.t(s.etiketKey) as string,
  };
}

export function GirisAmbientVideolariAl(): GirisAmbientKaynak[] {
  return GIRIS_AMBIENT_SABITLERI.map(ambientCevir);
}

/** Geriye dönük — her okumada canlı dil */
export const GIRIS_AMBIENT_VIDEOLARI: GirisAmbientKaynak[] = new Proxy(
  [] as GirisAmbientKaynak[],
  {
    get(_t, prop, receiver) {
      const live = GirisAmbientVideolariAl();
      if (prop === 'length') return live.length;
      if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return live[Number(prop)];
      }
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      return Reflect.ownKeys(GirisAmbientVideolariAl());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = GirisAmbientVideolariAl();
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
  },
);
