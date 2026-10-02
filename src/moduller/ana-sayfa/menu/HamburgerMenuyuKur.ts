import type { TFunction } from 'i18next';
import type { AnaSayfaMenuOgesi } from '../bilesenler/HamburgerMenuGrubu';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import {
  HAMBURGER_MENU_KATALOGU,
  HamburgerKatalogMap,
  type HamburgerGrupId,
} from './HamburgerMenuKatalogu';
import {
  HamburgerMenuCacheOku,
  type HamburgerRemoteItem,
} from './HamburgerMenuCache';

export type HamburgerMenuKurOpsiyon = {
  t: TFunction;
  isAdmin: boolean;
  /** Ajans yönetimi href — kullanıcının ajansına göre */
  yonetimHref?: string;
  /** Admin simülasyonda gizlileri de göster */
  gizliOgeleriDahilEt?: boolean;
  /** Admin simülasyonda flag kapısını atla */
  flagKapisiniAtla?: boolean;
  remoteOverride?: HamburgerRemoteItem[];
};

export type HamburgerMenuKurulmusOge = AnaSayfaMenuOgesi & {
  groupId: HamburgerGrupId;
  sortOrder: number;
  enabled: boolean;
  featureFlag?: string;
};

/**
 * Katalog + remote merge → drawer öğeleri.
 * enabled=false / flag kapalı / adminOnly → çıkar (opsiyonlarla gevşetilebilir).
 */
export function HamburgerMenuyuKur(
  ops: HamburgerMenuKurOpsiyon,
): HamburgerMenuKurulmusOge[] {
  const remote = ops.remoteOverride ?? HamburgerMenuCacheOku();
  const katalog = HamburgerKatalogMap();
  const remoteByKey = new Map(remote.map((r) => [r.item_key, r]));

  const keys = new Set<string>([
    ...HAMBURGER_MENU_KATALOGU.map((k) => k.itemKey),
    ...remote.map((r) => r.item_key),
  ]);

  const sonuc: HamburgerMenuKurulmusOge[] = [];

  for (const key of keys) {
    const kat = katalog.get(key);
    if (!kat) continue;
    const rem = remoteByKey.get(key);
    const enabled = rem ? rem.enabled : true;
    const groupId = (rem?.group_id ?? kat.defaultGroup) as HamburgerGrupId;
    const sortOrder = rem?.sort_order ?? kat.defaultSort;

    if (!ops.gizliOgeleriDahilEt && !enabled) continue;
    if (kat.adminOnly && !ops.isAdmin) continue;
    if (
      !ops.flagKapisiniAtla &&
      kat.featureFlag &&
      !OzellikBayragiAktifMi(kat.featureFlag)
    ) {
      continue;
    }

    const href =
      key === 'agency_manage' && ops.yonetimHref
        ? ops.yonetimHref
        : kat.href;

    sonuc.push({
      key,
      baslik: String(ops.t(kat.baslikKey)),
      alt: String(ops.t(kat.altKey)),
      icon: kat.icon,
      tint: kat.tint,
      href,
      groupId,
      sortOrder,
      enabled,
      featureFlag: kat.featureFlag,
    });
  }

  sonuc.sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
  return sonuc;
}
