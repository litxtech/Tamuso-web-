import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { RoomCard } from '../../src/components/RoomCard';
import { BosDurum } from '../../src/components/BosDurum';
import { fetchLiveRooms } from '../../src/services/api';
import type { Room } from '../../src/types/models';
import { YUZEN_TAB_ICERIK_BOSLUGU } from '../../src/components/YuzenTabBar';
import { OdalarMarkaBasligi } from '../../src/moduller/odalar/bilesenler/OdalarMarkaBasligi';
import { OdaHaftalikSiralamaSeridi } from '../../src/moduller/liderlik-siralamalari/bilesenler/OdaHaftalikSiralamaSeridi';
import {
  OdalarModFiltresi,
  type OdalarFiltre,
} from '../../src/moduller/odalar/bilesenler/OdalarModFiltresi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { SesOdasinaGit } from '../../src/moduller/ses-odalari/navigasyon/SesOdasinaGit';

export default function RoomsScreen() {
  const { t } = useCeviri();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filtre, setFiltre] = useState<OdalarFiltre>('all');
  const ilkYuklemeBitti = React.useRef(false);
  const loadNesil = React.useRef(0);
  const filtreRef = React.useRef(filtre);
  filtreRef.current = filtre;

  const load = useCallback(async (mod: 'ilk' | 'sessiz' | 'pull' = 'sessiz') => {
    const nesil = ++loadNesil.current;
    const aktifFiltre = filtreRef.current;
    try {
      if (mod === 'pull') setRefreshing(true);
      const mode = aktifFiltre === 'all' ? null : aktifFiltre;
      const data = await fetchLiveRooms(60, mode);
      if (nesil !== loadNesil.current) return;
      setRooms(data);
    } catch {
      if (nesil !== loadNesil.current) return;
      if (mod === 'ilk') setRooms([]);
    } finally {
      if (nesil !== loadNesil.current) return;
      if (mod === 'pull') setRefreshing(false);
      ilkYuklemeBitti.current = true;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(ilkYuklemeBitti.current ? 'sessiz' : 'ilk');
      return () => {
        loadNesil.current += 1;
        setRefreshing(false);
      };
    }, [load]),
  );

  const filtreSec = useCallback(
    (sonraki: OdalarFiltre) => {
      setFiltre(sonraki);
      filtreRef.current = sonraki;
      void load('sessiz');
    },
    [load],
  );

  const odaAc = useCallback((oda: Room) => {
    void SesOdasinaGit({ roomId: oda.id, room: oda });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Room }) => (
      <View style={styles.kartWrap}>
        <RoomCard
          room={item}
          variant="avatar"
          onPress={() => odaAc(item)}
        />
      </View>
    ),
    [odaAc],
  );

  const listeBaslik = useMemo(
    () =>
      rooms.length > 0 && filtre !== 'all' ? (
        <View style={styles.listeBaslik}>
          <View style={styles.accent} />
          <Text style={styles.listeBaslikYazi}>
            {filtre === 'all' ? t('odalar.canliOdalar') : t('odalar.seciliSahne')}
          </Text>
          <Text style={styles.listeSayi}>{rooms.length}</Text>
        </View>
      ) : null,
    [rooms.length, filtre, t],
  );

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="odalar">
        <OdalarMarkaBasligi canliSayisi={rooms.length} />
        <OdalarModFiltresi secili={filtre} onSec={filtreSec} />
        <OdaHaftalikSiralamaSeridi />

        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.satir}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={9}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('pull')}
              tintColor={RenkTokenlari.primary}
            />
          }
          ListHeaderComponent={listeBaslik}
          ListEmptyComponent={
            <View style={styles.bosWrap}>
              <BosDurum
                icon="radio-outline"
                title={filtre === 'all' ? t('odalar.sahneBos') : t('odalar.moddaYok')}
                body={
                  filtre === 'all'
                    ? t('odalar.bosBody')
                    : t('odalar.modBosBody')
                }
              />
              <Pressable
                onPress={() => router.navigate('/(tabs)/create')}
                style={styles.bosCta}
              >
                <LinearGradient
                  colors={[...RenkTokenlari.gradientPrimary]}
                  style={styles.bosCtaIc}
                >
                  <Ionicons name="add" size={16} color={RenkTokenlari.textOnPrimary} />
                  <Text style={styles.bosCtaYazi}>{t('odalar.odaKur')}</Text>
                </LinearGradient>
              </Pressable>
              {filtre !== 'all' ? (
                <Pressable onPress={() => filtreSec('all')} hitSlop={8}>
                  <Text style={styles.tumuneDon}>{t('odalar.tumSahneler')}</Text>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={renderItem}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 0,
    paddingBottom: YUZEN_TAB_ICERIK_BOSLUGU,
    gap: BoslukTokenlari.xs,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  satir: {
    gap: BoslukTokenlari.sm,
    alignItems: 'flex-start',
    marginTop: 0,
  },
  kartWrap: {
    width: '31.5%',
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  listeBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    marginTop: 0,
    paddingHorizontal: BoslukTokenlari.xs,
  },
  accent: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.primary,
  },
  listeBaslikYazi: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    flex: 1,
    fontSize: 15,
  },
  listeSayi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    backgroundColor: 'rgba(232, 64, 145, 0.14)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
    overflow: 'hidden',
    fontSize: 10,
  },
  bosWrap: {
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingTop: BoslukTokenlari.lg,
  },
  bosCta: {
    borderRadius: YaricapTokenlari.pill,
    overflow: 'hidden',
  },
  bosCtaIc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bosCtaYazi: {
    ...TipografiTokenlari.caption,
    fontWeight: '800',
    color: RenkTokenlari.textOnPrimary,
  },
  tumuneDon: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
