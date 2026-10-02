import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CuzdanNoQrGorselUri } from '../islemler/CuzdanKartPaylasimi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  GolgeTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  walletNumber: string;
  marka?: string | null;
  onWhatsAppPaylas?: () => void;
  onKameraOku?: () => void;
};

function formatNo(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 18);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/** Köşe tarama çerçevesi — modern banka QR hissi */
function KoseCerceve() {
  const L = 22;
  const T = 2.5;
  const c = RenkTokenlari.accent;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.kose, styles.koseTL, { borderColor: c, width: L, height: L, borderTopWidth: T, borderLeftWidth: T }]} />
      <View style={[styles.kose, styles.koseTR, { borderColor: c, width: L, height: L, borderTopWidth: T, borderRightWidth: T }]} />
      <View style={[styles.kose, styles.koseBL, { borderColor: c, width: L, height: L, borderBottomWidth: T, borderLeftWidth: T }]} />
      <View style={[styles.kose, styles.koseBR, { borderColor: c, width: L, height: L, borderBottomWidth: T, borderRightWidth: T }]} />
    </View>
  );
}

/**
 * Modern MUTA PAY cüzdan QR kartı —
 * gradient çerçeve, köşe markaları, yüksek kontrastlı kod.
 */
export function CuzdanQrKarti({
  walletNumber,
  marka,
  onWhatsAppPaylas,
  onKameraOku,
}: Props) {
  const { t } = useCeviri();
  const no = walletNumber.replace(/\D/g, '');
  const hazir = no.length === 18;
  const uri = useMemo(
    () => (hazir ? CuzdanNoQrGorselUri(no, 360) : null),
    [hazir, no],
  );

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[
          'rgba(240, 180, 41, 0.35)',
          'rgba(232, 64, 145, 0.22)',
          'rgba(139, 92, 246, 0.28)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.disCerzeve}
      >
        <View style={styles.icKart}>
          <View style={styles.ustSerit}>
            <View style={styles.markaPill}>
              <Text style={styles.markaYazi}>
                {(marka || 'MUTA PAY').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.ustEtiket}>{t('cuzdan.cuzdanQr').toUpperCase()}</Text>
          </View>

          <View style={styles.qrSahne}>
            <KoseCerceve />
            <View style={styles.qrPlaka}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.qrImg}
                  resizeMode="contain"
                  accessibilityLabel={t('cuzdan.qrKoduA11y')}
                />
              ) : (
                <ActivityIndicator color={RenkTokenlari.accent} />
              )}
            </View>
          </View>

          <Text style={styles.noYazi} numberOfLines={1}>
            {hazir ? formatNo(no) : t('cuzdan.numaraHazirlaniyor')}
          </Text>
          <Text style={styles.ipucu}>{t('cuzdan.qrIpucu')}</Text>

          <View style={styles.aksiyonSatir}>
            {onKameraOku ? (
              <Pressable
                style={({ pressed }) => [
                  styles.aksiyonBtn,
                  pressed && { opacity: 0.88 },
                ]}
                onPress={onKameraOku}
                accessibilityLabel={t('cuzdan.qrOku')}
              >
                <Ionicons
                  name="scan-outline"
                  size={18}
                  color={RenkTokenlari.accent}
                />
                <Text style={styles.aksiyonYazi}>{t('cuzdan.qrOku')}</Text>
              </Pressable>
            ) : null}
            {onWhatsAppPaylas ? (
              <Pressable
                style={({ pressed }) => [
                  styles.aksiyonBtn,
                  styles.aksiyonWa,
                  pressed && { opacity: 0.88 },
                ]}
                onPress={onWhatsAppPaylas}
                accessibilityLabel={t('cuzdan.a11yWaQr')}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                <Text style={[styles.aksiyonYazi, styles.aksiyonWaYazi]}>
                  {t('ortak.whatsapp')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: BoslukTokenlari.md,
    ...GolgeTokenlari.soft,
  },
  disCerzeve: {
    borderRadius: YaricapTokenlari.xl,
    padding: 1.5,
  },
  icKart: {
    borderRadius: YaricapTokenlari.xl - 1,
    backgroundColor: RenkTokenlari.bgElevated,
    paddingVertical: BoslukTokenlari.lg,
    paddingHorizontal: BoslukTokenlari.lg,
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    overflow: 'hidden',
  },
  ustSerit: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markaPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(240, 180, 41, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(240, 180, 41, 0.35)',
  },
  markaYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    letterSpacing: 1.6,
    fontWeight: '800',
    fontSize: 10,
  },
  ustEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    letterSpacing: 1.4,
    fontWeight: '700',
    fontSize: 10,
  },
  qrSahne: {
    width: 212,
    height: 212,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  kose: {
    position: 'absolute',
    borderRadius: 3,
  },
  koseTL: { top: 0, left: 0 },
  koseTR: { top: 0, right: 0 },
  koseBL: { bottom: 0, left: 0 },
  koseBR: { bottom: 0, right: 0 },
  qrPlaka: {
    width: 176,
    height: 176,
    borderRadius: 18,
    backgroundColor: '#FFFEFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 180, 41, 0.2)',
    overflow: 'hidden',
  },
  qrImg: {
    width: 156,
    height: 156,
  },
  noYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    letterSpacing: 2.4,
    fontWeight: '700',
    fontSize: 14,
    opacity: 0.92,
  },
  ipucu: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: BoslukTokenlari.sm,
  },
  aksiyonSatir: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
    width: '100%',
    marginTop: 2,
  },
  aksiyonBtn: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: 'rgba(240, 180, 41, 0.35)',
    backgroundColor: RenkTokenlari.pressFill,
  },
  aksiyonWa: {
    borderColor: 'rgba(37, 211, 102, 0.45)',
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
  },
  aksiyonYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
  aksiyonWaYazi: {
    color: '#25D366',
  },
});
