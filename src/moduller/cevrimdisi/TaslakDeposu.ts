import { cevrimdisiOku, cevrimdisiYaz } from './CevrimdisiDeposu';

export type TaslakTuru = 'post' | 'story' | 'message' | 'comment' | 'profile';

export type CevrimdisiTaslak = {
  id: string;
  type: TaslakTuru;
  text: string;
  images: string[];
  video: string | null;
  hashtags: string[];
  mentions: string[];
  location: string | null;
  createdAt: string;
  /** Otomatik yayın kapalıyken kullanıcı onayı bekler. */
  hazir: boolean;
  ekstra?: Record<string, unknown>;
};

const ALAN = 'taslak';

function gecerli(x: unknown): x is CevrimdisiTaslak {
  if (!x || typeof x !== 'object') return false;
  const t = x as CevrimdisiTaslak;
  return typeof t.id === 'string' && typeof t.type === 'string' && typeof t.createdAt === 'string';
}

export async function TaslaklariGetir(userId: string): Promise<CevrimdisiTaslak[]> {
  const ham = await cevrimdisiOku<unknown>(userId, ALAN, []);
  if (!Array.isArray(ham)) return [];
  return ham.filter(gecerli);
}

export async function TaslakKaydet(
  userId: string,
  taslak: Omit<CevrimdisiTaslak, 'createdAt' | 'hazir'> & {
    createdAt?: string;
    hazir?: boolean;
  },
): Promise<CevrimdisiTaslak> {
  const liste = await TaslaklariGetir(userId);
  const kayit: CevrimdisiTaslak = {
    id: taslak.id,
    type: taslak.type,
    text: taslak.text ?? '',
    images: taslak.images ?? [],
    video: taslak.video ?? null,
    hashtags: taslak.hashtags ?? [],
    mentions: taslak.mentions ?? [],
    location: taslak.location ?? null,
    createdAt: taslak.createdAt ?? new Date().toISOString(),
    hazir: taslak.hazir !== false,
    ekstra: taslak.ekstra,
  };
  const diger = liste.filter((t) => t.id !== kayit.id);
  await cevrimdisiYaz(userId, ALAN, [kayit, ...diger].slice(0, 100));
  return kayit;
}

export async function TaslakSil(userId: string, id: string): Promise<void> {
  const liste = (await TaslaklariGetir(userId)).filter((t) => t.id !== id);
  await cevrimdisiYaz(userId, ALAN, liste);
}
