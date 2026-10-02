import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AnaSayfaCanliNokta } from './AnaSayfaCanliNokta';
import { OdaUyeAvatarYigini } from './OdaUyeAvatarYigini';
import type { SonGezilenGorunum } from '../depolama/SonGezilenDepolama';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { kullaniciTemaKodunuAl, temaAcikMi } from '../../../tasarim-sistemi/tema/TemaDurumu';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';
import { SayiKisaBicim } from '../../../tasarim-sistemi/premium/SeviyeXpHesap';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  ogeler: SonGezilenGorunum[];
  onPress: (oge: SonGezilenGorunum) => void;
};

/** Son gezilenler — hafif kart (gölge yok) */
export function AnaSayfaSonGezilenSeridi({ ogeler, onPress }: Props) {
  useTemayaAboneOl();
  const { t } = useCeviri();
  if (ogeler.length === 0) return null;

  const acik = temaAcikMi(kullaniciTemaKodunuAl());

  return (
    <View style={styles.wrap}>
      <View style={styles.baslikSatir}>
        <View style={styles.baslikSol}>
          <AnaSayfaCanliNokta boyut={6} nabiz={false} />
          <Text style={styles.baslik}>{t('anaSayfa.sonGezilenler')}</Text>
        </View>
        <Text style={styles.sayi}>{ogeler.length}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.serit}
        decelerationRate="fast"
      >
        {ogeler.map((oge) => {
          const kapak = MedyaUriGuvenli(oge.coverUrl ?? oge.hostAvatar);
          const yayinMi = oge.tur === 'canli';
          const tint = yayinMi ? RenkTokenlari.live : RenkTokenlari.primary;
          const border = oge.canli
            ? `${tint}77`
            : acik
              ? RenkTokenlari.border
              : `${tint}40`;
          const uyeAvatarlari =
            oge.uyeAvatarlari && oge.uyeAvatarlari.length > 0
              ? oge.uyeAvatarlari
              : oge.hostAvatar
                ? [oge.hostAvatar]
                : [];

          return (
            <Pressable
              key={`${oge.tur}:${oge.id}`}
              onPress={() => onPress(oge)}
              style={({ pressed }) => [
                styles.kartPress,
                pressed && styles.pressed,
                !oge.canli && styles.kartSoluk,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('anaSayfa.gezilenA11y', { baslik: oge.title || (yayinMi ? t('anaSayfa.yayin') : t('olusturTab.oda')), tur: yayinMi ? t('anaSayfa.yayin') : t('anaSayfa.sesOdasiKisa') })}
            >
              <View style={[styles.kart, { borderColor: border }]}>
                {kapak ? (
                  <Image
                    source={{ uri: kapak }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.fallbackIkon]}>
                    <Ionicons
                      name={yayinMi ? 'videocam' : 'headset'}
                      size={28}
                      color={`${tint}55`}
                    />
                  </View>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(8,6,14,0.92)']}
                  locations={[0.4, 1]}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.ust}>
                  <View
                    style={[
                      styles.rozet,
                      {
                        backgroundColor: oge.canli
                          ? `${tint}40`
                          : 'rgba(255,255,255,0.12)',
                        borderColor: oge.canli
                          ? `${tint}88`
                          : 'rgba(255,255,255,0.2)',
                      },
                    ]}
                  >
                    {oge.canli ? (
                      <AnaSayfaCanliNokta
                        boyut={5}
                        renk={tint}
                        nabiz={false}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.rozetYazi,
                        { color: oge.canli ? tint : '#fff' },
                      ]}
                    >
                      {yayinMi
                        ? t('anaSayfa.yayinRozet')
                        : t('olusturTab.rozetSes')}
                    </Text>
                  </View>
                  {oge.listenerCount > 0 ? (
                    <View style={styles.sayac}>
                      <Ionicons name="people" size={10} color="#fff" />
                      <Text style={styles.sayacYazi}>
                        {SayiKisaBicim(oge.listenerCount)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.alt}>
                  <Text style={styles.baslikKart} numberOfLines={2}>
                    {oge.title || (yayinMi ? t('anaSayfa.yayin') : t('olusturTab.oda'))}
                  </Text>
                  <View style={styles.altSatir}>
                    <OdaUyeAvatarYigini
                      avatarlar={uyeAvatarlari}
                      max={5}
                      boyut={16}
                      overlap={5}
                      borderColor={`${tint}AA`}
                    />
                    {oge.hostAd ? (
                      <Text style={styles.host} numberOfLines={1}>
                        {oge.hostAd}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: BoslukTokenlari.md },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
  },
  baslikSol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sayi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
  },
  serit: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  kartPress: { width: 128 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  kartSoluk: { opacity: 0.72 },
  kart: {
    width: 128,
    height: 168,
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  fallbackIkon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.bgElevated,
  },
  ust: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rozetYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sayac: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sayacYazi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  alt: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    gap: 4,
  },
  baslikKart: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnOverlay,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 15,
  },
  altSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  host: {
    ...TipografiTokenlari.micro,
    flex: 1,
    color: RenkTokenlari.textOnOverlay,
    opacity: 0.8,
    fontSize: 10,
  },
});
