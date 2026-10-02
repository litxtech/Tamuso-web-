/**
 * Rebuild PolitikaMetinleri.ts with i18n for baslik/kisa/kabulMetni.
 * community_rules.govde → i18n; long bodies stay as TR constants.
 */
import fs from 'fs';

const src = fs.readFileSync(
  'src/moduller/politikalar/icerik/PolitikaMetinleri.ts',
  'utf8',
);

function extractGovde(kod) {
  const marker = `\n  ${kod}: {`;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('missing ' + kod);
  const govdeIdx = src.indexOf('govde: `', start);
  if (govdeIdx < 0) throw new Error('no govde ' + kod);
  const bodyStart = govdeIdx + 'govde: `'.length;
  let i = bodyStart;
  let esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\') {
      esc = true;
      continue;
    }
    if (c === '`') break;
  }
  return src.slice(bodyStart, i);
}

const tos = extractGovde('tos');
const privacy = extractGovde('privacy');
const child = extractGovde('child_safety');

const out = `/**
 * Yerel yasal metinler — kayıt / lobi / okuma ekranı.
 * DB policy_versions ile senkron (migration 039 + 072).
 * baslik / kisa / onayEtiketi (kabulMetni) → i18n; uzun gövdeler TR sabit.
 */

import i18n from '../../../i18n';

export type PolitikaKodu = 'tos' | 'privacy' | 'child_safety' | 'community_rules';

export type PolitikaTanimi = {
  kod: PolitikaKodu;
  baslik: string;
  kisa: string;
  /** Kayıt kutucuğunda görünen kısa etiket */
  onayEtiketi: string;
  govde: string;
};

const GOVDE_TOS = \`${tos}\`;

const GOVDE_PRIVACY = \`${privacy}\`;

const GOVDE_CHILD_SAFETY = \`${child}\`;

type PolitikaSabit = {
  kod: PolitikaKodu;
  baslikKey: string;
  kisaKey: string;
  kabulKey: string;
  govdeKey?: string;
  govde?: string;
};

const POLITIKA_SABITLERI: Record<PolitikaKodu, PolitikaSabit> = {
  tos: {
    kod: 'tos',
    baslikKey: 'politikalar.tosBaslik',
    kisaKey: 'politikalar.tosKisa',
    kabulKey: 'politikalar.tosKabulMetni',
    govde: GOVDE_TOS,
  },
  privacy: {
    kod: 'privacy',
    baslikKey: 'politikalar.privacyBaslik',
    kisaKey: 'politikalar.privacyKisa',
    kabulKey: 'politikalar.privacyKabulMetni',
    govde: GOVDE_PRIVACY,
  },
  child_safety: {
    kod: 'child_safety',
    baslikKey: 'politikalar.childSafetyBaslik',
    kisaKey: 'politikalar.childSafetyKisa',
    kabulKey: 'politikalar.childSafetyKabulMetni',
    govde: GOVDE_CHILD_SAFETY,
  },
  community_rules: {
    kod: 'community_rules',
    baslikKey: 'politikalar.communityBaslik',
    kisaKey: 'politikalar.communityKisa',
    kabulKey: 'politikalar.communityKabulMetni',
    govdeKey: 'politikalar.communityGovde',
  },
};

function politikaCevir(s: PolitikaSabit): PolitikaTanimi {
  return {
    kod: s.kod,
    baslik: i18n.t(s.baslikKey) as string,
    kisa: i18n.t(s.kisaKey) as string,
    onayEtiketi: i18n.t(s.kabulKey) as string,
    govde: s.govdeKey
      ? (i18n.t(s.govdeKey) as string)
      : (s.govde ?? ''),
  };
}

/** Canlı dilde politika metinleri */
export function PolitikaMetinleriAl(): Record<PolitikaKodu, PolitikaTanimi> {
  return {
    tos: politikaCevir(POLITIKA_SABITLERI.tos),
    privacy: politikaCevir(POLITIKA_SABITLERI.privacy),
    child_safety: politikaCevir(POLITIKA_SABITLERI.child_safety),
    community_rules: politikaCevir(POLITIKA_SABITLERI.community_rules),
  };
}

/** Geriye dönük — her okumada canlı dil */
export const POLITIKA_METINLERI: Record<PolitikaKodu, PolitikaTanimi> = new Proxy(
  {} as Record<PolitikaKodu, PolitikaTanimi>,
  {
    get(_t, prop, receiver) {
      if (prop === Symbol.toStringTag) return 'Object';
      if (prop === 'then') return undefined;
      const live = PolitikaMetinleriAl();
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      return Reflect.ownKeys(PolitikaMetinleriAl());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = PolitikaMetinleriAl();
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
    has(_t, prop) {
      return prop in PolitikaMetinleriAl();
    },
  },
);

export const POLITIKA_LISTESI: PolitikaTanimi[] = new Proxy(
  [] as PolitikaTanimi[],
  {
    get(_t, prop, receiver) {
      const live = [
        POLITIKA_METINLERI.tos,
        POLITIKA_METINLERI.privacy,
        POLITIKA_METINLERI.community_rules,
        POLITIKA_METINLERI.child_safety,
      ];
      if (prop === 'length') return live.length;
      if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
      if (typeof prop === 'string' && /^\\d+$/.test(prop)) {
        return live[Number(prop)];
      }
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      const live = [
        POLITIKA_METINLERI.tos,
        POLITIKA_METINLERI.privacy,
        POLITIKA_METINLERI.community_rules,
        POLITIKA_METINLERI.child_safety,
      ];
      return Reflect.ownKeys(live);
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = [
        POLITIKA_METINLERI.tos,
        POLITIKA_METINLERI.privacy,
        POLITIKA_METINLERI.community_rules,
        POLITIKA_METINLERI.child_safety,
      ];
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
  },
);

export function PolitikaKodundanGetir(kod: string): PolitikaTanimi | null {
  if (
    kod === 'tos' ||
    kod === 'privacy' ||
    kod === 'child_safety' ||
    kod === 'community_rules'
  ) {
    return politikaCevir(POLITIKA_SABITLERI[kod]);
  }
  if (kod === 'terms' || kod === 'kullanim') {
    return politikaCevir(POLITIKA_SABITLERI.tos);
  }
  if (kod === 'gizlilik') return politikaCevir(POLITIKA_SABITLERI.privacy);
  if (kod === 'topluluk' || kod === 'community' || kod === 'eula') {
    return politikaCevir(POLITIKA_SABITLERI.community_rules);
  }
  if (kod === 'cocuk' || kod === 'child' || kod === 'child-safety') {
    return politikaCevir(POLITIKA_SABITLERI.child_safety);
  }
  return null;
}
`;

fs.writeFileSync(
  'src/moduller/politikalar/icerik/PolitikaMetinleri.ts',
  out,
);
console.log('rewrote PolitikaMetinleri.ts', out.length);
