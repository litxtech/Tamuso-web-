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
import { AnaSayfaPremiumBolumBasligi } from './AnaSayfaPremiumBolumBasligi';
import { AnaSayfaSesCubuklari } from './AnaSayfaSesCubuklari';
import { OdaUyeAvatarYigini } from './OdaUyeAvatarYigini';
import type { FeedOggesi } from '../okuma/AnaSayfaIcerikleriniGetir';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { SayiKisaBicim } from '../../../tasarim-sistemi/premium/SeviyeXpHesap';
import { kullaniciTemaKodunuAl, temaAcikMi } from '../../../tasarim-sistemi/tema/TemaDurumu';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  ogeler: FeedOggesi[];
  onPress: (oge: FeedOggesi) => void;
  onTumunuGor?: () => void;
};

const KART_W = 156;

/** Yatay ses odası carousel — platform ışıltı + üye avatar önizleme */
export function AnaSayfaSesOdasiSeridi({
  ogeler,
  onPress,
  onTumunuGor,
}: Props) {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const acik = temaAcikMi(kullaniciTemaKodunuAl());

  if (ogeler.length === 0) {
    return (
      <View style={styles.wrap}>
        <AnaSayfaPremiumBolumBasligi
          baslik={t('anaSayfa.sesliSohbetOdalari')}
          emoji="🎧"
          onTumunuGor={onTumunuGor}
        />
        <View style={styles.bos}>
          <Text style={styles.bosBaslik}>{t('anaSayfa.sesBosBaslik')}</Text>
          <Text style={styles.bosAlt}>{t('anaSayfa.sesBosAlt')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <AnaSayfaPremiumBolumBasligi
        baslik={t('anaSayfa.sesliSohbetOdalari')}
        emoji="🎧"
        onTumunuGor={onTumunuGor}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.serit}
        decelerationRate="fast"
      >
        {ogeler.map((oge, i) => {
          const hostAvatar = MedyaUriGuvenli(oge.host?.avatar_url);
          const hostAd =
            oge.host?.display_name ??
            (oge.host?.username ? `@${oge.host.username}` : t('anaSayfa.evSahibi'));
          const harf = (hostAd[0] ?? 'O').toUpperCase();
          const uyeAvatarlari =
            oge.uye_avatarlari && oge.uye_avatarlari.length > 0
              ? oge.uye_avatarlari
              : hostAvatar
                ? [hostAvatar]
                : [];

          return (
            <Pressable
              key={`${oge.id}-${i}`}
              onPress={() => onPress(oge)}
              style={({ pressed }) => [
                styles.kartPress,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('anaSayfa.sesA11y', { baslik: oge.title })}
            >
              <View
                style={[
                  styles.isiltiSarici,
                  {
                    borderColor: `${RenkTokenlari.primary}55`,
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    acik
                      ? (['#FFFFFF', '#F8EEF5'] as const)
                      : ([...RenkTokenlari.gradientCard] as [string, string])
                  }
                  style={[
                    styles.kart,
                    {
                      borderColor: acik
                        ? `${RenkTokenlari.primary}40`
                        : `${RenkTokenlari.primary}55`,
                    },
                  ]}
                >
                  <View style={styles.ust}>
                    {oge.host?.level && oge.host.level > 1 ? (
                      <View style={styles.crown}>
                        <Text style={styles.crownYazi}>Lv{oge.host.level}</Text>
                      </View>
                    ) : (
                      <View />
                    )}
                    {oge.listener_count > 0 ? (
                      <View style={styles.katilimci}>
                        <Ionicons
                          name="people"
                          size={11}
                          color={RenkTokenlari.primarySoft}
                        />
                        <Text style={styles.katilimciYazi}>
                          {SayiKisaBicim(oge.listener_count)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.avatarBlok}>
                    <LinearGradient
                      colors={[RenkTokenlari.primary, RenkTokenlari.magenta]}
                      style={styles.avatarRing}
                    >
                      <View
                        style={[
                          styles.avatarIc,
                          { backgroundColor: RenkTokenlari.bgElevated },
                        ]}
                      >
                        {hostAvatar ? (
                          <Image
                            source={{ uri: hostAvatar }}
                            style={styles.avatar}
                          />
                        ) : (
                          <LinearGradient
                            colors={[...RenkTokenlari.gradientPrimary]}
                            style={styles.avatar}
                          >
                            <Text style={styles.avatarHarf}>{harf}</Text>
                          </LinearGradient>
                        )}
                      </View>
                    </LinearGradient>
                  </View>

                  <Text style={styles.baslik} numberOfLines={2}>
                    {oge.title}
                  </Text>
                  <Text style={styles.host} numberOfLines={1}>
                    {hostAd}
                  </Text>

                  <View style={styles.altSatir}>
                    <OdaUyeAvatarYigini
                      avatarlar={uyeAvatarlari}
                      max={6}
                      boyut={18}
                      overlap={6}
                      borderColor={RenkTokenlari.bgCard}
                    />
                    <AnaSayfaSesCubuklari
                      yukseklik={14}
                      renk={RenkTokenlari.primarySoft}
                    />
                  </View>
                </LinearGradient>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: BoslukTokenlari.lg },
  serit: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.md,
    paddingVertical: 4,
  },
  kartPress: { width: KART_W },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  isiltiSarici: {
    borderRadius: YaricapTokenlari.lg + 1,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  kart: {
    width: KART_W,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    minHeight: 168,
  },
  ust: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 20,
  },
  crown: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: 'rgba(240,180,41,0.16)',
  },
  crownYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontSize: 9,
    fontWeight: '800',
  },
  katilimci: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  katilimciYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    fontSize: 11,
  },
  avatarBlok: {
    alignItems: 'center',
    marginVertical: 4,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIc: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHarf: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.textOnPrimary,
    fontSize: 20,
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 17,
  },
  host: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    fontSize: 11,
  },
  altSatir: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 6,
  },
  bos: {
    marginHorizontal: BoslukTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 4,
  },
  bosBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 15,
  },
  bosAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
