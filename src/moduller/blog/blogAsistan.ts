import { supabase } from '../../lib/supabase';
import { OrtamDegiskenleri } from '../../yapilandirma/OrtamDegiskenleri';

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

export type BlogAkimYazi = { baslik: string; html: string; ozet: string };

export async function blogAsistanAkim(
  girdi: {
    mod: 'doldur' | 'oner' | 'gorsel';
    alan?: string;
    istek?: string;
    taslak: BlogAsistanGirdi;
  },
  onYazi: (yazi: BlogAkimYazi) => void,
): Promise<Ortak> {
  const { data: oturum } = await supabase.auth.getSession();
  const token = oturum.session?.access_token;
  const adres = OrtamDegiskenleri.supabaseUrl;
  if (!token || !adres) return blogAsistanDoldur(girdi);
  const res = await fetch(`${adres}/functions/v1/blog-asistan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: OrtamDegiskenleri.supabaseAnonAnahtari,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mod: girdi.mod,
      alan: girdi.alan,
      istek: girdi.istek,
      taslak: girdi.taslak,
      akim: girdi.mod === 'doldur',
    }),
  });
  if (res.status === 401 || res.status === 403) return { ok: false, code: 'FORBIDDEN' };
  if (!res.ok || !res.body || typeof res.body.getReader !== 'function') return blogAsistanDoldur(girdi);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let sonuc: Ortak = { ok: false, code: 'EMPTY_RESPONSE' };
  while (true) {
    const parca = await reader.read();
    if (parca.done) break;
    buf += decoder.decode(parca.value, { stream: true });
    const bloklar = buf.split('\n\n');
    buf = bloklar.pop() ?? '';
    for (const blok of bloklar) {
      const satir = blok.split('\n').find((s) => s.startsWith('data:'));
      if (!satir) continue;
      let olay: {
        tur?: string;
        baslik?: string;
        html?: string;
        ozet?: string;
        code?: string;
        taslak?: BlogAsistanTaslak | null;
        oneriler?: BlogAsistanOneri;
        gorseller?: BlogGorselAday[];
      };
      try {
        olay = JSON.parse(satir.slice(5).trim()) as typeof olay;
      } catch {
        continue;
      }
      if (olay.tur === 'sifirla') onYazi({ baslik: '', html: '', ozet: '' });
      if (olay.tur === 'yazi') onYazi({ baslik: olay.baslik ?? '', html: olay.html ?? '', ozet: olay.ozet ?? '' });
      if (olay.tur === 'hata') sonuc = { ok: false, code: olay.code };
      if (olay.tur === 'bitti') {
        sonuc = {
          ok: true,
          taslak: olay.taslak ?? null,
          oneriler: olay.oneriler ?? bosOneri(),
          gorseller: Array.isArray(olay.gorseller) ? olay.gorseller : [],
        };
      }
    }
  }
  return sonuc;
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
