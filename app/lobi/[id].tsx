import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { guvenliGeriDon } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import {
  OdaGirisYetkisiniKontrolEt,
  OdaKapasitesiniKontrolEt,
  OdaUyeligiVarMi,
} from '../../src/moduller/oda-lobisi/islemler/OdaGirisKontrolleri';
import {
  LobiKatilimcilariniGetir,
  LobidenAyril,
  LobiyeKatil,
} from '../../src/moduller/oda-lobisi/islemler/LobiKatilimIslemleri';
import { ProfilAvatarKucuk } from '../../src/moduller/canli-sohbet/bilesenler/ProfilAvatarKucuk';
import { CamArkaplan } from '../../src/bilesenler/yuzey/CamArkaplan';
import { joinRoom } from '../../src/services/api';
import type { Room } from '../../src/types/models';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { OdaCikisKilidiAktifMi } from '../../src/moduller/ses-odalari/navigasyon/OdaCikisKilidi';
import { YeniOdaOnbellegeYaz } from '../../src/moduller/ses-odalari/onbellek/YeniOdaOnbellek';
import { useCeviri } from '../../src/i18n/useCeviri';

type LobiKisi = {
  user_id: string;
  joined_at: string;
  profile?: {
    id: string;
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

/**
 * Oda lobisi — sözleşme onayı yok; giriş doğrudan odaya gider.
 * Ambient video giriş (auth) lobisinde; burada değil.
 */
export default function OdaLobisiEkrani() {
  const { t } = useCeviri();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [oda, setOda] = useState<Room | null>(null);
  const [kisiler, setKisiler] = useState<LobiKisi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [giriyor, setGiriyor] = useState(false);
  const ayrildi = useRef(false);
  const giriyorRef = useRef(false);
  /** Modal altinda lobi kalirsa focus'ta tekrar odaya sokulmasin */
  const otomatikGirisYapildi = useRef(false);

  const odayaDogruGec = useCallback(async (hedef: Room) => {
    if (!id || !user || giriyorRef.current) return false;
    giriyorRef.current = true;
    setGiriyor(true);
    try {
      const hostMu = user.id === hedef.host_id;
      if (!hostMu) {
        const uyeMi = await OdaUyeligiVarMi(hedef.id, user.id);
        if (!uyeMi) {
          const kapasite = await OdaKapasitesiniKontrolEt({
            listener_count: hedef.listener_count,
            audience_capacity: hedef.audience_capacity,
          });
          if (!kapasite.ok) {
            Alert.alert(t('lobi.alertDolu'), kapasite.hata);
            return false;
          }
        }
      }
      // Hemen odaya geç — join / lobi çıkışı room ekranında ve arka planda
      ayrildi.current = true;
      void LobidenAyril(id);
      void joinRoom(hedef.id, user.id, hostMu ? 'host' : 'listener').catch(
        () => undefined,
      );
      YeniOdaOnbellegeYaz(hedef, []);
      router.replace(`/room/${hedef.id}` as any);
      return true;
    } catch (e) {
      Alert.alert(
        t('lobi.alertGiris'),
        e instanceof Error ? e.message : t('ortak.hata'),
      );
      return false;
    } finally {
      giriyorRef.current = false;
      setGiriyor(false);
    }
  }, [id, user, t]);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      if (!user) {
        Alert.alert(t('lobi.alertGiris'), t('lobi.oturumGerekli'));
        router.replace('/(auth)/login' as any);
        return;
      }
      const yetki = await OdaGirisYetkisiniKontrolEt(id);
      if (!yetki.ok || !yetki.oda) {
        Alert.alert(t('lobi.alertOda'), yetki.hata ?? t('lobi.odaYok'));
        router.replace('/(tabs)' as any);
        return;
      }
      setOda(yetki.oda);

      // Sözleşme onayı yok — doğrudan gir; odadan dönüşte tekrar sokma
      if (!otomatikGirisYapildi.current) {
        otomatikGirisYapildi.current = true;
        const gecti = await odayaDogruGec(yetki.oda);
        if (gecti) return;
        // Dolu / hata: lobiyi göster (onay zaten işaretli)
      }

      await LobiyeKatil(id);
      const liste = await LobiKatilimcilariniGetir(id);
      setKisiler(liste);
    } catch (e) {
      Alert.alert(
        t('lobi.alertLobi'),
        e instanceof Error ? e.message : t('ajans.yuklenemedi'),
      );
    } finally {
      setYukleniyor(false);
    }
  }, [id, user, odayaDogruGec, t]);

  useFocusEffect(
    useCallback(() => {
      // Odadan cikis: dismissAll lobiyi anlik focus eder
      if (OdaCikisKilidiAktifMi()) {
        return;
      }
      ayrildi.current = false;
      void yukle();
      return () => {
        if (id && !ayrildi.current && !OdaCikisKilidiAktifMi()) {
          void LobidenAyril(id);
        }
      };
    }, [yukle, id]),
  );

  useEffect(() => {
    if (!id) return;
    const t = setInterval(() => {
      void LobiKatilimcilariniGetir(id)
        .then(setKisiler)
        .catch(() => undefined);
    }, 8000);
    return () => clearInterval(t);
  }, [id]);

  const odayaGir = async () => {
    if (!id || !user || !oda || giriyor) return;
    await odayaDogruGec(oda);
  };

  // Yüklemede lobi flaş etmesin
  const onayEkraniGoster = !yukleniyor && !giriyor;

  return (
    <View style={styles.screen}>
      <ModulHataSiniri modulAdi="oda-lobisi">
        <LinearGradient
          colors={[...RenkTokenlari.gradientNight]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {!onayEkraniGoster ? (
          <View style={[styles.bekler, { paddingTop: insets.top }]} />
        ) : (
          <>
            <View style={[styles.ust, { paddingTop: insets.top + 6 }]}>
              <Pressable
                onPress={() => guvenliGeriDon('/(tabs)')}
                style={styles.yuvarlak}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={22} color={RenkTokenlari.text} />
              </Pressable>

              <View style={styles.hostKart}>
                <ProfilAvatarKucuk
                  size={36}
                  displayName={oda?.host?.display_name}
                  username={oda?.host?.username}
                  avatarUrl={oda?.host?.avatar_url ?? oda?.cover_url}
                />
                <View style={styles.hostCopy}>
                  <Text style={styles.odaAd} numberOfLines={1}>
                    {oda?.title ?? t('lobi.baslik')}
                  </Text>
                  <Text style={styles.hostAd} numberOfLines={1}>
                    {oda?.host?.display_name ??
                      (oda?.host?.username
                        ? `@${oda.host.username}`
                        : t('kesfet.evSahibi'))}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.orta} pointerEvents="box-none">
              <View style={styles.ortaKart}>
                <Text style={styles.ortaBaslik}>{t('lobi.odaLobisi')}</Text>
                <Text style={styles.ortaAlt}>{t('lobi.odaLobisiAlt')}</Text>
                <View style={styles.avatarSerit}>
                  {kisiler.slice(0, 6).map((k) => (
                    <View key={k.user_id} style={styles.avatarHalka}>
                      <ProfilAvatarKucuk
                        size={40}
                        displayName={k.profile?.display_name}
                        username={k.profile?.username}
                        avatarUrl={k.profile?.avatar_url}
                      />
                    </View>
                  ))}
                </View>
                <Text style={styles.ortaYazi}>
                  {kisiler.length === 0
                    ? t('lobi.bos')
                    : t('lobi.bekleyen', { count: kisiler.length })}
                </Text>
              </View>
            </View>

            <View style={[styles.alt, { paddingBottom: insets.bottom + 14 }]}>
              <CamArkaplan
                intensity={28}
                style={StyleSheet.absoluteFill}
                fallbackColor={RenkTokenlari.tabBarFallback}
                pointerEvents="none"
              />
              <LinearGradient
                colors={[...RenkTokenlari.gradientPrimary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGrad}
              >
                <Pressable
                  style={styles.cta}
                  onPress={() => void odayaGir()}
                  disabled={giriyor || yukleniyor || !oda}
                >
                  {giriyor ? (
                    <ActivityIndicator color={RenkTokenlari.textOnPrimary} />
                  ) : (
                    <>
                      <Ionicons name="mic" size={20} color={RenkTokenlari.textOnPrimary} />
                      <Text style={styles.ctaYazi}>{t('lobi.sesOdasinaGir')}</Text>
                    </>
                  )}
                </Pressable>
              </LinearGradient>
            </View>
          </>
        )}
      </ModulHataSiniri>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: RenkTokenlari.bg },
  bekler: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    zIndex: 4,
  },
  yuvarlak: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.chipFill,
  },
  hostKart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 22,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  hostCopy: { flex: 1, minWidth: 0 },
  odaAd: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  hostAd: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  orta: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.xl,
    zIndex: 3,
  },
  ortaKart: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  ortaBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  ortaAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  avatarSerit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  avatarHalka: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: RenkTokenlari.borderAccent,
  },
  ortaYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  alt: {
    zIndex: 5,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.lg,
    gap: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  ctaGrad: {
    borderRadius: YaricapTokenlari.pill,
    overflow: 'hidden',
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  ctaYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
  },
});
