import { supabase } from '../../../lib/supabase';
import type {
  AdminBayrak,
  AdminCanliOda,
  AdminCekim,
  AdminHarcayan,
  AdminHediye,
  AdminKill,
  AdminPaket,
  AdminPlatformOzeti,
  AdminRapor,
  AdminRaporDetay,
  AjansKomisyonOrani,
  EkonomiSimulasyon,
  PlatformEkonomiConfig,
} from '../tipler/PlatformTipleri';

function rpcHata(error: { message?: string } | null): never {
  throw new Error(error?.message ?? 'Admin işlem başarısız');
}

export async function AdminPlatformOzetiGetir(): Promise<AdminPlatformOzeti> {
  const { data, error } = await supabase.rpc('admin_platform_ozeti');
  if (error) rpcHata(error);
  return data as AdminPlatformOzeti;
}

export async function AdminEnCokHarcayanlar(
  limit = 30,
): Promise<AdminHarcayan[]> {
  const { data, error } = await supabase.rpc('admin_en_cok_harcayanlar', {
    p_limit: limit,
  });
  if (error) rpcHata(error);
  return (data ?? []) as AdminHarcayan[];
}

export async function AdminCekimListesi(limit = 40): Promise<AdminCekim[]> {
  const { data, error } = await supabase.rpc('admin_cekim_listesi', {
    p_limit: limit,
  });
  if (error) rpcHata(error);
  return (data ?? []) as AdminCekim[];
}

export async function AdminCekimDurumGuncelle(
  id: string,
  status: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_cekim_durum_guncelle', {
    p_id: id,
    p_status: status,
    p_note: note ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminCuzdanDuzelt(girdi: {
  userId: string;
  currency: 'coins' | 'diamonds';
  delta: number;
  reason?: string;
}): Promise<{ balance_after: number; currency: string }> {
  const { data, error } = await supabase.rpc('admin_cuzdan_duzelt', {
    p_user_id: girdi.userId,
    p_currency: girdi.currency,
    p_delta: girdi.delta,
    p_reason: girdi.reason ?? 'admin_adjust',
  });
  if (error) rpcHata(error);
  return data as { balance_after: number; currency: string };
}

export async function AdminRaporListesi(limit = 40): Promise<AdminRapor[]> {
  const zengin = await supabase.rpc('admin_rapor_kuyrugu', { p_limit: limit });
  if (!zengin.error && Array.isArray(zengin.data)) {
    return zengin.data as AdminRapor[];
  }

  const { data, error } = await supabase.rpc('admin_rapor_listesi', {
    p_limit: limit,
  });
  if (error) rpcHata(error);
  return (data ?? []) as AdminRapor[];
}

export async function AdminRaporDetayGetir(id: string): Promise<AdminRaporDetay> {
  const { data, error } = await supabase.rpc('admin_rapor_detay', { p_id: id });
  if (error) rpcHata(error);
  return data as AdminRaporDetay;
}

export async function AdminRaporDurumGuncelle(
  id: string,
  status: string,
  adminNote?: string,
  reporterNote?: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_rapor_durum_guncelle', {
    p_id: id,
    p_status: status,
    p_admin_note: adminNote ?? null,
    p_reporter_note: reporterNote ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminRaporIcerikKaldir(reportId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_rapor_icerik_kaldir', {
    p_report_id: reportId,
  });
  if (error) rpcHata(error);
}

export async function AdminCanliOdalar(limit = 40): Promise<AdminCanliOda[]> {
  const { data, error } = await supabase.rpc('admin_canli_odalar', {
    p_limit: limit,
  });
  if (error) rpcHata(error);
  return (data ?? []) as AdminCanliOda[];
}

export async function AdminOdaCanliKapat(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_oda_canli_kapat', {
    p_room_id: roomId,
  });
  if (error) rpcHata(error);
}

export async function AdminBayraklariGetir(): Promise<{
  flags: AdminBayrak[];
  kills: AdminKill[];
}> {
  const { data, error } = await supabase.rpc('admin_bayraklari_getir');
  if (error) rpcHata(error);
  const d = data as { flags: AdminBayrak[]; kills: AdminKill[] };
  return { flags: d?.flags ?? [], kills: d?.kills ?? [] };
}

export async function AdminOzellikBayragiAyarla(
  key: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('admin_ozellik_bayragi_ayarla', {
    p_key: key,
    p_enabled: enabled,
  });
  if (error) rpcHata(error);
}

export async function AdminKillSwitchAyarla(
  key: string,
  active: boolean,
  reason?: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_kill_switch_ayarla', {
    p_key: key,
    p_active: active,
    p_reason: reason ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminEkonomiKatalogu(): Promise<{
  config: PlatformEkonomiConfig | null;
  simuleOrnek: EkonomiSimulasyon | null;
  paketler: AdminPaket[];
  hediyeler: AdminHediye[];
}> {
  const { data, error } = await supabase.rpc('admin_ekonomi_katalogu');
  if (error) rpcHata(error);
  const d = data as {
    config?: PlatformEkonomiConfig;
    simule_ornek?: EkonomiSimulasyon;
    paketler: AdminPaket[];
    hediyeler: AdminHediye[];
  };
  return {
    config: d?.config ?? null,
    simuleOrnek: d?.simule_ornek ?? null,
    paketler: d?.paketler ?? [],
    hediyeler: d?.hediyeler ?? [],
  };
}

export async function AdminEkonomiConfigGuncelle(
  patch: Partial<PlatformEkonomiConfig>,
): Promise<PlatformEkonomiConfig> {
  const { data, error } = await supabase.rpc('admin_ekonomi_config_guncelle', {
    p: patch,
  });
  if (error) rpcHata(error);
  return data as PlatformEkonomiConfig;
}

export async function AdminEkonomiSimuleEt(
  brutTry: number,
): Promise<EkonomiSimulasyon> {
  const { data, error } = await supabase.rpc('admin_ekonomi_simule_et', {
    p_brut_try: brutTry,
  });
  if (error) rpcHata(error);
  return data as EkonomiSimulasyon;
}

export async function AdminAjansKomisyonListele(): Promise<{
  items: AjansKomisyonOrani[];
  defaults: {
    default_agency_share: number;
    gift_host_share: number;
    default_platform_share: number;
  };
}> {
  const { data, error } = await supabase.rpc('admin_ajans_komisyon_listele');
  if (error) rpcHata(error);
  const d = data as {
    items?: AjansKomisyonOrani[];
    defaults?: {
      default_agency_share?: number;
      gift_host_share?: number;
      default_platform_share?: number;
    };
  };
  return {
    items: (d?.items ?? []).map((x) => ({
      ...x,
      agency_share: Number(x.agency_share),
      host_share: Number(x.host_share),
      platform_share: Number(x.platform_share),
    })),
    defaults: {
      default_agency_share: Number(d?.defaults?.default_agency_share ?? 0.2),
      gift_host_share: Number(d?.defaults?.gift_host_share ?? 0.8),
      default_platform_share: Number(d?.defaults?.default_platform_share ?? 0.1),
    },
  };
}

export async function AdminAjansKomisyonGuncelle(input: {
  agencyId: string;
  agencyShare: number;
  platformShare: number;
}): Promise<{
  agency_id: string;
  agency_share: number;
  platform_share: number;
  host_share: number;
  updated_at?: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_ajans_komisyon_guncelle', {
    p_agency_id: input.agencyId,
    p_agency_share: input.agencyShare,
    p_platform_share: input.platformShare,
  });
  if (error) rpcHata(error);
  const d = data as {
    agency_id: string;
    agency_share: number;
    platform_share: number;
    host_share: number;
    updated_at?: string | null;
  };
  return {
    agency_id: d.agency_id,
    agency_share: Number(d.agency_share),
    platform_share: Number(d.platform_share),
    host_share: Number(d.host_share),
    updated_at: d.updated_at,
  };
}

export async function AdminAjansKomisyonVarsayilanUygula(): Promise<{
  updated_rows: number;
  agency_share: number;
  platform_share: number;
  host_share: number;
}> {
  const { data, error } = await supabase.rpc(
    'admin_ajans_komisyon_varsayilan_uygula',
  );
  if (error) rpcHata(error);
  const d = data as {
    updated_rows?: number;
    agency_share?: number;
    platform_share?: number;
    host_share?: number;
  };
  return {
    updated_rows: d?.updated_rows ?? 0,
    agency_share: Number(d?.agency_share ?? 0.2),
    platform_share: Number(d?.platform_share ?? 0.1),
    host_share: Number(d?.host_share ?? 0.7),
  };
}

export async function AdminHediyeKatalogOranUygula(): Promise<{
  updated_rows: number;
  gift_host_share: number;
}> {
  const { data, error } = await supabase.rpc('admin_hediye_katalog_oran_uygula');
  if (error) rpcHata(error);
  const d = data as { updated_rows?: number; gift_host_share?: number };
  return {
    updated_rows: d?.updated_rows ?? 0,
    gift_host_share: Number(d?.gift_host_share ?? 0.8),
  };
}

export async function AdminHediyeGuncelle(input: {
  id: string;
  coinCost?: number | null;
  diamondValue?: number | null;
  name?: string | null;
  emoji?: string | null;
  rarity?: string | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
}): Promise<AdminHediye> {
  const { data, error } = await supabase.rpc('admin_hediye_guncelle', {
    p_id: input.id,
    p_coin_cost: input.coinCost ?? null,
    p_diamond_value: input.diamondValue ?? null,
    p_name: input.name ?? null,
    p_emoji: input.emoji ?? null,
    p_rarity: input.rarity ?? null,
    p_is_active: input.isActive ?? null,
    p_sort_order: input.sortOrder ?? null,
  });
  if (error) rpcHata(error);
  const hediye = (data as { hediye?: AdminHediye })?.hediye;
  if (!hediye) throw new Error('Hediye güncellenemedi');
  return hediye;
}

export async function AdminPaketAktiflik(
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('admin_paket_aktiflik', {
    p_id: id,
    p_active: active,
  });
  if (error) rpcHata(error);
}

export async function AdminCoinPaketGuncelle(input: {
  id: string;
  title?: string | null;
  coins?: number | null;
  bonusCoins?: number | null;
  badge?: string | null;
  campaignText?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  priceTry?: number | null;
  priceUsd?: number | null;
}): Promise<AdminPaket> {
  const { data, error } = await supabase.rpc('admin_coin_paket_guncelle', {
    p_id: input.id,
    p_title: input.title ?? null,
    p_coins: input.coins ?? null,
    p_bonus_coins: input.bonusCoins ?? null,
    p_badge: input.badge ?? null,
    p_campaign_text: input.campaignText ?? null,
    p_sort_order: input.sortOrder ?? null,
    p_is_active: input.isActive ?? null,
    p_price_try: input.priceTry ?? null,
    p_price_usd: input.priceUsd ?? null,
  });
  if (error) rpcHata(error);
  const paket = (data as { paket?: AdminPaket })?.paket;
  if (!paket) throw new Error('Paket güncellenemedi');
  return paket;
}

export type AdminAjansCoinPaket = {
  id: string;
  package_key: string;
  title: string;
  liste_fiyat_try: number;
  odenecek_try: number;
  coins: number;
  indirim_yuzde: number;
  sort_order: number;
  is_active: boolean;
};

export async function AdminAjansPaketKatalogu(): Promise<AdminAjansCoinPaket[]> {
  const { data, error } = await supabase.rpc('admin_ajans_paket_katalogu');
  if (error) rpcHata(error);
  return (Array.isArray(data) ? data : []) as AdminAjansCoinPaket[];
}

export async function AdminAjansPaketGuncelle(input: {
  id: string;
  title?: string | null;
  listeFiyatTry?: number | null;
  coins?: number | null;
  indirimYuzde?: number | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}): Promise<AdminAjansCoinPaket> {
  const { data, error } = await supabase.rpc('admin_ajans_paket_guncelle', {
    p_id: input.id,
    p_title: input.title ?? null,
    p_liste_fiyat_try: input.listeFiyatTry ?? null,
    p_coins: input.coins ?? null,
    p_indirim_yuzde: input.indirimYuzde ?? null,
    p_sort_order: input.sortOrder ?? null,
    p_is_active: input.isActive ?? null,
  });
  if (error) rpcHata(error);
  const paket = (data as { paket?: AdminAjansCoinPaket })?.paket;
  if (!paket) throw new Error('Ajans paketi güncellenemedi');
  return paket;
}

export async function AdminHediyeAktiflik(
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('admin_hediye_aktiflik', {
    p_id: id,
    p_active: active,
  });
  if (error) rpcHata(error);
}

export async function AdminDuyuruOlustur(
  title: string,
  body: string,
  priority = 'normal',
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_duyuru_olustur', {
    p_title: title,
    p_body: body,
    p_priority: priority,
  });
  if (error) rpcHata(error);
  return data as string;
}
