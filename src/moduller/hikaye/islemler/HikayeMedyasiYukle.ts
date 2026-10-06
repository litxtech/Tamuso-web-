import { supabase } from '../../../lib/supabase';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import {
  GaleriAc,
} from '../../../ortak/medya/ImagePickerHazirMi';
import {
  DepoyaMedyaYukle,
  GuvenliMimeTipi,
  MedyaUzantisiCoz,
} from '../../../ortak/medya/DepoyaMedyaYukle';
import i18n from '../../../i18n';
import * as FileSystem from 'expo-file-system/legacy';
import { VIDEO_SIKISTIRMA_SONRASI_MAX_BYTES } from '../../../ortak/medya/VideoPaylasimSabitleri';
import { Video1080eSikistir } from '../../../ortak/medya/VideoSikistir';
import { HIKAYE_BUCKET, HIKAYE_VIDEO_MAX_BYTES } from '../sabitler';
import type { HikayeMedyaTuru } from '../tipler';
import { HikayeDosyaBoyutuBayt } from './HikayeVideoKirp';

function sureMsNormalize(duration: number | undefined | null): number | undefined {
  if (typeof duration !== 'number' || !(duration > 0)) return undefined;
  // expo-image-picker: genelde saniye; >1000 ise ms kabul et
  return duration > 1000 ? Math.round(duration) : Math.round(duration * 1000);
}

export type HikayeYerelMedya = {
  uri: string;
  mediaType: Exclude<HikayeMedyaTuru, 'text'>;
  mime?: string | null;
  durationMs?: number;
};

export type HikayeMedyaSecimSonucu =
  | {
      ok: true;
      url: string;
      mediaType: Exclude<HikayeMedyaTuru, 'text'>;
      localUri: string;
      durationMs?: number;
    }
  | { ok: false; hata: string; iptal?: boolean };

export type HikayeYerelSecimSonucu =
  | ({ ok: true } & HikayeYerelMedya)
  | { ok: false; hata: string; iptal?: boolean };

async function uploadBanKontrol(): Promise<string | null> {
  const { YaptirimAktifMi } = await import(
    '../../admin/ses-odalari/AdminSesOdasiIslemleri'
  );
  if (await YaptirimAktifMi('upload_ban')) {
    return i18n.t('hikaye.uploadBan');
  }
  return null;
}

function publicUrlOlustur(path: string): string | null {
  const { data: pub } = supabase.storage.from(HIKAYE_BUCKET).getPublicUrl(path);
  const base = OrtamDegiskenleri.supabaseUrl?.replace(/\/$/, '');
  const url =
    pub?.publicUrl ||
    `${base}/storage/v1/object/public/${HIKAYE_BUCKET}/${path}`;
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) return null;
  return url.trim();
}

/**
 * Büyük video: JS belleğine almadan FileSystem stream upload.
 * Küçük dosya / hata → klasik ArrayBuffer yolu.
 */
async function videoStreamYukle(opts: {
  uri: string;
  path: string;
  mime?: string | null;
  maxBytes: number;
}): Promise<{ ok: true } | { ok: false; hata: string } | { ok: false; fallback: true }> {
  try {
    const bayt = await HikayeDosyaBoyutuBayt(opts.uri);
    if (bayt != null && bayt > opts.maxBytes) {
      const gercekMb = Math.max(1, Math.round(bayt / (1024 * 1024)));
      const limitMb = Math.max(1, Math.round(opts.maxBytes / (1024 * 1024)));
      return {
        ok: false,
        hata: i18n.t('hikaye.videoCokBuyuk', {
          mb: gercekMb,
          limit: limitMb,
        }),
      };
    }

    // ~4 MB üstü stream — bellek + hız
    if (bayt != null && bayt < 4 * 1024 * 1024) {
      return { ok: false, fallback: true };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    const base = OrtamDegiskenleri.supabaseUrl?.replace(/\/$/, '');
    const anon = OrtamDegiskenleri.supabaseAnonAnahtari;
    if (!token || !base || !anon) return { ok: false, fallback: true };

    const ext = MedyaUzantisiCoz(opts.uri, opts.mime, 'mp4');
    const contentType = GuvenliMimeTipi(opts.mime, ext, 'video');
    const uploadUrl = `${base}/storage/v1/object/${HIKAYE_BUCKET}/${opts.path}`;

    const sonuc = await FileSystem.uploadAsync(uploadUrl, opts.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': contentType,
        'x-upsert': 'false',
      },
    });

    if (sonuc.status >= 200 && sonuc.status < 300) {
      return { ok: true };
    }

    const govde =
      typeof sonuc.body === 'string' ? sonuc.body.slice(0, 200) : '';
    if (/Payload too large|exceeded|Entity Too Large|413/i.test(govde)) {
      const limitMb = Math.max(1, Math.round(opts.maxBytes / (1024 * 1024)));
      return {
        ok: false,
        hata: i18n.t('hikaye.videoCokBuyuk', {
          mb: bayt != null ? Math.max(1, Math.round(bayt / (1024 * 1024))) : limitMb,
          limit: limitMb,
        }),
      };
    }

    return { ok: false, fallback: true };
  } catch {
    return { ok: false, fallback: true };
  }
}

/** Yayın anında yükle — seçimde upload yok (video hızı). */
export async function HikayeYerelMedyaYukle(input: {
  uri: string;
  mime?: string | null;
  tur: 'image' | 'video';
  durationMs?: number;
  onSikistirma?: (pct: number) => void;
}): Promise<HikayeMedyaSecimSonucu> {
  try {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') };

    const ban = await uploadBanKontrol();
    if (ban) return { ok: false, hata: ban };

    let uri = input.uri;
    let mime = input.mime;
    const uploadId =
      input.tur === 'video'
        ? `hikaye-${Date.now().toString(36)}`
        : null;

    if (uploadId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { UploadActivityBaslat } = require('../../tamuso-activity/entegrasyon/UploadActivityBagla') as {
          UploadActivityBaslat: (i: { uploadId: string; title?: string }) => Promise<void>;
        };
        void UploadActivityBaslat({
          uploadId,
          title: i18n.t('hikaye.videoYukleniyor', {
            defaultValue: 'Video yükleniyor',
          }),
        });
      } catch {
        /* ignore */
      }
    }

    if (input.tur === 'video') {
      const sik = await Video1080eSikistir(uri, {
        onProgress: (pct) => {
          input.onSikistirma?.(pct);
          if (uploadId) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const { UploadActivityIlerleme } = require('../../tamuso-activity/entegrasyon/UploadActivityBagla') as {
                UploadActivityIlerleme: (
                  id: string,
                  p: number,
                ) => Promise<void>;
              };
              // sıkıştırma 0..0.5 bandı
              void UploadActivityIlerleme(uploadId, pct * 0.5);
            } catch {
              /* ignore */
            }
          }
        },
        durationMs: input.durationMs,
      });
      if (sik.ok) {
        uri = sik.uri;
        mime = sik.mime;
      }
    }

    const ext = MedyaUzantisiCoz(
      uri,
      mime,
      input.tur === 'video' ? 'mp4' : 'jpg',
    );
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const maxBytes =
      input.tur === 'video'
        ? HIKAYE_VIDEO_MAX_BYTES || VIDEO_SIKISTIRMA_SONRASI_MAX_BYTES
        : 12 * 1024 * 1024;

    if (input.tur === 'video') {
      const stream = await videoStreamYukle({
        uri,
        path,
        mime,
        maxBytes,
      });
      if (stream.ok === true) {
        const url = publicUrlOlustur(path);
        if (!url) {
          if (uploadId) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const { UploadActivityHata } = require('../../tamuso-activity/entegrasyon/UploadActivityBagla') as {
                UploadActivityHata: (id: string) => Promise<void>;
              };
              void UploadActivityHata(uploadId);
            } catch {
              /* ignore */
            }
          }
          return { ok: false, hata: i18n.t('hikaye.gecersizAdres') };
        }
        if (uploadId) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { UploadActivityTamam } = require('../../tamuso-activity/entegrasyon/UploadActivityBagla') as {
              UploadActivityTamam: (id: string) => Promise<void>;
            };
            void UploadActivityTamam(uploadId);
          } catch {
            /* ignore */
          }
        }
        return {
          ok: true,
          url,
          mediaType: 'video',
          localUri: uri,
          durationMs: input.durationMs,
        };
      }
      if ('hata' in stream && stream.hata) {
        if (uploadId) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { UploadActivityHata } = require('../../tamuso-activity/entegrasyon/UploadActivityBagla') as {
              UploadActivityHata: (id: string) => Promise<void>;
            };
            void UploadActivityHata(uploadId);
          } catch {
            /* ignore */
          }
        }
        return { ok: false, hata: stream.hata };
      }
      // fallback → klasik (sıkıştırma DepoyaMedyaYukle'de tekrarlanmasın)
    }

    const up = await DepoyaMedyaYukle(supabase, {
      bucket: HIKAYE_BUCKET,
      path,
      uri,
      mime,
      tur: input.tur,
      upsert: false,
      maxBytes,
      sikistir: false,
    });
    if (!up.ok) {
      if (uploadId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { UploadActivityHata } = require('../../tamuso-activity/entegrasyon/UploadActivityBagla') as {
            UploadActivityHata: (id: string) => Promise<void>;
          };
          void UploadActivityHata(uploadId);
        } catch {
          /* ignore */
        }
      }
      return { ok: false, hata: up.hata };
    }

    const url = publicUrlOlustur(path);
    if (!url) {
      if (uploadId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { UploadActivityHata } = require('../../tamuso-activity/entegrasyon/UploadActivityBagla') as {
            UploadActivityHata: (id: string) => Promise<void>;
          };
          void UploadActivityHata(uploadId);
        } catch {
          /* ignore */
        }
      }
      return { ok: false, hata: i18n.t('hikaye.gecersizAdres') };
    }

    if (uploadId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { UploadActivityTamam } = require('../../tamuso-activity/entegrasyon/UploadActivityBagla') as {
          UploadActivityTamam: (id: string) => Promise<void>;
        };
        void UploadActivityTamam(uploadId);
      } catch {
        /* ignore */
      }
    }

    return {
      ok: true,
      url,
      mediaType: input.tur,
      localUri: uri,
      durationMs: input.durationMs,
    };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('hikaye.yuklemeBasarisiz'),
    };
  }
}

/** Galeri seç — hemen yerel URI döner, upload yok */
export async function HikayeMedyasiGaleriSec(opts?: {
  allowVideo?: boolean;
  /** true: yalnızca video galerisi */
  onlyVideo?: boolean;
}): Promise<HikayeYerelSecimSonucu> {
  try {
    const mediaTypes = opts?.onlyVideo
      ? (['videos'] as const)
      : opts?.allowVideo === false
        ? (['images'] as const)
        : (['images', 'videos'] as const);
    const secim = await GaleriAc({
      mediaTypes: [...mediaTypes],
      quality: 1,
    });
    if (!secim.ok) return secim;

    const asset = secim.asset;
    const isVideo =
      opts?.onlyVideo === true ||
      (asset.mimeType ?? '').startsWith('video') ||
      /\.(mp4|mov|webm|m4v)$/i.test(asset.uri);

    if (opts?.onlyVideo && !isVideo) {
      return { ok: false, hata: i18n.t('hikaye.videoSecilmedi') };
    }

    return {
      ok: true,
      uri: asset.uri,
      mediaType: isVideo ? 'video' : 'image',
      mime: asset.mimeType,
      durationMs: sureMsNormalize(asset.duration),
    };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('hikaye.yuklemeBasarisiz'),
    };
  }
}

/** @deprecated — geriye uyum; seç + yükle (yavaş). Yeni akış: Sec → yayınla Yukle */
export async function HikayeMedyasiGaleriSecVeYukle(opts?: {
  onYuklemeBasladi?: () => void;
  allowVideo?: boolean;
}): Promise<HikayeMedyaSecimSonucu> {
  const sec = await HikayeMedyasiGaleriSec({ allowVideo: opts?.allowVideo });
  if (!sec.ok) return sec;
  opts?.onYuklemeBasladi?.();
  return HikayeYerelMedyaYukle({
    uri: sec.uri,
    mime: sec.mime,
    tur: sec.mediaType,
    durationMs: sec.durationMs,
  });
}

/** @deprecated — CameraView kullan; ImagePicker kamera yedek */
export async function HikayeMedyasiKameraSecVeYukle(opts?: {
  onYuklemeBasladi?: () => void;
  video?: boolean;
}): Promise<HikayeMedyaSecimSonucu> {
  const { KameraAc } = await import('../../../ortak/medya/ImagePickerHazirMi');
  try {
    const secim = await KameraAc({
      mediaTypes: opts?.video ? ['videos'] : ['images'],
      // Galeri/kamera süre limiti yok — 1080p sıkıştırma
    });
    if (!secim.ok) return secim;
    opts?.onYuklemeBasladi?.();
    const asset = secim.asset;
    const isVideo = !!opts?.video || (asset.mimeType ?? '').startsWith('video');
    return HikayeYerelMedyaYukle({
      uri: asset.uri,
      mime: asset.mimeType,
      tur: isVideo ? 'video' : 'image',
      durationMs: sureMsNormalize(asset.duration),
    });
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('hikaye.yuklemeBasarisiz'),
    };
  }
}
