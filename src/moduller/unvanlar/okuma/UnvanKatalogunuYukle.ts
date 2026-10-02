import { supabase } from '../../../lib/supabase';
import { UnvanTasariminiDogrula } from '../dogrulama/UnvanTasarimZod';
import type { UnvanKatalogKaydi } from '../tipler';

export type UnvanKatalogSurum = {
  max_updated_at: string;
  max_version: number;
  count: number;
};

type Ham = Record<string, unknown>;

function ham(v: unknown): Ham {
  return v && typeof v === 'object' ? (v as Ham) : {};
}

function i18nMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string') out[k] = val;
  }
  return out;
}

export function UnvanKatalogKaydiParse(v: unknown): UnvanKatalogKaydi | null {
  const d = ham(v);
  if (typeof d.id !== 'string' || !d.id) return null;
  return {
    id: d.id,
    slug: typeof d.slug === 'string' ? d.slug : '',
    name: typeof d.name === 'string' ? d.name : '',
    name_i18n: i18nMap(d.name_i18n),
    design: UnvanTasariminiDogrula(d.design),
    version: Number(d.version) || 0,
    priority: Number(d.priority) || 0,
    updated_at: typeof d.updated_at === 'string' ? d.updated_at : undefined,
  };
}

export async function UnvanKatalogunuYukle(): Promise<UnvanKatalogKaydi[]> {
  const { data, error } = await supabase.rpc('user_titles_katalog');
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map(UnvanKatalogKaydiParse)
    .filter((r): r is UnvanKatalogKaydi => r !== null);
}

export async function UnvanKatalogSurumunuYukle(): Promise<UnvanKatalogSurum> {
  const { data, error } = await supabase.rpc('user_titles_katalog_surum');
  if (error) throw error;
  const d = ham(data);
  return {
    max_updated_at:
      typeof d.max_updated_at === 'string' ? d.max_updated_at : '1970-01-01T00:00:00Z',
    max_version: Number(d.max_version) || 0,
    count: Number(d.count) || 0,
  };
}
