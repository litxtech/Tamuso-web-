import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import {
  PolitikaKayittanGorunum,
  type PolitikaGorunum,
  type PolitikaKayit,
} from '../tipler/PolitikaTipleri';
import {
  POLITIKA_METINLERI,
  PolitikaKodundanGetir,
  type PolitikaKodu,
} from '../icerik/PolitikaMetinleri';

export type PolitikaSurumu = {
  id: string;
  policy_code: string;
  version: number;
  body_md: string;
  published_at: string;
  policies?: { title: string; is_required: boolean } | null;
};

function yereldenDoldur(p: PolitikaKayit): PolitikaGorunum {
  const yerel = PolitikaKodundanGetir(p.code);
  const g = PolitikaKayittanGorunum(p);
  const dbGovde = (p.body_md ?? '').trim();
  const placeholder =
    !dbGovde ||
    dbGovde.startsWith('# ') ||
    dbGovde.includes('Placeholder') ||
    dbGovde.length < 80;
  if (yerel && placeholder) {
    return {
      ...g,
      baslik: g.baslik || yerel.baslik,
      kisa: g.kisa || yerel.kisa,
      onayEtiketi: g.onayEtiketi || yerel.onayEtiketi,
      linkEtiketi: g.linkEtiketi || yerel.baslik,
      govde: yerel.govde,
    };
  }
  return g;
}

export async function PolitikalariListele(
  yer: 'all' | 'register' | 'login' = 'all',
): Promise<PolitikaGorunum[]> {
  const { data, error } = await supabase.rpc('politikalari_listele', {
    p_yer: yer,
  });
  if (error) throw new Error(error.message);
  const rows = (data as PolitikaKayit[]) ?? [];
  if (!rows.length && yer !== 'all') {
    // DB boşsa eski sabitler (kayıt/giriş kırılmasın)
    return Object.values(POLITIKA_METINLERI).map((p) => ({
      kod: p.kod,
      baslik: p.baslik,
      kisa: p.kisa,
      onayEtiketi: p.onayEtiketi,
      linkEtiketi: p.baslik,
      govde: p.govde,
    }));
  }
  return rows.map(yereldenDoldur);
}

export async function PolitikaGetir(kod: string): Promise<PolitikaGorunum | null> {
  const { data, error } = await supabase.rpc('politika_getir', {
    p_code: kod,
  });
  if (error) throw new Error(error.message);
  if (data) return yereldenDoldur(data as PolitikaKayit);
  const yerel = PolitikaKodundanGetir(kod);
  if (!yerel) return null;
  return {
    kod: yerel.kod,
    baslik: yerel.baslik,
    kisa: yerel.kisa,
    onayEtiketi: yerel.onayEtiketi,
    linkEtiketi: yerel.baslik,
    govde: yerel.govde,
  };
}

export async function GuncelPolitikalariGetir(): Promise<PolitikaSurumu[]> {
  const { data, error } = await supabase
    .from('policy_versions')
    .select('*, policies(title, is_required)')
    .order('version', { ascending: false });
  if (error) throw error;
  const rows = (data as PolitikaSurumu[]) ?? [];
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.policy_code)) return false;
    seen.add(r.policy_code);
    return true;
  });
}

export async function PolitikaKabulEt(policyVersionId: string) {
  if (!(await OzellikBayragiAktifMiSunucu('policies_enabled'))) {
    return { ok: false as const, hata: i18n.t('politikalar.simdiKapali') };
  }
  const { error } = await supabase.rpc('politika_kabul_et', {
    p_policy_version_id: policyVersionId,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

/** Kayıt sonrası gösterilen zorunlu politikaları kabul kaydı */
export async function KayitPolitikaKabulKaydet(
  kodlar?: string[],
): Promise<{ ok: boolean; hata?: string }> {
  try {
    const liste =
      kodlar ??
      (await PolitikalariListele('register')).map((p) => p.kod);
    const guncel = await GuncelPolitikalariGetir();
    for (const kod of liste) {
      const satir = guncel.find((g) => g.policy_code === kod);
      if (!satir?.id) continue;
      const r = await PolitikaKabulEt(satir.id);
      if (!r.ok) return { ok: false, hata: r.hata ?? 'Politika kabul edilemedi' };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('politikalar.kayitBasarisiz'),
    };
  }
}

/** Zorunlu politikalarda yeniden kabul gereken sürüm var mı? */
export async function PolitikaYenidenKabulGerekliMi(): Promise<{
  gerekli: boolean;
  kodlar: string[];
}> {
  try {
    const { data: uid } = await supabase.auth.getUser();
    const userId = uid.user?.id;
    if (!userId) return { gerekli: false, kodlar: [] };

    const guncel = await GuncelPolitikalariGetir();
    const zorunlu = guncel.filter((g) => g.policies?.is_required !== false);
    if (!zorunlu.length) return { gerekli: false, kodlar: [] };

    const { data: kabuller } = await supabase
      .from('policy_acceptances')
      .select('policy_version_id')
      .eq('user_id', userId);
    const kabulSet = new Set(
      ((kabuller as { policy_version_id: string }[]) ?? []).map(
        (k) => k.policy_version_id,
      ),
    );
    const eksik = zorunlu.filter((z) => !kabulSet.has(z.id));
    return {
      gerekli: eksik.length > 0,
      kodlar: eksik.map((e) => e.policy_code),
    };
  } catch {
    return { gerekli: false, kodlar: [] };
  }
}

/** @deprecated tip — string kod kullan */
export type { PolitikaKodu };
