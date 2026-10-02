/**
 * Kullanıcı hesap hareketleri — PDF / Excel / WhatsApp belge içeriği (i18n).
 */

import type { BelgeIcerik, BelgeSatiri } from './BelgeSablonlari';
import {
  LedgerAnlasilirOzet,
  LedgerBirimEtiketi,
  LedgerTutarYazi,
  type LedgerSatiri,
} from '../cuzdan/okuma/CuzdanLedgeriniGetir';
import type { HediyeGecmisiKaydi } from '../hediyeler/okuma/HediyeGecmisiniGetir';
import {
  OyunDurumEtiketi,
  OyunSiraYazi,
  type OyunGecmisiKaydi,
} from '../oyunlar/ortak/servisler/OyunGecmisiniGetir';
import type { OyunOyuncuIstatistik } from '../oyunlar/ortak/servisler/OyunIstatistikServisi';
import { CEKIM_ODEME_BILGISI } from '../cuzdan/cekim/CekimOdemeBilgisi';
import i18n from '../../i18n';
import { DilNormalizeEt, DIL_LOCALE_MAP } from '../../i18n/diller';

export type HesapCekimSatiri = {
  id: string;
  diamonds: number;
  status: string;
  method: string;
  created_at: string;
  durumEtiket: string;
};

export type HesapHareketleriBelgeGirdi = {
  sahipAdi?: string | null;
  hesapKodu?: string | null;
  coins?: number;
  diamonds?: number;
  ledger: LedgerSatiri[];
  hediyeler: HediyeGecmisiKaydi[];
  cekimler: HesapCekimSatiri[];
  oyunlar?: OyunGecmisiKaydi[];
  oyunOzet?: OyunOyuncuIstatistik | null;
};

/** Excel / CSV satırı */
export type HesapHareketExcelSatiri = {
  tarih: string;
  saat: string;
  islem: string;
  aciklama: string;
  karsiTaraf: string;
  yer: string;
  tutar: string;
  birim: string;
  bakiyeSonrasi: string;
  durum: string;
  islemNo: string;
};

function belgelocale(): string {
  return DIL_LOCALE_MAP[DilNormalizeEt(i18n.language)];
}

function sayi(n: number): string {
  return n.toLocaleString(belgelocale());
}

function tarihParcala(iso: string): { tarih: string; saat: string; tam: string } {
  const dil = belgelocale();
  try {
    const d = new Date(iso);
    return {
      tarih: d.toLocaleDateString(dil, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      saat: d.toLocaleTimeString(dil, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      tam: d.toLocaleString(dil, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch {
    return { tarih: iso, saat: '—', tam: iso };
  }
}

function hediyeKim(h: HediyeGecmisiKaydi): string {
  return (
    h.karsi_profil?.display_name ??
    h.karsi_profil?.username ??
    i18n.t('belge.kullanici')
  );
}

/** Tüm kaynaklardan Excel satırları (kronolojik, yeni → eski) */
export function HesapHareketExcelSatirlari(
  girdi: HesapHareketleriBelgeGirdi,
): HesapHareketExcelSatiri[] {
  const satirlar: (HesapHareketExcelSatiri & { _ts: number })[] = [];
  const hediyeVar = girdi.hediyeler.length > 0;
  const cekimVar = girdi.cekimler.length > 0;

  for (const r of girdi.ledger) {
    const kok = r.reason.split(':')[0] ?? r.reason;
    if (
      hediyeVar &&
      (kok.startsWith('gift_') || kok === 'gift_sent' || kok === 'gift_received')
    ) {
      continue;
    }
    if (
      cekimVar &&
      (kok.startsWith('withdraw') || kok === 'withdrawal_hold')
    ) {
      continue;
    }
    const t = tarihParcala(r.created_at);
    satirlar.push({
      _ts: new Date(r.created_at).getTime(),
      tarih: t.tarih,
      saat: t.saat,
      islem: LedgerAnlasilirOzet(r),
      aciklama:
        r.delta >= 0
          ? i18n.t('belge.hesabaGiris')
          : i18n.t('belge.hesaptanCikis'),
      karsiTaraf: '—',
      yer: '—',
      tutar: `${r.delta >= 0 ? '+' : ''}${sayi(r.delta)}`,
      birim: LedgerBirimEtiketi(r.currency),
      bakiyeSonrasi: sayi(r.balance_after),
      durum:
        r.delta >= 0
          ? i18n.t('belge.kazancYukleme')
          : i18n.t('belge.harcamaKayip'),
      islemNo: r.id.slice(0, 13).toUpperCase(),
    });
  }

  for (const h of girdi.hediyeler) {
    const t = tarihParcala(h.created_at);
    const gonderildi = h.yon === 'gonderilen';
    const hediyeAd = `${h.gift?.emoji ?? '🎁'} ${h.gift?.name ?? i18n.t('belge.hediye')}${
      h.quantity > 1 ? ` ×${h.quantity}` : ''
    }`;
    satirlar.push({
      _ts: new Date(h.created_at).getTime(),
      tarih: t.tarih,
      saat: t.saat,
      islem: gonderildi
        ? i18n.t('belge.hediyeGonderildi')
        : i18n.t('belge.hediyeAlindi'),
      aciklama: hediyeAd,
      karsiTaraf: hediyeKim(h),
      yer: h.oda?.title ?? '—',
      tutar: gonderildi
        ? `−${sayi(h.coins_spent)}`
        : `+${sayi(h.diamonds_earned)}`,
      birim: gonderildi
        ? i18n.t('belge.coinBirim')
        : i18n.t('belge.elmasBirim'),
      bakiyeSonrasi: '—',
      durum: gonderildi
        ? i18n.t('belge.gonderildi')
        : i18n.t('belge.alindi'),
      islemNo: h.id.slice(0, 13).toUpperCase(),
    });
  }

  for (const c of girdi.cekimler) {
    const t = tarihParcala(c.created_at);
    satirlar.push({
      _ts: new Date(c.created_at).getTime(),
      tarih: t.tarih,
      saat: t.saat,
      islem: i18n.t('belge.elmasCekimTalebi'),
      aciklama: i18n.t('belge.bankaYontem', { method: c.method }),
      karsiTaraf: '—',
      yer: '—',
      tutar: `−${sayi(c.diamonds)}`,
      birim: i18n.t('belge.elmasBirim'),
      bakiyeSonrasi: '—',
      durum: c.durumEtiket,
      islemNo: c.id.slice(0, 13).toUpperCase(),
    });
  }

  for (const o of girdi.oyunlar ?? []) {
    const t = tarihParcala(o.baslangic);
    const kazancMi = o.sira === 1 || o.coinOdul > 0;
    const durum = OyunDurumEtiketi(o.durum);
    satirlar.push({
      _ts: new Date(o.baslangic).getTime(),
      tarih: t.tarih,
      saat: t.saat,
      islem: i18n.t('belge.oyunIslem', { ad: o.oyunAdi }),
      aciklama: i18n.t('belge.oyunAciklama', {
        sira: OyunSiraYazi(o.sira),
        xp: sayi(o.xp),
        kupa: `${o.kupa >= 0 ? '+' : ''}${o.kupa}`,
      }),
      karsiTaraf: '—',
      yer: o.odaBaslik ?? '—',
      tutar:
        o.coinOdul !== 0
          ? `${o.coinOdul >= 0 ? '+' : ''}${sayi(o.coinOdul)}`
          : '—',
      birim: o.coinOdul !== 0 ? i18n.t('belge.coinBirim') : '—',
      bakiyeSonrasi: '—',
      durum: kazancMi
        ? i18n.t('belge.durumKazanc', { durum })
        : durum,
      islemNo: o.session_id.slice(0, 13).toUpperCase(),
    });
  }

  return satirlar
    .sort((a, b) => b._ts - a._ts)
    .map((row) => {
      const { _ts, ...rest } = row;
      void _ts;
      return rest;
    });
}

/** Excel'in açtığı CSV (UTF-8 BOM + ; ayırıcı — TR Excel) */
export function HesapHareketExcelCsvOlustur(
  girdi: HesapHareketleriBelgeGirdi,
): string {
  const basliklar = [
    i18n.t('belge.excelBaslikTarih'),
    i18n.t('belge.excelBaslikSaat'),
    i18n.t('belge.excelBaslikIslem'),
    i18n.t('belge.excelBaslikAciklama'),
    i18n.t('belge.excelBaslikKarsi'),
    i18n.t('belge.excelBaslikYer'),
    i18n.t('belge.excelBaslikTutar'),
    i18n.t('belge.excelBaslikBirim'),
    i18n.t('belge.excelBaslikBakiye'),
    i18n.t('belge.excelBaslikDurum'),
    i18n.t('belge.excelBaslikNo'),
  ];
  const hucre = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const satirlar = HesapHareketExcelSatirlari(girdi).map((s) =>
    [
      s.tarih,
      s.saat,
      s.islem,
      s.aciklama,
      s.karsiTaraf,
      s.yer,
      s.tutar,
      s.birim,
      s.bakiyeSonrasi,
      s.durum,
      s.islemNo,
    ]
      .map(hucre)
      .join(';'),
  );
  return `\uFEFF${basliklar.map(hucre).join(';')}\n${satirlar.join('\n')}`;
}

export function HesapHareketleriBelgesiOlustur(
  girdi: HesapHareketleriBelgeGirdi,
): BelgeIcerik {
  const ad = girdi.sahipAdi?.trim() || i18n.t('belge.kullanici');
  const kod = girdi.hesapKodu?.trim();
  const excel = HesapHareketExcelSatirlari(girdi);
  const dil = belgelocale();
  const yukleme = girdi.ledger.filter(
    (r) =>
      r.delta > 0 &&
      (r.reason.includes('purchase') ||
        r.reason.includes('iap') ||
        r.reason.includes('stripe') ||
        r.reason.includes('topup') ||
        r.reason.includes('bonus')),
  ).length;
  const oyunKazanc = girdi.ledger.filter(
    (r) =>
      r.delta > 0 &&
      (r.reason.startsWith('game_reward') ||
        r.reason.startsWith('kaskad_win') ||
        r.reason.startsWith('zeus_win')),
  ).length;
  const oyunKayip = girdi.ledger.filter(
    (r) =>
      r.delta < 0 &&
      (r.reason.startsWith('game_entry') ||
        r.reason.startsWith('kaskad_bet') ||
        r.reason.startsWith('zeus_bet')),
  ).length;

  const ozetSatirlar: BelgeSatiri[] = [
    { etiket: i18n.t('belge.hesapSahibi'), deger: ad },
    ...(kod ? [{ etiket: i18n.t('belge.hesapKodu'), deger: kod }] : []),
    {
      etiket: i18n.t('belge.guncelCoin'),
      deger: sayi(girdi.coins ?? 0),
    },
    {
      etiket: i18n.t('belge.guncelElmas'),
      deger: sayi(girdi.diamonds ?? 0),
    },
    {
      etiket: i18n.t('belge.toplamKayit'),
      deger: i18n.t('belge.satirSayisi', { n: excel.length }),
    },
    {
      etiket: i18n.t('belge.yuklemeIslemi'),
      deger: String(yukleme),
    },
    {
      etiket: i18n.t('belge.oyunBahisGiris'),
      deger: String(oyunKayip),
    },
    {
      etiket: i18n.t('belge.oyunKazancOdul'),
      deger: String(oyunKazanc),
    },
    {
      etiket: i18n.t('belge.raporZamani'),
      deger: new Date().toLocaleString(dil),
    },
  ];

  if (girdi.oyunOzet) {
    const o = girdi.oyunOzet;
    ozetSatirlar.push(
      {
        etiket: i18n.t('belge.oynananOyun'),
        deger: String(o.totalGames),
      },
      {
        etiket: i18n.t('belge.birincilikKazanc'),
        deger: String(o.wins),
      },
      {
        etiket: i18n.t('belge.kazanmaOraniEtiket'),
        deger: i18n.t('belge.kazanmaOrani', { n: o.winRate }),
      },
      {
        etiket: i18n.t('belge.lig'),
        deger: o.leagueLabel,
      },
    );
  }

  const hareketBolumu: BelgeSatiri[] = girdi.ledger.slice(0, 120).map((r) => {
    const t = tarihParcala(r.created_at);
    return {
      etiket: `${t.tam} · ${LedgerAnlasilirOzet(r)}`,
      deger: i18n.t('belge.bakiyeOk', {
        tutar: LedgerTutarYazi(r),
        bakiye: sayi(r.balance_after),
      }),
    };
  });

  const hediyeBolumu: BelgeSatiri[] = girdi.hediyeler.slice(0, 80).map((h) => {
    const t = tarihParcala(h.created_at);
    const gonderildi = h.yon === 'gonderilen';
    const kim = hediyeKim(h);
    const hediye = `${h.gift?.name ?? i18n.t('belge.hediye')}${h.quantity > 1 ? ` ×${h.quantity}` : ''}`;
    return {
      etiket: `${t.tam} · ${gonderildi ? `${hediye} → ${kim}` : `${hediye} ← ${kim}`}`,
      deger: gonderildi
        ? `−${sayi(h.coins_spent)} ${i18n.t('belge.coinBirim')}${h.oda?.title ? ` · ${h.oda.title}` : ''}`
        : `+${sayi(h.diamonds_earned)} ${i18n.t('belge.elmasBirim')}${h.oda?.title ? ` · ${h.oda.title}` : ''}`,
    };
  });

  const oyunBolumu: BelgeSatiri[] = (girdi.oyunlar ?? []).slice(0, 80).map((o) => {
    const t = tarihParcala(o.baslangic);
    return {
      etiket: `${t.tam} · ${o.oyunAdi}${o.odaBaslik ? ` · ${o.odaBaslik}` : ''}`,
      deger: i18n.t('belge.oyunSatir', {
        sira: OyunSiraYazi(o.sira),
        durum: OyunDurumEtiketi(o.durum),
        odul: sayi(o.coinOdul),
        xp: o.xp,
      }),
    };
  });

  const cekimBolumu: BelgeSatiri[] = girdi.cekimler.slice(0, 40).map((c) => {
    const t = tarihParcala(c.created_at);
    return {
      etiket: `${t.tam} · ${i18n.t('belge.elmas', { n: sayi(c.diamonds) })}`,
      deger: `${c.durumEtiket} · ${c.method}`,
    };
  });

  return {
    baslik: i18n.t('belge.hesapHareketleri'),
    altBaslik: `${ad}${kod ? ` · ${kod}` : ''} · Tamuso`,
    platformAdi: 'Tamuso',
    ozet: i18n.t('belge.hesapOzet'),
    satirlar: ozetSatirlar,
    bolumler: [
      {
        baslik: i18n.t('belge.cuzdanHareketleri'),
        ozet: i18n.t('belge.cuzdanHareketOzet', { n: girdi.ledger.length }),
        satirlar: hareketBolumu.length
          ? hareketBolumu
          : [{ etiket: i18n.t('belge.durum'), deger: i18n.t('belge.henuzCuzdanYok') }],
      },
      {
        baslik: i18n.t('belge.hediyeEtkilesimleri'),
        ozet: i18n.t('belge.hediyeEtkilesimOzet', { n: girdi.hediyeler.length }),
        satirlar: hediyeBolumu.length
          ? hediyeBolumu
          : [{ etiket: i18n.t('belge.durum'), deger: i18n.t('belge.henuzHediyeYok') }],
      },
      {
        baslik: i18n.t('belge.oyunGecmisi'),
        ozet: i18n.t('belge.oyunGecmisiOzet', { n: girdi.oyunlar?.length ?? 0 }),
        satirlar: oyunBolumu.length
          ? oyunBolumu
          : [{ etiket: i18n.t('belge.durum'), deger: i18n.t('belge.henuzOyunYok') }],
      },
      {
        baslik: i18n.t('belge.cekimTalepleri'),
        ozet: i18n.t('belge.cekimTalepOzet', { n: girdi.cekimler.length }),
        satirlar: cekimBolumu.length
          ? cekimBolumu
          : [{ etiket: i18n.t('belge.durum'), deger: i18n.t('belge.henuzCekimYok') }],
      },
    ],
    not: i18n.t('belge.belgeNot', { odeme: CEKIM_ODEME_BILGISI() }),
  };
}
