import { supabase } from '../../../lib/supabase';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

export type AjansSatisPlatform =
  | 'whatsapp'
  | 'instagram'
  | 'telegram'
  | 'web'
  | 'uygulama'
  | 'diger';

export type AjansSatisLinki = {
  id: string;
  agency_id: string;
  code: string;
  title: string;
  description: string;
  selling_platform: AjansSatisPlatform;
  package_id: string | null;
  liste_fiyat_try: number | null;
  coins: number | null;
  is_active: boolean;
  click_count: number;
  created_at: string;
  expires_at?: string | null;
  closed_at?: string | null;
  closed_reason?: 'sold' | 'expired' | 'manual' | null;
};

export type AjansTakipSatis = {
  id: string;
  agency_id: string;
  sale_link_id: string | null;
  offer_id: string | null;
  buyer_id: string | null;
  buyer_label: string | null;
  buyer_email?: string | null;
  buyer_display_name?: string | null;
  package_title: string | null;
  liste_fiyat_try: number | null;
  amount_try: number | null;
  coins: number | null;
  selling_platform: string | null;
  payment_status: string;
  validation_status: 'pending' | 'valid' | 'invalid';
  invalid_reason: string | null;
  receipt_note: string | null;
  receipt_url: string | null;
  receipt_payload?: Record<string, unknown> | null;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  created_at: string;
};

export type AjansFatura = {
  id: string;
  agency_id: string;
  tracked_sale_id: string | null;
  invoice_no: string;
  buyer_name: string;
  buyer_tax_id: string;
  buyer_address: string;
  line_title: string;
  coins: number | null;
  amount_try: number;
  notes: string;
  status: 'draft' | 'issued' | 'cancelled';
  issued_at: string | null;
  created_at: string;
};

function rpcHata(error: { message?: string } | null): never {
  throw new Error(error?.message ?? 'Satış işlemi başarısız');
}

export const AJANS_SATIS_PLATFORMLARI: Array<{
  id: AjansSatisPlatform;
  labelKey: string;
}> = [
  { id: 'whatsapp', labelKey: 'ajans.platformWhatsapp' },
  { id: 'instagram', labelKey: 'ajans.platformInstagram' },
  { id: 'telegram', labelKey: 'ajans.platformTelegram' },
  { id: 'web', labelKey: 'ajans.platformWeb' },
  { id: 'uygulama', labelKey: 'ajans.platformUygulama' },
  { id: 'diger', labelKey: 'ajans.platformDiger' },
];

export function AjansSatisHttpsUrl(code: string): string {
  const kod = code.trim().toUpperCase();
  // Görünür Tamuso URL (DNS/proxy ile ajans-pay'e yönlendirilir). Eski supabase linkleri bozulmaz.
  const payBase = process.env.EXPO_PUBLIC_PAY_BASE_URL?.replace(/\/$/, '');
  if (payBase) {
    return `${payBase}/${encodeURIComponent(kod)}`;
  }
  const supabase = OrtamDegiskenleri.supabaseUrl.replace(/\/$/, '');
  return `${supabase}/functions/v1/ajans-pay?c=${encodeURIComponent(kod)}`;
}

export function AjansSatisDeepLink(code: string): string {
  const scheme = OrtamDegiskenleri.uygulamaSemasi || 'muta';
  return `${scheme}://ajans/satis/${encodeURIComponent(code.trim().toUpperCase())}`;
}

export function AjansSatisPaylasMesaji(opts: {
  title: string;
  description?: string;
  platform?: string;
  url: string;
  agencyName?: string;
}): string {
  const parts = [
    opts.agencyName ? `${opts.agencyName}` : 'Tamuso Ajans',
    opts.title,
    opts.description?.trim() || '',
    opts.platform ? `Platform: ${opts.platform}` : '',
    '',
    opts.url,
  ].filter((x, i, a) => x !== '' || (i > 0 && a[i - 1] !== ''));
  return parts.join('\n').trim();
}

export async function AjansSatisLinkiniPaylas(opts: {
  code: string;
  title: string;
  description?: string;
  platformLabel?: string;
  agencyName?: string;
  whatsapp?: boolean;
}): Promise<void> {
  const url = AjansSatisHttpsUrl(opts.code);
  const mesaj = AjansSatisPaylasMesaji({
    title: opts.title,
    description: opts.description,
    platform: opts.platformLabel,
    url,
    agencyName: opts.agencyName,
  });
  if (opts.whatsapp) {
    const wa = `https://wa.me/?text=${encodeURIComponent(mesaj)}`;
    await Linking.openURL(wa);
    return;
  }
  await Share.share(
    Platform.OS === 'ios'
      ? { message: mesaj }
      : { message: mesaj, title: opts.title },
  );
}

export async function AjansSatisLinkiOlustur(input: {
  agencyId: string;
  title: string;
  description: string;
  sellingPlatform: AjansSatisPlatform;
  packageId?: string | null;
  listeFiyatTry?: number | null;
  coins?: number | null;
}): Promise<AjansSatisLinki> {
  const { data, error } = await supabase.rpc('ajans_satis_linki_olustur', {
    p_agency_id: input.agencyId,
    p_title: input.title,
    p_description: input.description,
    p_selling_platform: input.sellingPlatform,
    p_package_id: input.packageId ?? null,
    p_liste_fiyat_try: input.listeFiyatTry ?? null,
    p_coins: input.coins ?? null,
  });
  if (error) rpcHata(error);
  const link = (data as { link?: AjansSatisLinki })?.link;
  if (!link) throw new Error('Link oluşturulamadı');
  return link;
}

export async function AjansSatisLinkleriListe(
  agencyId: string,
): Promise<AjansSatisLinki[]> {
  const { data, error } = await supabase.rpc('ajans_satis_linkleri_liste', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (Array.isArray(data) ? data : []) as AjansSatisLinki[];
}

export async function AjansSatisLinkiGetir(code: string): Promise<{
  id: string;
  code: string;
  title: string;
  description: string;
  selling_platform: string;
  package_id: string | null;
  liste_fiyat_try: number | null;
  coins: number | null;
  agency_id: string;
  agency_name: string;
}> {
  const { data, error } = await supabase.rpc('ajans_satis_linki_getir', {
    p_code: code,
  });
  if (error) rpcHata(error);
  const link = (data as { link?: Record<string, unknown> })?.link;
  if (!link) throw new Error('Link bulunamadı');
  return link as any;
}

export async function AjansSatisLinkiAktiflik(
  agencyId: string,
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('ajans_satis_linki_aktiflik', {
    p_agency_id: agencyId,
    p_id: id,
    p_is_active: isActive,
  });
  if (error) rpcHata(error);
}

export async function AjansSatislariListe(
  agencyId: string,
): Promise<AjansTakipSatis[]> {
  const { data, error } = await supabase.rpc('ajans_satislari_liste', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (Array.isArray(data) ? data : []) as AjansTakipSatis[];
}

export async function AjansSatisDogrula(input: {
  agencyId: string;
  saleId: string;
  validationStatus: 'pending' | 'valid' | 'invalid';
  invalidReason?: string | null;
  receiptNote?: string | null;
  receiptUrl?: string | null;
}): Promise<AjansTakipSatis> {
  const { data, error } = await supabase.rpc('ajans_satis_dogrula', {
    p_agency_id: input.agencyId,
    p_sale_id: input.saleId,
    p_validation_status: input.validationStatus,
    p_invalid_reason: input.invalidReason ?? null,
    p_receipt_note: input.receiptNote ?? null,
    p_receipt_url: input.receiptUrl ?? null,
  });
  if (error) rpcHata(error);
  const sale = (data as { sale?: AjansTakipSatis })?.sale;
  if (!sale) throw new Error('Güncellenemedi');
  return sale;
}

export async function AjansFaturalariListe(
  agencyId: string,
): Promise<AjansFatura[]> {
  const { data, error } = await supabase.rpc('ajans_faturalari_liste', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (Array.isArray(data) ? data : []) as AjansFatura[];
}

export async function AjansFaturaKaydet(input: {
  agencyId: string;
  id?: string | null;
  trackedSaleId?: string | null;
  buyerName?: string;
  buyerTaxId?: string;
  buyerAddress?: string;
  lineTitle?: string;
  coins?: number | null;
  amountTry?: number | null;
  notes?: string;
  status?: 'draft' | 'issued' | 'cancelled' | null;
}): Promise<AjansFatura> {
  const { data, error } = await supabase.rpc('ajans_fatura_kaydet', {
    p_agency_id: input.agencyId,
    p_id: input.id ?? null,
    p_tracked_sale_id: input.trackedSaleId ?? null,
    p_buyer_name: input.buyerName ?? null,
    p_buyer_tax_id: input.buyerTaxId ?? null,
    p_buyer_address: input.buyerAddress ?? null,
    p_line_title: input.lineTitle ?? null,
    p_coins: input.coins ?? null,
    p_amount_try: input.amountTry ?? null,
    p_notes: input.notes ?? null,
    p_status: input.status ?? null,
  });
  if (error) rpcHata(error);
  const invoice = (data as { invoice?: AjansFatura })?.invoice;
  if (!invoice) throw new Error('Fatura kaydedilemedi');
  return invoice;
}

export async function AjansSatisLinktenKayit(code: string): Promise<{
  sale: AjansTakipSatis;
  agency_id: string;
  liste_fiyat_try: number | null;
}> {
  const { data, error } = await supabase.rpc('ajans_satis_linkten_kayit', {
    p_code: code,
  });
  if (error) rpcHata(error);
  const d = data as {
    sale?: AjansTakipSatis;
    agency_id?: string;
    liste_fiyat_try?: number;
  };
  if (!d?.sale) throw new Error('Kayıt oluşturulamadı');
  return {
    sale: d.sale,
    agency_id: d.agency_id!,
    liste_fiyat_try: d.liste_fiyat_try ?? null,
  };
}

export type AjansSatisOzeti = {
  ok: boolean;
  toplam_try: number;
  toplam_coin: number;
  islem_adet: number;
  top_alicilar: Array<{
    buyer_id: string | null;
    buyer_name: string;
    toplam_try: number;
    toplam_coin: number;
    islem_adet: number;
  }>;
  cuzdan: {
    coins: number;
    diamonds: number;
    distribution_balance: number;
    lifetime_coins_sold: number;
    sale_gift_milestones: number;
    sonraki_hediye_icin: number;
  };
};

export async function AjansSatisOzetiGetir(
  agencyId: string,
): Promise<AjansSatisOzeti> {
  const { data, error } = await supabase.rpc('ajans_satis_ozeti', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return data as AjansSatisOzeti;
}

export type AjansCuzdanHareket = {
  id: string;
  currency: 'coins' | 'diamonds' | 'distribution';
  delta: number;
  balance_after: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export async function AjansCuzdanHareketleriGetir(
  agencyId: string,
  limit = 100,
): Promise<{
  wallet: AjansSatisOzeti['cuzdan'] & { updated_at?: string };
  hareketler: AjansCuzdanHareket[];
}> {
  const { data, error } = await supabase.rpc('ajans_cuzdan_hareketleri', {
    p_agency_id: agencyId,
    p_limit: limit,
  });
  if (error) rpcHata(error);
  const d = data as {
    wallet: AjansSatisOzeti['cuzdan'] & { updated_at?: string };
    hareketler: AjansCuzdanHareket[];
  };
  return {
    wallet: d.wallet,
    hareketler: Array.isArray(d.hareketler) ? d.hareketler : [],
  };
}

/** İmzalı PDF URL — varsa storage signed URL (hızlı), yoksa edge üretimi */
export async function AjansDekontPdfUrlGetir(
  saleId: string,
  opts?: { force?: boolean; sale?: AjansTakipSatis | null },
): Promise<{
  url: string;
  path: string;
  bucket: string;
}> {
  const bucket = 'agency-receipts';
  const CURRENT_VER = 3;
  const payload = (opts?.sale?.receipt_payload ?? null) as {
    pdf_path?: string;
    pdf_version?: number;
  } | null;
  const pathHint =
    payload?.pdf_path ||
    (opts?.sale?.agency_id ? `${opts.sale.agency_id}/${saleId}.pdf` : null);
  const ver = Number(payload?.pdf_version ?? 0);

  // Hızlı yol: mevcut PDF + imzalı URL (edge turu yok)
  if (!opts?.force && pathHint && ver >= CURRENT_VER) {
    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrl(pathHint, 60 * 60);
    if (signed?.signedUrl) {
      return { url: signed.signedUrl, path: pathHint, bucket };
    }
  }

  const { data: uret, error: uretErr } = await supabase.functions.invoke(
    'ajans-dekont-pdf',
    { body: { sale_id: saleId, force: !!opts?.force } },
  );
  if (uretErr) throw new Error(uretErr.message);
  const u = uret as { ok?: boolean; url?: string; path?: string; error?: string };
  if (!u?.url) throw new Error(u?.error ?? 'PDF oluşturulamadı');
  return {
    url: u.url,
    path: u.path ?? pathHint ?? `${saleId}.pdf`,
    bucket,
  };
}

/** PDF'i cihaza indir — webview yok */
export async function AjansDekontPdfYerelAl(
  saleId: string,
  fileName?: string,
  sale?: AjansTakipSatis | null,
): Promise<string> {
  const { url } = await AjansDekontPdfUrlGetir(saleId, { sale: sale ?? null });
  const { UzakDosyayiYerelIndir } = await import(
    '../../mesajlasma/islemler/MesajDosyaIndir'
  );
  return UzakDosyayiYerelIndir(
    url,
    fileName ?? `tamuso-dekont-${saleId.slice(0, 8)}.pdf`,
  );
}

export function AjansDekontPaylasMesaji(opts: {
  packageTitle: string;
  amountTry: number;
  coins: number;
  buyerLabel?: string | null;
  pdfUrl: string;
  agencyName?: string | null;
}): string {
  return [
    'Tamuso ödeme dekontu',
    opts.agencyName ? opts.agencyName : null,
    opts.packageTitle,
    `${Number(opts.amountTry).toLocaleString('tr-TR')} ₺ · ${Number(opts.coins).toLocaleString('tr-TR')} coin`,
    opts.buyerLabel ? `Alıcı: ${opts.buyerLabel}` : null,
  ]
    .filter((x) => x != null && x !== '')
    .join('\n');
}

/** PDF dosyasını sistem paneli / WhatsApp ile gönder (link değil) */
export async function AjansDekontWhatsAppPaylas(opts: {
  saleId: string;
  packageTitle: string;
  amountTry: number;
  coins: number;
  buyerLabel?: string | null;
  agencyName?: string | null;
  sale?: AjansTakipSatis | null;
}): Promise<void> {
  const { YerelDosyayiPaylas } = await import(
    '../../mesajlasma/islemler/MesajDosyaIndir'
  );
  const uri = await AjansDekontPdfYerelAl(
    opts.saleId,
    `dekont-${opts.saleId.slice(0, 8)}.pdf`,
    opts.sale ?? null,
  );
  await YerelDosyayiPaylas(uri, {
    mimeType: 'application/pdf',
    dialogTitle: opts.packageTitle || 'Tamuso dekont',
    uti: 'com.adobe.pdf',
  });
}

export async function AjansDekontSistemPaylas(opts: {
  saleId: string;
  packageTitle: string;
  amountTry: number;
  coins: number;
  buyerLabel?: string | null;
  agencyName?: string | null;
  sale?: AjansTakipSatis | null;
}): Promise<void> {
  await AjansDekontWhatsAppPaylas(opts);
}

/** PDF'i dm-media'ya kopyala (public URL) */
export async function AjansDekontDmMedyayaYukle(
  saleId: string,
  sale?: AjansTakipSatis | null,
): Promise<{ url: string; fileName: string }> {
  const uri = await AjansDekontPdfYerelAl(
    saleId,
    `dekont-${saleId.slice(0, 8)}.pdf`,
    sale ?? null,
  );
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error('Oturum yok');
  const fileName = `dekont-${saleId.slice(0, 8)}.pdf`;
  const path = `${uid}/${Date.now()}-${fileName}`;

  const res = await fetch(uri);
  const blob = await res.blob();
  const { error } = await supabase.storage.from('dm-media').upload(path, blob, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data: pub } = supabase.storage.from('dm-media').getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error('PDF URL alınamadı');
  return { url: pub.publicUrl, fileName };
}
