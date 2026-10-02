import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { StripeOdemeOnayla } from '../islemler/StripeOdemeOnayla';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  visible: boolean;
  catalog: 'coin' | 'ai_music' | 'agency_package';
  packageId?: string;
  productId?: string;
  offerId?: string;
  baslik?: string;
  onClose: () => void;
  onBasarili: () => void;
  onHata?: (mesaj: string) => void;
};

const EKRAN_H = Dimensions.get('window').height;
const SHEET_H = Math.round(Math.min(EKRAN_H * 0.92, 720));

/**
 * Stripe Checkout — uygulama içi alttan WebView (harici tarayıcı yok).
 * Native PaymentSheet yoksa yedek.
 */
export function StripeCheckoutWebSheet({
  visible,
  catalog,
  packageId,
  productId,
  offerId,
  baslik,
  onClose,
  onBasarili,
  onHata,
}: Props) {
  const { t } = useCeviri();
  const baslikMetin = baslik ?? t('aiMuzik.kartIleOde');
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const basladi = useRef(false);
  const tamamlandi = useRef(false);

  const baslat = useCallback(async () => {
    if (basladi.current) return;
    basladi.current = true;
    setYukleniyor(true);
    const scheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'muta';
    const r = await StripeCheckoutBaslat({
      catalog,
      packageId,
      productId,
      offerId,
      successUrl: `${scheme}://stripe-success`,
      cancelUrl: `${scheme}://stripe-cancel`,
    });
    setYukleniyor(false);
    if (!r.ok) {
      basladi.current = false;
      onHata?.(r.hata);
      onClose();
      return;
    }
    setUrl(r.url);
  }, [catalog, packageId, productId, offerId, onClose, onHata]);

  React.useEffect(() => {
    if (!visible) {
      basladi.current = false;
      tamamlandi.current = false;
      setUrl(null);
      return;
    }
    void baslat();
  }, [visible, baslat]);

  const navDegisti = (nav: WebViewNavigation) => {
    const u = nav.url ?? '';
    if (tamamlandi.current) return;
    if (u.includes('stripe-success') || u.includes('stripe=success')) {
      tamamlandi.current = true;
      onBasarili();
      onClose();
      return;
    }
    if (u.includes('stripe-cancel') || u.includes('stripe=cancel')) {
      tamamlandi.current = true;
      onClose();
    }
  };

  const altPad = Math.max(insets.bottom, 12);

  return (
    <TamusoModal
      visible={visible}
      onClose={onClose}
      placement="bottom"
      animationType="slide"
      contentStyle={styles.wrap}
    >
      <View style={[styles.sheet, { height: SHEET_H, paddingBottom: altPad }]}>
        <CamArkaplan
          intensity={Platform.OS === 'android' ? 0 : 40}
          hafif
          style={StyleSheet.absoluteFill}
          fallbackColor={RenkTokenlari.bgElevated}
          pointerEvents="none"
        />
        <View style={styles.ust}>
          <View style={styles.tutamak} />
          <View style={styles.ustSatir}>
            <Text style={styles.baslik}>{baslikMetin}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.kapat}>
              <Ionicons name="close" size={22} color={RenkTokenlari.textMuted} />
            </Pressable>
          </View>
        </View>
        {yukleniyor || !url ? (
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginTop: 48 }}
          />
        ) : (
          <WebView
            source={{ uri: url }}
            style={styles.web}
            onNavigationStateChange={navDegisti}
            startInLoadingState
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            javaScriptEnabled
            domStorageEnabled
          />
        )}
      </View>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  sheet: {
    width: '100%',
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgElevated,
  },
  ust: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    zIndex: 2,
  },
  tutamak: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.sm,
  },
  ustSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: BoslukTokenlari.sm,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  kapat: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  web: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
