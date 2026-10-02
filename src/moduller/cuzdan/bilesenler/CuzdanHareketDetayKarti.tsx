import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import {
  LedgerAnlasilirOzet,
  LedgerBirimEtiketi,
  LedgerRefEtiketi,
  LedgerSebepEtiketi,
  LedgerTutarYazi,
  type LedgerSatiri,
} from '../okuma/CuzdanLedgeriniGetir';
import type { HediyeGecmisiKaydi } from '../../hediyeler/okuma/HediyeGecmisiniGetir';
import { CEKIM_ODEME_IS_GUNU } from '../cekim/CekimOdemeBilgisi';
import {
  CoinTryKarsiligi,
  TryYazi,
} from '../katalog/CoinTryOrani';
import {
  BelgePaylasDugmesi,
  BelgePaylasimPaneli,
} from '../../belge-paylasim/bilesenler/BelgePaylasimPaneli';
import { CuzdanHareketBelgesiOlustur } from '../../belge-paylasim/BelgeIcerikDonustur';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { AktifDil } from '../../../i18n';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';

export type CuzdanHareketDetay =
  | { tur: 'ledger'; veri: LedgerSatiri }
  | {
      tur: 'hediye';
      veri: HediyeGecmisiKaydi;
    }
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

type Props = {
  detay: CuzdanHareketDetay | null;
  onKapat: () => void;
};

function formatTarih(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatSaat(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <View style={styles.satir}>
      <Text style={styles.satirEtiket}>{etiket}</Text>
      <Text style={styles.satirDeger}>{deger}</Text>
    </View>
  );
}

/** Hareket detay kartı — banka dekontu + PDF/WhatsApp */
export function CuzdanHareketDetayKarti({ detay, onKapat }: Props) {
  const { t } = useCeviri();
  const locale = DIL_LOCALE_MAP[AktifDil()];
  const [paylasAcik, setPaylasAcik] = useState(false);

  const belge = useMemo(
    () => (detay ? CuzdanHareketBelgesiOlustur(detay) : null),
    [detay],
  );

  if (!detay) return null;

  let baslik = t('cuzdanX.hareketDetay');
  let tutar = '';
  let tutarRenk: string = RenkTokenlari.text;
  let ozet: { id: string; etiket: string; deger: string }[] = [];

  if (detay.tur === 'ledger') {
    const r = detay.veri;
    const pozitif = r.delta >= 0;
    baslik = LedgerAnlasilirOzet(r);
    tutar = LedgerTutarYazi(r);
    tutarRenk = pozitif ? RenkTokenlari.mint : RenkTokenlari.danger;
    ozet = [
      { id: 'tur', etiket: t('cuzdanX.islemTuru'), deger: LedgerSebepEtiketi(r.reason) },
      { id: 'birim', etiket: t('cuzdanX.paraBirimi'), deger: LedgerBirimEtiketi(r.currency) },
      { id: 'tutar', etiket: t('cuzdanX.tutar'), deger: tutar },
      {
        id: 'bakiye',
        etiket: t('cuzdanX.islemSonrasiBakiye'),
        deger: `${r.balance_after.toLocaleString(locale)} ${LedgerBirimEtiketi(r.currency)}`,
      },
      { id: 'kaynak', etiket: t('cuzdanX.kaynak'), deger: LedgerRefEtiketi(r.ref_type) },
      {
        id: 'yon',
        etiket: t('cuzdanX.yon'),
        deger: pozitif ? t('cuzdanX.hesabaGirisYon') : t('cuzdanX.hesaptanCikisYon'),
      },
      { id: 'tarih', etiket: t('cuzdanX.tarih'), deger: formatTarih(r.created_at, locale) },
      { id: 'saat', etiket: t('cuzdanX.saat'), deger: formatSaat(r.created_at, locale) },
      { id: 'islem_no', etiket: t('cuzdanX.islemNo'), deger: r.id.slice(0, 13).toUpperCase() },
    ];
  } else if (detay.tur === 'hediye') {
    const h = detay.veri;
    const gonderildi = h.yon === 'gonderilen';
    const kim =
      h.karsi_profil?.display_name ??
      h.karsi_profil?.username ??
      t('ortak.kullanici');
    baslik = h.gift?.name ?? t('cuzdan.hediye');
    tutar = gonderildi
      ? `−${h.coins_spent.toLocaleString(locale)} coin`
      : `+${h.diamonds_earned.toLocaleString(locale)} ${t('cuzdan.birimElmas')}`;
    tutarRenk = gonderildi ? RenkTokenlari.danger : RenkTokenlari.mint;
    const tryDeger = CoinTryKarsiligi(h.coins_spent);
    ozet = [
      {
        id: 'hediye',
        etiket: t('cuzdan.hediye'),
        deger: `${h.gift?.emoji ?? ''} ${baslik}${h.quantity > 1 ? ` ×${h.quantity}` : ''}`.trim(),
      },
      {
        id: 'yon',
        etiket: t('cuzdanX.yon'),
        deger: gonderildi ? t('cuzdan.gonderilen') : t('cuzdan.alinan'),
      },
      {
        id: 'kim',
        etiket: gonderildi ? t('cuzdanX.etiketAlici') : t('cuzdanX.etiketGonderen'),
        deger: kim,
      },
      {
        id: 'oda',
        etiket: t('cuzdanX.etiketOda'),
        deger: h.oda?.title ?? t('cuzdan.tire'),
      },
      { id: 'tutar', etiket: t('cuzdanX.tutar'), deger: tutar },
      {
        id: 'katalog',
        etiket: gonderildi
          ? t('cuzdanX.uiKatalogLabel')
          : t('cuzdanX.alinanKarsilik'),
        deger: TryYazi(tryDeger),
      },
      { id: 'tarih', etiket: t('cuzdanX.tarih'), deger: formatTarih(h.created_at, locale) },
      { id: 'saat', etiket: t('cuzdanX.saat'), deger: formatSaat(h.created_at, locale) },
      { id: 'islem_no', etiket: t('cuzdanX.islemNo'), deger: h.id.slice(0, 13).toUpperCase() },
    ];
  } else {
    const c = detay.veri;
    baslik = t('cuzdanX.elmasCekimi');
    tutar = `−${c.diamonds.toLocaleString(locale)} ${t('cuzdan.birimElmas')}`;
    tutarRenk = RenkTokenlari.accent;
    ozet = [
      { id: 'islem', etiket: t('cuzdanX.etiketIslem'), deger: t('cuzdanX.cekimTalebi') },
      { id: 'miktar', etiket: t('cuzdanX.etiketMiktar'), deger: tutar },
      { id: 'yontem', etiket: t('cuzdanX.etiketYontem'), deger: c.method },
      { id: 'durum', etiket: t('cuzdanX.etiketDurum'), deger: detay.durumEtiket },
      {
        id: 'odeme',
        etiket: t('cuzdanX.odemeSuresi'),
        deger: t('cuzdanXExtra.odemeBilgisi', { gun: CEKIM_ODEME_IS_GUNU }),
      },
      { id: 'tarih', etiket: t('cuzdanX.tarih'), deger: formatTarih(c.created_at, locale) },
      { id: 'saat', etiket: t('cuzdanX.saat'), deger: formatSaat(c.created_at, locale) },
      { id: 'talep_no', etiket: t('cuzdanX.talepNo'), deger: c.id.slice(0, 13).toUpperCase() },
    ];
  }

  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onKapat}>
        <View style={styles.kok}>
          <Pressable style={styles.perde} onPress={onKapat} />
          <CamArkaplan
            intensity={28}
            style={StyleSheet.absoluteFill}
            fallbackColor={RenkTokenlari.scrim}
            pointerEvents="none"
          />
          <View style={styles.kartWrap}>
            <LinearGradient colors={[...RenkTokenlari.gradientCard]} style={styles.kart}>
              <View style={styles.ust}>
                <Text style={styles.fisilti}>{t('cuzdanX.islemDekontu')}</Text>
                <Pressable onPress={onKapat} style={styles.kapat} hitSlop={8}>
                  <Ionicons name="close" size={18} color={RenkTokenlari.text} />
                </Pressable>
              </View>

              <Text style={styles.baslik}>{baslik}</Text>
              <Text style={[styles.tutar, { color: tutarRenk }]}>{tutar}</Text>

              <View style={styles.liste}>
                {ozet.map((s) => (
                  <Satir key={s.id} etiket={s.etiket} deger={s.deger} />
                ))}
              </View>

              <View style={styles.aksiyonlar}>
                <BelgePaylasDugmesi
                  onPress={() => setPaylasAcik(true)}
                  label={t('cuzdanX.pdfWhatsapp')}
                />
                <Pressable onPress={onKapat} style={styles.tamamHit}>
                  <Text style={styles.tamamYazi}>{t('ortak.kapat')}</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <BelgePaylasimPaneli
        visible={paylasAcik}
        onKapat={() => setPaylasAcik(false)}
        icerik={belge}
      />
    </>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.xl,
  },
  perde: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    elevation: 1,
  },
  kartWrap: {
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    zIndex: 3,
    elevation: 24,
  },
  kart: {
    padding: BoslukTokenlari.xl,
    gap: BoslukTokenlari.md,
  },
  ust: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fisilti: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1.4,
  },
  kapat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  baslik: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
  },
  tutar: {
    ...TipografiTokenlari.title,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  liste: {
    gap: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
    marginTop: BoslukTokenlari.sm,
  },
  satir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: BoslukTokenlari.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  satirEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  satirDeger: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  aksiyonlar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BoslukTokenlari.md,
    marginTop: BoslukTokenlari.sm,
  },
  tamamHit: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  tamamYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
});
