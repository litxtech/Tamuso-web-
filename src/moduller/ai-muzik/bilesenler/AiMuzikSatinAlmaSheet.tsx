import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCeviri } from '../../../i18n/useCeviri';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { AiMuzikUrunleriListele } from '../islemler/AiMuzikApi';
import { AiMuzikStoreFiyatlari } from '../islemler/AiMuzikIapSatinAl';
import {
  AiMuzikPaketDakika,
  AiMuzikPaketFiyatYazi,
  AiMuzikPaketSatinAl,
} from '../islemler/AiMuzikSatinAl';
import { StripeCheckoutWebSheet } from '../../stripe/bilesenler/StripeCheckoutWebSheet';
import { StripeSdkOnIsit } from '../../stripe/islemler/StripeSdkOnIsit';
import type { AiMuzikProduct } from '../tipler';
import { DakikaEtiket } from '../utils/SureFormat';

type Props = {
  visible: boolean;
  onClose: () => void;
  onBasarili?: () => void;
  kalanSn?: number;
};

function storeSku(p: AiMuzikProduct): string {
  if (Platform.OS === 'ios') return p.apple_product_id ?? p.product_id;
  return p.google_product_id ?? p.product_id;
}

const EKRAN_H = Dimensions.get('window').height;
const SHEET_H = Math.round(Math.min(EKRAN_H * 0.82, 640));

export function AiMuzikSatinAlmaSheet({
  visible,
  onClose,
  onBasarili,
  kalanSn,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [urunler, setUrunler] = useState<AiMuzikProduct[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, string>>({});
  const [yukleniyor, setYukleniyor] = useState(false);
  const [satinAliniyor, setSatinAliniyor] = useState<string | null>(null);
  const [webSheetPkg, setWebSheetPkg] = useState<AiMuzikProduct | null>(null);

  const katalogYukle = useCallback(async () => {
    // Önce önbellekli katalog — sheet hemen dolu açılsın
    try {
      const list = await AiMuzikUrunleriListele();
      setUrunler(list);
      setYukleniyor(false);
      // Mağaza fiyatı arka planda
      void AiMuzikStoreFiyatlari(list).then(setFiyatlar).catch(() => undefined);
    } catch {
      setUrunler([]);
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setYukleniyor(urunler.length === 0);
    void katalogYukle();
    StripeSdkOnIsit();
  }, [visible, katalogYukle]);

  const satinAl = async (pkg: AiMuzikProduct) => {
    if (satinAliniyor) return;
    setSatinAliniyor(pkg.id);
    try {
      const sonuc = await AiMuzikPaketSatinAl(pkg);
      if (!sonuc.ok) {
        if (sonuc.kod === 'cancel') return;
        if (sonuc.webSheet) {
          setWebSheetPkg(pkg);
          return;
        }
        Alert.alert(t('aiMuzik.satinAlmaAlert'), sonuc.hata);
        return;
      }
      if (sonuc.method === 'stripe') {
        onBasarili?.();
        onClose();
        Alert.alert(t('aiMuzik.odemeAlindi'), t('aiMuzik.odemeAlindiBody'));
        return;
      }
      onBasarili?.();
      onClose();
      Alert.alert(
        t('aiMuzik.hakkinEklendi'),
        t('aiMuzik.hakkinEklendiBody', { dakika: DakikaEtiket(sonuc.secondsAdded) }),
      );
    } finally {
      setSatinAliniyor(null);
    }
  };

  const altPad = Math.max(insets.bottom, 16) + 8;
  const odemeKanal =
    Platform.OS === 'ios'
      ? t('aiMuzik.kanalIos')
      : Platform.OS === 'android'
        ? t('aiMuzik.kanalAndroid')
        : t('aiMuzik.kanalWeb');

  return (
    <>
    <TamusoModal
      visible={visible}
      onClose={onClose}
      placement="bottom"
      animationType="slide"
      contentStyle={styles.sheetWrap}
    >
      <View style={[styles.sheet, { height: SHEET_H, paddingBottom: altPad }]}>
        <CamArkaplan
          intensity={Platform.OS === 'android' ? 0 : 44}
          hafif
          style={StyleSheet.absoluteFill}
          fallbackColor={RenkTokenlari.bgElevated}
          pointerEvents="none"
        />
        <View style={styles.sheetIc}>
          <View style={styles.tutamak} />
          <View style={styles.ust}>
            <View style={{ flex: 1 }}>
              <Text style={styles.baslik}>{t('aiMuzik.dakikaAlBaslik')}</Text>
              <Text style={styles.alt}>
                {t('aiMuzik.dakikaAlAlt', { kanal: odemeKanal })}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.kapatBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color={RenkTokenlari.textMuted} />
            </Pressable>
          </View>

          {typeof kalanSn === 'number' ? (
            <View style={styles.kalanKutu}>
              <Text style={styles.kalanEtiket}>{t('aiMuzik.kalanHakkin')}</Text>
              <Text style={styles.kalanDeger}>{DakikaEtiket(kalanSn)}</Text>
            </View>
          ) : null}

          {yukleniyor && urunler.length === 0 ? (
            <ActivityIndicator
              color={RenkTokenlari.primarySoft}
              style={{ marginVertical: 40 }}
            />
          ) : urunler.length === 0 ? (
            <Text style={styles.bos}>{t('aiMuzik.paketYuklenemedi')}</Text>
          ) : (
            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {urunler.map((p, idx) => {
                const sku = storeSku(p);
                const toplamSn = p.seconds_granted + (p.bonus_seconds ?? 0);
                const dk = AiMuzikPaketDakika(p);
                const fiyat = fiyatlar[sku] ?? AiMuzikPaketFiyatYazi(p);
                const oneCikar =
                  idx === 1 ||
                  !!p.badge?.toLowerCase().includes('popüler') ||
                  !!p.badge?.toLowerCase().includes('popular');
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.paket, oneCikar && styles.paketOne]}
                    onPress={() => void satinAl(p)}
                    disabled={!!satinAliniyor}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.display_name}, ${dk} ${t('aiMuzik.dkKisa')}, ${fiyat}`}
                  >
                    <View style={styles.dkRozet}>
                      <Text style={styles.dkSayi}>{dk}</Text>
                      <Text style={styles.dkBirim}>{t('aiMuzik.dkKisa')}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.paketUst}>
                        <Text style={styles.paketAd} numberOfLines={1}>
                          {p.display_name}
                        </Text>
                        {p.badge ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeYazi}>{p.badge}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.paketAciklama} numberOfLines={2}>
                        {p.description?.trim() ||
                          t('aiMuzik.paketAciklamaVarsayilan', {
                            sure: DakikaEtiket(toplamSn),
                          })}
                      </Text>
                      {p.bonus_seconds > 0 ? (
                        <Text style={styles.bonus}>
                          {t('aiMuzik.bonus', { sure: DakikaEtiket(p.bonus_seconds) })}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.fiyatWrap}>
                      {satinAliniyor === p.id ? (
                        <ActivityIndicator color={RenkTokenlari.primarySoft} />
                      ) : (
                        <>
                          <Text style={styles.fiyat}>{fiyat}</Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={RenkTokenlari.textDim}
                          />
                        </>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </TamusoModal>

      <StripeCheckoutWebSheet
        visible={!!webSheetPkg}
        catalog="ai_music"
        productId={webSheetPkg?.product_id}
        baslik={
          webSheetPkg
            ? t('aiMuzik.paketKart', { ad: webSheetPkg.display_name })
            : t('aiMuzik.kartIleOde')
        }
        onClose={() => setWebSheetPkg(null)}
        onBasarili={() => {
          setWebSheetPkg(null);
          onBasarili?.();
          onClose();
          Alert.alert(t('aiMuzik.odemeAlindi'), t('aiMuzik.odemeAlindiBody'));
        }}
        onHata={(mesaj) => Alert.alert(t('aiMuzik.odeme'), mesaj)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheetWrap: { width: '100%' },
  sheet: {
    width: '100%',
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgElevated,
  },
  sheetIc: {
    flex: 1,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
  },
  tutamak: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.md,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: BoslukTokenlari.md,
  },
  kapatBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 4,
  },
  kalanKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgGlass,
    marginBottom: BoslukTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  kalanEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  kalanDeger: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.primarySoft,
    fontVariant: ['tabular-nums'],
  },
  scroll: { flex: 1 },
  paket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 88,
  },
  paketOne: {
    borderColor: RenkTokenlari.primarySoft + '66',
    backgroundColor: RenkTokenlari.primarySoft + '14',
  },
  dkRozet: {
    width: 52,
    height: 52,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.primarySoft + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkSayi: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.primarySoft,
    fontVariant: ['tabular-nums'],
    lineHeight: 22,
  },
  dkBirim: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    marginTop: -2,
  },
  paketUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  paketAd: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  badge: {
    backgroundColor: RenkTokenlari.primarySoft + '33',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.sm,
  },
  badgeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
  },
  paketAciklama: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  bonus: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    marginTop: 2,
  },
  fiyatWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 72,
    gap: 2,
  },
  fiyat: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    paddingVertical: 28,
  },
});
