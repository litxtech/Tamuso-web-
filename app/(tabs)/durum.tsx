import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  type ViewToken,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { BosDurum } from '../../src/components/BosDurum';
import { yuzenTabBarToplamYukseklik } from '../../src/components/YuzenTabBosluk';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { DurumKart } from '../../src/moduller/durum/bilesenler/DurumKart';
import { DurumAkisSkeleton } from '../../src/moduller/durum/bilesenler/DurumAkisSkeleton';
import { DurumResimLightbox } from '../../src/moduller/durum/bilesenler/DurumResimLightbox';
import { DurumYorumPaneli } from '../../src/moduller/durum/bilesenler/DurumYorumPaneli';
import { KullaniciGuvenlikMenusu } from '../../src/moduller/moderasyon/bilesenler/KullaniciGuvenlikMenusu';
import {
  DurumAkisiniGetir,
  DurumTakipAkisiniGetir,
  DurumGoruntulemeKaydet,
  DurumSil,
  type DurumOggesi,
} from '../../src/moduller/durum/islemler/DurumIslemleri';
import { useCeviri } from '../../src/i18n/useCeviri';
import { useDurumAkisRealtime } from '../../src/moduller/durum/gercek-zamanli/useDurumAkisRealtime';
import { useHediyeMagaza } from '../../src/moduller/hediyeler/islemler/useHediyeMagaza';
import { HediyeMagazaBaglamasi } from '../../src/moduller/hediyeler/bilesenler/HediyeMagazaBaglamasi';
import { GonderiPaylasSheet } from '../../src/moduller/durum/paylasim/bilesenler/GonderiPaylasSheet';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../src/tasarim-sistemi/tema/useTemayaAboneOl';

type Sekme = 'sana' | 'takip';

type SekmeOnbellek = {
  items: DurumOggesi[];
  /** Son satırın created_at — p_before cursor */
  cursor: string | null;
  hasMore: boolean;
  yuklendi: boolean;
  hata: string | null;
};

const SAYFA = 24;
const BOS_ONBELLEK = (): SekmeOnbellek => ({
  items: [],
  cursor: null,
  hasMore: true,
  yuklendi: false,
  hata: null,
});

function sonCursor(items: DurumOggesi[]): string | null {
  if (!items.length) return null;
  return items[items.length - 1]?.created_at ?? null;
}

function birlestirTekil(
  onceki: DurumOggesi[],
  gelen: DurumOggesi[],
): DurumOggesi[] {
  if (!onceki.length) return gelen;
  const ids = new Set(onceki.map((x) => x.id));
  const ek = gelen.filter((x) => !ids.has(x.id));
  return ek.length ? [...onceki, ...ek] : onceki;
}

export default function DurumAkisEkrani() {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { isGuest, user } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const magaza = useHediyeMagaza();

  const [sekme, setSekme] = useState<Sekme>('sana');
  const [onbellek, setOnbellek] = useState<Record<Sekme, SekmeOnbellek>>(() => ({
    sana: BOS_ONBELLEK(),
    takip: BOS_ONBELLEK(),
  }));
  const [yenileniyor, setYenileniyor] = useState(false);
  const [sayfaYukleniyor, setSayfaYukleniyor] = useState(false);
  const [yorumStatusId, setYorumStatusId] = useState<string | null>(null);
  const [bildirOge, setBildirOge] = useState<DurumOggesi | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [ekranOdak, setEkranOdak] = useState(true);
  const [aktifVideoId, setAktifVideoId] = useState<string | null>(null);
  const [paylasStatusId, setPaylasStatusId] = useState<string | null>(null);
  const [yeniGoster, setYeniGoster] = useState(false);

  const goruntulemeIstek = useRef(new Set<string>());
  const begeniKilit = useRef(new Set<string>());
  const sayfaIstek = useRef(false);
  const yukleIstek = useRef(0);
  const listRef = useRef<FlatList<DurumOggesi>>(null);
  const scrollOfset = useRef<Record<Sekme, number>>({ sana: 0, takip: 0 });
  const ustteMiRef = useRef(true);

  const aktif = onbellek[sekme];
  const items = aktif.items;
  const ilkYukleme = !aktif.yuklendi && !aktif.hata;

  const altBosluk = yuzenTabBarToplamYukseklik(insets.bottom) + BoslukTokenlari.lg;

  const sekmeYukle = useCallback(
    async (hedef: Sekme, opts?: { yenile?: boolean }) => {
      const yenile = !!opts?.yenile;
      const istekNo = ++yukleIstek.current;
      try {
        if (yenile) setYenileniyor(true);
        const gelen =
          hedef === 'takip'
            ? await DurumTakipAkisiniGetir(SAYFA, null)
            : await DurumAkisiniGetir(SAYFA, null);
        if (istekNo !== yukleIstek.current) return;
        setOnbellek((prev) => ({
          ...prev,
          [hedef]: {
            items: gelen,
            cursor: sonCursor(gelen),
            hasMore: gelen.length >= SAYFA,
            yuklendi: true,
            hata: null,
          },
        }));
      } catch (e) {
        if (istekNo !== yukleIstek.current) return;
        const mesaj =
          e instanceof Error ? e.message : t('durum.akisHatasi');
        setOnbellek((prev) => ({
          ...prev,
          [hedef]: {
            ...prev[hedef],
            yuklendi: true,
            hata: mesaj,
            items: yenile ? prev[hedef].items : [],
          },
        }));
      } finally {
        if (istekNo === yukleIstek.current) setYenileniyor(false);
      }
    },
    [t],
  );

  const dahaFazla = useCallback(async () => {
    const k = onbellek[sekme];
    if (!k.hasMore || !k.cursor || sayfaIstek.current || yenileniyor) return;
    sayfaIstek.current = true;
    setSayfaYukleniyor(true);
    try {
      const gelen =
        sekme === 'takip'
          ? await DurumTakipAkisiniGetir(SAYFA, k.cursor)
          : await DurumAkisiniGetir(SAYFA, k.cursor);
      setOnbellek((prev) => {
        const cur = prev[sekme];
        const itemsNext = birlestirTekil(cur.items, gelen);
        return {
          ...prev,
          [sekme]: {
            ...cur,
            items: itemsNext,
            cursor: sonCursor(itemsNext),
            hasMore: gelen.length >= SAYFA,
            hata: null,
          },
        };
      });
    } catch {
      /* sessiz — kullanıcı yukarı çekerek yeniden deneyebilir */
    } finally {
      sayfaIstek.current = false;
      setSayfaYukleniyor(false);
    }
  }, [onbellek, sekme, yenileniyor]);

  useFocusEffect(
    useCallback(() => {
      setEkranOdak(true);
      const k = onbellek[sekme];
      if (!k.yuklendi) void sekmeYukle(sekme);
      return () => {
        setEkranOdak(false);
        setAktifVideoId(null);
      };
      // onbellek kasıtlı: focus’ta yalnızca boşsa yükle
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sekme, sekmeYukle]),
  );

  const sekmeDegistir = (next: Sekme) => {
    if (next === sekme) return;
    setAktifVideoId(null);
    setSekme(next);
    const k = onbellek[next];
    if (!k.yuklendi) void sekmeYukle(next);
    requestAnimationFrame(() => {
      const y = scrollOfset.current[next] ?? 0;
      if (y > 0) {
        listRef.current?.scrollToOffset({ offset: y, animated: false });
      }
    });
  };

  const itemGuncelle = useCallback(
    (id: string, patch: Partial<DurumOggesi> | ((x: DurumOggesi) => DurumOggesi)) => {
      setOnbellek((prev) => {
        const guncelle = (k: SekmeOnbellek): SekmeOnbellek => ({
          ...k,
          items: k.items.map((x) => {
            if (x.id !== id) return x;
            return typeof patch === 'function' ? patch(x) : { ...x, ...patch };
          }),
        });
        return { sana: guncelle(prev.sana), takip: guncelle(prev.takip) };
      });
    },
    [],
  );

  const itemKaldir = useCallback((id: string) => {
    setOnbellek((prev) => {
      const filtre = (k: SekmeOnbellek): SekmeOnbellek => ({
        ...k,
        items: k.items.filter((x) => x.id !== id),
      });
      return { sana: filtre(prev.sana), takip: filtre(prev.takip) };
    });
  }, []);

  useDurumAkisRealtime({
    ustteMiRef,
    enabled: ekranOdak && !isGuest,
    onYeniUstte: () => {
      void sekmeYukle(sekme, { yenile: true });
    },
    onYeniAsagida: () => setYeniGoster(true),
    onSilindi: (id) => itemKaldir(id),
  });

  const isGuestRef = useRef(isGuest);
  isGuestRef.current = isGuest;
  const itemGuncelleRef = useRef(itemGuncelle);
  itemGuncelleRef.current = itemGuncelle;

  const onViewableStable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const gorunen: DurumOggesi[] = [];
      for (const v of viewableItems) {
        const oge = v.item as DurumOggesi | undefined;
        if (oge?.id) gorunen.push(oge);
      }
      const video = gorunen.find((x) => x.media_type === 'video');
      const muzik = gorunen.find((x) => x.post_kind === 'music');
      // Video öncelikli; yoksa görünür müzik kartı (önizleme + scroll’da kapanır)
      setAktifVideoId(video?.id ?? muzik?.id ?? null);

      if (isGuestRef.current) return;
      for (const oge of gorunen) {
        if (goruntulemeIstek.current.has(oge.id)) continue;
        goruntulemeIstek.current.add(oge.id);
        void (async () => {
          const r = await DurumGoruntulemeKaydet(oge.id);
          if (!r.ok || typeof r.view_count !== 'number') return;
          itemGuncelleRef.current(oge.id, { view_count: r.view_count });
        })();
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
    minimumViewTime: 120,
  }).current;

  const begen = useCallback(
    (oge: DurumOggesi) => {
      islemiDene('yorum_yap', () => {
        if (begeniKilit.current.has(oge.id)) return;
        begeniKilit.current.add(oge.id);

        const oncekiLiked = !!oge.liked_by_me;
        const oncekiCount = Number(oge.like_count ?? 0);
        const sonrakiLiked = !oncekiLiked;
        const sonrakiCount = Math.max(0, oncekiCount + (sonrakiLiked ? 1 : -1));

        itemGuncelle(oge.id, {
          liked_by_me: sonrakiLiked,
          like_count: sonrakiCount,
        });

        void (async () => {
          try {
            const { DurumBegeniVeyaKuyruk } = await import(
              '../../src/moduller/cevrimdisi/SosyalKuyruk'
            );
            const r = await DurumBegeniVeyaKuyruk({
              userId: user?.id,
              statusId: oge.id,
              liked: sonrakiLiked,
            });
            if (!r.ok) {
              itemGuncelle(oge.id, {
                liked_by_me: oncekiLiked,
                like_count: oncekiCount,
              });
              Alert.alert(t('durum.begeni'), r.hata ?? t('durum.basarisiz'));
              return;
            }
            itemGuncelle(oge.id, {
              liked_by_me: !!r.liked,
              like_count:
                typeof r.like_count === 'number' ? r.like_count : sonrakiCount,
            });
          } catch {
            itemGuncelle(oge.id, {
              liked_by_me: oncekiLiked,
              like_count: oncekiCount,
            });
          } finally {
            begeniKilit.current.delete(oge.id);
          }
        })();
      });
    },
    [islemiDene, itemGuncelle, t],
  );

  const hediyeAc = useCallback(
    (oge: DurumOggesi) => {
      magaza.ac({
        receiverId: oge.user_id,
        aliciAdi: oge.display_name,
        statusId: oge.id,
        animasyon: true,
        onBasarili: (_gift, adet) => {
          itemGuncelle(oge.id, (x) => ({
            ...x,
            gift_count: (x.gift_count ?? 0) + adet,
          }));
        },
      });
    },
    [magaza, itemGuncelle],
  );

  const sil = useCallback(
    (oge: DurumOggesi) => {
      Alert.alert(t('durum.gonderiSil'), t('durum.gonderiSilBody'), [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('ortak.sil'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const r = await DurumSil(oge.id);
              if (!r.ok) {
                Alert.alert(t('ortak.sil'), r.hata ?? t('durum.silinemedi'));
                return;
              }
              itemKaldir(oge.id);
            })();
          },
        },
      ]);
    },
    [itemKaldir, t],
  );

  const cevrimdisiKaydet = useCallback(
    (oge: DurumOggesi) => {
      const uid = user?.id;
      if (!uid) return;
      void (async () => {
        const { CevrimdisiIcerikKaydet } = await import(
          '../../src/moduller/cevrimdisi/CevrimdisiKaydet'
        );
        const tur =
          oge.media_type === 'video'
            ? 'video'
            : oge.media_type === 'image'
              ? 'image'
              : oge.media_type === 'audio'
                ? 'audio'
                : 'text';
        const r = await CevrimdisiIcerikKaydet({
          userId: uid,
          id: oge.id,
          url: oge.media_url,
          tur,
          baslik: oge.caption,
        });
        Alert.alert(
          t('durum.gonderi'),
          r.ok
            ? t('cevrimdisi.kaydedildi')
            : r.hata === 'disk'
              ? t('cevrimdisi.diskYetersiz')
              : t('cevrimdisi.senkronHata'),
        );
      })();
    },
    [t, user?.id],
  );

  const menuAc = useCallback(
    (oge: DurumOggesi) => {
      if (oge.is_mine) {
        const buttons: {
          text: string;
          style?: 'cancel' | 'destructive' | 'default';
          onPress?: () => void;
        }[] = [];
        if (oge.post_kind !== 'game_win') {
          buttons.push({
            text: t('ortak.duzenle'),
            onPress: () => router.push(`/durum/duzenle?id=${oge.id}` as any),
          });
        }
        buttons.push(
          {
            text: t('cevrimdisi.kaydetCevrimdisi'),
            onPress: () => cevrimdisiKaydet(oge),
          },
          {
            text: t('ortak.paylas'),
            onPress: () =>
              islemiDene('mesaj_gonder', () => setPaylasStatusId(oge.id)),
          },
          {
            text: t('ortak.kaldir'),
            style: 'destructive',
            onPress: () => sil(oge),
          },
          { text: t('ortak.vazgec'), style: 'cancel' },
        );
        Alert.alert(t('durum.gonderi'), undefined, buttons);
        return;
      }
      Alert.alert(t('durum.gonderi'), undefined, [
        {
          text: t('cevrimdisi.kaydetCevrimdisi'),
          onPress: () => cevrimdisiKaydet(oge),
        },
        {
          text: t('ortak.paylas'),
          onPress: () =>
            islemiDene('mesaj_gonder', () => setPaylasStatusId(oge.id)),
        },
        {
          text: t('durum.bildirEngelle'),
          style: 'destructive',
          onPress: () => setBildirOge(oge),
        },
        { text: t('ortak.vazgec'), style: 'cancel' },
      ]);
    },
    [cevrimdisiKaydet, islemiDene, sil, t],
  );

  const listFooter = useMemo(() => {
    if (!sayfaYukleniyor) return <View style={{ height: 8 }} />;
    return (
      <ActivityIndicator
        color={RenkTokenlari.primarySoft}
        style={{ marginVertical: 16 }}
      />
    );
  }, [sayfaYukleniyor]);

  const listEmpty = useMemo(() => {
    if (aktif.hata) {
      return (
        <View style={styles.hataKutu}>
          <Text style={styles.hataBaslik}>{t('durum.akisHatasi')}</Text>
          <Text style={styles.hataGovde}>{aktif.hata}</Text>
          <Pressable
            style={styles.hataBtn}
            onPress={() => void sekmeYukle(sekme, { yenile: true })}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.tekrarDene')}
          >
            <Text style={styles.hataBtnYazi}>{t('ortak.tekrarDene')}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <BosDurum
        icon="images-outline"
        title={
          sekme === 'takip'
            ? t('durum.bosTakip')
            : t('durum.bosSana')
        }
        body={
          sekme === 'takip'
            ? t('durum.bosTakipBody')
            : t('durum.bosSanaBody')
        }
      />
    );
  }, [aktif.hata, sekme, sekmeYukle, t]);

  const renderItem = useCallback(
    ({ item }: { item: DurumOggesi }) => (
      <DurumKart
        oge={item}
        videoAktif={
          ekranOdak &&
          !yorumStatusId &&
          !lightboxUri &&
          aktifVideoId === item.id
        }
        onPress={() => router.push(`/durum/${item.id}` as any)}
        onResimPress={() => {
          if (item.media_type === 'video') return;
          const u =
            typeof item.media_url === 'string' ? item.media_url.trim() : '';
          if (/^https?:\/\//i.test(u)) setLightboxUri(u);
        }}
        onBegen={() => begen(item)}
        onYorum={() =>
          islemiDene('yorum_yap', () => setYorumStatusId(item.id))
        }
        onHediye={() => hediyeAc(item)}
        onPaylas={() =>
          islemiDene('mesaj_gonder', () => setPaylasStatusId(item.id))
        }
        onProfil={() => router.push(`/kullanici/${item.user_id}` as any)}
        onMenu={() => menuAc(item)}
      />
    ),
    [
      ekranOdak,
      yorumStatusId,
      lightboxUri,
      aktifVideoId,
      begen,
      islemiDene,
      hediyeAc,
      menuAc,
    ],
  );

  return (
    <Screen edges={['top']} tabSayfaKaydir>
      <ModulHataSiniri modulAdi="durum">
        <View style={styles.header}>
          <Text style={styles.title}>{t('durum.baslik')}</Text>
          <Pressable
            style={styles.paylasBtn}
            onPress={() =>
              islemiDene('durum_paylas', () =>
                router.push('/durum/olustur' as any),
              )
            }
            accessibilityRole="button"
            accessibilityLabel={t('durum.gonderiOlustur')}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={RenkTokenlari.text}
            />
          </Pressable>
        </View>
        <View style={styles.sekmeRow}>
          <Pressable
            onPress={() => sekmeDegistir('sana')}
            style={[styles.sekme, sekme === 'sana' && styles.sekmeOn]}
            accessibilityRole="button"
            accessibilityLabel={t('durum.sanaOzel')}
            accessibilityState={{ selected: sekme === 'sana' }}
          >
            <Text
              style={[styles.sekmeYazi, sekme === 'sana' && styles.sekmeYaziOn]}
            >
              {t('durum.sanaOzel')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => sekmeDegistir('takip')}
            style={[styles.sekme, sekme === 'takip' && styles.sekmeOn]}
            accessibilityRole="button"
            accessibilityLabel={t('durum.takipSekme')}
            accessibilityState={{ selected: sekme === 'takip' }}
          >
            <Text
              style={[
                styles.sekmeYazi,
                sekme === 'takip' && styles.sekmeYaziOn,
              ]}
            >
              {t('durum.takipSekme')}
            </Text>
          </Pressable>
        </View>

        {ilkYukleme ? (
          <DurumAkisSkeleton adet={4} />
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={[styles.list, { paddingBottom: altBosluk }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={yenileniyor}
                onRefresh={() => void sekmeYukle(sekme, { yenile: true })}
                tintColor={RenkTokenlari.primarySoft}
              />
            }
            ListEmptyComponent={listEmpty}
            ListFooterComponent={listFooter}
            renderItem={renderItem}
            onViewableItemsChanged={onViewableStable}
            viewabilityConfig={viewabilityConfig}
            onEndReached={() => void dahaFazla()}
            onEndReachedThreshold={0.35}
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              scrollOfset.current[sekme] = y;
              ustteMiRef.current = y < 80;
            }}
            scrollEventThrottle={64}
            windowSize={7}
            maxToRenderPerBatch={6}
            initialNumToRender={5}
            removeClippedSubviews
          />
        )}

        {yeniGoster ? (
          <View style={styles.yeniPillWrap} pointerEvents="box-none">
            <Pressable
              style={styles.yeniPill}
              onPress={() => {
                setYeniGoster(false);
                void sekmeYukle(sekme, { yenile: true });
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
                ustteMiRef.current = true;
              }}
              accessibilityRole="button"
              accessibilityLabel={t('durum.yeniGonderiler')}
            >
              <Ionicons name="arrow-up" size={14} color="#fff" />
              <Text style={styles.yeniPillYazi}>{t('durum.yeniGonderiler')}</Text>
            </Pressable>
          </View>
        ) : null}

        {yorumStatusId ? (
          <DurumYorumPaneli
            visible
            statusId={yorumStatusId}
            onClose={() => {
              setYorumStatusId(null);
              setLightboxUri(null);
            }}
            onChanged={() => {
              // Aktif sekme önbelleğini yenile (scroll state korunur)
              void sekmeYukle(sekme, { yenile: true });
            }}
            onProfil={(uid) => {
              setYorumStatusId(null);
              setLightboxUri(null);
              router.push(`/kullanici/${uid}` as any);
            }}
          />
        ) : null}

        {!yorumStatusId ? (
          <DurumResimLightbox
            uri={lightboxUri}
            onClose={() => setLightboxUri(null)}
          />
        ) : null}

        {paylasStatusId ? (
          <GonderiPaylasSheet
            visible
            statusId={paylasStatusId}
            onClose={() => setPaylasStatusId(null)}
          />
        ) : null}

        {bildirOge ? (
          <KullaniciGuvenlikMenusu
            visible
            targetUserId={bildirOge.user_id}
            targetName={bildirOge.display_name}
            contentType="status_post"
            contentId={bildirOge.id}
            contentPreview={bildirOge.caption}
            contentMediaUrl={bildirOge.media_url}
            onClose={() => setBildirOge(null)}
            onReported={() => setBildirOge(null)}
            onBlocked={() => {
              const uid = bildirOge.user_id;
              setOnbellek((prev) => {
                const filtre = (k: SekmeOnbellek): SekmeOnbellek => ({
                  ...k,
                  items: k.items.filter((x) => x.user_id !== uid),
                });
                return { sana: filtre(prev.sana), takip: filtre(prev.takip) };
              });
              setBildirOge(null);
            }}
          />
        ) : null}

        <HediyeMagazaBaglamasi magaza={magaza} misafirKart={false} />

        <HesabiTamamlaKarti
          visible={upgradeAcik || magaza.upgradeAcik}
          onClose={() => {
            upgradeKapat();
            magaza.upgradeKapat();
          }}
          onCompleted={() => {
            upgradeKapat();
            magaza.upgradeKapat();
          }}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  title: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    fontSize: 22,
    fontWeight: '800',
  },
  sekmeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.sm,
  },
  sekme: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: RenkTokenlari.bgCard,
  },
  sekmeOn: {
    backgroundColor: RenkTokenlari.primary,
  },
  sekmeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '800',
  },
  sekmeYaziOn: { color: '#fff' },
  paylasBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 1,
  },
  hataKutu: {
    paddingHorizontal: BoslukTokenlari.xl,
    paddingTop: 48,
    alignItems: 'center',
    gap: 10,
  },
  hataBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  hataGovde: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  hataBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: RenkTokenlari.primary,
  },
  hataBtnYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
  },
  yeniPillWrap: {
    position: 'absolute',
    top: 108,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  yeniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: RenkTokenlari.primary,
    elevation: 4,
  },
  yeniPillYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
