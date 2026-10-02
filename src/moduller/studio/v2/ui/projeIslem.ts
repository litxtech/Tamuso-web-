import { supabase } from '../../../../lib/supabase';
import type { StudioOyun } from '../../StudioApi';

export type ProjeFiltre = 'hepsi' | 'olusuyor' | 'hazir' | 'taslak' | 'inceleme' | 'yayin' | 'arsiv';
export type ProjeSira = 'duzenlenen' | 'yeni' | 'eski' | 'ad' | 'durum';

const OLUSUYOR = ['PLANNING', 'GENERATING_ASSETS', 'BUILDING_SCENE', 'BUILDING_GAMEPLAY', 'SCANNING'];
const HAZIR = ['READY_FOR_PREVIEW', 'PRIVATE_TEST'];
const INCELEME = ['SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'SCANNING'];
const YAYIN = ['APPROVED', 'PUBLISHED'];

export function projeFiltresi(oyun: StudioOyun, filtre: ProjeFiltre) {
  if (filtre === 'hepsi') return oyun.status !== 'ARCHIVED';
  if (filtre === 'olusuyor') return OLUSUYOR.includes(oyun.status) || oyun.status === 'FAILED' || oyun.status === 'CANCELLED';
  if (filtre === 'hazir') return HAZIR.includes(oyun.status);
  if (filtre === 'taslak') return oyun.status === 'DRAFT';
  if (filtre === 'inceleme') return INCELEME.includes(oyun.status);
  if (filtre === 'yayin') return YAYIN.includes(oyun.status);
  return oyun.status === 'ARCHIVED';
}

export function projeSirala(liste: StudioOyun[], sira: ProjeSira) {
  const kopya = [...liste];
  if (sira === 'ad') return kopya.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  if (sira === 'durum') return kopya.sort((a, b) => a.status.localeCompare(b.status));
  if (sira === 'eski') return kopya.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  return kopya.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function projeAra(liste: StudioOyun[], sorgu: string) {
  const q = sorgu.trim().toLocaleLowerCase();
  if (!q) return liste;
  return liste.filter((o) =>
    [o.title, o.genre, o.status, o.dimension].some((alan) => String(alan ?? '').toLocaleLowerCase().includes(q)),
  );
}

export function olusuyorMu(status: string) {
  return OLUSUYOR.includes(status);
}

export function hazirMi(status: string) {
  return HAZIR.includes(status) || status === 'SUBMITTED';
}

async function rpc(ad: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(ad, args);
  if (error) return { ok: false as const, code: error.message };
  return { ok: true as const, data };
}

export function StudioProjeArsivle(id: string, arsiv: boolean) {
  return rpc('creator_oyun_arsivle', { p_id: id, p_arsiv: arsiv });
}

export function StudioProjeCogalt(id: string) {
  return rpc('creator_oyun_cogalt', { p_id: id });
}

export function StudioProjeSil(id: string) {
  return rpc('creator_oyun_sil', { p_id: id });
}

export function StudioProjeAdlandir(id: string, title: string, description: string) {
  return rpc('creator_oyun_adlandir', { p_id: id, p_title: title, p_description: description });
}

export type Revizyon = { revision: number; summary: string; createdAt: string };

export async function StudioRevizyonlar(id: string): Promise<Revizyon[]> {
  const sonuc = await rpc('creator_revizyonlar', { p_id: id });
  return sonuc.ok && Array.isArray(sonuc.data) ? (sonuc.data as Revizyon[]) : [];
}
