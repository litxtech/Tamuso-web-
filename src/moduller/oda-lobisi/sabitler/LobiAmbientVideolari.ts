/**
 * @deprecated Giriş lobisi videosu `giris-lobisi/sabitler/GirisAmbientVideolari` altında.
 * Geriye uyumluluk için tutuluyor.
 */

import i18n from '../../../i18n';

export type LobiAmbientKaynak = {
  id: string;
  kaynak: number;
  etiket: string;
};

type LobiAmbientSabit = Omit<LobiAmbientKaynak, 'etiket'> & {
  etiketKey: string;
};

const LOBI_AMBIENT_SABITLERI: LobiAmbientSabit[] = [
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

function ambientCevir(s: LobiAmbientSabit): LobiAmbientKaynak {
  return {
    id: s.id,
    kaynak: s.kaynak,
    etiket: i18n.t(s.etiketKey) as string,
  };
}

export function LobiAmbientVideolariAl(): LobiAmbientKaynak[] {
  return LOBI_AMBIENT_SABITLERI.map(ambientCevir);
}

/** Geriye dönük — her okumada canlı dil */
export const LOBI_AMBIENT_VIDEOLARI: LobiAmbientKaynak[] = new Proxy(
  [] as LobiAmbientKaynak[],
  {
    get(_t, prop, receiver) {
      const live = LobiAmbientVideolariAl();
      if (prop === 'length') return live.length;
      if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return live[Number(prop)];
      }
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      return Reflect.ownKeys(LobiAmbientVideolariAl());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = LobiAmbientVideolariAl();
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
  },
);
