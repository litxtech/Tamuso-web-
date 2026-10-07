import type { TanitimMetin } from './tanitimMetin';

export type WebSayfaGrup = 'urun' | 'kurum';

/** Yeni pazarlama sayfası: buraya bir satır. Footer ve gezinti aynı kaynaktan okur. */
export type WebSayfa = {
  href: string;
  etiket: keyof TanitimMetin;
  grup: WebSayfaGrup;
};

export const WEB_SAYFALARI: WebSayfa[] = [
  { href: '/', etiket: 'navAnasayfa', grup: 'urun' },
  { href: '/blog', etiket: 'navBlog', grup: 'urun' },
  { href: '/tanitim/ozellikler', etiket: 'navOzellik', grup: 'urun' },
  { href: '/tanitim/coinler', etiket: 'navCoin', grup: 'urun' },
  { href: '/tanitim/meyve', etiket: 'navMeyve', grup: 'urun' },
  { href: '/tanitim/hakkinda', etiket: 'navHakkinda', grup: 'kurum' },
  { href: '/tanitim/yatirim', etiket: 'navYatirim', grup: 'kurum' },
  { href: '/tanitim/isbirligi', etiket: 'navIsbirligi', grup: 'kurum' },
  { href: '/destek', etiket: 'navDestek', grup: 'kurum' },
];

export const VARSAYILAN_ADRES = '15442 VENTURA BLVD STE 201-183, USA';
