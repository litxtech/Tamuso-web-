import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { ModulHataSiniri } from '../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAjansUyeligi } from '../../../src/moduller/ajanslar/kancalar/useAjansUyeligi';
import { useAjansYonetim } from '../../../src/moduller/ajanslar/kancalar/useAjansYonetim';
import {
  HostProfilimiGetir,
  type HostProfil,
} from '../../../src/moduller/hostlar/okuma/HostProfiliniGetir';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  screenPaddingHorizontal,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';

function saatMetni(sn: number) {
  const s = Math.max(0, Math.floor(sn / 3600));
  return String(s);
}

export default function AjansUyePaneli() {
  const { t } = useCeviri();
  const { refreshProfile } = useAuth();
  const { uyelik, yukleniyor } = useAjansUyeligi();
  const { yetkili, yonetimHref } = useAjansYonetim();
  const [host, setHost] = useState<HostProfil | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      HostProfilimiGetir()
        .then(setHost)
        .catch(() => setHost(null));
    }, [refreshProfile]),
  );

  const ajans = uyelik.agency;
  const uye = uyelik.role === 'member' || uyelik.role === 'owner';
  const beklemede = uyelik.role === 'pending';

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ajans-uye" varyant="ekran" fallbackHref="/(tabs)/profile">
        <EkranBasligi
          title={t('ajans.ajansim')}
          subtitle={
            uye
              ? ajans?.name ?? t('ajans.uyePaneli')
              : beklemede
                ? t('ajans.basvuruInceleniyor')
                : t('ajans.ajansaKatil')
          }
        />
        {yukleniyor && !ajans ? (
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginTop: 40 }}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {ajans ? (
              <Pressable
                onPress={() => router.push(`/ajans/profil/${ajans.id}` as any)}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <LinearGradient
                  colors={[...RenkTokenlari.gradientCard]}
                  style={styles.ajansKart}
                >
                  {MedyaUriGuvenli(ajans.logo_url) ? (
                    <Image source={{ uri: MedyaUriGuvenli(ajans.logo_url)! }} style={styles.logo} />
                  ) : (
                    <View style={[styles.logo, styles.logoBos]}>
                      <Ionicons
                        name="briefcase"
                        size={22}
                        color={RenkTokenlari.primarySoft}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.ajansAd} numberOfLines={1}>
                      {ajans.name}
                    </Text>
                    <Text style={styles.ajansMeta} numberOfLines={1}>
                      {beklemede
                        ? t('ajans.incelemeBekleniyor')
                        : uyelik.role === 'owner'
                          ? t('ajans.sahip')
                          : t('ajans.uyeRol')}
                    </Text>
                    {ajans.slogan ? (
                      <Text style={styles.ajansSlogan} numberOfLines={1}>
                        {ajans.slogan}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={RenkTokenlari.textDim}
                  />
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={styles.bosKart}>
                <Text style={styles.bosBaslik}>{t('ajans.bosUyeBaslik')}</Text>
                <Text style={styles.bosGovde}>{t('ajans.bosUyeBody')}</Text>
              </View>
            )}

            {beklemede ? (
              <View style={styles.bilgiKart}>
                <Ionicons
                  name="hourglass-outline"
                  size={22}
                  color={RenkTokenlari.accent}
                />
                <Text style={styles.bilgiYazi}>{t('ajans.beklemeBilgi')}</Text>
              </View>
            ) : null}

            {uye ? (
              <>
                <Text style={styles.bolum}>{t('ajans.bolumYapabileceklerin')}</Text>
                <Aksiyon
                  icon="radio-outline"
                  baslik={t('ajans.aksiyonCanli')}
                  alt={t('ajans.aksiyonCanliAlt')}
                  onPress={() => router.push('/canli' as any)}
                />
                <Aksiyon
                  icon="mic-outline"
                  baslik={t('ajans.aksiyonSes')}
                  alt={t('ajans.aksiyonSesAlt')}
                  onPress={() => router.push('/(tabs)/create' as any)}
                />
                <Aksiyon
                  icon="business-outline"
                  baslik={t('ajans.aksiyonProfil')}
                  alt={t('ajans.aksiyonProfilAlt')}
                  onPress={() =>
                    ajans && router.push(`/ajans/profil/${ajans.id}` as any)
                  }
                />
                <Aksiyon
                  icon="person-outline"
                  baslik={t('ajans.aksiyonHost')}
                  alt={t('ajans.aksiyonHostAlt')}
                  onPress={() => router.push('/host' as any)}
                />
                {yetkili ? (
                  <Aksiyon
                    icon="settings-outline"
                    baslik={t('ajans.aksiyonYonetim')}
                    alt={t('ajans.aksiyonYonetimAlt')}
                    onPress={() => router.push(yonetimHref as any)}
                  />
                ) : null}

                {host ? (
                  <View style={styles.statSatir}>
                    <Stat etiket={t('ajans.statSaat')} deger={saatMetni(host.total_live_seconds)} />
                    <Stat etiket={t('ajans.statElmas')} deger={String(host.gift_income_diamonds)} />
                    <Stat etiket={t('ajans.statPk')} deger={String(host.pk_wins)} />
                  </View>
                ) : null}
              </>
            ) : (
              <Aksiyon
                icon="compass-outline"
                baslik={t('ajans.aksiyonKesfet')}
                alt={t('ajans.aksiyonKesfetAlt')}
                onPress={() => router.push('/ajans' as any)}
              />
            )}
          </ScrollView>
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

function Aksiyon({
  icon,
  baslik,
  alt,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  baslik: string;
  alt: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.aksiyon, pressed && styles.pressed]}
    >
      <View style={styles.aksiyonIkon}>
        <Ionicons name={icon} size={18} color={RenkTokenlari.primarySoft} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.aksiyonBaslik}>{baslik}</Text>
        <Text style={styles.aksiyonAlt}>{alt}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={RenkTokenlari.textDim} />
    </Pressable>
  );
}

function Stat({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statDeger}>{deger}</Text>
      <Text style={styles.statEtiket}>{etiket}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: screenPaddingHorizontal,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
  },
  pressed: { opacity: 0.88 },
  ajansKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: RenkTokenlari.surface,
  },
  logoBos: { alignItems: 'center', justifyContent: 'center' },
  ajansAd: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  ajansMeta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  ajansSlogan: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  bosKart: {
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: BoslukTokenlari.sm,
  },
  bosBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  bosGovde: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 20,
  },
  bilgiKart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.35)',
  },
  bilgiYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flex: 1,
    lineHeight: 20,
  },
  bolum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginTop: BoslukTokenlari.sm,
  },
  aksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  aksiyonIkon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aksiyonBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  aksiyonAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  statSatir: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
    marginTop: BoslukTokenlari.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 2,
  },
  statDeger: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  statEtiket: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
});
