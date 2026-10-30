/**
 * Personel girişi için tarayıcı taraflı hız sınırı.
 *
 * Supabase zaten kendi hız sınırını uygular; bu katman kaba kuvvet denemelerini
 * tarayıcıda erkenden keser ve personeli kilitlenme durumundan haberdar eder.
 *
 * Saklananlar: yalnızca deneme sayısı ve zaman damgası.
 * E-posta, kullanıcı adı veya şifre ASLA saklanmaz.
 */

const DEPO_ANAHTARI = 'tamuso_admin_giris_kilit_v1';

const PENCERE_MS = 15 * 60 * 1000;
const AZAMI_DENEME = 5;
const ILK_KILIT_MS = 2 * 60 * 1000;
const AZAMI_KILIT_MS = 30 * 60 * 1000;

type KilitDurumu = {
  /** Son penceredeki başarısız denemelerin zaman damgaları. */
  denemeler: number[];
  /** Ardışık kilitlenme sayısı — kilit süresini üstel büyütür. */
  kilitSayisi: number;
  /** Kilit bu ana kadar sürer (epoch ms). */
  kilitBitis: number;
};

const BOS_DURUM: KilitDurumu = { denemeler: [], kilitSayisi: 0, kilitBitis: 0 };

function depo(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.localStorage;
    s.getItem(DEPO_ANAHTARI);
    return s;
  } catch {
    // Gizli mod / depolama kapalı — kilit devre dışı, giriş engellenmez.
    return null;
  }
}

function oku(): KilitDurumu {
  const s = depo();
  if (!s) return BOS_DURUM;
  try {
    const ham = s.getItem(DEPO_ANAHTARI);
    if (!ham) return BOS_DURUM;
    const j = JSON.parse(ham) as Partial<KilitDurumu>;
    return {
      denemeler: Array.isArray(j.denemeler)
        ? j.denemeler.filter((t): t is number => typeof t === 'number')
        : [],
      kilitSayisi: typeof j.kilitSayisi === 'number' ? j.kilitSayisi : 0,
      kilitBitis: typeof j.kilitBitis === 'number' ? j.kilitBitis : 0,
    };
  } catch {
    return BOS_DURUM;
  }
}

function yaz(d: KilitDurumu): void {
  const s = depo();
  if (!s) return;
  try {
    s.setItem(DEPO_ANAHTARI, JSON.stringify(d));
  } catch {
    /* kota dolu — sessizce geç */
  }
}

function pencereyiTemizle(d: KilitDurumu, simdi: number): KilitDurumu {
  const denemeler = d.denemeler.filter((t) => simdi - t < PENCERE_MS);
  return { ...d, denemeler };
}

export type KilitBilgisi = {
  kilitli: boolean;
  kalanSaniye: number;
  kalanDeneme: number;
};

/** Giriş denemesi yapılmadan önce çağrılır. */
export function kilitDurumunuGetir(): KilitBilgisi {
  const simdi = Date.now();
  const d = pencereyiTemizle(oku(), simdi);
  const kilitli = d.kilitBitis > simdi;
  return {
    kilitli,
    kalanSaniye: kilitli ? Math.ceil((d.kilitBitis - simdi) / 1000) : 0,
    kalanDeneme: Math.max(0, AZAMI_DENEME - d.denemeler.length),
  };
}

/** Başarısız denemeden sonra çağrılır. */
export function basarisizDenemeKaydet(): KilitBilgisi {
  const simdi = Date.now();
  const mevcut = pencereyiTemizle(oku(), simdi);
  const denemeler = [...mevcut.denemeler, simdi];

  if (denemeler.length < AZAMI_DENEME) {
    const sonraki: KilitDurumu = { ...mevcut, denemeler };
    yaz(sonraki);
    return {
      kilitli: false,
      kalanSaniye: 0,
      kalanDeneme: AZAMI_DENEME - denemeler.length,
    };
  }

  const kilitSayisi = mevcut.kilitSayisi + 1;
  const sure = Math.min(ILK_KILIT_MS * 2 ** (kilitSayisi - 1), AZAMI_KILIT_MS);
  yaz({ denemeler: [], kilitSayisi, kilitBitis: simdi + sure });

  return { kilitli: true, kalanSaniye: Math.ceil(sure / 1000), kalanDeneme: 0 };
}

/** Başarılı girişte sayaç sıfırlanır. */
export function basariliGirisiKaydet(): void {
  const s = depo();
  if (!s) return;
  try {
    s.removeItem(DEPO_ANAHTARI);
  } catch {
    /* yok say */
  }
}

/** Saniye → "2:05" biçimi. */
export function sureBicimle(saniye: number): string {
  const dk = Math.floor(saniye / 60);
  const sn = saniye % 60;
  return `${dk}:${String(sn).padStart(2, '0')}`;
}
