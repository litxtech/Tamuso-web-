/**
 * Remote hamburger menü config — bellek + AsyncStorage + realtime.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import type { HamburgerGrupId } from './HamburgerMenuKatalogu';
import { HAMBURGER_MENU_KATALOGU } from './HamburgerMenuKatalogu';

const STORAGE_KEY = 'hamburger_menu_cache_v1';

export type HamburgerRemoteItem = {
  item_key: string;
  enabled: boolean;
  sort_order: number;
  group_id: HamburgerGrupId;
};

type Listener = () => void;

let items: HamburgerRemoteItem[] = HAMBURGER_MENU_KATALOGU.map((k) => ({
  item_key: k.itemKey,
  enabled: true,
  sort_order: k.defaultSort,
  group_id: k.defaultGroup,
}));
let remote = false;
let yukleniyor = false;
let realtimeKurulu = false;
const listeners = new Set<Listener>();

function bildir() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

export function HamburgerMenuCacheAbone(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function HamburgerMenuCacheSurum(): string {
  return `${remote ? 'r' : 'l'}:${items.length}:${items.map((i) => `${i.item_key}:${i.enabled}:${i.sort_order}:${i.group_id}`).join('|')}`;
}

export function HamburgerMenuCacheOku(): HamburgerRemoteItem[] {
  return items.slice();
}

function uygula(next: HamburgerRemoteItem[], isRemote: boolean) {
  items = next;
  remote = isRemote;
  bildir();
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
}

function normalizeRow(raw: Record<string, unknown>): HamburgerRemoteItem | null {
  const key = String(raw.item_key ?? '').trim();
  if (!key) return null;
  const group = String(raw.group_id ?? 'kesfet');
  const group_id = (
    ['yayin', 'kesfet', 'hesap', 'yardim', 'yonetim'].includes(group)
      ? group
      : 'kesfet'
  ) as HamburgerGrupId;
  return {
    item_key: key,
    enabled: raw.enabled !== false,
    sort_order: Number(raw.sort_order ?? 100) || 100,
    group_id,
  };
}

export async function HamburgerMenuCacheDisktenYukle(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed)) return;
    const rows = parsed
      .map((r) => normalizeRow(r))
      .filter((r): r is HamburgerRemoteItem => !!r);
    if (rows.length) uygula(rows, false);
  } catch {
    /* ignore */
  }
}

export async function HamburgerMenuyuYukle(): Promise<void> {
  if (yukleniyor) return;
  yukleniyor = true;
  try {
    const { data, error } = await supabase.rpc('hamburger_menu_get');
    if (error) throw error;
    const arr = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
    const rows = arr
      .map((r) => normalizeRow(r))
      .filter((r): r is HamburgerRemoteItem => !!r);
    if (rows.length) {
      uygula(rows, true);
    }
  } catch {
    /* yerel kalır */
  } finally {
    yukleniyor = false;
  }
}

export async function AdminHamburgerMenuKaydet(
  kayitlar: HamburgerRemoteItem[],
): Promise<void> {
  const payload = kayitlar.map((i) => ({
    item_key: i.item_key,
    enabled: i.enabled,
    sort_order: i.sort_order,
    group_id: i.group_id,
  }));
  const { error } = await supabase.rpc('admin_hamburger_menu_kaydet', {
    p_items: payload,
  });
  if (error) throw error;
  uygula(kayitlar, true);
}

export function HamburgerMenuRealtimeKur(): () => void {
  if (realtimeKurulu) return () => undefined;
  realtimeKurulu = true;
  const kanal = supabase
    .channel('hamburger-menu-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hamburger_menu_items' },
      () => {
        void HamburgerMenuyuYukle();
      },
    )
    .subscribe();
  return () => {
    realtimeKurulu = false;
    void supabase.removeChannel(kanal);
  };
}
