/**
 * Ajans paket teklifi — sohbet kartı.
 * Kart / detay → Şimdi öde → Stripe (PaymentSheet / WebView).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import {
  AjansPaketTeklifGetir,
  type AjansPaketTeklif,
} from '../../cuzdan/islemler/AjansPaketTeklifIslemleri';
import { AjansPaketTeklifOde } from '../../cuzdan/islemler/AjansPaketTeklifOde';
import { CanliCoinSimgesi } from '../../cuzdan/bilesenler/CanliCoinSimgesi';
import { StripeCheckoutWebSheet } from '../../stripe/bilesenler/StripeCheckoutWebSheet';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import type { DirektMesaj } from '../okuma/MesajlariGetir';

type Props = {
  item: DirektMesaj;
  mine: boolean;
  onLongPress?: () => void;
};

function metaDanTeklif(item: DirektMesaj): AjansPaketTeklif | null {
  const meta = (item.media_meta ?? {}) as Record<string, unknown>;
  const id = String(meta.offer_id ?? item.ref_id ?? '').trim();
  if (!id) return null;
  return {
    id,
    agency_id: String(meta.agency_id ?? ''),
    agency_name: (meta.agency_name as string | null) ?? null,
    buyer_id: String(meta.buyer_id ?? '').trim(),
    package_key: String(meta.package_key ?? ''),
    title: String(meta.title ?? ''),
    liste_fiyat_try: Number(meta.liste_fiyat_try ?? 0),
    amount_try: Number(meta.amount_try ?? 0),
    coins: Number(meta.coins ?? 0),
    indirim_yuzde: Number(meta.indirim_yuzde ?? 20),
    status: String(meta.status ?? 'pending').trim().toLowerCase(),
    expires_at: (meta.expires_at as string | null) ?? null,
    paid_at: (meta.paid_at as string | null) ?? null,
  };
}

function formatTry(n: number, locale: string): string {
  return `${n.toLocaleString(locale, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

/** Geçersiz tarih parse → ödemeyi engelleme. */
function sureGecerli(expiresAt?: string | null): boolean {
  if (!expiresAt) return true;
  const ms = new Date(expiresAt).getTime();
  if (!Number.isFinite(ms)) return true;
  return ms > Date.now();
}

export function MesajAjansPaketTeklifKarti({ item, mine, onLongPress }: Props) {
  const { t, i18n } = useCeviri();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const locale = i18n.language || 'tr';
  const [teklif, setTeklif] = useState<AjansPaketTeklif | null>(() =>
    metaDanTeklif(item),
  );
  const [busy, setBusy] = useState(false);
  const [webSheet, setWebSheet] = useState(false);
  const [detayAcik, setDetayAcik] = useState(false);

  const yenile = useCallback(async () => {
    const id = (item.ref_id || teklif?.id || '').trim();
    if (!id) return;
    const g = await AjansPaketTeklifGetir(id);
    if (g) {
      setTeklif({
        ...g,
        status: String(g.status ?? 'pending').trim().toLowerCase(),
        buyer_id: String(g.buyer_id ?? '').trim(),
      });
    }
  }, [item.ref_id, teklif?.id]);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  // 1:1 ajans sohbeti: alıcı = buyer_id eşleşmesi VEYA kartı alan taraf (!mine)
  const aliciMi = useMemo(() => {
    if (!user?.id || !teklif) return false;
    if (teklif.buyer_id && teklif.buyer_id === user.id) return true;
    // Ajans sahibi gönderdiği kartta mine=true → ödeyemez
    if (mine) return false;
    // Alıcı tarafında buyer_id boş/eski meta olsa bile ödeme aç
    return true;
  }, [mine, teklif, user?.id]);

  const odenebilir =
    !!teklif &&
    teklif.status === 'pending' &&
    aliciMi &&
    sureGecerli(teklif.expires_at);

  const ode = async () => {
    if (!teklif || busy) return;
    if (!odenebilir) {
      Alert.alert(
        t('cuzdanX.satinAlma'),
        mine
          ? t('cuzdanX.ajansTeklifSahipOdeyemez')
          : t('cuzdanX.ajansTeklifOdenemez'),
      );
      return;
    }
    setBusy(true);
    try {
      const r = await AjansPaketTeklifOde(teklif.id);
      if (r.ok) {
        setDetayAcik(false);
        Alert.alert(
          t('cuzdanX.odemeTamam'),
          t('cuzdanX.ajansOdemeSonrasiAjansFis'),
        );
        void yenile();
        return;
      }
      if (r.kod === 'cancel') return;
      if (r.webSheet) {
        setWebSheet(true);
        return;
      }
      Alert.alert(t('cuzdanX.satinAlma'), r.hata);
    } finally {
      setBusy(false);
    }
  };

  if (!teklif) {
    return (
      <View style={[styles.kart, mine && styles.kartMine]}>
        <View style={styles.kartIc}>
          <Text style={styles.baslik}>
            {item.body || t('cuzdanX.ajansTeklifKart')}
          </Text>
        </View>
      </View>
    );
  }

  const durumYazi =
    teklif.status === 'paid'
      ? t('cuzdanX.teklifOdendi')
      : teklif.status === 'expired'
        ? t('cuzdanX.teklifSuresiDoldu')
        : teklif.status === 'cancelled'
          ? t('cuzdanX.teklifIptal')
          : t('cuzdanX.teklifBekliyor');

  const durumRenk =
    teklif.status === 'paid'
      ? RenkTokenlari.mint
      : teklif.status === 'pending'
        ? '#E8C36A'
        : RenkTokenlari.textDim;

  return (
    <>
      <Pressable
        onPress={() => {
          void yenile();
          setDetayAcik(true);
        }}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={({ pressed }) => [
          styles.kart,
          mine && styles.kartMine,
          pressed && styles.kartPressed,
        ]}
      >
        <LinearGradient
          colors={['#1A1610', '#12141C', '#0E1016']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.kartIc}
        >
          <View style={styles.ustSerit}>
            <View style={styles.rozet}>
              <Ionicons name="diamond-outline" size={11} color="#E8C36A" />
              <Text style={styles.rozetYazi}>{t('cuzdanX.paketTeklifCip')}</Text>
            </View>
            <View style={[styles.durumPill, { borderColor: `${durumRenk}55` }]}>
              <View style={[styles.durumNokta, { backgroundColor: durumRenk }]} />
              <Text style={[styles.durumPillYazi, { color: durumRenk }]} numberOfLines={1}>
                {durumYazi}
              </Text>
            </View>
          </View>

          <View style={styles.orta}>
            <View style={styles.coinHalo}>
              <CanliCoinSimgesi size={36} seviye={0.55} />
            </View>
            <View style={styles.ortaMetin}>
              <Text style={styles.ajans} numberOfLines={1}>
                {teklif.agency_name || t('cuzdanX.yetkiliDagitici')}
              </Text>
              <Text style={styles.baslik} numberOfLines={1}>
                {teklif.title}
              </Text>
              <Text style={styles.coinAdet}>
                {teklif.coins.toLocaleString(locale)}{' '}
                <Text style={styles.coinBirim}>{t('cuzdan.coin')}</Text>
              </Text>
            </View>
            <View style={styles.indirimBadge}>
              <Text style={styles.indirimBadgeYazi}>-%{teklif.indirim_yuzde}</Text>
            </View>
          </View>

          <View style={styles.fiyatBlok}>
            <View>
              <Text style={styles.listeEtiket}>{t('cuzdanX.ajansFisListe')}</Text>
              <Text style={styles.liste}>
                {formatTry(teklif.liste_fiyat_try, locale)}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color="rgba(232,195,106,0.45)" />
            <View style={styles.fiyatSag}>
              <Text style={styles.odeEtiket}>{t('cuzdanX.ajansFisOdenen')}</Text>
              <Text style={styles.fiyat}>{formatTry(teklif.amount_try, locale)}</Text>
            </View>
          </View>

          {odenebilir ? (
            <Pressable
              style={[styles.ctaKart, busy && { opacity: 0.65 }]}
              disabled={busy}
              onPress={() => void ode()}
            >
              {busy ? (
                <ActivityIndicator color="#120E08" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={15} color="#120E08" />
                  <Text style={styles.ctaYazi}>{t('cuzdanX.simdiOde')}</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.detayIpucu}>
              <Text style={styles.detayIpucuYazi}>
                {t('cuzdanX.ajansTeklifTiklaDetay')}
              </Text>
              <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.35)" />
            </View>
          )}
        </LinearGradient>
      </Pressable>

      <TamusoModal
        visible={detayAcik}
        onClose={() => setDetayAcik(false)}
        placement="bottom"
        animationType="slide"
        contentStyle={styles.sheetWrap}
      >
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetBaslikSatir}>
            <Text style={styles.sheetBaslik}>{t('cuzdanX.ajansTeklifDetay')}</Text>
            <Pressable
              onPress={() => setDetayAcik(false)}
              hitSlop={10}
              style={styles.sheetKapat}
            >
              <Ionicons name="close" size={18} color={RenkTokenlari.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetIcerik}
          >
            <LinearGradient
              colors={['#1C1812', '#12141C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sheetHero}
            >
              <CanliCoinSimgesi size={48} seviye={0.6} />
              <Text style={styles.sheetAjans} numberOfLines={1}>
                {teklif.agency_name || t('cuzdanX.yetkiliDagitici')}
              </Text>
              <Text style={styles.sheetPaket}>{teklif.title}</Text>
              <Text style={styles.sheetCoin}>
                {teklif.coins.toLocaleString(locale)} {t('cuzdan.coin')}
              </Text>
              <View style={[styles.durumPill, { borderColor: `${durumRenk}55`, marginTop: 6 }]}>
                <View style={[styles.durumNokta, { backgroundColor: durumRenk }]} />
                <Text style={[styles.durumPillYazi, { color: durumRenk }]}>{durumYazi}</Text>
              </View>
            </LinearGradient>

            <View style={styles.sheetKart}>
              <View style={styles.sheetSatir}>
                <Text style={styles.sheetEtiket}>{t('cuzdanX.ajansFisListe')}</Text>
                <Text style={styles.sheetListe}>
                  {formatTry(teklif.liste_fiyat_try, locale)}
                </Text>
              </View>
              <View style={styles.sheetAyir} />
              <View style={styles.sheetSatir}>
                <Text style={styles.sheetEtiket}>{t('cuzdanX.ajansFisIndirim')}</Text>
                <Text style={styles.sheetIndirim}>-%{teklif.indirim_yuzde}</Text>
              </View>
              <View style={styles.sheetAyir} />
              <View style={styles.sheetSatir}>
                <Text style={styles.sheetEtiket}>{t('cuzdanX.ajansFisOdenen')}</Text>
                <Text style={styles.sheetTutar}>
                  {formatTry(teklif.amount_try, locale)}
                </Text>
              </View>
            </View>

            <Text style={styles.sheetNot}>{t('cuzdanX.ajansTeklifDetayNot')}</Text>
          </ScrollView>

          {odenebilir ? (
            <Pressable
              style={[styles.cta, busy && { opacity: 0.65 }]}
              disabled={busy}
              onPress={() => void ode()}
            >
              {busy ? (
                <ActivityIndicator color="#120E08" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={17} color="#120E08" />
                  <Text style={styles.ctaYazi}>{t('cuzdanX.simdiOde')}</Text>
                </>
              )}
            </Pressable>
          ) : (
            <Text style={styles.sheetUyeNot}>
              {mine
                ? t('cuzdanX.ajansTeklifSahipOdeyemez')
                : t('cuzdanX.ajansTeklifOdenemez')}
            </Text>
          )}
        </View>
      </TamusoModal>

      <StripeCheckoutWebSheet
        visible={webSheet}
        catalog="agency_package"
        offerId={teklif.id}
        baslik={t('cuzdanX.simdiOde')}
        onClose={() => setWebSheet(false)}
        onBasarili={() => {
          setWebSheet(false);
          setDetayAcik(false);
          Alert.alert(
            t('cuzdanX.odemeTamam'),
            t('cuzdanX.ajansOdemeSonrasiAjansFis'),
          );
          void yenile();
        }}
        onHata={(m) => Alert.alert(t('cuzdanX.satinAlma'), m)}
      />
    </>
  );
}

const ALTIN = '#E8C36A';
const ALTIN_KOYU = '#120E08';

const styles = StyleSheet.create({
  kart: {
    width: 268,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232, 195, 106, 0.28)',
    backgroundColor: '#0E1016',
  },
  kartMine: { alignSelf: 'flex-end' },
  kartPressed: { opacity: 0.94, transform: [{ scale: 0.985 }] },
  kartIc: {
    padding: 12,
    gap: 12,
  },
  ustSerit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 195, 106, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 195, 106, 0.28)',
  },
  rozetYazi: {
    color: ALTIN,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  durumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.03)',
    maxWidth: 130,
  },
  durumNokta: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  durumPillYazi: {
    fontSize: 9,
    fontWeight: '700',
    flexShrink: 1,
  },
  orta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coinHalo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 195, 106, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 195, 106, 0.18)',
  },
  ortaMetin: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  ajans: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  baslik: {
    color: '#F7F2E8',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  coinAdet: {
    color: ALTIN,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 1,
  },
  coinBirim: {
    color: 'rgba(232, 195, 106, 0.65)',
    fontWeight: '700',
    fontSize: 11,
  },
  indirimBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(110, 231, 183, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.32)',
  },
  indirimBadgeYazi: {
    color: RenkTokenlari.mint,
    fontSize: 11,
    fontWeight: '900',
  },
  fiyatBlok: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  listeEtiket: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  liste: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  fiyatSag: {
    alignItems: 'flex-end',
  },
  odeEtiket: {
    color: 'rgba(232, 195, 106, 0.55)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fiyat: {
    color: ALTIN,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  detayIpucu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  detayIpucuYazi: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
  },
  ctaKart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ALTIN,
  },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: '#0E1016',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: BoslukTokenlari.lg,
    maxHeight: '86%',
    borderWidth: 1,
    borderColor: 'rgba(232, 195, 106, 0.18)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetBaslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetBaslik: {
    color: '#F7F2E8',
    fontSize: 18,
    fontWeight: '900',
  },
  sheetKapat: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetIcerik: { gap: 12, paddingBottom: 12 },
  sheetHero: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(232, 195, 106, 0.16)',
    gap: 4,
  },
  sheetAjans: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  sheetPaket: {
    color: '#F7F2E8',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sheetCoin: {
    color: ALTIN,
    fontSize: 15,
    fontWeight: '900',
  },
  sheetKart: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  sheetAyir: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sheetEtiket: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  sheetListe: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  sheetIndirim: {
    color: RenkTokenlari.mint,
    fontSize: 14,
    fontWeight: '900',
  },
  sheetTutar: {
    color: ALTIN,
    fontSize: 20,
    fontWeight: '900',
  },
  sheetNot: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 11,
    lineHeight: 16,
  },
  sheetUyeNot: {
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  cta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: ALTIN,
  },
  ctaYazi: {
    color: ALTIN_KOYU,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
