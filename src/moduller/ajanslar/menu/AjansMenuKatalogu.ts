import type { Ionicons } from '@expo/vector-icons';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';
import { AJANS_BOLUMLER } from '../bilesenler/AjansBolumRayi';
import { ajansHref } from '../kancalar/useAjansRouteId';

export type AjansMenuGrupId =
  | 'genel'
  | 'operasyon'
  | 'icerik'
  | 'satis'
  | 'finans'
  | 'yonetim';

export type AjansMenuOgesi = {
  key: string;
  labelKey: CeviriAnahtari;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  href: string;
  groupId: AjansMenuGrupId;
};

const GRUP_MAP: Record<string, AjansMenuGrupId> = {
  ozet: 'genel',
  canli: 'genel',
  uyeler: 'genel',
  analitik: 'genel',
  basvurular: 'operasyon',
  davetler: 'operasyon',
  ekipler: 'operasyon',
  gorevler: 'operasyon',
  program: 'icerik',
  etkinlikler: 'icerik',
  duyurular: 'icerik',
  'satis-linkleri': 'satis',
  'satis-takibi': 'satis',
  'en-cok-alicilar': 'satis',
  dekontlar: 'satis',
  faturalar: 'satis',
  islemler: 'finans',
  cuzdan: 'finans',
  paketler: 'finans',
  destek: 'yonetim',
  guvenlik: 'yonetim',
  dogrulama: 'yonetim',
  ayarlar: 'yonetim',
};

export const AJANS_MENU_GRUP_SIRA: AjansMenuGrupId[] = [
  'genel',
  'operasyon',
  'icerik',
  'satis',
  'finans',
  'yonetim',
];

export const AJANS_MENU_GRUP_BASLIK: Record<AjansMenuGrupId, CeviriAnahtari> = {
  genel: 'ajans.menuGrupGenel',
  operasyon: 'ajans.menuGrupOperasyon',
  icerik: 'ajans.menuGrupIcerik',
  satis: 'ajans.menuGrupSatis',
  finans: 'ajans.menuGrupFinans',
  yonetim: 'ajans.menuGrupYonetim',
};

/** Ajansım hamburger — bölüm rayı yerine gruplu menü */
export function AjansMenuOgeleriniKur(agencyId: string): AjansMenuOgesi[] {
  return AJANS_BOLUMLER.map((b) => ({
    key: b.key,
    labelKey: b.labelKey,
    icon: b.icon,
    path: b.path,
    href: ajansHref(agencyId, b.path),
    groupId: GRUP_MAP[b.key] ?? 'genel',
  }));
}

export function AjansMenuGruplarinaBol(ogeler: AjansMenuOgesi[]) {
  return AJANS_MENU_GRUP_SIRA.map((id) => ({
    id,
    ogeler: ogeler.filter((o) => o.groupId === id),
  })).filter((g) => g.ogeler.length > 0);
}
