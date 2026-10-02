import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../src/components/Screen';
import { RoomCard } from '../src/components/RoomCard';
import { BosDurum } from '../src/components/BosDurum';
import { ModulHataSiniri } from '../src/ortak/hata-sinirlari/ModulHataSiniri';
import { TamusoBanner } from '../src/banner';
import { AnaSayfaAtmosfer } from '../src/moduller/ana-sayfa/bilesenler/AnaSayfaAtmosfer';
import {
  KESFET_FILTRELERI,
  type KesfetFiltresi,
} from '../src/moduller/kesfet/filtreler/KesfetFiltreleri';
import { KesfetOneriGetir } from '../src/moduller/kesfet/okuma/KesfetOneriGetir';
import { KesfetAramaCubugu } from '../src/moduller/kesfet/bilesenler/KesfetAramaCubugu';
import {
  KesfetFiltreCipleri,
  type KesfetCipi,
} from '../src/moduller/kesfet/bilesenler/KesfetFiltreCipleri';
import { KesfetOneCikanKart } from '../src/moduller/kesfet/bilesenler/KesfetOneCikanKart';
import { KesfetIskelet } from '../src/moduller/kesfet/bilesenler/KesfetIskelet';
import { KesfetMarkaBasligi } from '../src/moduller/kesfet/bilesenler/KesfetMarkaBasligi';
import {
  KesfetDunyaPortallari,
  type KesfetPortal,
} from '../src/moduller/kesfet/bilesenler/KesfetDunyaPortallari';
import { KesfetModKartlari } from '../src/moduller/kesfet/bilesenler/KesfetModKartlari';
import { KesfetTrendSeridi } from '../src/moduller/kesfet/bilesenler/KesfetTrendSeridi';
import { KesfetBolumBasligi } from '../src/moduller/kesfet/bilesenler/KesfetBolumBasligi';
import { KesfetOnerilenKullanicilar } from '../src/moduller/kesfet/bilesenler/KesfetOnerilenKullanicilar';
import { TakipOnerileriniGetir } from '../src/moduller/takip/oneri/TakipOneriServisi';
import { TakipServisi } from '../src/moduller/takip/islemler/TakipServisi';
import type { TakipOnerisi } from '../src/moduller/takip/TakipTipleri';
import { OzellikBayragiAktifMi } from '../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { useAjansYonetim } from '../src/moduller/ajanslar/kancalar/useAjansYonetim';
import type { Room, RoomMode } from '../src/types/models';
import { RenkTokenlari } from '../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../src/i18n/useCeviri';
import { SesOdasinaGit } from '../src/moduller/ses-odalari/navigasyon/SesOdasinaGit';

const FILTRE_IKONLARI: Record<KesfetFiltresi, keyof typeof Ionicons.glyphMap> = {
  global: 'grid-outline',
  online: 'pulse-outline',
  new_creator: 'sparkles-outline',
  trending: 'flame-outline',
};

/** Tam Keşfet hub — dünyalar, modlar, trend ve canlı ızgara */
export default function KesfetEkrani() {
  const { t } = useCeviri();
  const [filtre, setFiltre] = useState<KesfetFiltresi>('global');
  const [mode, setMode] = useState<RoomMode | null>(null);
  const [arama, setArama] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [oneriler, setOneriler] = useState<TakipOnerisi[]>([]);
  const [oneriBusy, setOneriBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Mod sayaçları için tüm canlıları çek; mod filtresi istemci tarafında
      const data = await KesfetOneriGetir({ filtre, mode: null }).catch(() => []);
      setRooms(data);
      const people = await TakipOnerileriniGetir(8).catch(() => []);
      setOneriler(people);
    } finally {
      setLoading(false);
    }
  }, [filtre]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtreCipleri = useMemo<KesfetCipi[]>(
    () =>
      KESFET_FILTRELERI.map((f) => ({
        id: f.id,
        label: t(f.label),
        icon: FILTRE_IKONLARI[f.id],
      })),
    [t],
  );

  const portallar = useMemo<KesfetPortal[]>(() => {
    const liste: KesfetPortal[] = [
      {
        key: 'rooms',
        label: t('odalar.baslik'),
        icon: 'headset-outline',
        href: '/(tabs)/rooms',
        tint: RenkTokenlari.mint,
      },
      {
        key: 'create',
        label: t('kesfet.odaAc'),
        icon: 'add-circle-outline',
        href: '/(tabs)/create',
        tint: RenkTokenlari.primarySoft,
      },
    ];

    if (OzellikBayragiAktifMi('people_discovery_enabled')) {
      liste.push({
        key: 'kisiler',
        label: t('kisiler.baslik'),
        icon: 'people-outline',
        href: '/kisiler',
        tint: RenkTokenlari.magenta,
      });
    }

    if (OzellikBayragiAktifMi('city_league_enabled')) {
      liste.push({
        key: 'sehir',
        label: t('sehir.baslik'),
        icon: 'business-outline',
        href: '/sehir',
        tint: RenkTokenlari.primarySoft,
      });
      liste.push({
        key: 'lig',
        label: t('sehir.lig'),
        icon: 'trophy-outline',
        href: '/sehir/lig',
        tint: RenkTokenlari.accent,
      });
    }

    if (OzellikBayragiAktifMi('country_league_enabled')) {
      liste.push({
        key: 'ulke',
        label: t('ulkeLigi.feedButon'),
        icon: 'globe-outline',
        href: '/ulke',
        tint: RenkTokenlari.violet,
      });
    }

    if (OzellikBayragiAktifMi('agency_enabled')) {
      liste.push({
        key: 'ajans',
        label: t('ajans.baslik'),
        icon: 'people-outline',
        href: '/ajans',
        tint: RenkTokenlari.violet,
      });
    }

    if (OzellikBayragiAktifMi('pk_enabled')) {
      liste.push({
        key: 'pk',
        label: 'PK',
        icon: 'flash-outline',
        href: '/pk',
        tint: RenkTokenlari.accent,
      });
    }

    liste.push({
      key: 'siralamalar',
      label: t('siralamalar.baslik'),
      icon: 'podium-outline',
      href: '/siralamalar',
      tint: RenkTokenlari.magenta,
    });

    if (OzellikBayragiAktifMi('events_enabled')) {
      liste.push({
        key: 'platform',
        label: t('kesfet.etkinlik'),
        icon: 'calendar-outline',
        href: '/platform',
        tint: RenkTokenlari.magenta,
      });
    }

    if (OzellikBayragiAktifMi('live_enabled')) {
      liste.push({
        key: 'canli',
        label: t('canli.baslik'),
        icon: 'radio-outline',
        href: '/canli',
        tint: RenkTokenlari.live,
      });
    }

    return liste;
  }, [t]);

  const modeSayaclari = useMemo(() => {
    const sayac: Partial<Record<RoomMode, number>> = {};
    for (const r of rooms) {
      sayac[r.mode] = (sayac[r.mode] ?? 0) + 1;
    }
    return sayac;
  }, [rooms]);

  const gorunenler = useMemo(() => {
    const modlu = mode ? rooms.filter((r) => r.mode === mode) : rooms;
    const q = arama.trim().toLocaleLowerCase('tr');
    if (!q) return modlu;
    return modlu.filter((r) => {
      const metin = [
        r.title,
        r.topic ?? '',
        r.host?.display_name ?? '',
        r.host?.username ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase('tr');
      return metin.includes(q);
    });
  }, [rooms, arama, mode]);

  const trendOdalar = useMemo(() => {
    if (arama) return [];
    return [...gorunenler]
      .sort(
        (a, b) =>
          b.listener_count - a.listener_count ||
          b.total_coins_earned - a.total_coins_earned,
      )
      .slice(0, 8);
  }, [gorunenler, arama]);

  const aramaAktif = arama.trim().length > 0;
  const heroVar = !aramaAktif && gorunenler.length >= 2;
  const izgara = heroVar ? gorunenler.slice(1) : gorunenler;
  const ilkYukleme = loading && rooms.length === 0;

  const odaAc = useCallback((oda: Room) => {
    void SesOdasinaGit({ roomId: oda.id, room: oda });
  }, []);

  const hostAc = useCallback((hostId: string) => {
    router.push(`/kullanici/${hostId}` as any);
  }, []);

  const portalAc = useCallback((href: string) => {
    router.push(href as any);
  }, []);

  return (
    <Screen edges={['top']}>
      <AnaSayfaAtmosfer />
      <ModulHataSiniri modulAdi="kesfet">
        <KesfetMarkaBasligi canliSayisi={rooms.length} />
        <KesfetAramaCubugu deger={arama} onDegisti={setArama} />

        <View style={styles.bannerUst}>
          <TamusoBanner placement="DISCOVER_TOP" screen="DISCOVER" compact />
        </View>

        {ilkYukleme ? (
          <KesfetIskelet />
        ) : (
          <FlatList
            data={izgara}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.satir}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() => void load()}
                tintColor={RenkTokenlari.primary}
              />
            }
            ListHeaderComponent={
              <View style={styles.baslikAlani}>
                {!aramaAktif ? (
                  <>
                    <KesfetDunyaPortallari
                      portallar={portallar}
                      onSec={portalAc}
                    />
                    <KesfetModKartlari
                      aktifMode={mode}
                      onSec={setMode}
                      sayaclar={modeSayaclari}
                    />
                    <View style={styles.bannerOrta}>
                      <TamusoBanner
                        placement="DISCOVER_MIDDLE"
                        screen="DISCOVER"
                        compact
                      />
                    </View>
                    <KesfetTrendSeridi
                      odalar={trendOdalar}
                      onSec={odaAc}
                      onHost={hostAc}
                    />
                    <KesfetOnerilenKullanicilar
                      items={oneriler}
                      busyId={oneriBusy}
                      onFollow={(id) => {
                        void (async () => {
                          setOneriBusy(id);
                          const r = await TakipServisi.takipEt(id);
                          setOneriBusy(null);
                          if (r.ok) setOneriler((prev) => prev.filter((x) => x.user_id !== id));
                        })();
                      }}
                    />
                  </>
                ) : null}

                {heroVar ? (
                  <View style={styles.padYatay}>
                    <KesfetOneCikanKart
                      room={gorunenler[0]}
                      onPress={() => odaAc(gorunenler[0])}
                    />
                  </View>
                ) : null}

                <KesfetFiltreCipleri
                  cipler={filtreCipleri}
                  aktifId={filtre}
                  onSec={(id) => setFiltre(id as KesfetFiltresi)}
                />

                {gorunenler.length > 0 ? (
                  <View style={styles.padYatay}>
                    <KesfetBolumBasligi
                      baslik={
                        aramaAktif
                          ? t('kesfet.aramaSonuclari')
                          : mode
                            ? t('kesfet.seciliSahne')
                            : t('kesfet.canliOdalar')
                      }
                      sayac={gorunenler.length}
                    />
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.bosAlan}>
                <BosDurum
                  icon={aramaAktif ? 'search-outline' : 'compass-outline'}
                  title={
                    aramaAktif
                      ? t('kesfet.eslesenYok')
                      : mode
                        ? t('kesfet.moddaYok')
                        : t('kesfet.canliYok')
                  }
                  body={
                    aramaAktif
                      ? t('kesfet.eslesenYokBody')
                      : t('kesfet.canliYokBody')
                  }
                />
                {!aramaAktif ? (
                  <View style={styles.bosAksiyonlar}>
                    <Pressable
                      onPress={() => router.navigate('/(tabs)/create')}
                      style={styles.bosBtn}
                    >
                      <LinearGradient
                        colors={[...RenkTokenlari.gradientPrimary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.bosBtnIc}
                      >
                        <Ionicons name="mic" size={15} color={RenkTokenlari.textOnPrimary} />
                        <Text style={styles.bosBtnYazi}>{t('kesfet.sesOdasiAc')}</Text>
                      </LinearGradient>
                    </Pressable>
                    {mode ? (
                      <Pressable
                        onPress={() => setMode(null)}
                        style={styles.bosBtnIkincil}
                      >
                        <Text style={styles.bosBtnIkincilYazi}>{t('kesfet.tumModlar')}</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => router.navigate('/(tabs)/rooms')}
                        style={styles.bosBtnIkincil}
                      >
                        <Text style={styles.bosBtnIkincilYazi}>{t('kesfet.odalariGez')}</Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </View>
            }
            ListFooterComponent={
              <View style={styles.bannerAlt}>
                <TamusoBanner
                  placement="DISCOVER_BOTTOM"
                  screen="DISCOVER"
                  compact
                />
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.kartWrap}>
                <RoomCard room={item} onPress={() => odaAc(item)} />
              </View>
            )}
          />
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.xs,
    paddingBottom: BoslukTokenlari.xxl ?? BoslukTokenlari.xl * 2,
    gap: BoslukTokenlari.md,
    flexGrow: 1,
  },
  satir: { gap: BoslukTokenlari.md },
  kartWrap: {
    flex: 1,
    maxWidth: '48.5%',
  },
  baslikAlani: {
    gap: BoslukTokenlari.md,
    marginHorizontal: -BoslukTokenlari.lg,
  },
  padYatay: {
    paddingHorizontal: BoslukTokenlari.lg,
  },
  bannerUst: {
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.xs,
  },
  bannerOrta: {
    paddingHorizontal: BoslukTokenlari.lg,
  },
  bannerAlt: {
    paddingTop: BoslukTokenlari.md,
  },
  bosAlan: {
    alignItems: 'center',
    gap: BoslukTokenlari.xs,
    paddingTop: BoslukTokenlari.lg,
  },
  bosAksiyonlar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
  },
  bosBtn: {
    borderRadius: YaricapTokenlari.pill,
    overflow: 'hidden',
  },
  bosBtnIc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  bosBtnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
  },
  bosBtnIkincil: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  bosBtnIkincilYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
});
