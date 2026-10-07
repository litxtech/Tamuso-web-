/** Pazarlama sitesi footer ve blog kısaltma metinleri. */
const SOZLUK = {
  tr: {
    dahaFazla: 'Daha fazla oku',
    dahaAz: 'Daha az göster',
    sayfalar: 'Sayfalar',
    yazilar: 'Yazılar',
    iletisim: 'İletişim',
    yasal: 'Yasal',
    sosyal: 'Sosyal',
  },
  en: {
    dahaFazla: 'Read more',
    dahaAz: 'Show less',
    sayfalar: 'Pages',
    yazilar: 'Articles',
    iletisim: 'Contact',
    yasal: 'Legal',
    sosyal: 'Social',
  },
  es: {
    dahaFazla: 'Leer más',
    dahaAz: 'Mostrar menos',
    sayfalar: 'Páginas',
    yazilar: 'Artículos',
    iletisim: 'Contacto',
    yasal: 'Legal',
    sosyal: 'Social',
  },
  pt: {
    dahaFazla: 'Ler mais',
    dahaAz: 'Mostrar menos',
    sayfalar: 'Páginas',
    yazilar: 'Artigos',
    iletisim: 'Contato',
    yasal: 'Legal',
    sosyal: 'Social',
  },
  ar: {
    dahaFazla: 'اقرأ المزيد',
    dahaAz: 'عرض أقل',
    sayfalar: 'الصفحات',
    yazilar: 'المقالات',
    iletisim: 'تواصل',
    yasal: 'قانوني',
    sosyal: 'التواصل',
  },
  fr: {
    dahaFazla: 'Lire la suite',
    dahaAz: 'Réduire',
    sayfalar: 'Pages',
    yazilar: 'Articles',
    iletisim: 'Contact',
    yasal: 'Mentions',
    sosyal: 'Social',
  },
  fil: {
    dahaFazla: 'Magbasa pa',
    dahaAz: 'Ipakita nang mas kaunti',
    sayfalar: 'Mga pahina',
    yazilar: 'Mga artikulo',
    iletisim: 'Kontak',
    yasal: 'Legal',
    sosyal: 'Social',
  },
} as const;

export type SiteMetin = (typeof SOZLUK)['tr'];

export function siteMetin(dil: string): SiteMetin {
  const kod = dil.toLowerCase().split('-')[0] as keyof typeof SOZLUK;
  return SOZLUK[kod] ?? SOZLUK.en;
}
