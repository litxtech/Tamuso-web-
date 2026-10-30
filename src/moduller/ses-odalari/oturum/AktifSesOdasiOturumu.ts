/**
 * Aktif ses odası oturumu — küçültülünce medya bağlantısını canlı tutar.
 * Normal çıkışta bitirilir; arka planda iken MedyaOdasiKes çağrılmaz.
 */

export type AktifSesOdasiDurum = {
  roomId: string;
  title: string;
  coverUrl?: string | null;
  /** true: oda ekranı blur olsa bile LiveKit açık kalsın */
  arkaPlanda: boolean;
  micAcik: boolean;
  dinleyiciSayisi: number;
};

type Dinleyici = (durum: AktifSesOdasiDurum | null) => void;

let durum: AktifSesOdasiDurum | null = null;
const dinleyiciler = new Set<Dinleyici>();
/** Küçültme anı — hemen ardından gelen odak/load pencereyi kapatmasın */
let kucultulduguAn = 0;
/** profil: oda ekranı altta durur, kapanınca küçük pencere kapanmalı */
let arkaPlanNedeni: 'profil' | 'kucult' | null = null;

function yayinla() {
  dinleyiciler.forEach((fn) => fn(durum));
}

export function AktifSesOdasiDurumunuAl(): AktifSesOdasiDurum | null {
  return durum;
}

export function AktifSesOdasiArkaPlandaMi(): boolean {
  return !!durum?.arkaPlanda;
}

export function AktifSesOdasiCanliMi(): boolean {
  return !!durum;
}

/** Küçültmeden hemen sonra gelen sahte odak / yeniden bağlanma */
export function AktifSesOdasiKucultmeTazeMi(ms = 4000): boolean {
  return kucultulduguAn > 0 && Date.now() - kucultulduguAn < ms;
}

/** Profil ziyareti — odaya dönünce küçük pencere kapanır */
export function AktifSesOdasiProfilZiyaretiMi(): boolean {
  return arkaPlanNedeni === 'profil';
}

export function AktifSesOdasiDinle(fn: Dinleyici): () => void {
  dinleyiciler.add(fn);
  fn(durum);
  return () => {
    dinleyiciler.delete(fn);
  };
}

export function AktifSesOdasiBaslat(input: {
  roomId: string;
  title: string;
  coverUrl?: string | null;
  micAcik?: boolean;
  dinleyiciSayisi?: number;
}): void {
  const ayni =
    durum?.roomId === input.roomId &&
    (durum.arkaPlanda || (kucultulduguAn > 0 && Date.now() - kucultulduguAn < 4000));
  durum = {
    roomId: input.roomId,
    title: input.title,
    coverUrl: input.coverUrl ?? null,
    arkaPlanda: ayni ? true : false,
    micAcik: input.micAcik ?? false,
    dinleyiciSayisi: input.dinleyiciSayisi ?? 0,
  };
  if (!ayni) {
    kucultulduguAn = 0;
    arkaPlanNedeni = null;
  }
  yayinla();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SesOdasiActivityBaslat } = require('../../tamuso-activity/entegrasyon/SesOdasiActivityBagla') as {
      SesOdasiActivityBaslat: (i: {
        roomId: string;
        roomName: string;
        participantCount?: number;
      }) => Promise<void>;
    };
    void SesOdasiActivityBaslat({
      roomId: input.roomId,
      roomName: input.title,
      participantCount: input.dinleyiciSayisi ?? 0,
    });
  } catch {
    /* Live Activity native yok */
  }
}

/** Küçült / profil — oda ekranı blur olur ama ses devam eder */
export function AktifSesOdasiArkaPlanaAl(
  neden: 'profil' | 'kucult' = 'kucult',
): void {
  if (!durum) return;
  kucultulduguAn = Date.now();
  arkaPlanNedeni = neden;
  durum = { ...durum, arkaPlanda: true };
  yayinla();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MedyaMiniSesiniTut } = require('../../livekit/MedyaBaglantisi') as {
      MedyaMiniSesiniTut: () => void;
    };
    MedyaMiniSesiniTut();
  } catch {
    /* ses modülü */
  }
}

/** Oda ekranına dönünce. Küçültme sonrası sahte odak bunu çağırmamalı. */
export function AktifSesOdasiOneCikar(): void {
  if (!durum) return;
  kucultulduguAn = 0;
  arkaPlanNedeni = null;
  durum = { ...durum, arkaPlanda: false };
  yayinla();
}

export function AktifSesOdasiGuncelle(patch: {
  title?: string;
  coverUrl?: string | null;
  micAcik?: boolean;
  dinleyiciSayisi?: number;
}): void {
  if (!durum) return;
  durum = {
    ...durum,
    ...(patch.title != null ? { title: patch.title } : null),
    ...(patch.coverUrl !== undefined ? { coverUrl: patch.coverUrl } : null),
    ...(patch.micAcik != null ? { micAcik: patch.micAcik } : null),
    ...(patch.dinleyiciSayisi != null
      ? { dinleyiciSayisi: patch.dinleyiciSayisi }
      : null),
  };
  yayinla();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SesOdasiActivityGuncelle } = require('../../tamuso-activity/entegrasyon/SesOdasiActivityBagla') as {
      SesOdasiActivityGuncelle: (i: {
        roomId: string;
        roomName?: string;
        participantCount?: number;
      }) => Promise<void>;
    };
    void SesOdasiActivityGuncelle({
      roomId: durum.roomId,
      roomName: durum.title,
      participantCount: durum.dinleyiciSayisi,
    });
  } catch {
    /* ignore */
  }
}

/** Normal çıkış / oda kapandı — oturum state temizlenir (medya ayrı kesilir) */
export function AktifSesOdasiBitir(): void {
  if (!durum) return;
  const roomId = durum.roomId;
  durum = null;
  kucultulduguAn = 0;
  arkaPlanNedeni = null;
  yayinla();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SesOdasiActivityBitir } = require('../../tamuso-activity/entegrasyon/SesOdasiActivityBagla') as {
      SesOdasiActivityBitir: (id?: string) => Promise<void>;
    };
    void SesOdasiActivityBitir(roomId);
  } catch {
    /* ignore */
  }
}
