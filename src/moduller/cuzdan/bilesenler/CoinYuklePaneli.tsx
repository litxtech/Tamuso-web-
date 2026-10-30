import React from 'react';
import {
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
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { HesabiTamamlaKarti } from '../../misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useAuth, useWallet } from '../../../contexts/AuthContext';
import { useCeviri } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import { CoinPaketMagaza } from './CoinPaketMagaza';
import type { CoinPackage } from '../../../types/models';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  visible: boolean;
  packages: CoinPackage[];
  locked?: boolean;
  coins?: number;
  onBuy: (pkg: CoinPackage) => void;
  onClose: () => void;
  /** Misafir upgrade (hook’tan) */
  upgradeAcik?: boolean;
  upgradeKapat?: () => void;
  onPaketleriYenile?: () => void;
};

const EKRAN_H = Dimensions.get('window').height;
const SHEET_H = Math.round(Math.min(EKRAN_H * 0.88, EKRAN_H - 28));

/**
 * Wallet’taki coin paket kartlarını bottom-sheet olarak gösterir.
 * Sıfır / yetersiz bakiyede oyun veya hediye denemesinde açılır.
 */
export function CoinYuklePaneli({
  visible,
  packages,
  locked,
  coins,
  onBuy,
  onClose,
  upgradeAcik = false,
  upgradeKapat,
  onPaketleriYenile,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t, dil } = useCeviri();
  const loc = DIL_LOCALE_MAP[dil];
  const { refreshProfile } = useAuth();
  const { refreshWallet } = useWallet();
  const altPad =
    Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 12) + 8;

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
            intensity={Platform.OS === 'android' ? 0 : 42}
            hafif
            style={StyleSheet.absoluteFill}
            fallbackColor={RenkTokenlari.bgElevated}
            pointerEvents="none"
          />
          <View style={styles.sheetIc}>
            <View style={styles.handle} />
            <View style={styles.ust}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.baslik}>{t('cuzdanX.coinPaketleri')}</Text>
                <Text style={styles.alt}>{t('cuzdanX.paketSecGuvenli')}</Text>
                {coins != null ? (
                  <View style={styles.bakiyeSatir}>
                    <Text style={styles.bakiyeIcon}>🪙</Text>
                    <Text style={styles.bakiyeYazi}>
                      {t('cuzdanX.bakiyeNokta', {
                        adet: coins.toLocaleString(loc),
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Pressable onPress={onClose} style={styles.kapatBtn} hitSlop={8}>
                <Ionicons name="close" size={22} color={RenkTokenlari.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollIc}
              bounces
            >
              <CoinPaketMagaza
                packages={packages}
                locked={locked}
                onBuy={onBuy}
                baslikGoster={false}
                onPaketleriYenile={onPaketleriYenile}
              />
            </ScrollView>
          </View>
        </View>
      </TamusoModal>

      {upgradeKapat ? (
        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => {
            void refreshProfile();
            void refreshWallet();
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  sheetWrap: {
    paddingHorizontal: 0,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  sheetIc: {
    flex: 1,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    gap: BoslukTokenlari.md,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.border,
    marginBottom: 2,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 22,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  bakiyeSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  bakiyeIcon: { fontSize: 13 },
  bakiyeYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontWeight: '800',
  },
  kapatBtn: {
    width: 40,
    height: 40,
    borderRadius: YaricapTokenlari.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollIc: {
    paddingBottom: BoslukTokenlari.xl,
    gap: BoslukTokenlari.md,
  },
});
