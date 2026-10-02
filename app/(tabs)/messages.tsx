import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { YUZEN_TAB_ICERIK_BOSLUGU } from '../../src/components/YuzenTabBar';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import {
  MesajKonulariniGetir,
  type MesajKonusu,
} from '../../src/moduller/mesajlasma/okuma/MesajKonulariniGetir';
import { MesajThreadArsivle, MesajSohbetSil } from '../../src/moduller/mesajlasma/islemler/MesajGonder';
import { MesajMarkaBasligi } from '../../src/moduller/mesajlasma/bilesenler/MesajMarkaBasligi';
import { MesajKonuKarti } from '../../src/moduller/mesajlasma/bilesenler/MesajKonuKarti';
import { MesajBosDurum } from '../../src/moduller/mesajlasma/bilesenler/MesajBosDurum';
import { useMesajInboxKanali } from '../../src/moduller/mesajlasma/gercek-zamanli/useMesajKanali';
import { useMesajOkunmamis } from '../../src/moduller/mesajlasma/baglam/MesajOkunmamisSaglayici';
import { useMesajTaslakHaritasi } from '../../src/moduller/mesajlasma/depolama/useMesajTaslakHaritasi';
import { MesajTaslakSil } from '../../src/moduller/mesajlasma/depolama/MesajTaslakDepolama';
import {
  MESAJ_SAYFA_BOYUTU,
  MesajSayfaOnbellekOku,
  MesajSayfaOnbellekOkuSync,
  MesajSayfaOnbellekYaz,
} from '../../src/moduller/mesajlasma/depolama/MesajSayfaOnbellek';
import { MesajlariGetir } from '../../src/moduller/mesajlasma/okuma/MesajlariGetir';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { TamusoBanner } from '../../src/banner';
import { GorusmeGecmisPaneli } from '../../src/moduller/gorusme/bilesenler/GorusmeGecmisPaneli';
import {
  CihazPushTokeniniKaydet,
  MesajPushIzniGerekirseIste,
} from '../../src/moduller/bildirimler/BildirimlerPublicSozlesmesi';
import { useCeviri } from '../../src/i18n/useCeviri';

type Sekme = 'sohbet' | 'arsiv' | 'gorusme';

export default function MessagesScreen() {
  const { t } = useCeviri();
  const acik = OzellikBayragiAktifMi('messages_enabled');
  const { isGuest, refreshProfile, refreshWallet, user } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const { sayfayiAcincaTemizle, yenile: mesajRozetYenile } = useMesajOkunmamis();
  const taslaklar = useMesajTaslakHaritasi(user?.id);
  const [konular, setKonular] = useState<MesajKonusu[]>([]);
  const [sekme, setSekme] = useState<Sekme>('sohbet');
  const arsivModu = sekme === 'arsiv';
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const ilkYuklemeBitti = React.useRef(false);
  const loadNesil = React.useRef(0);

  const load = useCallback(async (mod: 'ilk' | 'sessiz' | 'pull' = 'sessiz') => {
    if (!acik || isGuest) {
      setKonular([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const nesil = ++loadNesil.current;
    try {
      if (mod === 'ilk') setLoading(true);
      if (mod === 'pull') setRefreshing(true);
      const data = await MesajKonulariniGetir(arsivModu);
      if (nesil !== loadNesil.current) return;
      setKonular(
        (data ?? []).filter(
          (k) => typeof k?.id === 'string' && k.id.length > 0,
        ),
      );
    } catch {
      if (nesil !== loadNesil.current) return;
      setKonular([]);
    } finally {
      if (nesil !== loadNesil.current) return;
      if (mod === 'ilk') setLoading(false);
      if (mod === 'pull') setRefreshing(false);
      ilkYuklemeBitti.current = true;
    }
  }, [acik, isGuest, arsivModu]);

  useFocusEffect(
    useCallback(() => {
      sayfayiAcincaTemizle();
      void load(ilkYuklemeBitti.current ? 'sessiz' : 'ilk').then(() => {
        void mesajRozetYenile();
      });
      if (!isGuest && acik) {
        void MesajPushIzniGerekirseIste().then((sonuc) => {
          if (sonuc.granted) {
            void CihazPushTokeniniKaydet().catch(() => undefined);
          }
        });
      }
      return () => {
        loadNesil.current += 1;
        setRefreshing(false);
        setLoading(false);
      };
    }, [load, sayfayiAcincaTemizle, mesajRozetYenile, isGuest, acik]),
  );

  useMesajInboxKanali(() => {
    void load('sessiz');
  });

  const yeniSohbet = () => {
    islemiDene('mesaj_gonder', () => {
      router.push('/mesaj/yeni' as any);
    });
  };

  const konuMenu = (konu: MesajKonusu) => {
    Alert.alert(konu.peer_display_name || t('mesajlar.sohbetler'), undefined, [
      arsivModu
        ? {
            text: t('mesajlar.arsivdenCikar'),
            onPress: () => {
              void (async () => {
                await MesajThreadArsivle(konu.id, false);
                await load('sessiz');
              })();
            },
          }
        : {
            text: t('mesajlar.arsivle'),
            onPress: () => {
              void (async () => {
                await MesajThreadArsivle(konu.id, true);
                await load('sessiz');
              })();
            },
          },
      {
        text: t('mesajlar.sohbetiSil'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            t('mesajlar.sohbetiSil'),
            t('mesajlar.sohbetiSilBody'),
            [
              { text: t('ortak.vazgec'), style: 'cancel' },
              {
                text: t('ortak.sil'),
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    const r = await MesajSohbetSil(konu.id);
                    if (!r.ok) Alert.alert(t('mesajlar.silinemedi'), r.hata);
                    else {
                      if (user?.id) await MesajTaslakSil(user.id, konu.id);
                      await load('sessiz');
                    }
                  })();
                },
              },
            ],
          );
        },
      },
      { text: t('ortak.vazgec'), style: 'cancel' },
    ]);
  };

  const altYazi = !acik
    ? t('mesajlar.kapali')
    : isGuest
      ? t('mesajlar.misafirHint')
      : sekme === 'arsiv'
        ? t('mesajlar.arsivAlt')
        : sekme === 'gorusme'
          ? t('mesajlar.gorusmeAlt')
          : t('mesajlar.sohbetAlt');

  return (
    <Screen edges={['top']} tabSayfaKaydir>
      <ModulHataSiniri modulAdi="mesajlasma">
        <MesajMarkaBasligi
          altYazi={altYazi}
          sohbetSayisi={sekme === 'gorusme' ? 0 : konular.length}
          onYeniSohbet={yeniSohbet}
        />

        <ModulHataSiniri
          modulAdi="mesaj-banner"
          varyant="kart"
          yedek={<View />}
        >
          <TamusoBanner placement="MESSAGES_TOP" screen="MESSAGES" />
        </ModulHataSiniri>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, sekme === 'sohbet' && styles.tabAktif]}
            onPress={() => setSekme('sohbet')}
          >
            <Text
              style={[styles.tabText, sekme === 'sohbet' && styles.tabTextAktif]}
            >
              {t('mesajlar.sohbetler')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, sekme === 'gorusme' && styles.tabAktif]}
            onPress={() => setSekme('gorusme')}
          >
            <Text
              style={[
                styles.tabText,
                sekme === 'gorusme' && styles.tabTextAktif,
              ]}
            >
              {t('mesajlar.gorusmeler')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, sekme === 'arsiv' && styles.tabAktif]}
            onPress={() => setSekme('arsiv')}
          >
            <Text
              style={[styles.tabText, sekme === 'arsiv' && styles.tabTextAktif]}
            >
              {t('mesajlar.arsiv')}
            </Text>
          </Pressable>
        </View>

        {sekme === 'gorusme' ? (
          <GorusmeGecmisPaneli misafir={isGuest} />
        ) : (
          <FlatList
            data={konular}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('pull')}
                tintColor={RenkTokenlari.primary}
              />
            }
            contentContainerStyle={[
              styles.list,
              konular.length === 0 && styles.listEmpty,
            ]}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListEmptyComponent={
              <MesajBosDurum
                misafir={isGuest}
                kapali={!acik}
                onAksiyon={yeniSohbet}
              />
            }
            renderItem={({ item }) => (
              <MesajKonuKarti
                konu={item}
                taslakMetin={taslaklar[item.id]}
                onPress={() => {
                  if (!item?.id) return;
                  // Instagram: navigasyondan önce son sayfayı ısıt
                  if (!MesajSayfaOnbellekOkuSync(item.id)) {
                    void MesajSayfaOnbellekOku(item.id).then((hit) => {
                      if (hit?.length) return;
                      void MesajlariGetir({
                        threadId: item.id,
                        limit: MESAJ_SAYFA_BOYUTU,
                      })
                        .then((msgs) => MesajSayfaOnbellekYaz(item.id, msgs))
                        .catch(() => null);
                    });
                  }
                  router.push(`/mesaj/${item.id}` as any);
                }}
                onLongPress={() => konuMenu(item)}
              />
            )}
          />
        )}

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
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  tabAktif: {
    borderColor: RenkTokenlari.mint,
    backgroundColor: 'rgba(61,207,176,0.14)',
  },
  tabText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  tabTextAktif: { color: RenkTokenlari.mint },
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: YUZEN_TAB_ICERIK_BOSLUGU,
  },
  listEmpty: { flexGrow: 1 },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: RenkTokenlari.border,
    marginLeft: 68,
  },
});
