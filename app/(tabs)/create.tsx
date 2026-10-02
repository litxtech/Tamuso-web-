import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { GradientButton } from '../../src/components/GradientButton';
import { KlavyeKapatan } from '../../src/components/KlavyeKapatan';
import {
  KlavyeAlanaKaydir,
  KlavyeFocusKaydir,
  KlavyeScrollView,
  type KlavyeScrollHandle,
} from '../../src/bilesenler/klavye/KlavyeScrollView';
import { useAuth } from '../../src/contexts/AuthContext';
import { createRoom } from '../../src/services/api';
import type { Room } from '../../src/types/models';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { YUZEN_TAB_ICERIK_BOSLUGU } from '../../src/components/YuzenTabBar';
import { OdaOlusturMarkaBasligi } from '../../src/moduller/oda-olusturma/bilesenler/OdaOlusturMarkaBasligi';
import {
  CanliAcilisModKarti,
  type CanliAcilisMod,
} from '../../src/moduller/oda-olusturma/bilesenler/CanliAcilisModKarti';
import {
  ODA_KAPASITELER,
  OdaKapasitesiniCoz,
} from '../../src/moduller/oda-olusturma/katalog/OdaKapasiteKatalogu';
import { YeniOdaOnbellegeYaz } from '../../src/moduller/ses-odalari/onbellek/YeniOdaOnbellek';
import { HostCanliOdasiniGetir } from '../../src/moduller/ses-odalari/okuma/HostCanliOdasiniGetir';
import { OdayiSil } from '../../src/moduller/ses-odalari/islemler/OdayiSil';
import {
  AktifSesOdasiBitir,
} from '../../src/moduller/ses-odalari/oturum/AktifSesOdasiOturumu';
import { MedyaOdasiKes } from '../../src/moduller/livekit/MedyaBaglantisi';
import {
  OdaKapakSec,
  OdaKapakUriIleYukle,
} from '../../src/moduller/ses-odalari/islemler/OdaKapakMedyasiYukle';
import { OdaArkaPlanTemaSeridi } from '../../src/moduller/ses-odalari/bilesenler/OdaArkaPlanTemaSeridi';
import { OdaDuzenSecimSeridi } from '../../src/moduller/ses-odalari/bilesenler/OdaDuzenSecimSeridi';
import { OdaTemasiniCoz } from '../../src/moduller/oda-olusturma/katalog/OdaTemaKatalogu';
import { OdaDuzeniniCoz } from '../../src/moduller/ses-odalari/duzen/OdaDuzeniniCoz';
import { MedyaIzinleriniIste } from '../../src/moduller/livekit/izin/MedyaIzinleriniIste';
import { ImagePickerOnIsit } from '../../src/ortak/medya/ImagePickerHazirMi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';

type AcilisAdim = 'hub' | 'ses_odasi';

const MOD_VARSAYILAN: Record<
  Room['mode'],
  { tema: string; duzen: string }
> = {
  dating: { tema: 'velvet_rose', duzen: 'intimate_duo' },
  party: { tema: 'neon_aurora', duzen: 'neon_matrix' },
  karaoke: { tema: 'royal_gold', duzen: 'theater_gold' },
  game: { tema: 'cosmic_void', duzen: 'arena_crown' },
  private: { tema: 'midnight_plum', duzen: 'whisper_circle' },
};

export default function CreateRoomScreen() {
  const { t } = useCeviri();
  useEffect(() => {
    ImagePickerOnIsit({ izinIste: false });
  }, []);

  const { user, isGuest, refreshProfile, refreshWallet, profile } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const scrollRef = useRef<KlavyeScrollHandle>(null);

  const [adim, setAdim] = useState<AcilisAdim>('hub');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [kapakUri, setKapakUri] = useState<string | null>(null);
  const [kapakMime, setKapakMime] = useState<string | null>(null);
  const [mode] = useState<Room['mode']>('party');
  const [temaKod, setTemaKod] = useState(() => MOD_VARSAYILAN.party.tema);
  const [duzenKod, setDuzenKod] = useState(() => MOD_VARSAYILAN.party.duzen);
  const [kapasiteKod, setKapasiteKod] = useState('social');
  const [loading, setLoading] = useState(false);

  const kapasite = OdaKapasitesiniCoz(kapasiteKod);
  const seciliTema = OdaTemasiniCoz(temaKod);
  const seciliDuzen = OdaDuzeniniCoz(duzenKod);

  const hubModlari = useMemo<CanliAcilisMod[]>(
    () => [
      {
        kod: 'ses_odasi',
        ad: t('olusturTab.sesOdasi'),
        alt: t('olusturTab.sesOdasiAlt'),
        rozet: t('olusturTab.rozetSes'),
        icon: 'mic',
        tint: RenkTokenlari.primarySoft,
        renkler: [
          'rgba(232,64,145,0.55)',
          'rgba(80,28,90,0.92)',
          'rgba(16,10,24,0.98)',
        ],
      },
      {
        kod: 'canli_yayin',
        ad: t('olusturTab.canliYayin'),
        alt: t('olusturTab.canliYayinAlt'),
        rozet: t('olusturTab.rozetCanli'),
        icon: 'videocam',
        tint: '#FF6B6B',
        renkler: [
          'rgba(220,40,60,0.55)',
          'rgba(90,20,40,0.92)',
          'rgba(16,10,20,0.98)',
        ],
      },
      {
        kod: 'durum',
        ad: t('durum.baslik'),
        alt: t('olusturTab.durumAlt'),
        rozet: t('olusturTab.rozetStory'),
        icon: 'sparkles',
        tint: RenkTokenlari.mint,
        renkler: [
          'rgba(61,207,176,0.45)',
          'rgba(24,70,70,0.92)',
          'rgba(12,16,22,0.98)',
        ],
      },
    ],
    [t],
  );

  const baslikOnerisi = useMemo(() => {
    const ad = profile?.display_name?.trim() || profile?.username?.trim();
    if (!ad) return '';
    return t('olusturTab.odaOnerisi', { ad });
  }, [profile?.display_name, profile?.username, t]);

  const hubSec = (kod: string) => {
    if (kod === 'ses_odasi') {
      setAdim('ses_odasi');
      return;
    }
    if (kod === 'canli_yayin') {
      // Stack'te güvenli geçiş — replace fallback (push çökerse)
      try {
        router.push('/canli' as any);
      } catch {
        router.replace('/canli' as any);
      }
      return;
    }
    if (kod === 'durum') {
      router.push('/durum/olustur' as any);
    }
  };

  const onCreate = (opts?: { oncekiyiKapat?: boolean }) => {
    islemiDene('oda_olustur', async () => {
      if (!user) {
        Alert.alert(t('olusturTab.girisGerekli'));
        return;
      }
      const baslik = (title.trim() || baslikOnerisi).trim();
      if (!baslik) {
        Alert.alert(
          t('olusturTab.baslikGerekli'),
          t('olusturTab.baslikGerekliBody'),
        );
        return;
      }

      setLoading(true);
      try {
        void MedyaIzinleriniIste({ mikrofon: true });

        const { YaptirimAktifMi } = await import(
          '../../src/moduller/admin/ses-odalari/AdminSesOdasiIslemleri'
        );
        if (await YaptirimAktifMi('room_create_ban')) {
          Alert.alert(
            t('olusturTab.odaAcilamaz'),
            t('olusturTab.odaYasakBody'),
          );
          return;
        }

        const mevcut = await HostCanliOdasiniGetir(user.id);
        if (mevcut && !opts?.oncekiyiKapat) {
          Alert.alert(
            t('olusturTab.odanizVar'),
            t('olusturTab.odanizVarBody', { baslik: mevcut.title }),
            [
              { text: t('ortak.iptal'), style: 'cancel' },
              {
                text: t('olusturTab.odamaGit'),
                onPress: () => router.push(`/room/${mevcut.roomId}` as any),
              },
              {
                text: t('ortak.onayla'),
                style: 'destructive',
                onPress: () => onCreate({ oncekiyiKapat: true }),
              },
            ],
          );
          return;
        }

        if (mevcut && opts?.oncekiyiKapat) {
          const kapat = await OdayiSil(mevcut.roomId);
          if (!kapat.ok) {
            Alert.alert(
              t('olusturTab.oda'),
              kapat.hata || t('olusturTab.odaKapatilamadi'),
            );
            return;
          }
          AktifSesOdasiBitir();
          void MedyaOdasiKes().catch(() => undefined);
        }

        let coverUrl: string | null = null;
        if (kapakUri) {
          const up = await OdaKapakUriIleYukle(kapakUri, kapakMime);
          if (!up.ok) {
            Alert.alert(t('olusturTab.kapak'), up.hata);
            return;
          }
          coverUrl = up.url;
        }

        const room = await createRoom({
          hostId: user.id,
          title: baslik,
          topic: topic.trim() || undefined,
          coverUrl,
          mode,
          maxSeats: kapasite.mikrofon,
          layoutCode: duzenKod,
          themeCode: temaKod,
          capacityTierCode: kapasite.kod,
          audienceCapacity: kapasite.dinleyici,
          microphoneCapacity: kapasite.mikrofon,
        });

        YeniOdaOnbellegeYaz(room, [
          {
            id: `local-${room.id}-0`,
            room_id: room.id,
            seat_index: 0,
            user_id: user.id,
            is_muted: false,
            is_locked: false,
            profile: profile ? { ...profile } : null,
          },
          ...Array.from(
            { length: Math.max(0, (room.max_seats ?? kapasite.mikrofon) - 1) },
            (_, i) => ({
              id: `local-${room.id}-${i + 1}`,
              room_id: room.id,
              seat_index: i + 1,
              user_id: null,
              is_muted: false,
              is_locked: false,
              profile: null,
            }),
          ),
        ]);

        router.push(`/room/${room.id}` as any);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        const mevcutHata =
          e &&
          typeof e === 'object' &&
          'code' in e &&
          (e as { code?: string }).code === 'MEVCUT_CANLI_ODA'
            ? (e as { roomId?: string; roomTitle?: string })
            : null;

        if (mevcutHata?.roomId || msg === 'MEVCUT_CANLI_ODA') {
          const odaId = mevcutHata?.roomId ?? (e as { roomId?: string })?.roomId;
          const odaBaslik = mevcutHata?.roomTitle;
          Alert.alert(
            t('olusturTab.odanizVar'),
            odaBaslik
              ? t('olusturTab.odanizVarBody', { baslik: odaBaslik })
              : t('olusturTab.odanizVarBodyKisa'),
            [
              { text: t('ortak.iptal'), style: 'cancel' },
              ...(odaId
                ? [
                    {
                      text: t('olusturTab.odamaGit'),
                      onPress: () => router.push(`/room/${odaId}` as any),
                    },
                  ]
                : []),
              {
                text: t('ortak.onayla'),
                style: 'destructive',
                onPress: () => onCreate({ oncekiyiKapat: true }),
              },
            ],
          );
          return;
        }

        Alert.alert(
          t('olusturTab.odaAcilamadi'),
          /policy|yaptirim|room_create|forbidden|check|duplicate|unique|tek_canli/i.test(
            msg,
          )
            ? t('olusturTab.odaAcilamadiYasak')
            : msg || t('olusturTab.migrationHint'),
        );
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <Screen edges={['top']} tabSayfaKaydir>
      <ModulHataSiniri
        modulAdi={t('canli.gecBaslik')}
        varyant="ekran"
        fallbackHref="/(tabs)"
      >
        <KlavyeScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {adim === 'hub' ? (
            <>
              <OdaOlusturMarkaBasligi
                baslik={t('canli.gecBaslik')}
                fisilti={t('canli.gecFisilti')}
                ozet={t('canli.gecOzet')}
              />
              <View style={styles.hubListe}>
                {hubModlari.map((m) => (
                  <CanliAcilisModKarti
                    key={m.kod}
                    mod={m}
                    onPress={() => hubSec(m.kod)}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <OdaOlusturMarkaBasligi
                baslik={t('canli.sesOdasiBaslik')}
                fisilti={t('canli.sesOdasiFisilti')}
                ozet={t('canli.sesOdasiOzet')}
                geriMi
                onGeri={() => setAdim('hub')}
              />

              <KlavyeKapatan style={styles.panel}>
                <LinearGradient
                  colors={[
                    'rgba(232,64,145,0.14)',
                    'rgba(33,28,46,0.94)',
                    'rgba(18,14,28,0.98)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroKart}
                >
                  <Pressable
                    onPress={() => {
                      void (async () => {
                        const sec = await OdaKapakSec();
                        if (!sec.ok) {
                          if (!sec.iptal) {
                            Alert.alert(t('olusturTab.kapak'), sec.hata);
                          }
                          return;
                        }
                        setKapakUri(sec.uri);
                        setKapakMime(sec.mimeType ?? null);
                      })();
                    }}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.kapakPress,
                      pressed && styles.kapakPressed,
                    ]}
                    accessibilityLabel={t('olusturTab.odaKapakResmi')}
                  >
                    {kapakUri ? (
                      <Image source={{ uri: kapakUri }} style={styles.kapakImg} />
                    ) : (
                      <LinearGradient
                        colors={[...seciliTema.renkler]}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 0.8, y: 1 }}
                        style={styles.kapakBos}
                      >
                        <View style={styles.kapakIkon}>
                          <Ionicons
                            name="image-outline"
                            size={24}
                            color={seciliTema.vurgu}
                          />
                        </View>
                        <Text style={styles.kapakHint}>
                          {t('olusturTab.kapakEkle')}
                        </Text>
                        <Text style={styles.kapakAlt}>
                          {t('olusturTab.kapakYoksa', { tema: seciliTema.ad })}
                        </Text>
                      </LinearGradient>
                    )}
                    <View style={styles.kapakBadge}>
                      <Ionicons
                        name="camera"
                        size={12}
                        color={RenkTokenlari.textOnOverlay}
                      />
                      <Text style={styles.kapakBadgeYazi}>
                        {kapakUri ? t('olusturTab.degistir') : t('olusturTab.sec')}
                      </Text>
                    </View>
                  </Pressable>

                <TextField
                  label={t('canli.odaBasligi')}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={baslikOnerisi || t('olusturTab.baslikPlaceholder')}
                  maxLength={40}
                />
                <TextField
                  label={t('canli.aciklama')}
                  value={topic}
                  onChangeText={setTopic}
                  placeholder={t('canli.aciklamaPlaceholder')}
                  maxLength={120}
                  multiline
                  numberOfLines={2}
                  onFocus={(e) =>
                    KlavyeFocusKaydir(scrollRef.current, e, { delayMs: 80 })
                  }
                />
                </LinearGradient>

                <View style={styles.bolumBlok}>
                  <Text style={styles.bolum}>{t('olusturTab.arkaPlanTemasi')}</Text>
                  <Text style={styles.bolumAlt}>
                    {kapakUri
                      ? t('olusturTab.temaYedek', { tema: seciliTema.ad })
                      : t('olusturTab.temaSahne', { tema: seciliTema.ad })}
                  </Text>
                  <OdaArkaPlanTemaSeridi
                    seciliKod={temaKod}
                    onSec={(tema) => setTemaKod(tema.kod)}
                  />
                </View>

                <View style={styles.bolumBlok}>
                  <Text style={styles.bolum}>{t('olusturTab.duzen')}</Text>
                  <Text style={styles.bolumAlt}>
                    {t('olusturTab.duzenAlt', { duzen: seciliDuzen.ad })}
                  </Text>
                  <OdaDuzenSecimSeridi
                    seciliKod={duzenKod}
                    onSec={(duzen) => setDuzenKod(duzen.kod)}
                  />
                </View>

                <View style={styles.bolumBlok}>
                  <Text style={styles.bolum}>{t('olusturTab.boyut')}</Text>
                  <Text style={styles.bolumAlt}>{t('olusturTab.boyutAlt')}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipSerit}
                  >
                    {ODA_KAPASITELER.map((k) => {
                      const secili = kapasiteKod === k.kod;
                      return (
                        <Pressable
                          key={k.kod}
                          onPress={() => setKapasiteKod(k.kod)}
                          style={({ pressed }) => [
                            styles.chip,
                            secili && styles.chipAktif,
                            pressed && styles.chipPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: secili }}
                        >
                          <Text
                            style={[styles.chipAd, secili && styles.chipAdAktif]}
                          >
                            {k.ad}
                          </Text>
                          <Text
                            style={[styles.chipAlt, secili && styles.chipAltAktif]}
                          >
                            {t('olusturTab.koltuk', { adet: k.mikrofon })}
                          </Text>
                          <Text
                            style={[
                              styles.chipDinleyici,
                              secili && styles.chipAltAktif,
                            ]}
                          >
                            {k.dinleyici >= 1000
                              ? t('olusturTab.dinleyiciBin', {
                                  adet: Math.round(k.dinleyici / 1000),
                                })
                              : t('olusturTab.dinleyici', { adet: k.dinleyici })}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <GradientButton
                  title={loading ? t('canli.aciliyor') : t('canli.sesOdasiniAc')}
                  onPress={() => onCreate()}
                  loading={loading}
                  style={styles.cta}
                />
              </KlavyeKapatan>
            </>
          )}
        </KlavyeScrollView>

        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => {
            void refreshProfile();
            void refreshWallet();
          }}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: YUZEN_TAB_ICERIK_BOSLUGU,
  },
  hubListe: {
    paddingHorizontal: BoslukTokenlari.xl,
    gap: BoslukTokenlari.md,
    paddingBottom: BoslukTokenlari.lg,
  },
  panel: {
    paddingHorizontal: BoslukTokenlari.xl,
    gap: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.lg,
  },
  heroKart: {
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: BoslukTokenlari.md,
  },
  bolumBlok: {
    gap: 6,
  },
  bolum: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 17,
    lineHeight: 22,
  },
  bolumAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginBottom: BoslukTokenlari.sm,
  },
  chipSerit: {
    gap: BoslukTokenlari.sm,
    paddingRight: BoslukTokenlari.md,
  },
  chip: {
    minWidth: 100,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 3,
  },
  chipAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: 'rgba(232,64,145,0.16)',
  },
  chipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  chipAd: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  chipAdAktif: {
    color: RenkTokenlari.primarySoft,
  },
  chipAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  chipDinleyici: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 9,
  },
  chipAltAktif: {
    color: RenkTokenlari.textMuted,
  },
  cta: {
    marginTop: BoslukTokenlari.xs,
  },
  kapakPress: {
    height: 148,
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.28)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  kapakPressed: {
    opacity: 0.92,
  },
  kapakImg: {
    width: '100%',
    height: '100%',
  },
  kapakBos: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kapakIkon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,64,145,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.35)',
    marginBottom: 4,
  },
  kapakHint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kapakAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  kapakBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: RenkTokenlari.chipFill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: YaricapTokenlari.pill,
  },
  kapakBadgeYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnOverlay,
    fontWeight: '700',
    fontSize: 10,
  },
});
