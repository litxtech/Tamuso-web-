/** Dil, adres, hreflang ve indeks kararı. Türkçe önek almaz. */
export const ORIGIN = 'https://www.tamuso.com';

export const DIL_KAYDI = {
  tr: { locale: 'tr-TR', dir: 'ltr', ad: 'Türkçe' },
  en: { locale: 'en', dir: 'ltr', ad: 'English' },
  de: { locale: 'de', dir: 'ltr', ad: 'Deutsch' },
  es: { locale: 'es', dir: 'ltr', ad: 'Español' },
  ar: { locale: 'ar', dir: 'rtl', ad: 'العربية' },
  ru: { locale: 'ru', dir: 'ltr', ad: 'Русский' },
};

export const ARAYUZ = {
  tr: { ana: 'Ana Sayfa', blog: 'Blog', politika: 'Politikalar', gizlilik: 'Gizlilik', oku: 'Devamını oku', faq: 'Sık sorulanlar', ilgili: 'İlgili yazılar', kopya: 'Linki kopyala', bos: 'Henüz yayınlanmış yazı yok.', sehir: 'İlgili şehir', sayfa: 'İlgili sayfalar', guncelleme: 'Güncelleme', dakika: (n) => `${n} dk okuma`, oynat: 'Videoyu oynat' },
  en: { ana: 'Home', blog: 'Blog', politika: 'Policies', gizlilik: 'Privacy', oku: 'Read more', faq: 'Questions', ilgili: 'Related articles', kopya: 'Copy link', bos: 'No published articles yet.', sehir: 'Related city', sayfa: 'Related pages', guncelleme: 'Updated', dakika: (n) => `${n} min read`, oynat: 'Play video' },
  de: { ana: 'Start', blog: 'Blog', politika: 'Richtlinien', gizlilik: 'Datenschutz', oku: 'Weiterlesen', faq: 'Fragen', ilgili: 'Ähnliche Beiträge', kopya: 'Link kopieren', bos: 'Noch keine veröffentlichten Beiträge.', sehir: 'Zugehörige Stadt', sayfa: 'Zugehörige Seiten', guncelleme: 'Aktualisiert', dakika: (n) => `${n} Min. Lesezeit`, oynat: 'Video abspielen' },
  es: { ana: 'Inicio', blog: 'Blog', politika: 'Políticas', gizlilik: 'Privacidad', oku: 'Seguir leyendo', faq: 'Preguntas', ilgili: 'Artículos relacionados', kopya: 'Copiar enlace', bos: 'Todavía no hay artículos publicados.', sehir: 'Ciudad relacionada', sayfa: 'Páginas relacionadas', guncelleme: 'Actualizado', dakika: (n) => `${n} min de lectura`, oynat: 'Reproducir vídeo' },
  ar: { ana: 'الرئيسية', blog: 'المدونة', politika: 'السياسات', gizlilik: 'الخصوصية', oku: 'اقرأ المزيد', faq: 'أسئلة', ilgili: 'مقالات ذات صلة', kopya: 'نسخ الرابط', bos: 'لا توجد مقالات منشورة بعد.', sehir: 'المدينة ذات الصلة', sayfa: 'صفحات ذات صلة', guncelleme: 'تحديث', dakika: (n) => `${n} دقائق قراءة`, oynat: 'تشغيل الفيديو' },
  ru: { ana: 'Главная', blog: 'Блог', politika: 'Правила', gizlilik: 'Конфиденциальность', oku: 'Читать дальше', faq: 'Вопросы', ilgili: 'Похожие материалы', kopya: 'Копировать ссылку', bos: 'Опубликованных статей пока нет.', sehir: 'Связанный город', sayfa: 'Связанные страницы', guncelleme: 'Обновлено', dakika: (n) => `${n} мин чтения`, oynat: 'Воспроизвести видео' },
};

export const OLAY_ADLARI = ['share', 'outbound', 'cta', 'language_switch', 'related_click'];

export function blogYolu(dil, slug) {
  const kod = dil && dil !== 'tr' ? dil : 'tr';
  return kod === 'tr' ? `/blog/${slug}` : `/${kod}/blog/${slug}`;
}

export function blogKok(dil) {
  return !dil || dil === 'tr' ? '/blog' : `/${dil}/blog`;
}

export function yazarYolu(slug) {
  return `/yazar/${slug}`;
}

export function herkeseAcikMi(yazi, simdi = new Date()) {
  if (!yazi) return false;
  if (!['yayinda', 'planlandi'].includes(yazi.status)) return false;
  if (!yazi.published_at) return false;
  return new Date(yazi.published_at).getTime() <= simdi.getTime();
}

export function indexlenebilirMi(yazi, dil, simdi = new Date()) {
  if (!herkeseAcikMi(yazi, simdi)) return false;
  if (yazi.robots_index === false) return false;
  const kayit = dil || { is_active: (yazi.language_code || 'tr') === 'tr', is_publishable: true };
  if (!kayit.is_active || !kayit.is_publishable) return false;
  return true;
}

export function hreflangleri(surumler, diller = []) {
  const harita = new Map(diller.map((d) => [d.code, d]));
  const yayin = (surumler || []).filter((s) => {
    const kayit = harita.get(s.language_code) || {
      is_active: s.language_code === 'tr',
      is_publishable: s.language_code === 'tr',
    };
    return indexlenebilirMi(s, kayit);
  });
  const linkler = yayin.map((s) => ({
    hreflang: s.language_code,
    href: `${ORIGIN}${blogYolu(s.language_code, s.slug)}`,
  }));
  const xd = yayin.find((s) => s.language_code === 'tr') || yayin[0];
  if (xd) linkler.push({ hreflang: 'x-default', href: `${ORIGIN}${blogYolu(xd.language_code, xd.slug)}` });
  return linkler;
}

export function kanonikDil(dil, slug, ozel) {
  const self = `${ORIGIN}${blogYolu(dil || 'tr', slug)}`;
  const elle = String(ozel ?? '').trim();
  if (!elle) return self;
  try {
    const u = new URL(elle);
    if (u.origin !== ORIGIN) return self;
    if (u.pathname.replace(/\/$/, '') !== blogYolu(dil || 'tr', slug)) return self;
    return self;
  } catch {
    return self;
  }
}

function yonlendirmeHedefi(yol, liste, derinlik = 0) {
  if (!liste?.length || derinlik > 5) return null;
  const yon = liste.find((y) => y.old_path === yol || (y.from_slug && blogYolu('tr', y.from_slug) === yol));
  if (!yon) return null;
  const sonraki = yon.new_path || blogYolu('tr', yon.to_slug);
  if (!sonraki || sonraki === yol) return null;
  return yonlendirmeHedefi(sonraki, liste, derinlik + 1) || sonraki;
}

export function yolKarari({ dil, slug, yazilar, yonlendirmeler }) {
  const kod = dil || 'tr';
  const yol = blogYolu(kod, slug);
  const hedef = yonlendirmeHedefi(yol, yonlendirmeler);
  if (hedef && hedef !== yol) return { tip: 'yonlendir', hedef, kod: 301 };
  const yazi = (yazilar || []).find((y) => (y.language_code || 'tr') === kod && y.slug === slug);
  if (!yazi || !herkeseAcikMi(yazi)) return { tip: 'yok' };
  return { tip: 'yazi', yazi };
}

export function videolariCikar(html) {
  const bulunan = [];
  const re = /<iframe\b[^>]*\bsrc="(https:\/\/[^"]+)"[^>]*>/gi;
  let eslesme = re.exec(String(html ?? ''));
  while (eslesme) {
    const src = eslesme[1];
    if (/youtube\.com|youtube-nocookie\.com|youtu\.be/.test(src)) {
      bulunan.push({
        provider: 'youtube',
        embed_url: src.replace('www.youtube.com', 'www.youtube-nocookie.com'),
        title: 'Video',
      });
    } else if (/vimeo\.com/.test(src)) {
      bulunan.push({ provider: 'vimeo', embed_url: src, title: 'Video' });
    }
    eslesme = re.exec(String(html ?? ''));
  }
  return bulunan;
}

export function okumaDakikaDil(metin, dil) {
  const duz = String(metin ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (dil === 'ar') {
    const harf = [...duz.replace(/\s/g, '')].length;
    return Math.max(1, Math.ceil(harf / 500));
  }
  const kelime = duz.split(/\s+/).filter(Boolean).length;
  const hiz = dil === 'de' ? 160 : dil === 'ru' ? 170 : 180;
  return Math.max(1, Math.ceil(kelime / hiz) || 1);
}
