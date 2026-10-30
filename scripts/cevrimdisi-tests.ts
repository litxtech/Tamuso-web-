/**
 * Çevrimdışı motor — saf mantık ve bellek deposu.
 * Çalıştır: npm run test:cevrimdisi
 */
import { bellekKvDepoOlustur } from '../src/moduller/cevrimdisi/depo/BellekKvDepo';
import { cevrimdisiDepoAyarla, cevrimdisiOku, cevrimdisiYaz } from '../src/moduller/cevrimdisi/CevrimdisiDeposu';
import { sonrakiBeklemeMs, MAKS_DENEME } from '../src/moduller/cevrimdisi/saf/GeriCekilme';
import { baytEtiket, kotaHesapla, OTOMATIK_KOTA_BAYT, MANUEL_KOTA_BAYT } from '../src/moduller/cevrimdisi/saf/KotaHesabi';
import { hikayeSuresiGecerliMi, hikayeOgeleriFiltrele } from '../src/moduller/cevrimdisi/saf/HikayeSuresi';
import { catismaSinifla } from '../src/moduller/cevrimdisi/saf/Catisma';
import { semaCoz, semaSar } from '../src/moduller/cevrimdisi/saf/SemaGoc';
import { tahliyeEt } from '../src/moduller/cevrimdisi/saf/LruTahliye';
import {
  kuyrukAcilistaDuzelt,
  kuyrukIsle,
  kuyrugaBirlestir,
  type KuyrukKaydi,
} from '../src/moduller/cevrimdisi/saf/KuyrukMantigi';
import { IslemKuyrugaEkle, IslemKuyruguCalistir } from '../src/moduller/cevrimdisi/IslemKuyrugu';
import { kuyrugaAlinmaliMi } from '../src/moduller/cevrimdisi/saf/KuyrukKarari';
import { uuidGecerliMi, yerliUuid } from '../src/moduller/cevrimdisi/saf/Uuid';
import { AnlikBoyutlari, FeedAnlikOku, FeedAnlikYaz, HikayeGrupOku, HikayeGrupYaz, HikayeTepsiOku, HikayeTepsiYaz, OnbellekParcaSil, ProfilAnlikOku, ProfilAnlikYaz } from '../src/moduller/cevrimdisi/AnlikGoruntu';

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  }
}

assert(sonrakiBeklemeMs(0) === 1000, 'backoff 1s');
assert(sonrakiBeklemeMs(1) === 2000, 'backoff 2s');
assert(sonrakiBeklemeMs(2) === 4000, 'backoff 4s');
assert(sonrakiBeklemeMs(3) === 8000, 'backoff 8s');
assert(sonrakiBeklemeMs(4) === 16000, 'backoff 16s');
assert(sonrakiBeklemeMs(5) === 30000, 'backoff 30s');
assert(sonrakiBeklemeMs(9) === 30000, 'backoff tavan 30s');
assert(MAKS_DENEME === 6, 'maks deneme 6');

assert(uuidGecerliMi(yerliUuid()), 'yorum client id uuid');
assert(!uuidGecerliMi('yerel-1'), 'sahte id uuid değil');
assert(
  kuyrugaAlinmaliMi({ offline: true, hata: 'Yorum bos', idempotent: false, catisma: false }),
  'çevrimdışı kuyruk',
);
assert(
  !kuyrugaAlinmaliMi({
    offline: false,
    hata: 'timeout',
    idempotent: false,
    catisma: false,
  }),
  'yavaş ağ beğeniyi kuyruğa yazmaz',
);
assert(
  kuyrugaAlinmaliMi({
    offline: false,
    hata: 'Network request failed',
    idempotent: true,
    catisma: false,
  }),
  'yorum zaman aşımı client id ile kuyruk',
);
assert(
  !kuyrugaAlinmaliMi({
    offline: false,
    hata: 'Yorum bos olamaz',
    idempotent: true,
    catisma: false,
  }),
  'doğrulama kuyruğa girmez',
);

const bos700 = 700 * 1024 * 1024;
assert(kotaHesapla(bos700, true) < MANUEL_KOTA_BAYT, '700 MB boşta 2 GB yok');
assert(kotaHesapla(bos700, true) <= Math.floor(bos700 * 0.2), 'boş alanın %20 tavanı');
assert(kotaHesapla(8 * 1024 * 1024 * 1024, false) === OTOMATIK_KOTA_BAYT, 'otomatik kota 700 MB');
assert(kotaHesapla(100 * 1024 * 1024, true) < 64 * 1024 * 1024, 'düşük depoda büyümez');
assert(baytEtiket(0) === '0 MB', 'boş önbellek');
assert(baytEtiket(20 * 1024) === '20 KB', 'küçük önbellek 0.0 MB yazmaz');
assert(baytEtiket(12 * 1024 * 1024) === '12 MB', 'medya megabayt');

const simdi = Date.parse('2026-10-08T12:00:00.000Z');
assert(hikayeSuresiGecerliMi('2026-10-08T18:00:00.000Z', simdi), 'story geçerli');
assert(!hikayeSuresiGecerliMi('2026-10-08T11:00:00.000Z', simdi), 'story süresi dolmuş');
assert(!hikayeSuresiGecerliMi(null, simdi), 'expiry yoksa gösterme');
const canli = hikayeOgeleriFiltrele(
  [
    { id: 'a', expires_at: '2026-10-08T18:00:00.000Z' },
    { id: 'b', expires_at: '2026-10-08T10:00:00.000Z' },
  ],
  simdi,
);
assert(canli.length === 1 && canli[0]!.id === 'a', 'dolmuş story elenir');

assert(catismaSinifla('user blocked') === 'user_blocked', 'engel');
assert(catismaSinifla('post deleted') === 'post_deleted', 'post silindi');
assert(catismaSinifla('content expired') === 'content_expired', 'süre');
assert(catismaSinifla('account disabled') === 'account_disabled', 'hesap');
assert(catismaSinifla('conversation deleted') === 'conversation_deleted', 'sohbet');
assert(semaCoz('{').ok === false, 'bozuk json düşürmez');
assert(semaCoz(semaSar({ a: 1 })).ok === true, 'sema sarma');

const tahliye = tahliyeEt(
  [
    { id: 'd', alan: 'draft', bytes: 500, lastUsedAt: 1 },
    { id: 'p', alan: 'pin', bytes: 500, lastUsedAt: 1 },
    { id: 'm', alan: 'media', bytes: 800, lastUsedAt: 1 },
    { id: 'f', alan: 'feed', bytes: 100, lastUsedAt: 5 },
  ],
  700,
);
assert(tahliye.silinen.some((k) => k.id === 'm'), 'eski medya silinir');
assert(tahliye.kalan.some((k) => k.id === 'd'), 'taslak silinmez');
assert(tahliye.kalan.some((k) => k.id === 'p'), 'manuel kayıt silinmez');

function like(liked: boolean, n: number): KuyrukKaydi {
  return {
    id: 'like:p1',
    type: 'like',
    payload: { statusId: 'p1', liked },
    priority: 40,
    createdAt: `2026-10-08T12:00:0${n}.000Z`,
    retryCount: 0,
    status: 'PENDING',
    idempotencyKey: 'like:p1',
  };
}
let liste: KuyrukKaydi[] = [];
for (const [liked, n] of [
  [true, 1],
  [false, 2],
  [true, 3],
  [false, 4],
  [true, 5],
] as const) {
  liste = kuyrugaBirlestir(liste, like(liked, n));
}
assert(liste.length === 1, 'like olayları birleşir');
assert(liste[0]!.payload.liked === true, 'son durum LIKE');

const yorum = kuyrugaBirlestir(
  [
    {
      id: 'c1',
      type: 'comment',
      payload: { body: 'Çok güzel' },
      priority: 30,
      createdAt: '2026-10-08T12:00:00.000Z',
      retryCount: 0,
      status: 'PENDING',
      idempotencyKey: 'comment:c1',
    },
  ],
  {
    id: 'c1',
    type: 'comment',
    payload: { body: 'Çok güzel' },
    priority: 30,
    createdAt: '2026-10-08T12:00:01.000Z',
    retryCount: 0,
    status: 'PENDING',
    idempotencyKey: 'comment:c1',
  },
);
assert(yorum.length === 1, 'yorum idempotency');

const duzelen = kuyrukAcilistaDuzelt([
  {
    id: 'x',
    type: 'comment',
    payload: {},
    priority: 30,
    createdAt: '2026-10-08T12:00:00.000Z',
    retryCount: 0,
    status: 'PROCESSING',
    idempotencyKey: 'comment:x',
  },
]);
assert(duzelen[0]!.status === 'PENDING', 'çökme sonrası PENDING');

const depo = bellekKvDepoOlustur();
cevrimdisiDepoAyarla(depo);

async function kabul() {
  const userA = 'user-a';
  const userB = 'user-b';
  await FeedAnlikYaz(userA, [{ id: 'oda:1', title: 'Oda', cachedAt: '2026-10-08T12:00:00.000Z' }]);
  await HikayeTepsiYaz(userA, [{ user_id: 'ali', display_name: 'Ali' }]);
  await HikayeGrupYaz(userA, 'ali', {
    expires_at: '2026-10-08T18:00:00.000Z',
    items: [
      { id: 's1', expires_at: '2026-10-08T18:00:00.000Z' },
      { id: 's2', expires_at: '2026-10-08T10:00:00.000Z' },
    ],
  });
  await ProfilAnlikYaz(userA, {
    id: 'ali',
    username: 'ali',
    display_name: 'Ali',
    bio: 'bio',
    avatar_url: 'https://cdn/a.jpg',
  });
  await cevrimdisiYaz(userA, 'dm', [{ body: 'Yarın görüşürüz.' }]);

  const feed = await FeedAnlikOku(userA);
  assert(Array.isArray(feed) && feed.length === 1, 'offline feed');
  const tepsi = await HikayeTepsiOku(userA, simdi);
  assert(tepsi.length === 1, 'geçerli story tepside');
  const grup = await HikayeGrupOku<{ items: { id: string }[] }>(userA, 'ali', simdi);
  assert(grup?.items.length === 1 && grup.items[0]!.id === 's1', 'dolmuş story gizlenir');
  const profil = await ProfilAnlikOku(userA, 'ali');
  assert(profil?.username === 'ali' && !('phone_e164' in (profil ?? {})), 'profil temel alan');

  await FeedAnlikYaz(userB, [{ id: 'baska' }]);
  const bFeed = await FeedAnlikOku(userB);
  const aFeed = await FeedAnlikOku(userA);
  assert(JSON.stringify(bFeed) !== JSON.stringify(aFeed), 'hesaplar izole');
  const bDm = await cevrimdisiOku<unknown[]>(userB, 'dm', []);
  assert(bDm.length === 0, 'B, A mesajını görmez');

  await IslemKuyrugaEkle(userA, {
    type: 'like',
    idempotencyKey: 'like:posta',
    payload: { statusId: 'posta', liked: true },
  });
  await IslemKuyrugaEkle(userA, {
    type: 'like',
    idempotencyKey: 'like:posta',
    payload: { statusId: 'posta', liked: false },
  });
  await IslemKuyrugaEkle(userA, {
    type: 'like',
    idempotencyKey: 'like:posta',
    payload: { statusId: 'posta', liked: true },
  });
  await IslemKuyrugaEkle(userA, {
    type: 'comment',
    id: 'c-merhaba',
    idempotencyKey: 'comment:c-merhaba',
    payload: { body: 'Tamam.' },
  });
  await IslemKuyrugaEkle(userA, {
    type: 'comment',
    id: 'c-merhaba',
    idempotencyKey: 'comment:c-merhaba',
    payload: { body: 'Tamam.' },
  });

  const gonderilen: string[] = [];
  const sonuc = await IslemKuyruguCalistir(
    userA,
    async (k) => {
      gonderilen.push(`${k.type}:${k.idempotencyKey}:${JSON.stringify(k.payload)}`);
      return { ok: true };
    },
    { simdiMs: simdi, depo },
  );
  assert(gonderilen.filter((g) => g.startsWith('like:')).length === 1, 'sunucuya tek LIKE');
  assert(gonderilen.some((g) => g.includes('"liked":true')), 'final LIKE');
  assert(gonderilen.filter((g) => g.startsWith('comment:')).length === 1, 'yorum bir kez');
  assert(sonuc.kalan === 0, 'kuyruk temiz');

  const beklet = await kuyrukIsle(
    [
      {
        id: 'v1',
        type: 'video',
        payload: {},
        priority: 80,
        createdAt: '2026-10-08T12:00:00.000Z',
        retryCount: 0,
        status: 'PENDING',
        idempotencyKey: 'video:v1',
      },
    ],
    simdi,
    async () => ({ ok: true }),
    { videoIzinli: false },
  );
  assert(beklet.gonderilen === 0 && beklet.liste.length === 1, 'wifi yokken video bekler');

  const catisma = await kuyrukIsle(
    [
      {
        id: 'c2',
        type: 'comment',
        payload: {},
        priority: 30,
        createdAt: '2026-10-08T12:00:00.000Z',
        retryCount: 0,
        status: 'PENDING',
        idempotencyKey: 'comment:c2',
      },
    ],
    simdi,
    async () => ({ ok: false, hata: 'post deleted' }),
  );
  assert(catisma.liste[0]?.status === 'FAILED', 'çakışma FAILED');
  assert(catisma.liste[0]?.conflict === 'post_deleted', 'yerel kayıt durur');

  await cevrimdisiYaz(userA, 'kuyruk', [{ id: 'm1', body: 'Yarın görüşürüz, taslak metin.' }]);
  await cevrimdisiYaz(userA, 'medya', {
    kayitlar: [
      { id: 'image:https://a', alan: 'story', bytes: 4 * 1024 * 1024, lastUsedAt: 1, yerel: 'file:///tmp/a' },
      { id: 'video:https://b', alan: 'media', bytes: 20 * 1024 * 1024, lastUsedAt: 1, yerel: 'file:///tmp/b' },
      { id: 'pin:image:https://c', alan: 'pin', bytes: 1024 * 1024, lastUsedAt: 1, yerel: 'file:///tmp/c' },
    ],
    cachedAt: '2026-10-11T12:00:00.000Z',
    bytes: 90,
  });
  const once = await AnlikBoyutlari(userA);
  assert(once.feed > 0, 'feed boyutu görünür');
  assert(once.kuyruk > 0, 'mesaj kuyruğu boyutu görünür');
  assert(once.medya >= 25 * 1024 * 1024, 'medya dosya baytı, indeks json değil');
  await OnbellekParcaSil(userA, 'image');
  const fotoSonra = await AnlikBoyutlari(userA);
  assert(fotoSonra.medya < once.medya, 'foto temizliği boyutu düşürür');
  const medya = await cevrimdisiOku<{ kayitlar: { id: string }[] }>(userA, 'medya', { kayitlar: [] });
  const ids = medya.kayitlar.map((k) => k.id);
  assert(!ids.some((id) => id.startsWith('image:')), 'foto indeksi silindi');
  assert(ids.some((id) => id.startsWith('video:')), 'video durur');
  assert(ids.some((id) => id.startsWith('pin:')), 'manuel kayıt durur');
  await OnbellekParcaSil(userA, 'feed');
  const feedSonra = await AnlikBoyutlari(userA);
  assert(feedSonra.feed === 0, 'feed temizliği');
}

kabul()
  .then(() => {
    if (failed > 0) {
      console.error(`cevrimdisi-tests: ${failed} FAIL`);
      process.exit(1);
    }
    console.log('cevrimdisi-tests: OK');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
