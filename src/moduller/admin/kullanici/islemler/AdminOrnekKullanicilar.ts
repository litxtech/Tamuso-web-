import { supabase } from '../../../../lib/supabase';
import { OrtamDegiskenleri } from '../../../../yapilandirma/OrtamDegiskenleri';
import type { AdminIslemSonucu } from './AdminKullaniciIslemleri';

async function ornekFonksiyonCagir(
  action: 'seed' | 'purge' | 'status',
): Promise<AdminIslemSonucu> {
  const url = `${OrtamDegiskenleri.supabaseUrl.replace(/\/$/, '')}/functions/v1/admin-ornek-kullanicilar`;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, hata: 'Oturum yok' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: OrtamDegiskenleri.supabaseAnonAnahtari,
      },
      body: JSON.stringify({ action }),
    });
    const json = (await res.json()) as Record<string, unknown> & {
      ok?: boolean;
      error?: string;
    };
    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        hata: String(json.error ?? json.hata ?? 'İşlem başarısız'),
      };
    }
    return { ok: true, veri: json };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : 'İstek başarısız',
    };
  }
}

/** 12 kız + 12 erkek örnek profil ekler (mevcutları atlar) */
export function AdminOrnekKullaniciEkle(): Promise<AdminIslemSonucu> {
  return ornekFonksiyonCagir('seed');
}

/** Tüm örnek profilleri kalıcı siler */
export async function AdminOrnekKullaniciSil(): Promise<AdminIslemSonucu> {
  const kenar = await ornekFonksiyonCagir('purge');
  const { data, error } = await supabase.rpc('admin_ornek_kullanicilari_sil');
  if (error && !kenar.ok) {
    return { ok: false, hata: error.message };
  }
  if (error) return kenar;
  const veri = (data ?? {}) as Record<string, unknown>;
  const kenarVeri = kenar.ok ? (kenar.veri ?? {}) : {};
  return {
    ok: true,
    veri: {
      ...kenarVeri,
      ...veri,
      silinen: Number(veri.silinen ?? kenarVeri.silinen ?? 0),
    },
  };
}

export function AdminOrnekKullaniciDurum(): Promise<AdminIslemSonucu> {
  return ornekFonksiyonCagir('status');
}

export async function AdminOrnekOzetiGetir(): Promise<{
  toplam: number;
  kiz: number;
  erkek: number;
}> {
  const { data, error } = await supabase.rpc('admin_ornek_kullanici_ozeti');
  if (error) return { toplam: 0, kiz: 0, erkek: 0 };
  const row = data as { toplam?: number; kiz?: number; erkek?: number };
  return {
    toplam: Number(row?.toplam) || 0,
    kiz: Number(row?.kiz) || 0,
    erkek: Number(row?.erkek) || 0,
  };
}
