import type { AdminOzet } from '../admin/okuma/AdminOzetGetir';
import type { BelgeIcerik } from './BelgeSablonlari';
import {
  LedgerAnlasilirOzet,
  LedgerBirimEtiketi,
  LedgerRefEtiketi,
  LedgerSebepEtiketi,
  LedgerTutarYazi,
  type LedgerSatiri,
} from '../cuzdan/okuma/CuzdanLedgeriniGetir';
import type { HediyeGecmisiKaydi } from '../hediyeler/okuma/HediyeGecmisiniGetir';
import { CEKIM_ODEME_BILGISI } from '../cuzdan/cekim/CekimOdemeBilgisi';
import type {
  AdminCiroOzeti,
  CiroDonem,
} from '../admin/ciro/AdminCiroOzetiGetir';
import { SayiKisa } from '../admin/bilesenler/AdminStil';
import i18n from '../../i18n';
import { DilNormalizeEt, DIL_LOCALE_MAP } from '../../i18n/diller';

function belgelocale(): string {
  return DIL_LOCALE_MAP[DilNormalizeEt(i18n.language)];
}

function tryYazi(n: number): string {
  return `${Number(n || 0).toLocaleString(belgelocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₺`;
}

function donemEtiket(d: CiroDonem): string {
  return i18n.t(`belge.admin.donem.${d}`);
}

/** Admin ciro raporu — PDF / WhatsApp / yazıcı */
export function AdminCiroBelgesiOlustur(data: AdminCiroOzeti | null): BelgeIcerik {
  const period = data?.period ?? 'today';
  const m = data?.ozet?.[period] ?? { try: 0, coins: 0, adet: 0 };
  const o = data?.ozet;
  const dil = belgelocale();
  const donem = donemEtiket(period);
  return {
    baslik: i18n.t('belge.admin.ciroBaslik'),
    altBaslik: i18n.t('belge.admin.ciroAlt', { donem }),
    platformAdi: 'Tamuso',
    ozet: i18n.t('belge.admin.ciroOzet', {
      donem,
      try: tryYazi(m.try),
      coins: SayiKisa(m.coins),
      adet: m.adet,
    }),
    satirlar: [
      { etiket: i18n.t('belge.admin.donemLabel'), deger: donem },
      { etiket: i18n.t('belge.admin.ciroTry'), deger: tryYazi(m.try) },
      { etiket: i18n.t('belge.admin.coin'), deger: SayiKisa(m.coins) },
      { etiket: i18n.t('belge.admin.islemAdedi'), deger: String(m.adet) },
      {
        etiket: i18n.t('belge.raporZamani'),
        deger: data?.generated_at
          ? new Date(data.generated_at).toLocaleString(dil)
          : new Date().toLocaleString(dil),
      },
    ],
    bolumler: [
      {
        baslik: i18n.t('belge.admin.ozetKartlar'),
        satirlar: [
          { etiket: donemEtiket('today'), deger: tryYazi(o?.today.try ?? 0) },
          { etiket: donemEtiket('week'), deger: tryYazi(o?.week.try ?? 0) },
          { etiket: donemEtiket('month'), deger: tryYazi(o?.month.try ?? 0) },
          { etiket: i18n.t('belge.admin.toplam'), deger: tryYazi(o?.all.try ?? 0) },
        ],
      },
      {
        baslik: i18n.t('belge.admin.kimden'),
        ozet: i18n.t('belge.admin.kimdenOzet', {
          n: data?.kimden?.length ?? 0,
        }),
        satirlar: (data?.kimden ?? []).slice(0, 40).map((k) => ({
          etiket:
            k.display_name ||
            k.username ||
            k.public_user_id ||
            i18n.t('belge.kullanici'),
          deger: i18n.t('belge.admin.kimdenSatir', {
            try: tryYazi(Number(k.toplam_try)),
            coins: SayiKisa(Number(k.toplam_coin)),
            adet: k.islem_adet,
          }),
        })),
      },
      {
        baslik: i18n.t('belge.admin.sonIslemler'),
        satirlar: (data?.islemler ?? []).slice(0, 40).map((i) => ({
          etiket: `${i.display_name} · ${new Date(i.created_at).toLocaleString(dil)}`,
          deger: i18n.t('belge.admin.islemSatir', {
            try: tryYazi(Number(i.amount_try)),
            coins: SayiKisa(Number(i.coins_added)),
          }),
        })),
      },
    ],
    not: i18n.t('belge.admin.ciroNot'),
  };
}

/** Belge donusumu icin hareket detayi (UI tipinden bagimsiz) */
export type BelgeCuzdanHareketGirdi =
  | { tur: 'ledger'; veri: LedgerSatiri }
  | { tur: 'hediye'; veri: HediyeGecmisiKaydi }
  | {
      tur: 'cekim';
      veri: {
        id: string;
        diamonds: number;
        status: string;
        method: string;
        created_at: string;
      };
      durumEtiket: string;
    };

/** Admin özet raporu */
export function AdminOzetBelgesiOlustur(ozet: AdminOzet | null): BelgeIcerik {
  const p = ozet?.platform;
  return {
    baslik: i18n.t('belge.admin.yonetimOzeti'),
    altBaslik: i18n.t('belge.admin.yonetimAlt'),
    platformAdi: 'Tamuso',
    ozet: i18n.t('belge.admin.yonetimOzetBody'),
    satirlar: [
      { etiket: i18n.t('belge.admin.canliOda'), deger: String(ozet?.liveRooms ?? 0) },
      { etiket: i18n.t('belge.admin.canliPk'), deger: String(ozet?.livePk ?? 0) },
      {
        etiket: i18n.t('belge.admin.pushKuyruk'),
        deger: String(ozet?.pendingOutbox ?? 0),
      },
      {
        etiket: i18n.t('belge.admin.acikRapor'),
        deger: String(ozet?.openReports ?? 0),
      },
    ],
    bolumler: p
      ? [
          {
            baslik: i18n.t('belge.admin.kullanicilar'),
            satirlar: [
              {
                etiket: i18n.t('belge.admin.toplam'),
                deger: String(p.kullanici.toplam),
              },
              {
                etiket: i18n.t('belge.admin.banli'),
                deger: String(p.kullanici.banli),
              },
              {
                etiket: i18n.t('belge.admin.host'),
                deger: String(p.kullanici.host),
              },
              {
                etiket: i18n.t('belge.admin.son24sYeni'),
                deger: String(p.kullanici.son_24s),
              },
            ],
          },
          {
            baslik: i18n.t('belge.admin.finans'),
            satirlar: [
              {
                etiket: i18n.t('belge.admin.toplamYuklemeCoin'),
                deger: String(p.finans.toplam_yukleme_coin),
              },
              {
                etiket: i18n.t('belge.admin.son24sYukleme'),
                deger: String(p.finans.son_24s_yukleme_coin),
              },
              {
                etiket: i18n.t('belge.admin.bekleyenCekim'),
                deger: String(p.finans.bekleyen_cekim),
              },
              {
                etiket: i18n.t('belge.admin.bekleyenElmas'),
                deger: String(p.finans.bekleyen_cekim_elmas),
              },
            ],
          },
          {
            baslik: i18n.t('belge.admin.sosyalGuvenlik'),
            satirlar: [
              {
                etiket: i18n.t('belge.admin.acikRapor'),
                deger: String(p.sosyal.acik_rapor),
              },
              {
                etiket: i18n.t('belge.admin.aktifIhtar'),
                deger: String(p.sosyal.aktif_ihtar),
              },
              {
                etiket: i18n.t('belge.admin.hediye24s'),
                deger: String(p.sosyal.hediye_24s),
              },
              {
                etiket: i18n.t('belge.admin.kapaliOzellik'),
                deger: String(p.bayrak.kapali_ozellik),
              },
              {
                etiket: i18n.t('belge.admin.aktifKill'),
                deger: String(p.bayrak.aktif_kill),
              },
            ],
          },
        ]
      : undefined,
    not: i18n.t('belge.admin.yonetimNot'),
  };
}

/** Cüzdan hareket / hediye / çekim → belge (i18n) */
export function CuzdanHareketBelgesiOlustur(
  detay: BelgeCuzdanHareketGirdi,
): BelgeIcerik {
  const dil = belgelocale();
  if (detay.tur === 'ledger') {
    const r: LedgerSatiri = detay.veri;
    const tarih = new Date(r.created_at);
    return {
      baslik: i18n.t('cuzdanXExtra.dekontBaslik'),
      altBaslik: LedgerAnlasilirOzet(r),
      platformAdi: 'Tamuso',
      ozet: LedgerTutarYazi(r),
      satirlar: [
        { etiket: i18n.t('belge.islem'), deger: LedgerSebepEtiketi(r.reason) },
        { etiket: i18n.t('belge.aciklama'), deger: LedgerAnlasilirOzet(r) },
        { etiket: i18n.t('belge.tutar'), deger: LedgerTutarYazi(r) },
        { etiket: i18n.t('belge.birim'), deger: LedgerBirimEtiketi(r.currency) },
        {
          etiket: i18n.t('cuzdanXExtra.islemSonrasiBakiye'),
          deger: `${r.balance_after.toLocaleString(dil)} ${LedgerBirimEtiketi(r.currency)}`,
        },
        { etiket: i18n.t('belge.kaynak'), deger: LedgerRefEtiketi(r.ref_type) },
        {
          etiket: i18n.t('belge.tarih'),
          deger: tarih.toLocaleDateString(dil, {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
        },
        {
          etiket: i18n.t('belge.saat'),
          deger: tarih.toLocaleTimeString(dil, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        },
        { etiket: i18n.t('belge.islemNo'), deger: r.id.slice(0, 13).toUpperCase() },
      ],
      not: i18n.t('cuzdanXExtra.dekontNot'),
    };
  }

  if (detay.tur === 'hediye') {
    const h: HediyeGecmisiKaydi = detay.veri;
    const kim =
      h.karsi_profil?.display_name ??
      h.karsi_profil?.username ??
      i18n.t('belge.kullanici');
    const tarih = new Date(h.created_at);
    const gonderildi = h.yon === 'gonderilen';
    return {
      baslik: i18n.t('cuzdanXExtra.hediyeBelgesi'),
      altBaslik: h.gift?.name ?? i18n.t('belge.hediye'),
      platformAdi: 'Tamuso',
      ozet: gonderildi
        ? i18n.t('cuzdanXExtra.gonderildiOk', { kim })
        : i18n.t('cuzdanXExtra.alindiOk', { kim }),
      satirlar: [
        {
          etiket: i18n.t('belge.hediye'),
          deger: `${h.gift?.emoji ?? ''} ${h.gift?.name ?? '—'}`.trim(),
        },
        { etiket: i18n.t('belge.adet'), deger: String(h.quantity) },
        {
          etiket: i18n.t('belge.yon'),
          deger: gonderildi
            ? i18n.t('belge.gonderildi')
            : i18n.t('belge.alindi'),
        },
        {
          etiket: gonderildi
            ? i18n.t('belge.alici')
            : i18n.t('belge.gonderen'),
          deger: kim,
        },
        { etiket: i18n.t('belge.oda'), deger: h.oda?.title ?? '—' },
        {
          etiket: i18n.t('cuzdanXExtra.harcananCoin'),
          deger: h.coins_spent.toLocaleString(dil),
        },
        {
          etiket: i18n.t('cuzdanXExtra.kazanilanElmas'),
          deger: h.diamonds_earned.toLocaleString(dil),
        },
        {
          etiket: i18n.t('belge.tarih'),
          deger: tarih.toLocaleDateString(dil, {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
        },
        {
          etiket: i18n.t('belge.saat'),
          deger: tarih.toLocaleTimeString(dil, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        },
        { etiket: i18n.t('belge.islemNo'), deger: h.id.slice(0, 13).toUpperCase() },
      ],
      not: i18n.t('cuzdanXExtra.hediyeNot'),
    };
  }

  const c = detay.veri;
  const tarih = new Date(c.created_at);
  return {
    baslik: i18n.t('cuzdanXExtra.cekimTalebi'),
    altBaslik: detay.durumEtiket,
    platformAdi: 'Tamuso',
    ozet: `${i18n.t('belge.elmas', { n: c.diamonds.toLocaleString(dil) })} · ${c.method}`,
    satirlar: [
      {
        etiket: i18n.t('belge.miktar'),
        deger: i18n.t('belge.elmas', { n: c.diamonds.toLocaleString(dil) }),
      },
      { etiket: i18n.t('belge.yontem'), deger: c.method },
      { etiket: i18n.t('belge.durum'), deger: detay.durumEtiket },
      { etiket: i18n.t('belge.odemeSuresi'), deger: CEKIM_ODEME_BILGISI() },
      {
        etiket: i18n.t('belge.tarih'),
        deger: tarih.toLocaleDateString(dil, {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      },
      {
        etiket: i18n.t('belge.saat'),
        deger: tarih.toLocaleTimeString(dil, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      },
      { etiket: i18n.t('belge.talepNo'), deger: c.id.slice(0, 13).toUpperCase() },
    ],
    not: CEKIM_ODEME_BILGISI(),
  };
}
