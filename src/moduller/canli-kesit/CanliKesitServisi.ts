import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { OrtamDegiskenleri } from '../../yapilandirma/OrtamDegiskenleri';
import { DepoyaMedyaYukle } from '../../ortak/medya/DepoyaMedyaYukle';
import { HIKAYE_BUCKET } from '../hikaye/sabitler';
import { HikayeDosyaBoyutuBayt } from '../hikaye/islemler/HikayeVideoKirp';
import { AnalyticsOlayEkle } from '../guvenlik/analytics/AnalyticsOlayEkle';
import i18n from '../../i18n';
import {
  kesitBoyutAsimi,
  kesitSaniyeNormalize,
  kesitUzanti,
  KESIT_CAPTION_MAX,
  KESIT_VARSAYILAN_MAX_BAYT,
  type KesitSaniye,
} from './canliKesitDogrulama';
import {
  canliKesitDosyaSil,
  canliKesitYerelKaydet,
  canliKesitYerelKayitVarMi,
} from './CanliKesitKaydedici';

export type KesitKaynak = {
  liveId: string;
  pkId?: string | null;
  hostAd?: string | null;
  rakipAd?: string | null;
};

export type KesitTaslak = {
  istekId: string;
  url: string | null;
  yerelUri: string | null;
  mime: string;
  saniye: KesitSaniye;
  maxBayt: number;
  width: number | null;
  height: number | null;
  yol: string | null;
};

export type KesitSonuc<T> = { ok: true; data: T } | { ok: false; hata: string; kod?: string };

function hataCevir(mesaj: string): string {
  const m = mesaj.toLowerCase();
  if (m.includes('rate limited')) return i18n.t('canliYayin.kesitLimit');
  if (m.includes('private live')) return i18n.t('canliYayin.kesitOzelYayin');
  if (m.includes('not host')) return i18n.t('canliYayin.kesitOlusturulamadi');
  if (m.includes('clip disabled') || m.includes('stories disabled') || m.includes('story')) {
    return i18n.t('canliYayin.kesitStoryYayinlanamadi');
  }
  if (m.includes('file too large')) return i18n.t('canliYayin.kesitCokBuyuk');
  if (m.includes('not authenticated')) return i18n.t('ortak.oturumYok');
  if (m.includes('upload banned')) return i18n.t('hikaye.uploadBan');
  if (m.includes('pk mismatch')) return i18n.t('canliYayin.kesitOlusturulamadi');
  if (m.includes('unsafe') || m.includes('invalid mime') || m.includes('medya')) {
    return i18n.t('canliYayin.kesitVideoHazirlanamadi');
  }
  if (m.includes('kaynak') || m.includes('not found')) return i18n.t('canliYayin.kesitKaynakYok');
  return i18n.t('canliYayin.kesitOlusturulamadi');
}

function olay(ad: string, props?: Record<string, unknown>) {
  void AnalyticsOlayEkle(ad, props);
}

async function istekKapat(
  istekId: string,
  durum: 'failed' | 'cancelled',
  mediaUrl?: string | null,
) {
  await supabase.rpc('canli_kesit_istek_kapat', {
    p_id: istekId,
    p_durum: durum,
    p_media_url: mediaUrl ?? null,
  });
}

export type KesitIstek = {
  istekId: string;
  maxBayt: number;
  saniye: KesitSaniye;
};

export async function canliKesitIstekAc(opts: {
  kaynak: KesitKaynak;
  saniye: number;
}): Promise<KesitSonuc<KesitIstek>> {
  const saniye = kesitSaniyeNormalize(opts.saniye);
  const { data, error } = await supabase.rpc('canli_kesit_istek_ac', {
    p_live_id: opts.kaynak.liveId,
    p_pk_id: opts.kaynak.pkId ?? null,
    p_saniye: saniye,
    p_host_ad: opts.kaynak.hostAd ?? null,
    p_rakip_ad: opts.kaynak.rakipAd ?? null,
  });
  if (error) return { ok: false, hata: hataCevir(error.message), kod: 'istek' };
  const row = (data ?? {}) as {
    request_id?: string;
    duration_ms?: number;
    max_bytes?: number;
  };
  const istekId = row.request_id;
  if (!istekId) return { ok: false, hata: i18n.t('canliYayin.kesitOlusturulamadi') };
  const maxBayt =
    typeof row.max_bytes === 'number' && row.max_bytes > 0
      ? row.max_bytes
      : KESIT_VARSAYILAN_MAX_BAYT;
  const sure = kesitSaniyeNormalize(
    typeof row.duration_ms === 'number' ? Math.round(row.duration_ms / 1000) : saniye,
  );
  return { ok: true, data: { istekId, maxBayt, saniye: sure } };
}

export function canliKesitDosyadanTaslak(
  istek: KesitIstek,
  dosya: { uri: string; mime: string; bayt: number; width?: number | null; height?: number | null },
): KesitTaslak {
  return {
    istekId: istek.istekId,
    url: null,
    yerelUri: dosya.uri,
    mime: dosya.mime,
    saniye: istek.saniye,
    maxBayt: istek.maxBayt,
    width: dosya.width ?? null,
    height: dosya.height ?? null,
    yol: null,
  };
}

export async function canliKesitIstekBirak(
  istekId: string,
  durum: 'failed' | 'cancelled',
): Promise<void> {
  await istekKapat(istekId, durum);
}

export async function canliKesitOlustur(opts: {
  kaynak: KesitKaynak;
  saniye: number;
  sinyal?: AbortSignal;
  onAsama?: (asama: 'kayit' | 'sunucu', oran: number) => void;
}): Promise<KesitSonuc<KesitTaslak>> {
  const acildi = await canliKesitIstekAc({ kaynak: opts.kaynak, saniye: opts.saniye });
  if (!acildi.ok) return acildi;
  const { istekId, maxBayt, saniye: sure } = acildi.data;

  try {
    if (canliKesitYerelKayitVarMi()) {
      opts.onAsama?.('kayit', 0);
      const dosya = await canliKesitYerelKaydet({
        saniye: sure,
        sinyal: opts.sinyal,
        onIlerleme: (oran) => opts.onAsama?.('kayit', oran),
      });
      if (!dosya) {
        await istekKapat(istekId, 'failed');
        return { ok: false, hata: i18n.t('canliYayin.kesitVideoHazirlanamadi') };
      }
      if (kesitBoyutAsimi(dosya.bayt, maxBayt)) {
        await canliKesitDosyaSil(dosya.uri);
        await istekKapat(istekId, 'failed');
        return { ok: false, hata: i18n.t('canliYayin.kesitCokBuyuk') };
      }
      olay('live_clip_created', {
        live_id: opts.kaynak.liveId,
        pk_id: opts.kaynak.pkId ?? null,
        duration_sec: sure,
        bytes: dosya.bayt,
        yol: 'yerel',
      });
      return {
        ok: true,
        data: {
          istekId,
          url: null,
          yerelUri: dosya.uri,
          mime: dosya.mime,
          saniye: sure,
          maxBayt,
          width: dosya.width,
          height: dosya.height,
          yol: null,
        },
      };
    }

    await istekKapat(istekId, 'failed');
    return { ok: false, hata: i18n.t('canliYayin.kesitVideoHazirlanamadi') };
  } catch (e) {
    const iptal = e instanceof Error && e.message === 'iptal';
    await istekKapat(istekId, iptal ? 'cancelled' : 'failed');
    if (iptal) return { ok: false, hata: i18n.t('ortak.iptal'), kod: 'iptal' };
    olay('live_clip_failed', { live_id: opts.kaynak.liveId, duration_sec: sure });
    return { ok: false, hata: i18n.t('canliYayin.kesitOlusturulamadi') };
  }
}

/** iOS kamera QuickTime üretir. Hikaye oynatıcısı gerçek MP4 ister. */
async function kesitMp4Yap(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const { Video } = await import('react-native-compressor');
    const out = await Video.compress(uri, {
      compressionMethod: 'auto',
      maxSize: 1280,
      minimumFileSizeForCompress: 0,
    });
    const yol = typeof out === 'string' ? out.trim() : '';
    if (!yol) return uri;
    return yol.startsWith('file://') || yol.startsWith('content://')
      ? yol
      : `file://${yol}`;
  } catch {
    return uri;
  }
}

async function yukle(taslak: KesitTaslak, onOran?: (n: number) => void): Promise<KesitSonuc<{ url: string; yol: string }>> {
  if (taslak.url && !taslak.yerelUri) {
    return { ok: true, data: { url: taslak.url, yol: taslak.yol ?? '' } };
  }
  if (!taslak.yerelUri) return { ok: false, hata: i18n.t('canliYayin.kesitVideoHazirlanamadi') };
  const mp4 = await kesitMp4Yap(taslak.yerelUri);
  taslak = { ...taslak, yerelUri: mp4, mime: 'video/mp4' };
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') };
  const bayt = await HikayeDosyaBoyutuBayt(taslak.yerelUri);
  if (kesitBoyutAsimi(bayt, taslak.maxBayt)) {
    return { ok: false, hata: i18n.t('canliYayin.kesitCokBuyuk') };
  }
  const ext = kesitUzanti(taslak.mime) ?? 'mp4';
  const simdi = new Date();
  const ay = String(simdi.getUTCMonth() + 1).padStart(2, '0');
  const yol = `${uid}/${simdi.getUTCFullYear()}/${ay}/kesit-${taslak.istekId}.${ext}`;
  let sonHata = i18n.t('canliYayin.kesitYuklemeBasarisiz');
  for (let deneme = 0; deneme < 3; deneme += 1) {
    onOran?.(deneme === 0 ? 0.15 : 0.15 + deneme * 0.2);
    const up = await DepoyaMedyaYukle(supabase, {
      bucket: HIKAYE_BUCKET,
      path: yol,
      uri: taslak.yerelUri,
      mime: taslak.mime,
      tur: 'video',
      upsert: deneme > 0,
      maxBytes: taslak.maxBayt,
      sikistir: false,
    });
    if (up.ok) {
      const { data: pub } = supabase.storage.from(HIKAYE_BUCKET).getPublicUrl(yol);
      const base = OrtamDegiskenleri.supabaseUrl?.replace(/\/$/, '');
      const url =
        pub?.publicUrl ||
        `${base}/storage/v1/object/public/${HIKAYE_BUCKET}/${yol}`;
      if (!/^https?:\/\//i.test(url)) {
        sonHata = i18n.t('canliYayin.kesitYuklemeBasarisiz');
      } else {
        onOran?.(1);
        olay('live_clip_uploaded', { request_id: taslak.istekId, bytes: bayt ?? null });
        return { ok: true, data: { url, yol } };
      }
    }
    if (!up.ok) sonHata = up.hata || sonHata;
    await new Promise((r) => setTimeout(r, 500 * (deneme + 1)));
  }
  return { ok: false, hata: sonHata };
}

export async function canliKesitYayinla(opts: {
  taslak: KesitTaslak;
  caption: string;
  onOran?: (n: number) => void;
}): Promise<KesitSonuc<{ itemId: string }>> {
  const caption = opts.caption.trim().slice(0, KESIT_CAPTION_MAX);
  const yuk = await yukle(opts.taslak, opts.onOran);
  if (!yuk.ok) {
    olay('live_clip_failed', { request_id: opts.taslak.istekId, adim: 'upload' });
    return yuk;
  }
  const { data, error } = await supabase.rpc('hikaye_canli_kesit_yayinla', {
    p_istek_id: opts.taslak.istekId,
    p_media_url: yuk.data.url,
    p_caption: caption || null,
    p_width: opts.taslak.width,
    p_height: opts.taslak.height,
  });
  if (error) {
    olay('live_clip_failed', { request_id: opts.taslak.istekId, adim: 'publish' });
    return { ok: false, hata: hataCevir(error.message) };
  }
  const row = (data ?? {}) as { item_id?: string };
  olay('live_clip_story_published', {
    request_id: opts.taslak.istekId,
    item_id: row.item_id ?? null,
    duration_sec: opts.taslak.saniye,
  });
  await canliKesitDosyaSil(opts.taslak.yerelUri);
  return { ok: true, data: { itemId: row.item_id ?? opts.taslak.istekId } };
}

export async function canliKesitVazgec(taslak: KesitTaslak | null) {
  if (!taslak) return;
  await istekKapat(taslak.istekId, 'cancelled', taslak.url);
  await canliKesitDosyaSil(taslak.yerelUri);
  olay('live_clip_cancelled', { request_id: taslak.istekId });
}

export async function canliKesitKaynakDurumu(
  liveId: string | null,
  pkId: string | null,
): Promise<{ canli: boolean; pkCanli: boolean }> {
  if (!liveId && !pkId) return { canli: false, pkCanli: false };
  const { data, error } = await supabase.rpc('canli_kesit_kaynak_durumu', {
    p_live_id: liveId,
    p_pk_id: pkId,
  });
  if (error) return { canli: false, pkCanli: false };
  const row = (data ?? {}) as { live?: boolean; pk?: boolean };
  return { canli: row.live === true, pkCanli: row.pk === true };
}
