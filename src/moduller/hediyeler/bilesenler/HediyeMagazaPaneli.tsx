import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Image,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { CanliHediyeSimgesi } from '../../cuzdan/bilesenler/CanliCoinSimgesi';
import { CoinPaketMagaza } from '../../cuzdan/bilesenler/CoinPaketMagaza';
import type { CoinPackage, Gift } from '../../../types/models';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { HediyePkAlici } from '../islemler/HediyeMagazaTipleri';
import { HediyeAdiCevir } from '../katalog/HediyeAdiCevir';
import { useCeviri } from '../../../i18n/useCeviri';
import { AktifDil } from '../../../i18n';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';

const ANDROID = Platform.OS === 'android';
const SUTUN = 5;

const SEKME_IDS = [
  'populer',
  'all',
  'common',
  'rare',
  'epic',
  'legendary',
] as const;

const SEKME_ANAHTAR: Record<(typeof SEKME_IDS)[number], CeviriAnahtari> = {
  populer: 'hediye.sekmePopuler',
  all: 'hediye.sekmeTumu',
  common: 'hediye.sekmeKlasik',
  rare: 'hediye.sekmeNadir',
  epic: 'hediye.sekmeLuks',
  legendary: 'hediye.sekmeEfsane',
};

const ADET_SECENEKLERI = [1, 7, 17, 77, 188, 777] as const;

type Props = {
  visible: boolean;
  gifts: Gift[];
  coins?: number;
  aliciAdi?: string | null;
  pkAlicilar?: HediyePkAlici[];
  seciliPkAliciId?: string | null;
  /** Ses odası: birden fazla alıcı. Tekrar dokunuş seçimi kaldırır. */
  seciliAliciIdler?: string[];
  onPkAliciSec?: (id: string) => void;
  onSend: (gift: Gift, quantity: number) => void;
  onClose: () => void;
  /** Eski: ayrı Modal. coinPackages verilirse panel içi moda geçilir (iOS güvenli). */
  onCoinYukle?: () => void;
  /** Panel içi coin yükleme — ikinci Modal açılmaz */
  coinPackages?: CoinPackage[];
  coinLocked?: boolean;
  onCoinBuy?: (pkg: CoinPackage) => void;
  onCoinPaketHazirla?: () => void;
  /** Gönderim sürerken buton kilidi */
  gonderiyor?: boolean;
};

type KartProps = {
  item: Gift;
  aktif: boolean;
  ucuz: boolean;
  locale: string;
  onSec: (g: Gift) => void;
  onHizliGonder: (g: Gift) => void;
};

const HediyeKart = React.memo(function HediyeKart({
  item,
  aktif,
  ucuz,
  locale,
  onSec,
  onHizliGonder,
}: KartProps) {
  return (
    <Pressable
      onPress={() => onSec(item)}
      onLongPress={() => onHizliGonder(item)}
      delayLongPress={280}
      style={[
        styles.hediye,
        aktif && styles.hediyeAktif,
        ucuz && styles.hediyeUcuz,
      ]}
    >
      <CanliHediyeSimgesi emoji={item.emoji} size={30} secili={aktif} sakin />
      <Text style={styles.hediyeAd} numberOfLines={1}>
        {HediyeAdiCevir(item.code, item.name)}
      </Text>
      <View style={styles.fiyatSatir}>
        <Text style={styles.coinIcon}>🪙</Text>
        <Text style={styles.fiyat}>
          {item.coin_cost.toLocaleString(locale)}
        </Text>
      </View>
    </Pressable>
  );
});

export function HediyeMagazaPaneli({
  visible,
  gifts,
  coins,
  aliciAdi,
  pkAlicilar,
  seciliPkAliciId,
  seciliAliciIdler,
  onPkAliciSec,
  onSend,
  onClose,
  onCoinYukle,
  coinPackages,
  coinLocked,
  onCoinBuy,
  onCoinPaketHazirla,
  gonderiyor = false,
}: Props) {
  const { t } = useCeviri();
  const { height: ekranYuk } = useWindowDimensions();
  const locale = DIL_LOCALE_MAP[AktifDil()];
  const insets = useSafeAreaInsets();
  const [sekme, setSekme] = useState<(typeof SEKME_IDS)[number]>('populer');
  const [secili, setSecili] = useState<Gift | null>(null);
  const [adet, setAdet] = useState(1);
  /** Aynı Modal içinde coin paketleri — iOS ikinci Modal açmaz */
  const [coinModu, setCoinModu] = useState(false);
  const icindeCoin = coinPackages != null && !!onCoinBuy;
  const odaAlici = !!pkAlicilar?.some((a) => a.rol);
  const kapatRef = useRef(onClose);
  kapatRef.current = onClose;
  const translateY = useSharedValue(0);

  const kapat = useCallback(() => {
    kapatRef.current();
  }, []);

  const sayfayiKapat = useCallback(() => {
    translateY.value = withTiming(
      Math.max(ekranYuk, 480),
      { duration: 200, easing: Easing.out(Easing.cubic) },
      (bitti) => {
        if (bitti) runOnJS(kapat)();
      },
    );
  }, [ekranYuk, kapat, translateY]);

  useEffect(() => {
    if (!visible) return;
    translateY.value = 0;
  }, [translateY, visible]);

  const asagiKaydir = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-9999, 10])
        .failOffsetX([-22, 22])
        .onUpdate((e) => {
          translateY.value = Math.max(0, e.translationY);
        })
        .onEnd((e) => {
          if (translateY.value > 72 || e.velocityY > 900) {
            translateY.value = withTiming(
              Math.max(ekranYuk, 480),
              { duration: 200, easing: Easing.out(Easing.cubic) },
              (bitti) => {
                if (bitti) runOnJS(kapat)();
              },
            );
            return;
          }
          translateY.value = withTiming(0, {
            duration: 160,
            easing: Easing.out(Easing.cubic),
          });
        }),
    [ekranYuk, kapat, translateY],
  );

  const sheetSuruk = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  /** Android nav / gesture çubuğu — kartı yukarı, Gönder tıklanabilir */
  const sheetLift = ANDROID
    ? Math.max(insets.bottom, 12) + 20
    : Math.max(insets.bottom, 8);
  const sheetPadBottom = odaAlici
    ? BoslukTokenlari.md
    : ANDROID
      ? Math.max(insets.bottom, 10) + 14
      : Math.max(insets.bottom, 8) + BoslukTokenlari.md;

  const sirali = useMemo(
    () => [...gifts].sort((a, b) => a.coin_cost - b.coin_cost),
    [gifts],
  );

  const liste = useMemo(() => {
    if (sekme === 'populer') {
      return sirali
        .filter(
          (g) =>
            g.coin_cost <= 999 ||
            g.code === 'rose' ||
            g.code === 'heart' ||
            g.code === 'crown' ||
            g.code === 'rocket' ||
            g.rarity === 'rare',
        )
        .slice(0, 24);
    }
    if (sekme === 'all') return sirali;
    return sirali.filter((g) => g.rarity === sekme);
  }, [sekme, sirali]);

  useEffect(() => {
    if (!visible) {
      setAdet(1);
      setCoinModu(false);
      return;
    }
    if (!secili && liste[0]) setSecili(liste[0]);
  }, [visible, liste, secili]);

  useEffect(() => {
    if (secili && !liste.some((g) => g.id === secili.id) && liste[0]) {
      setSecili(liste[0]);
    }
  }, [liste, secili]);

  const kisiSayisi = odaAlici ? (seciliAliciIdler?.length ?? 0) : 1;
  const toplam =
    secili != null && kisiSayisi > 0 ? secili.coin_cost * adet * kisiSayisi : 0;
  const yetmez = coins != null && toplam > coins;

  const coinAc = useCallback(() => {
    if (icindeCoin) {
      setCoinModu(true);
      onCoinPaketHazirla?.();
      return;
    }
    onCoinYukle?.();
  }, [icindeCoin, onCoinPaketHazirla, onCoinYukle]);

  const onSec = useCallback((g: Gift) => setSecili(g), []);
  const onHizliGonder = useCallback(
    (g: Gift) => {
      if (gonderiyor) return;
      setSecili(g);
      setAdet(1);
      if (coins != null && g.coin_cost > coins) {
        coinAc();
        return;
      }
      onSend(g, 1);
    },
    [coins, coinAc, gonderiyor, onSend],
  );

  const gonder = useCallback(() => {
    if (!secili || gonderiyor) return;
    if (yetmez) {
      coinAc();
      return;
    }
    onSend(secili, adet);
  }, [adet, coinAc, gonderiyor, onSend, secili, yetmez]);

  const renderItem = useCallback(
    ({ item }: { item: Gift }) => (
      <HediyeKart
        item={item}
        aktif={secili?.id === item.id}
        ucuz={coins != null && item.coin_cost > coins}
        locale={locale}
        onSec={onSec}
        onHizliGonder={onHizliGonder}
      />
    ),
    [coins, locale, onHizliGonder, onSec, secili?.id],
  );

  const keyExtractor = useCallback((item: Gift) => item.id, []);

  const extraData = useMemo(
    () => ({ seciliId: secili?.id, coins }),
    [secili?.id, coins],
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (coinModu) {
          setCoinModu(false);
          return;
        }
        sayfayiKapat();
      }}
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
    >
      <GestureHandlerRootView style={[styles.root, { paddingBottom: sheetLift }]}>
        <Pressable
          style={styles.perde}
          onPress={() => {
            if (coinModu) {
              setCoinModu(false);
              return;
            }
            sayfayiKapat();
          }}
        >
          <View style={[StyleSheet.absoluteFill, styles.perdeRenk]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            sheetSuruk,
            coinModu && styles.sheetCoin,
            odaAlici && !coinModu && styles.sheetOda,
          ]}
        >
          <CamArkaplan
            intensity={ANDROID ? 0 : 36}
            hafif={ANDROID}
            style={StyleSheet.absoluteFill}
            fallbackColor={RenkTokenlari.bgElevated}
            pointerEvents="none"
          />
          <View
            style={[
              styles.sheetIc,
              odaAlici && !coinModu && styles.sheetIcOda,
              { paddingBottom: sheetPadBottom },
            ]}
          >
            <GestureDetector gesture={asagiKaydir}>
              <View style={styles.tutamak}>
                <View style={styles.handle} />
                <View style={[styles.ust, styles.sabitSatir]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.baslik}>
                      {coinModu ? t('hediye.coinYukle') : t('hediye.gonderBaslik')}
                    </Text>
                    <Text style={styles.alt}>
                      {coinModu
                        ? t('hediye.coinYukleAlt')
                        : aliciAdi
                          ? t('hediye.alici', { ad: aliciAdi })
                          : t('hediye.canliHediyeler')}
                      {coinModu ? '' : ` · ${sirali.length}`}
                    </Text>
                  </View>
                  {coinModu ? (
                    <Pressable
                      onPress={() => setCoinModu(false)}
                      style={styles.kapatBtn}
                      hitSlop={8}
                      accessibilityLabel={t('hediye.hediyeyeDon')}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={20}
                        color={RenkTokenlari.textMuted}
                      />
                    </Pressable>
                  ) : (
                    <Pressable onPress={onClose} style={styles.kapatBtn} hitSlop={8}>
                      <Ionicons
                        name="close"
                        size={20}
                        color={RenkTokenlari.textMuted}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            </GestureDetector>

            {coinModu && coinPackages && onCoinBuy ? (
              <ScrollView
                style={styles.coinScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.coinScrollIc}
                keyboardShouldPersistTaps="handled"
              >
                <CoinPaketMagaza
                  packages={coinPackages}
                  locked={coinLocked}
                  onBuy={onCoinBuy}
                  baslikGoster={false}
                  onPaketleriYenile={onCoinPaketHazirla}
                />
              </ScrollView>
            ) : (
              <>
                {odaAlici && pkAlicilar ? (
                  <View style={styles.aliciBlok}>
                    <Text style={styles.pkBaslik}>{t('hediye.kime')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.aliciSatir}
                    >
                      {pkAlicilar.map((a) => {
                        const aktif = (seciliAliciIdler ?? []).includes(a.id);
                        return (
                          <Pressable
                            key={a.id}
                            onPress={() => onPkAliciSec?.(a.id)}
                            style={[styles.aliciKart, aktif && styles.aliciKartAktif]}
                          >
                            {a.avatarUrl ? (
                              <Image
                                source={{ uri: a.avatarUrl }}
                                style={styles.aliciAvatar}
                              />
                            ) : (
                              <View style={styles.aliciAvatarBos}>
                                <Ionicons
                                  name="person"
                                  size={12}
                                  color={RenkTokenlari.textMuted}
                                />
                              </View>
                            )}
                            <View style={styles.aliciMetin}>
                              <Text
                                style={[
                                  styles.aliciAd,
                                  aktif && styles.aliciAdAktif,
                                ]}
                                numberOfLines={1}
                              >
                                {a.ad}
                              </Text>
                              {a.rol === 'sahip' ? (
                                <View style={styles.sahipEtiket}>
                                  <Text style={styles.sahipEtiketYazi}>
                                    {t('sesOda.odaSahibi')}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : pkAlicilar && pkAlicilar.length > 1 ? (
                  <View style={styles.pkAlicilar}>
                    <Text style={styles.pkBaslik}>
                      {pkAlicilar.some((a) => a.side)
                        ? t('hediye.pkKime')
                        : t('hediye.kime')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pkSatir}
                    >
                      {pkAlicilar.map((a) => {
                        const aktif = seciliPkAliciId === a.id;
                        return (
                          <Pressable
                            key={a.id}
                            onPress={() => onPkAliciSec?.(a.id)}
                            style={[styles.pkChip, aktif && styles.pkChipAktif]}
                          >
                            {a.rol === 'sahip' ? (
                              <Ionicons
                                name="star"
                                size={12}
                                color={
                                  aktif
                                    ? RenkTokenlari.text
                                    : RenkTokenlari.accent
                                }
                              />
                            ) : a.rol === 'konuk' ? (
                              <Ionicons
                                name="mic"
                                size={12}
                                color={
                                  aktif
                                    ? RenkTokenlari.text
                                    : RenkTokenlari.textMuted
                                }
                              />
                            ) : null}
                            <Text
                              style={[
                                styles.pkChipYazi,
                                aktif && styles.pkChipYaziAktif,
                              ]}
                              numberOfLines={1}
                            >
                              {a.side === 'a' ? '🔵 ' : a.side === 'b' ? '🩷 ' : ''}
                              {a.ad}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.sabitSatir}
                  contentContainerStyle={styles.sekmeler}
                >
                  {SEKME_IDS.map((id) => {
                    const aktif = sekme === id;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => setSekme(id)}
                        style={[styles.sekme, aktif && styles.sekmeAktif]}
                      >
                        <Text
                          style={[
                            styles.sekmeYazi,
                            aktif && styles.sekmeYaziAktif,
                          ]}
                        >
                          {t(SEKME_ANAHTAR[id])}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={odaAlici ? styles.gridEsnek : styles.gridWrap}>
                  <FlashList
                    style={styles.gridListe}
                    data={liste}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    numColumns={SUTUN}
                    extraData={extraData}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    overScrollMode="never"
                    drawDistance={ANDROID ? 180 : 250}
                    contentContainerStyle={styles.grid}
                  />
                </View>

                <View style={styles.adetBar}>
                  <Text style={styles.adetEtiket}>{t('hediye.adet')}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.adetList}
                  >
                    {ADET_SECENEKLERI.map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setAdet(n)}
                        style={[
                          styles.adetChip,
                          adet === n && styles.adetChipAktif,
                        ]}
                      >
                        <Text
                          style={[
                            styles.adetChipYazi,
                            adet === n && styles.adetChipYaziAktif,
                          ]}
                        >
                          ×{n}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.altBar}>
                  <Pressable
                    style={styles.bakiye}
                    onPress={coinAc}
                    disabled={!icindeCoin && !onCoinYukle}
                  >
                    <Text style={styles.bakiyeIcon}>🪙</Text>
                    <Text style={styles.bakiyeYazi}>
                      {(coins ?? 0).toLocaleString(locale)}
                    </Text>
                    {icindeCoin || onCoinYukle ? (
                      <Ionicons
                        name="add-circle"
                        size={18}
                        color={RenkTokenlari.accent}
                      />
                    ) : null}
                  </Pressable>

                  <Pressable
                    onPress={gonder}
                    disabled={!secili || gonderiyor}
                    hitSlop={{ top: 10, bottom: 14, left: 8, right: 8 }}
                    style={({ pressed }) => [
                      styles.gonderWrap,
                      (!secili || gonderiyor) && { opacity: 0.45 },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <LinearGradient
                      colors={
                        yetmez
                          ? ['#F5C462', '#E8A838']
                          : [...RenkTokenlari.gradientPrimary]
                      }
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.gonder}
                    >
                      <Text
                        style={[
                          styles.gonderYazi,
                          yetmez && { color: '#1A1208' },
                        ]}
                      >
                        {gonderiyor
                          ? t('hediye.gonderiliyor')
                          : yetmez
                            ? t('hediye.coinYukle')
                            : secili && kisiSayisi > 0
                              ? t('hediye.gonderToplam', {
                                  toplam: toplam.toLocaleString(locale),
                                })
                              : t('ortak.gonder')}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  perde: { ...StyleSheet.absoluteFill },
  perdeRenk: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  sheet: {
    maxHeight: '72%',
    minHeight: '52%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.bgElevated,
    zIndex: 2,
    elevation: ANDROID ? 16 : 24,
  },
  sheetCoin: {
    maxHeight: '88%',
    minHeight: '70%',
  },
  sheetOda: {
    maxHeight: '68%',
    minHeight: 0,
  },
  sheetIcOda: {
    flex: 0,
  },
  coinScroll: {
    flex: 1,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  coinScrollIc: {
    paddingBottom: BoslukTokenlari.lg,
    gap: BoslukTokenlari.md,
  },
  sheetIc: {
    flex: 1,
    zIndex: 2,
    elevation: 6,
    gap: BoslukTokenlari.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  tutamak: {
    flexShrink: 0,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sabitSatir: {
    flexGrow: 0,
    flexShrink: 0,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 18,
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  kapatBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  sekmeler: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: 6,
    paddingVertical: 0,
    alignItems: 'center',
  },
  sekme: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sekmeAktif: {
    backgroundColor: 'rgba(232,64,145,0.28)',
  },
  sekmeYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
    letterSpacing: 0,
  },
  sekmeYaziAktif: {
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  gridWrap: {
    height: ANDROID ? 240 : 268,
    paddingHorizontal: BoslukTokenlari.xs,
  },
  gridEsnek: {
    height: 148,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: BoslukTokenlari.xs,
    overflow: 'hidden',
  },
  gridListe: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.sm,
  },
  hediye: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    gap: 3,
    margin: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  hediyeAktif: {
    backgroundColor: 'rgba(232,64,145,0.18)',
    borderColor: RenkTokenlari.borderAccent,
  },
  hediyeUcuz: { opacity: 0.45 },
  pkAlicilar: {
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
    gap: 6,
  },
  pkBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontWeight: '800',
  },
  pkSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
  },
  pkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.xs,
    maxWidth: 168,
    paddingVertical: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  pkChipAktif: {
    borderColor: '#F0B429',
    backgroundColor: 'rgba(240,180,41,0.16)',
  },
  pkChipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    flexShrink: 1,
  },
  pkChipYaziAktif: { color: RenkTokenlari.text },
  aliciBlok: {
    flexShrink: 0,
    gap: 4,
    paddingLeft: BoslukTokenlari.lg,
  },
  aliciSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: BoslukTokenlari.lg,
  },
  aliciKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    maxWidth: 168,
    paddingVertical: 2,
    paddingLeft: 2,
    paddingRight: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  aliciKartAktif: {
    borderColor: RenkTokenlari.accent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  aliciAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: RenkTokenlari.bg,
  },
  aliciAvatarBos: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.bg,
  },
  aliciMetin: {
    flexShrink: 1,
    gap: 1,
  },
  aliciAd: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
    letterSpacing: 0,
  },
  aliciAdAktif: {
    color: RenkTokenlari.text,
  },
  sahipEtiket: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.pressFill,
  },
  sahipEtiketYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    lineHeight: 12,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    letterSpacing: 0,
  },
  hediyeAd: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },
  fiyatSatir: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  coinIcon: { fontSize: 9 },
  fiyat: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    fontSize: 10,
  },
  adetBar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  adetEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
  },
  adetList: { gap: 6, alignItems: 'center' },
  adetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  adetChipAktif: {
    borderColor: RenkTokenlari.accent,
    backgroundColor: 'rgba(240,180,41,0.16)',
  },
  adetChipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  adetChipYaziAktif: { color: RenkTokenlari.accent },
  altBar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
  },
  bakiye: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  bakiyeIcon: { fontSize: 14 },
  bakiyeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  gonderWrap: { flex: 1 },
  gonder: {
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: ANDROID ? 16 : 14,
    alignItems: 'center',
    minHeight: ANDROID ? 52 : 48,
    justifyContent: 'center',
  },
  gonderYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
});
