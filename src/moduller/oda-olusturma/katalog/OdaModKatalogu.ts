import { Ionicons } from '@expo/vector-icons';
import type { Room } from '../../../types/models';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import i18n from '../../../i18n';

export type OdaModTanim = {
  kod: Room['mode'];
  ad: string;
  alt: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
};

type OdaModSabit = Omit<OdaModTanim, 'ad' | 'alt'> & {
  adKey: 'modlar.flort' | 'modlar.parti' | 'modlar.karaoke' | 'modlar.oyun';
  altKey:
    | 'modlar.flortAlt'
    | 'modlar.partiAlt'
    | 'modlar.karaokeAlt'
    | 'modlar.oyunAlt';
};

const ODA_MOD_SABITLERI: OdaModSabit[] = [
  {
    kod: 'dating',
    adKey: 'modlar.flort',
    altKey: 'modlar.flortAlt',
    icon: 'heart',
    tint: RenkTokenlari.primary,
  },
  {
    kod: 'party',
    adKey: 'modlar.parti',
    altKey: 'modlar.partiAlt',
    icon: 'sparkles',
    tint: RenkTokenlari.magenta,
  },
  {
    kod: 'karaoke',
    adKey: 'modlar.karaoke',
    altKey: 'modlar.karaokeAlt',
    icon: 'mic',
    tint: RenkTokenlari.violet,
  },
  {
    kod: 'game',
    adKey: 'modlar.oyun',
    altKey: 'modlar.oyunAlt',
    icon: 'game-controller',
    tint: RenkTokenlari.mint,
  },
];

function modCevir(s: OdaModSabit): OdaModTanim {
  return {
    kod: s.kod,
    ad: i18n.t(s.adKey),
    alt: i18n.t(s.altKey),
    icon: s.icon,
    tint: s.tint,
  };
}

/** Canlı dilde oda modları (her okumada çevrilir) */
export function OdaModlariAl(): OdaModTanim[] {
  return ODA_MOD_SABITLERI.map(modCevir);
}

/** Geriye dönük — her okumada canlı dil */
export const ODA_MODLARI: OdaModTanim[] = new Proxy([] as OdaModTanim[], {
  get(_t, prop, receiver) {
    const live = OdaModlariAl();
    if (prop === 'length') return live.length;
    if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return live[Number(prop)];
    }
    const v = Reflect.get(live, prop, receiver);
    return typeof v === 'function' ? v.bind(live) : v;
  },
  ownKeys() {
    return Reflect.ownKeys(OdaModlariAl());
  },
  getOwnPropertyDescriptor(_t, prop) {
    const live = OdaModlariAl();
    const desc = Reflect.getOwnPropertyDescriptor(live, prop);
    if (desc) desc.configurable = true;
    return desc;
  },
});

export function OdaModunuCoz(kod: Room['mode']): OdaModTanim {
  const sabit =
    ODA_MOD_SABITLERI.find((m) => m.kod === kod) ?? ODA_MOD_SABITLERI[0];
  return modCevir(sabit);
}
