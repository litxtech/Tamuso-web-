import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';
import { useCeviri } from '../../../i18n/useCeviri';
import { useDil } from '../../../i18n/DilSaglayici';
import { rtlMetinStili } from '../../../i18n/rtl';

export type HamburgerOdaOzeti = {
  roomId: string;
  title: string;
  isLive: boolean;
};

export type HamburgerAjansOzeti = {
  id: string;
  name: string;
  logoUrl: string | null;
  role: 'owner' | 'manager' | 'member';
};

type Props = {
  oda: HamburgerOdaOzeti | null;
  ajans: HamburgerAjansOzeti | null;
  onOdaPress: (oda: HamburgerOdaOzeti) => void;
  onAjansPress: (ajans: HamburgerAjansOzeti) => void;
};

/**
 * Coin altında şeffaf cam — kendi ses odası / ajans (varsa, kompakt).
 */
export function HamburgerCamBaglantilar({
  oda,
  ajans,
  onOdaPress,
  onAjansPress,
}: Props) {
  const { t } = useCeviri();
  const { rtl } = useDil();
  useTemayaAboneOl();

  if (!oda && !ajans) return null;

  const logo = MedyaUriGuvenli(ajans?.logoUrl);
  const metinRtl = rtlMetinStili(rtl, true);
  /** Parent drawer direction:'ltr' kilitli — chevron dil intent'ine göre */
  const chevronAdi = rtl ? 'chevron-back' : 'chevron-forward';

  return (
    <View style={styles.dis}>
      <CamArkaplan
        intensity={36}
        hafif
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        fallbackColor={RenkTokenlari.bgGlass}
      />
      <View style={styles.kenar} pointerEvents="none" />

      <View style={styles.icerik}>
        {oda ? (() => {
          const odaAdi = oda.title.trim() || t('anaSayfa.odam');
          const ikon = (
            <View style={[styles.ikon, oda.isLive && styles.ikonCanli]}>
              <Ionicons
                name="mic"
                size={14}
                color={oda.isLive ? RenkTokenlari.live : RenkTokenlari.primarySoft}
              />
            </View>
          );
          const metin = (
            <View style={styles.metin}>
              <Text style={[styles.etiket, metinRtl]} numberOfLines={1}>
                {t('anaSayfa.sesOdasiEtiket')}
              </Text>
              <Text style={[styles.ad, metinRtl]} numberOfLines={1}>
                {odaAdi}
              </Text>
            </View>
          );
          const kuyruk = oda.isLive ? (
            <View style={styles.canliRozet}>
              <View style={styles.canliNokta} />
              <Text style={styles.canliYazi}>{t('anaSayfa.canliRozet')}</Text>
            </View>
          ) : (
            <Ionicons
              name={chevronAdi}
              size={14}
              color={RenkTokenlari.textDim}
            />
          );
          return (
            <Pressable
              onPress={() => onOdaPress(oda)}
              style={({ pressed }) => [styles.satir, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('anaSayfa.sesOdasiA11y', { baslik: odaAdi })}
            >
              {rtl ? (
                <>
                  {kuyruk}
                  {metin}
                  {ikon}
                </>
              ) : (
                <>
                  {ikon}
                  {metin}
                  {kuyruk}
                </>
              )}
            </Pressable>
          );
        })() : null}

        {oda && ajans ? <View style={styles.ayrac} /> : null}

        {ajans ? (() => {
          const bas = logo ? (
            <View style={styles.logoWrap}>
              <Image
                source={{ uri: logo }}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={[styles.ikon, styles.ikonAjans]}>
              <Ionicons
                name="briefcase"
                size={13}
                color={RenkTokenlari.accent}
              />
            </View>
          );
          const metin = (
            <View style={styles.metin}>
              <Text style={[styles.etiket, metinRtl]} numberOfLines={1}>
                {ajans.role === 'member' ? t('anaSayfa.ajansEtiket') : t('ajans.ajansim')}
              </Text>
              <Text style={[styles.ad, metinRtl]} numberOfLines={1}>
                {ajans.name.trim() || t('anaSayfa.ajansEtiket')}
              </Text>
            </View>
          );
          const kuyruk = (
            <Ionicons
              name={chevronAdi}
              size={14}
              color={RenkTokenlari.textDim}
            />
          );
          return (
            <Pressable
              onPress={() => onAjansPress(ajans)}
              style={({ pressed }) => [styles.satir, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('anaSayfa.ajansA11y', { ad: ajans.name })}
            >
              {rtl ? (
                <>
                  {kuyruk}
                  {metin}
                  {bas}
                </>
              ) : (
                <>
                  {bas}
                  {metin}
                  {kuyruk}
                </>
              )}
            </Pressable>
          );
        })() : null}
      </View>
    </View>
  );
}

/** Drawer açılınca gecikmeli oda + ajans özeti — yoksa null */
export function useHamburgerCamBaglantilar(aktif: boolean): {
  oda: HamburgerOdaOzeti | null;
  ajans: HamburgerAjansOzeti | null;
} {
  const [oda, setOda] = useState<HamburgerOdaOzeti | null>(null);
  const [ajans, setAjans] = useState<HamburgerAjansOzeti | null>(null);

  useEffect(() => {
    if (!aktif) return;
    let iptal = false;
    const timer = setTimeout(() => {
      void Promise.all([
        import('../../oyunlar/kazanc-balonu/BenimHostOdam').then(({ BenimHostOdamGetir }) =>
          BenimHostOdamGetir(),
        ),
        import('../../ajanslar/okuma/AjansUyelikGetir').then(({ AjansUyelikGetir }) =>
          AjansUyelikGetir(),
        ),
      ])
        .then(([odaSonuc, uyelik]) => {
          if (iptal) return;
          setOda(
            odaSonuc.ok && odaSonuc.roomId && odaSonuc.isLive
              ? {
                  roomId: odaSonuc.roomId,
                  // Boş bırak — bileşen t('anaSayfa.odam') fallback'ini uygular
                  title: odaSonuc.title?.trim() || '',
                  isLive: true,
                }
              : null,
          );
          const a = uyelik.agency;
          const rol = uyelik.role;
          setAjans(
            a && (rol === 'owner' || rol === 'manager' || rol === 'member')
              ? {
                  id: a.id,
                  name: a.name,
                  logoUrl: a.logo_url,
                  role: rol,
                }
              : null,
          );
        })
        .catch(() => {
          if (!iptal) {
            setOda(null);
            setAjans(null);
          }
        });
    }, 220);
    return () => {
      iptal = true;
      clearTimeout(timer);
    };
  }, [aktif]);

  return { oda, ajans };
}

const styles = StyleSheet.create({
  dis: {
    alignSelf: 'stretch',
    marginHorizontal: 2,
    marginBottom: 6,
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
  },
  kenar: {
    ...StyleSheet.absoluteFill,
    borderRadius: YaricapTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  icerik: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 0,
  },
  /** LTR kilit — drawer paterni: Yoga aynalamasın, sıra JSX'te */
  satir: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: YaricapTokenlari.sm,
  },
  pressed: { opacity: 0.78, backgroundColor: RenkTokenlari.pressFill },
  ikon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.pressFill,
    flexShrink: 0,
  },
  ikonCanli: {
    backgroundColor: 'rgba(232, 64, 145, 0.16)',
  },
  ikonAjans: {
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
  },
  logoWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.pressFill,
    flexShrink: 0,
  },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  metin: { flex: 1, minWidth: 0, gap: 0 },
  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ad: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ayrac: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8,
    backgroundColor: RenkTokenlari.border,
    opacity: 0.7,
  },
  canliRozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(232, 64, 145, 0.16)',
    flexShrink: 0,
  },
  canliNokta: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: RenkTokenlari.live,
  },
  canliYazi: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: RenkTokenlari.primarySoft,
  },
});
