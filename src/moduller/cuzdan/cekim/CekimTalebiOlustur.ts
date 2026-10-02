import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { FinansIdempotencyAnahtariOlustur } from '../islemler/FinansIdempotencyAnahtariOlustur';
import { KillSwitchAktifMiSunucu } from '../../ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';

function CekimHataMesaji(ham?: string): string {
  const m = (ham ?? '').toLowerCase();
  if (!m) return i18n.t('cuzdanX.cekimOlusturulamadi');
  if (m.includes('insufficient')) return i18n.t('cuzdanX.elmasYetersiz');
  if (m.includes('guest')) return i18n.t('cuzdanX.misafirCekimYapamaz');
  if (m.includes('temporarily disabled') || m.includes('kill'))
    return i18n.t('cuzdanX.cekimGeciciKapali');
  if (m.includes('feature disabled') || m.includes('withdrawals'))
    return i18n.t('cuzdanX.cekimKullanilamiyor');
  if (m.includes('invalid amount')) return i18n.t('cuzdanX.gecerliElmasGir');
  if (m.includes('not authenticated')) return i18n.t('aiMuzik.oturumGerekli');
  return ham ?? i18n.t('cuzdanX.cekimOlusturulamadi');
}

export async function CekimTalebiOlustur(input: {
  diamonds: number;
  method?: string;
  details?: Record<string, unknown>;
}): Promise<{ ok: boolean; hata?: string }> {
  if (await KillSwitchAktifMiSunucu('kill_withdrawal')) {
    return { ok: false, hata: i18n.t('cuzdanX.cekimGeciciKapali') };
  }
  const withdrawAcik =
    (await OzellikBayragiAktifMiSunucu('wallet_withdraw_enabled')) ||
    (await OzellikBayragiAktifMiSunucu('withdrawals_enabled'));
  if (!withdrawAcik) {
    return { ok: false, hata: i18n.t('cuzdanX.cekimKullanilamiyor') };
  }
  const { error: bayrakErr } = await supabase.rpc('cekim_wallet_bayrak_kontrol');
  if (bayrakErr) {
    return { ok: false, hata: CekimHataMesaji(bayrakErr.message) };
  }

  const { error } = await supabase.rpc('cekim_talebi_olustur', {
    p_diamonds: input.diamonds,
    p_method: input.method ?? 'bank',
    p_details: input.details ?? {},
    p_idempotency_key: FinansIdempotencyAnahtariOlustur('withdrawal'),
  });
  if (error) return { ok: false, hata: CekimHataMesaji(error.message) };
  return { ok: true };
}

export async function CekimTaleplerimiGetir() {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}
