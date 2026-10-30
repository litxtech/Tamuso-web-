/**
 * Kişiler keşif üstü — canlı yayın ve şehir şeritleri.
 * Veri yoksa bölüm çizilmez.
 */

import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import type { KisilerKesifKarti } from '../tipler';
import type { SehirYukselen } from '../../sehirler/islemler/SehirModernIslemleri';
import { basHarfler, harfRenkleri } from './KisilerKartYuz';

export type CanliOzet = {
  id: string;
  hostId: string;
  ad: string;
  avatar: string | null;
  baslik: string | null;
  izleyici: number;
};

type Props = {
  canlilar: CanliOzet[];
  sehirler: SehirYukselen[];
  cevrimiciler: KisilerKesifKarti[];
  vurguCanli: boolean;
  onlineOnly: boolean;
  aramaMetni: string;
  onProfil: (userId: string) => void;
  onCanli: (sessionId: string) => void;
  onSehir: (cityId: string) => void;
};

export function KisilerKesfetSeritleri({
  canlilar,
  sehirler,
  cevrimiciler,
  vurguCanli,
  onlineOnly,
  aramaMetni,
  onProfil,
  onCanli,
  onSehir,
}: Props) {
  const { t } = useCeviri();
  const q = aramaMetni.trim().toLocaleLowerCase();

  const sehirSirasi = useMemo(() => {
    if (!q) return sehirler;
    const uyan = sehirler.filter((s) => s.name.toLocaleLowerCase().includes(q));
    const diger = sehirler.filter((s) => !s.name.toLocaleLowerCase().includes(q));
    return [...uyan, ...diger];
  }, [q, sehirler]);

  const canliGoster = canlilar.length > 0 || vurguCanli;
  const sehirGoster = sehirSirasi.length > 0;
  const aktifGoster = !onlineOnly && cevrimiciler.length > 0;

  if (!canliGoster && !sehirGoster && !aktifGoster) return null;

  const canliBlok = canliGoster ? (
    <View style={styles.blok}>
      <Text style={styles.baslik}>{t('kisiler.suAnCanli')}</Text>
      {canlilar.length === 0 ? (
        <Text style={styles.bos}>{t('kisiler.bosCanli')}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.satir}
        >
          {canlilar.map((c) => (
            <Pressable
              key={c.id}
              style={styles.canliKart}
              onPress={() => onCanli(c.id)}
              accessibilityRole="button"
              accessibilityLabel={`${t('kisiler.canliRozet')}, ${c.ad}`}
            >
              {c.avatar ? (
                <Image source={{ uri: c.avatar }} style={styles.canliFoto} />
              ) : (
                <LinearGradient colors={harfRenkleri(c.hostId)} style={styles.canliFoto}>
                  <Text style={styles.harf}>{basHarfler(c.ad)}</Text>
                </LinearGradient>
              )}
              <View style={styles.canliRozet}>
                <View style={styles.canliNokta} />
                <Text style={styles.canliYazi}>{t('kisiler.canliRozet')}</Text>
              </View>
              <Text style={styles.ad} numberOfLines={1}>
                {c.ad}
              </Text>
              {c.baslik ? (
                <Text style={styles.alt} numberOfLines={1}>
                  {c.baslik}
                </Text>
              ) : null}
              <Text style={styles.alt}>{t('kisiler.izleyici', { n: c.izleyici })}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  ) : null;

  const aktifBlok = aktifGoster ? (
    <View style={styles.blok}>
      <Text style={styles.baslik}>{t('kisilerX.cevrimici')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.satir}
      >
        {cevrimiciler.map((k) => {
          const ad = k.display_name?.trim() || k.username || t('ortak.kullanici');
          return (
            <Pressable
              key={k.user_id}
              style={styles.aktif}
              onPress={() => onProfil(k.user_id)}
              accessibilityRole="button"
              accessibilityLabel={t('kisilerX.profilA11y', { isim: ad })}
            >
              {k.avatar_url ? (
                <Image source={{ uri: k.avatar_url }} style={styles.aktifFoto} />
              ) : (
                <LinearGradient colors={harfRenkleri(k.user_id)} style={styles.aktifFoto}>
                  <Text style={styles.harfKucuk}>{basHarfler(ad)}</Text>
                </LinearGradient>
              )}
              <View style={styles.online} />
              <Text style={styles.aktifAd} numberOfLines={1}>
                {ad}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  const sehirBlok = sehirGoster ? (
    <View style={styles.blok}>
      <Text style={styles.baslik}>{t('kisiler.sehirleriKesfet')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.satir}
      >
        {sehirSirasi.map((s) => (
          <Pressable
            key={s.id}
            style={styles.sehir}
            onPress={() => onSehir(s.id)}
            accessibilityRole="button"
            accessibilityLabel={s.name}
          >
            <Ionicons name="business" size={14} color={RenkTokenlari.primarySoft} />
            <Text style={styles.sehirAd} numberOfLines={1}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  ) : null;

  return (
    <View style={styles.kok}>
      {vurguCanli ? (
        <>
          {canliBlok}
          {aktifBlok}
          {sehirBlok}
        </>
      ) : (
        <>
          {aktifBlok}
          {canliBlok}
          {sehirBlok}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kok: {
    gap: BoslukTokenlari.sm,
    marginBottom: BoslukTokenlari.sm,
  },
  blok: {
    gap: BoslukTokenlari.sm,
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  bos: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  satir: {
    gap: BoslukTokenlari.sm,
    paddingRight: BoslukTokenlari.sm,
  },
  canliKart: {
    width: 148,
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
    paddingBottom: BoslukTokenlari.sm,
  },
  canliFoto: {
    width: '100%',
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canliRozet: {
    position: 'absolute',
    top: BoslukTokenlari.sm,
    left: BoslukTokenlari.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.scrim,
  },
  canliNokta: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.magenta,
  },
  canliYazi: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: RenkTokenlari.textOnOverlay,
  },
  ad: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
    marginTop: BoslukTokenlari.xs,
    marginHorizontal: BoslukTokenlari.sm,
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginHorizontal: BoslukTokenlari.sm,
  },
  harf: {
    fontSize: 22,
    fontWeight: '700',
    color: RenkTokenlari.textOnOverlay,
  },
  harfKucuk: {
    fontSize: 16,
    fontWeight: '700',
    color: RenkTokenlari.textOnOverlay,
  },
  aktif: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  aktifFoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  online: {
    position: 'absolute',
    top: 48,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RenkTokenlari.mint,
    borderWidth: 1.5,
    borderColor: RenkTokenlari.bg,
  },
  aktifAd: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    textAlign: 'center',
    width: 72,
  },
  sehir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
    maxWidth: 180,
  },
  sehirAd: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '600',
    flexShrink: 1,
  },
});
