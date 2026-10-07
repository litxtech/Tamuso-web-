/**
 * Hamburger menü — tek kaynak katalog (ikon, i18n, href, flag).
 * Sıra / gizleme remote `hamburger_menu_items` ile gelir.
 */
import type { Ionicons } from '@expo/vector-icons';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';
import type { OzellikBayragiAnahtari } from '../../ozellik-bayraklari/OzellikBayragiAnahtarlari';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';

export type HamburgerGrupId =
  | 'yayin'
  | 'kesfet'
  | 'hesap'
  | 'yardim'
  | 'yonetim';

export type HamburgerKatalogOgesi = {
  itemKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  baslikKey: CeviriAnahtari;
  altKey: CeviriAnahtari;
  href: string;
  defaultGroup: HamburgerGrupId;
  defaultSort: number;
  featureFlag?: OzellikBayragiAnahtari;
  /** Yalnızca admin kullanıcılara */
  adminOnly?: boolean;
};

export const HAMBURGER_MENU_KATALOGU: readonly HamburgerKatalogOgesi[] = [
  {
    itemKey: 'blog',
    icon: 'reader-outline',
    tint: RenkTokenlari.accent,
    baslikKey: 'anaSayfa.menuBlog',
    altKey: 'anaSayfa.menuBlogAlt',
    href: 'https://www.tamuso.com/blog',
    defaultGroup: 'kesfet',
    defaultSort: 15,
  },
  {
    itemKey: 'live',
    icon: 'videocam-outline',
    tint: RenkTokenlari.live,
    baslikKey: 'anaSayfa.menuCanliYayin',
    altKey: 'anaSayfa.menuCanliYayinAlt',
    href: '/canli',
    defaultGroup: 'yayin',
    defaultSort: 10,
    featureFlag: 'live_enabled',
  },
  {
    itemKey: 'pk',
    icon: 'flash-outline',
    tint: RenkTokenlari.accent,
    baslikKey: 'pk.baslik',
    altKey: 'anaSayfa.menuPkAlt',
    href: '/pk',
    defaultGroup: 'yayin',
    defaultSort: 20,
    featureFlag: 'pk_enabled',
  },
  {
    itemKey: 'agency_manage',
    icon: 'briefcase-outline',
    tint: RenkTokenlari.magenta,
    baslikKey: 'ajans.ajansim',
    altKey: 'anaSayfa.menuAjansimAlt',
    href: '/ajans/yonetim',
    defaultGroup: 'hesap',
    defaultSort: 30,
    featureFlag: 'agency_enabled',
  },
  {
    itemKey: 'announcements',
    icon: 'megaphone-outline',
    tint: RenkTokenlari.accent,
    baslikKey: 'anaSayfa.menuDuyurular',
    altKey: 'anaSayfa.menuDuyurularAlt',
    href: '/duyuru',
    defaultGroup: 'hesap',
    defaultSort: 25,
  },
  {
    itemKey: 'host',
    icon: 'mic-outline',
    tint: RenkTokenlari.mint,
    baslikKey: 'anaSayfa.menuHostOl',
    altKey: 'anaSayfa.menuHostOlAlt',
    href: '/host',
    defaultGroup: 'hesap',
    defaultSort: 40,
  },
  {
    itemKey: 'ranks',
    icon: 'trophy-outline',
    tint: RenkTokenlari.violet,
    baslikKey: 'anaSayfa.menuSiralama',
    altKey: 'anaSayfa.menuSiralamaAlt',
    href: '/siralamalar',
    defaultGroup: 'kesfet',
    defaultSort: 50,
  },
  {
    itemKey: 'ulke_ligi',
    icon: 'globe-outline',
    tint: RenkTokenlari.magenta,
    baslikKey: 'ulkeLigi.baslik',
    altKey: 'ulkeLigi.altBaslik',
    href: '/ulke',
    defaultGroup: 'kesfet',
    defaultSort: 60,
    featureFlag: 'country_league_enabled',
  },
  {
    itemKey: 'city_league',
    icon: 'trophy-outline',
    tint: RenkTokenlari.accent,
    baslikKey: 'anaSayfa.bolumCityLeague',
    altKey: 'anaSayfa.bolumCityLeagueAlt',
    href: '/sehir/lig',
    defaultGroup: 'kesfet',
    defaultSort: 70,
    featureFlag: 'city_league_enabled',
  },
  {
    itemKey: 'official_city_rooms',
    icon: 'business-outline',
    tint: RenkTokenlari.primarySoft,
    baslikKey: 'anaSayfa.bolumOfficialCity',
    altKey: 'anaSayfa.bolumOfficialCityAlt',
    href: '/sehir',
    defaultGroup: 'kesfet',
    defaultSort: 80,
    featureFlag: 'city_league_enabled',
  },
  {
    itemKey: 'events',
    icon: 'calendar-outline',
    tint: RenkTokenlari.magenta,
    baslikKey: 'anaSayfa.bolumEvents',
    altKey: 'anaSayfa.bolumEventsAlt',
    href: '/platform',
    defaultGroup: 'kesfet',
    defaultSort: 90,
    featureFlag: 'events_enabled',
  },
  {
    itemKey: 'creators_for_you',
    icon: 'star-outline',
    tint: RenkTokenlari.mint,
    baslikKey: 'anaSayfa.bolumCreatorsForYou',
    altKey: 'anaSayfa.bolumCreatorsForYouAlt',
    href: '/kesfet',
    defaultGroup: 'kesfet',
    defaultSort: 100,
  },
  {
    itemKey: 'ai_muzik',
    icon: 'sparkles-outline',
    tint: RenkTokenlari.primarySoft,
    baslikKey: 'anaSayfa.menuAiMuzik',
    altKey: 'anaSayfa.menuAiMuzikAlt',
    href: '/ai-muzik',
    defaultGroup: 'kesfet',
    defaultSort: 110,
    featureFlag: 'ai_music_enabled',
  },
  {
    itemKey: 'studio',
    icon: 'sparkles-outline',
    tint: RenkTokenlari.primarySoft,
    baslikKey: 'studio.menuBaslik',
    altKey: 'studio.menuAlt',
    href: '/studio',
    defaultGroup: 'kesfet',
    defaultSort: 115,
    featureFlag: 'studio_menu_visible',
  },
  {
    itemKey: 'fruit_wheel',
    icon: 'aperture-outline',
    tint: '#E6CE92',
    baslikKey: 'oyun.fwTitle',
    altKey: 'oyun.fwBody',
    href: '/oyun/fruit-wheel',
    defaultGroup: 'kesfet',
    defaultSort: 117,
    featureFlag: 'fruit_wheel_enabled',
  },
  {
    itemKey: 'sis_spin',
    icon: 'aperture-outline',
    tint: '#ffd700',
    baslikKey: 'anaSayfa.menuSisSpin',
    altKey: 'anaSayfa.menuSisSpinAlt',
    href: '/oyun/sis-spin',
    defaultGroup: 'kesfet',
    defaultSort: 116,
  },
  {
    itemKey: 'kisiler',
    icon: 'people-outline',
    tint: RenkTokenlari.magenta,
    baslikKey: 'kisiler.baslik',
    altKey: 'anaSayfa.menuKisilerAlt',
    href: '/kisiler',
    defaultGroup: 'kesfet',
    defaultSort: 120,
    featureFlag: 'people_discovery_enabled',
  },
  {
    itemKey: 'asistan',
    icon: 'sparkles-outline',
    tint: RenkTokenlari.violet,
    baslikKey: 'aiAsistan.baslik',
    altKey: 'aiAsistan.menuAlt',
    href: '/asistan',
    defaultGroup: 'yardim',
    defaultSort: 125,
    featureFlag: 'ai_assistant_enabled',
  },
  {
    itemKey: 'fikir',
    icon: 'bulb-outline',
    tint: RenkTokenlari.accent,
    baslikKey: 'anaSayfa.menuFikir',
    altKey: 'anaSayfa.menuFikirAlt',
    href: '/fikirler',
    defaultGroup: 'yardim',
    defaultSort: 130,
  },
  {
    itemKey: 'destek',
    icon: 'headset-outline',
    tint: RenkTokenlari.primarySoft,
    baslikKey: 'ayarlar.canliDestek',
    altKey: 'anaSayfa.menuDestekAlt',
    href: '/destek',
    defaultGroup: 'yardim',
    defaultSort: 140,
  },
  {
    itemKey: 'bildir',
    icon: 'flag-outline',
    tint: RenkTokenlari.danger,
    baslikKey: 'bildir.baslik',
    altKey: 'anaSayfa.menuBildirAlt',
    href: '/bildir',
    defaultGroup: 'yardim',
    defaultSort: 150,
  },
  {
    itemKey: 'admin_oyun_test',
    icon: 'flask-outline',
    tint: RenkTokenlari.violet,
    baslikKey: 'anaSayfa.menuOyunTesti',
    altKey: 'anaSayfa.menuOyunTestiAlt',
    href: '/admin/oyun-test',
    defaultGroup: 'yonetim',
    defaultSort: 160,
    adminOnly: true,
  },
  {
    itemKey: 'admin_panel',
    icon: 'shield-checkmark-outline',
    tint: RenkTokenlari.accent,
    baslikKey: 'anaSayfa.menuAdminPanel',
    altKey: 'anaSayfa.menuAdminPanelAlt',
    href: '/admin',
    defaultGroup: 'yonetim',
    defaultSort: 170,
    adminOnly: true,
  },
] as const;

export function HamburgerKatalogMap(): Map<string, HamburgerKatalogOgesi> {
  return new Map(HAMBURGER_MENU_KATALOGU.map((o) => [o.itemKey, o]));
}
