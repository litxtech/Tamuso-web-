import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { BosDurum } from '../../src/components/BosDurum';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useBildirimler } from '../../src/moduller/bildirimler/baglam/BildirimSaglayici';
import {
  BildirimlerimiListele,
  BildirimSil,
  BildirimleriTopluSil,
  BildirimleriHepsiniSil,
  type UygulamaBildirimi,
} from '../../src/moduller/bildirimler/okuma/BildirimKuyrugumuGetir';
import {
  BildirimHedefYolu,
  BildirimTarihSaat,
} from '../../src/moduller/bildirimler/islemler/BildirimHedefYolu';
import { BildirimHedefineGit } from '../../src/moduller/bildirimler/islemler/BildirimPushYonlendirme';
import { ProfilAvatarKucuk } from '../../src/moduller/canli-sohbet/bilesenler/ProfilAvatarKucuk';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../src/i18n/useCeviri';

function kategoriEtiketi(
  cat: string,
  t: (key: CeviriAnahtari, opts?: Record<string, unknown>) => string,
) {
  const map: Record<string, CeviriAnahtari> = {
    gifts: 'bildirimler.kategoriHediye',
    live: 'bildirimler.kategoriCanli',
    rooms: 'bildirimler.kategoriOda',
    social: 'bildirimler.kategoriSosyal',
    wallet: 'bildirimler.kategoriCuzdan',
    system: 'bildirimler.kategoriSistem',
  };
  const key = map[cat];
  return key ? t(key) : cat;
}

function gonderenAdi(
  item: UygulamaBildirimi,
  t: (key: CeviriAnahtari, opts?: Record<string, unknown>) => string,
): string {
  if (item.actor_name?.trim()) return item.actor_name.trim();
  if (item.actor_username?.trim()) return `@${item.actor_username.trim()}`;
  if (item.category === 'system') return 'Tamuso';
  if (item.category === 'wallet') return t('bildirimler.kategoriCuzdan');
  return item.title || t('bildirimler.varsayilanBaslik');
}

function UstMetinDugme({
  label,
  onPress,
  accent,
  danger,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.ustMetinHit,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.ustMetin,
          accent && styles.ustMetinAccent,
          danger && styles.ustMetinDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function UstIkonDugme({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.ustIkon,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={RenkTokenlari.text} />
    </Pressable>
  );
}

export default function BildirimMerkeziEkrani() {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { sayfayiAcincaOkundu, tekOkundu, yenile } = useBildirimler();
  const [items, setItems] = useState<UygulamaBildirimi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secimModu, setSecimModu] = useState(false);
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [siliniyor, setSiliniyor] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await BildirimlerimiListele(60));
    } catch {
      setItems([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let iptal = false;
      void (async () => {
        await sayfayiAcincaOkundu();
        if (!iptal) await load();
      })();
      return () => {
        iptal = true;
        setSecimModu(false);
        setSecili(new Set());
      };
    }, [load, sayfayiAcincaOkundu]),
  );

  const secimModunuKapat = useCallback(() => {
    setSecimModu(false);
    setSecili(new Set());
  }, []);

  const secimModunuAc = useCallback(() => {
    setSecimModu(true);
    setSecili(new Set());
  }, []);

  const toggleSec = useCallback((id: string) => {
    setSecili((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hepsiniSec = useCallback(() => {
    setSecili(new Set(items.map((x) => x.id)));
  }, [items]);

  const ac = (item: UygulamaBildirimi) => {
    if (secimModu) {
      toggleSec(item.id);
      return;
    }
    void tekOkundu(item.id);
    setItems((prev) =>
      prev.map((x) =>
        x.id === item.id
          ? { ...x, read_at: x.read_at ?? new Date().toISOString() }
          : x,
      ),
    );
    const hedef = BildirimHedefYolu({
      deep_link: item.deep_link,
      category: item.category,
      payload: item.payload,
      actor_id: item.actor_id,
    });
    if (hedef) {
      void BildirimHedefineGit(hedef);
    }
  };

  const tekSil = useCallback(
    (item: UygulamaBildirimi) => {
      Alert.alert(t('bildirimler.silBaslik'), t('bildirimler.silSoru'), [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('ortak.sil'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setSiliniyor(true);
                await BildirimSil(item.id);
                setItems((prev) => prev.filter((x) => x.id !== item.id));
                setSecili((prev) => {
                  const next = new Set(prev);
                  next.delete(item.id);
                  return next;
                });
                await yenile();
              } catch {
                Alert.alert(t('ortak.hata'), t('bildirimler.silinemedi'));
              } finally {
                setSiliniyor(false);
              }
            })();
          },
        },
      ]);
    },
    [yenile, t],
  );

  const secilenleriSil = useCallback(() => {
    const ids = Array.from(secili);
    if (ids.length === 0) return;
    Alert.alert(
      t('bildirimler.secilenleriSil'),
      t('bildirimler.secilenleriSilSoru', { count: ids.length }),
      [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('ortak.sil'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setSiliniyor(true);
                await BildirimleriTopluSil(ids);
                const silinen = new Set(ids);
                setItems((prev) => prev.filter((x) => !silinen.has(x.id)));
                secimModunuKapat();
                await yenile();
              } catch {
                Alert.alert(t('ortak.hata'), t('bildirimler.silinemediCoklu'));
              } finally {
                setSiliniyor(false);
              }
            })();
          },
        },
      ],
    );
  }, [secili, secimModunuKapat, yenile, t]);

  const tumunuSil = useCallback(() => {
    if (items.length === 0) return;
    Alert.alert(t('bildirimler.tumunuSil'), t('bildirimler.tumunuSilSoru'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('bildirimler.tumunuSil'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setSiliniyor(true);
              await BildirimleriHepsiniSil();
              setItems([]);
              secimModunuKapat();
              await yenile();
            } catch {
              Alert.alert(t('ortak.hata'), t('bildirimler.silinemediCoklu'));
            } finally {
              setSiliniyor(false);
            }
          })();
        },
      },
    ]);
  }, [items.length, secimModunuKapat, yenile, t]);

  const seciliSayisi = secili.size;
  const tumuSecili = useMemo(
    () => items.length > 0 && seciliSayisi === items.length,
    [items.length, seciliSayisi],
  );
  const okunmamisSayisi = useMemo(
    () => items.filter((x) => !x.read_at).length,
    [items],
  );

  const altBaslik = secimModu
    ? t('bildirimler.secili', { count: seciliSayisi })
    : okunmamisSayisi > 0
      ? t('bildirimler.okunmamisOzet', { count: okunmamisSayisi })
      : t('bildirimler.altBaslik');

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="bildirimler">
        <EkranBasligi
          title={t('bildirimler.baslik')}
          subtitle={altBaslik}
          border
          right={
            <View style={styles.ustAksiyonlar}>
              {secimModu ? (
                <UstMetinDugme
                  label={t('bildirimler.secimiKapat')}
                  onPress={secimModunuKapat}
                  accent
                />
              ) : (
                <>
                  {items.length > 0 ? (
                    <UstMetinDugme
                      label={t('bildirimler.duzenle')}
                      onPress={secimModunuAc}
                      accent
                    />
                  ) : null}
                  <UstIkonDugme
                    icon="flag-outline"
                    label={t('bildirimler.raporlarim')}
                    onPress={() => router.push('/raporlarim' as any)}
                  />
                  <UstIkonDugme
                    icon="options-outline"
                    label={t('bildirimler.ayarlar')}
                    onPress={() => router.push('/bildirim-ayarlari' as any)}
                  />
                </>
              )}
            </View>
          }
        />

        <View style={styles.content}>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              secimModu && items.length > 0
                ? { paddingBottom: 88 + insets.bottom }
                : null,
            ]}
            refreshing={yukleniyor || siliniyor}
            onRefresh={() => {
              setYukleniyor(true);
              void load();
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.ayirici} />}
            ListEmptyComponent={
              yukleniyor ? null : (
                <BosDurum
                  icon="notifications-outline"
                  title={t('bildirimler.bos')}
                  body={t('bildirimler.bosBody')}
                />
              )
            }
            renderItem={({ item }) => {
              const okunmadi = !item.read_at;
              const ad = gonderenAdi(item, t);
              const zs = BildirimTarihSaat(item.created_at);
              const hedefVar = !!BildirimHedefYolu({
                deep_link: item.deep_link,
                category: item.category,
                payload: item.payload,
                actor_id: item.actor_id,
              });
              const secildi = secili.has(item.id);
              const govde =
                item.title !== ad
                  ? item.body || item.title
                  : item.body || item.title;

              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.satir,
                    okunmadi && styles.satirUnread,
                    secildi && styles.satirSecili,
                    pressed && styles.pressedSoft,
                  ]}
                  onPress={() => ac(item)}
                  onLongPress={() => {
                    if (!secimModu) {
                      setSecimModu(true);
                      setSecili(new Set([item.id]));
                    } else {
                      tekSil(item);
                    }
                  }}
                  delayLongPress={350}
                >
                  {okunmadi ? <View style={styles.unreadBar} /> : null}

                  {secimModu ? (
                    <View style={styles.secimKutu}>
                      <View
                        style={[
                          styles.checkbox,
                          secildi && styles.checkboxOn,
                        ]}
                      >
                        {secildi ? (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={RenkTokenlari.textOnPrimary}
                          />
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.avatarWrap}>
                    <ProfilAvatarKucuk
                      size={46}
                      displayName={ad}
                      username={item.actor_username}
                      avatarUrl={item.actor_avatar_url}
                    />
                    {okunmadi && !secimModu ? (
                      <View style={styles.nokta} />
                    ) : null}
                  </View>

                  <View style={styles.cardGovde}>
                    <View style={styles.cardUst}>
                      <Text
                        style={[styles.isim, okunmadi && styles.isimUnread]}
                        numberOfLines={1}
                      >
                        {ad}
                      </Text>
                      <Text style={styles.saat}>
                        {zs.saat || zs.tarih || ''}
                      </Text>
                    </View>

                    <Text
                      style={[styles.baslik, okunmadi && styles.baslikUnread]}
                      numberOfLines={2}
                    >
                      {item.title !== ad ? item.title : govde}
                    </Text>

                    {item.body && item.title !== ad ? (
                      <Text style={styles.body} numberOfLines={2}>
                        {item.body}
                      </Text>
                    ) : null}

                    <View style={styles.metaSatir}>
                      <View style={styles.kategoriChip}>
                        <Text style={styles.kategoriYazi}>
                          {kategoriEtiketi(item.category, t)}
                        </Text>
                      </View>
                      {zs.tarih ? (
                        <Text style={styles.meta}>{zs.tarih}</Text>
                      ) : null}
                      {!secimModu && hedefVar ? (
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={RenkTokenlari.textDim}
                          style={styles.chevron}
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>

        {secimModu && items.length > 0 ? (
          <View
            style={[
              styles.altBar,
              { paddingBottom: Math.max(insets.bottom, BoslukTokenlari.md) },
            ]}
          >
            <Pressable
              onPress={() => {
                if (tumuSecili) setSecili(new Set());
                else hepsiniSec();
              }}
              style={({ pressed }) => [
                styles.altBarBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                tumuSecili
                  ? t('bildirimler.secimiKaldir')
                  : t('bildirimler.tumunuSec')
              }
            >
              <Ionicons
                name={tumuSecili ? 'checkbox' : 'square-outline'}
                size={20}
                color={RenkTokenlari.text}
              />
              <Text style={styles.altBarBtnYazi}>
                {tumuSecili
                  ? t('bildirimler.secimiKaldir')
                  : t('bildirimler.tumunuSec')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (seciliSayisi > 0) secilenleriSil();
                else tumunuSil();
              }}
              disabled={siliniyor}
              style={({ pressed }) => [
                styles.altBarSil,
                pressed && styles.pressed,
                siliniyor && { opacity: 0.5 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                seciliSayisi > 0
                  ? t('bildirimler.secilenleriSil')
                  : t('bildirimler.tumunuSil')
              }
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={RenkTokenlari.danger}
              />
              <Text style={styles.altBarSilYazi}>
                {seciliSayisi > 0
                  ? t('bildirimler.secilenleriSil')
                  : t('bildirimler.tumunuSil')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  ustAksiyonlar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ustMetinHit: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  ustMetin: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 14,
  },
  ustMetinAccent: {
    color: RenkTokenlari.primarySoft,
  },
  ustMetinDanger: {
    color: RenkTokenlari.danger,
  },
  ustIkon: {
    width: 40,
    height: 40,
    borderRadius: YaricapTokenlari.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.chipFill,
  },
  pressed: { opacity: 0.72 },
  pressedSoft: { opacity: 0.88 },
  list: {
    paddingBottom: BoslukTokenlari.xxxl,
    flexGrow: 1,
  },
  ayirici: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: RenkTokenlari.border,
    marginStart: 78,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: 14,
    backgroundColor: RenkTokenlari.bg,
    position: 'relative',
  },
  satirUnread: {
    backgroundColor: RenkTokenlari.bgElevated,
  },
  satirSecili: {
    backgroundColor: `${RenkTokenlari.primarySoft}14`,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  secimKutu: {
    paddingTop: 12,
    width: 24,
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: RenkTokenlari.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: RenkTokenlari.primarySoft,
    borderColor: RenkTokenlari.primarySoft,
  },
  avatarWrap: {
    position: 'relative',
    marginTop: 1,
  },
  nokta: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RenkTokenlari.primarySoft,
    borderWidth: 2,
    borderColor: RenkTokenlari.bgElevated,
  },
  cardGovde: { flex: 1, minWidth: 0, gap: 4 },
  cardUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  isim: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
    flex: 1,
    fontSize: 15,
  },
  isimUnread: {
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  saat: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
    letterSpacing: 0,
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
    fontSize: 13,
  },
  baslikUnread: {
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  body: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    lineHeight: 17,
  },
  metaSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  kategoriChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.chipFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  kategoriYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontSize: 10,
    lineHeight: 13,
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    letterSpacing: 0,
    flex: 1,
  },
  chevron: {
    marginStart: 'auto',
  },
  altBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  altBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  altBarBtnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  altBarSil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: `${RenkTokenlari.danger}18`,
  },
  altBarSilYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    fontWeight: '700',
  },
});
