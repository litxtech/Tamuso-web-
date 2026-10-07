import { supabase } from '../../lib/supabase';

export type BlogAsistanTaslak = {
  title: string | null;
  excerpt: string | null;
  content_html: string | null;
  seo_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  keywords: string | null;
  focus_topic: string | null;
  search_intent: string | null;
  cover_alt: string | null;
  slug: string | null;
  etiketler: string[];
  faqs: { question: string; answer: string }[];
};

export type BlogAsistanOneri = {
  etiketler: string[];
  sehir_adlari: string[];
  baliklar: string[];
};

export type BlogGorselAday = { url: string; alt: string; credit: string };

export type BlogAsistanGirdi = {
  title?: string;
  excerpt?: string;
  content_html?: string;
  seo_title?: string;
  meta_description?: string;
  keywords?: string;
  focus_topic?: string;
  sehirler?: string[];
  etiketler?: string[];
};

type Ortak =
  | {
      ok: true;
      taslak: BlogAsistanTaslak | null;
      oneriler: BlogAsistanOneri;
      gorseller: BlogGorselAday[];
    }
  | { ok: false; code?: string };

function bosOneri(): BlogAsistanOneri {
  return { etiketler: [], sehir_adlari: [], baliklar: [] };
}

export async function blogAsistanDoldur(girdi: {
  mod: 'doldur' | 'oner' | 'gorsel';
  alan?: string;
  istek?: string;
  taslak: BlogAsistanGirdi;
}): Promise<Ortak> {
  const { data, error } = await supabase.functions.invoke('blog-asistan', {
    body: {
      mod: girdi.mod,
      alan: girdi.alan,
      istek: girdi.istek,
      taslak: girdi.taslak,
    },
  });
  if (error || !data?.ok) return { ok: false, code: data?.code ?? error?.message };
  return {
    ok: true,
    taslak: (data.taslak as BlogAsistanTaslak | null) ?? null,
    oneriler: (data.oneriler as BlogAsistanOneri) ?? bosOneri(),
    gorseller: Array.isArray(data.gorseller) ? (data.gorseller as BlogGorselAday[]) : [],
  };
}

export async function blogAsistanCevir(girdi: {
  dil: string;
  istek?: string;
  taslak: BlogAsistanGirdi;
}): Promise<{ ok: true; ceviri: BlogAsistanTaslak } | { ok: false; code?: string }> {
  const { data, error } = await supabase.functions.invoke('blog-asistan', {
    body: { mod: 'cevir', dil: girdi.dil, istek: girdi.istek, taslak: girdi.taslak },
  });
  if (error || !data?.ok || !data.ceviri) return { ok: false, code: data?.code ?? error?.message };
  return { ok: true, ceviri: data.ceviri as BlogAsistanTaslak };
}
