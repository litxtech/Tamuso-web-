import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { ProfilAvatarKucuk } from '../../canli-sohbet/bilesenler/ProfilAvatarKucuk';
import { SeviyeTaci } from './SeviyeTaci';
import {
  OdaDinleyicileriniAyikla,
  OdaUyeleriniGetir,
  type OdaDinleyici,
} from '../okuma/OdaDinleyicileriniGetir';
import { canliVarlikIdleri, useOdaVarlik } from '../varlik/useOdaVarlik';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { DogrulanmisTik } from '../../kullanici-profili/bilesenler/DogrulanmisTik';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  ODA_DOCK_BTN,
  ODA_DOCK_ICON,
  ODA_UST_BTN,
  ODA_UST_ICON,
} from './OdaButonOlculeri';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  roomId: string;
  demoMi?: boolean;
  currentUserId?: string | null;
  /** Sahnedeki dolu koltuklar — bunlar dinleyen listesine girmez. */
  koltukUserIds?: string[];
  onProfil?: (userId: string) => void;
  /** Oda sahibi: koltukta olmayan yöneticinin yetkisini geri alır */
  sahipMi?: boolean;
  onYoneticiKaldir?: (userId: string) => void;
  /** dock: alt bar 40px · ust: üst bar 36px */
  boyut?: 'dock' | 'ust';
  /** false: tetik butonu gizle (ör. dinleyici sayısı pill üzerinden aç) */
  gosterButon?: boolean;
  /** Kontrollü açılış */
  acikDis?: boolean;
  onAcikChange?: (acik: boolean) => void;
};

const DEMO_DINLEYICILER: OdaDinleyici[] = [
  {
    user_id: 'demo-d1',
    role: 'listener',
    joined_at: null,
    profile: {
      display_name: 'Ece',
      username: 'ece',
      avatar_url: null,
      level: 12,
      is_verified: true,
    },
  },
  {
    user_id: 'demo-d2',
    role: 'listener',
    joined_at: null,
    profile: {
      display_name: 'Mert',
      username: 'mert',
      avatar_url: null,
      level: 7,
      is_verified: false,
    },
  },
  {
    user_id: 'demo-d3',
    role: 'listener',
    joined_at: null,
    profile: {
      display_name: 'Selin',
      username: 'selin',
      avatar_url: null,
      level: 21,
      is_verified: false,
    },
  },
  {
    user_id: 'demo-d4',
    role: 'listener',
    joined_at: null,
    profile: {
      display_name: 'Can',
      username: 'can',
      avatar_url: null,
      level: 4,
      is_verified: false,
    },
  },
];

function adAl(d: OdaDinleyici): string {
  return (
    d.profile?.display_name?.trim() ||
    d.profile?.username?.trim() ||
    d.user_id.slice(0, 8)
  );
}

const EKRAN_H = Dimensions.get('window').height;
const KART_MAX = Math.round(EKRAN_H * 0.72);
const LISTE_MAX = Math.round(EKRAN_H * 0.42);
/** Taç halkasının dış kutusu (yogunluk=oda) — isim sütununa taşmasın */
const AVATAR = 40;
const TAC_SLOT =
  AVATAR + 8 + (Math.round(AVATAR * 0.2) + 6) * 2;

/** Dock / üst: koltukta olmayan dinleyen profiller — kart sayfa */
export function OdaDinleyiciPaneli({
  roomId,
  demoMi = false,
  currentUserId,
  koltukUserIds = [],
  onProfil,
  sahipMi = false,
  onYoneticiKaldir,
  boyut = 'dock',
  gosterButon = true,
  acikDis,
  onAcikChange,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const btnPx = boyut === 'ust' ? ODA_UST_BTN : ODA_DOCK_BTN;
  const iconPx = boyut === 'ust' ? ODA_UST_ICON : ODA_DOCK_ICON;
  const [uyeler, setUyeler] = useState<OdaDinleyici[]>(
    demoMi ? DEMO_DINLEYICILER : [],
  );
  const [acikIc, setAcikIc] = useState(false);
  const acik = acikDis ?? acikIc;
  const setAcik = (v: boolean) => {
    if (acikDis === undefined) setAcikIc(v);
    onAcikChange?.(v);
  };
  const [yukleniyor, setYukleniyor] = useState(false);

  const yukle = useCallback(async () => {
    if (demoMi) {
      setUyeler(DEMO_DINLEYICILER);
      return;
    }
    try {
      const gelen = await OdaUyeleriniGetir(roomId);
      setUyeler((prev) => {
        if (
          prev.length === gelen.length &&
          prev.every(
            (p, i) =>
              p.user_id === gelen[i]?.user_id && p.role === gelen[i]?.role,
          )
        ) {
          return prev;
        }
        return gelen;
      });
    } catch {
      setUyeler([]);
    }
  }, [demoMi, roomId]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
      if (demoMi) return;
      const t = setInterval(() => void yukle(), 20_000);
      return () => clearInterval(t);
    }, [yukle, demoMi]),
  );

  useEffect(() => {
    if (demoMi) return;

    const imza = `oda-dinleyici-${roomId}`;
    for (const ch of supabase.getChannels()) {
      const topic = ch.topic ?? '';
      if (topic === imza || topic === `realtime:${imza}` || topic.includes(imza)) {
        void supabase.removeChannel(ch);
      }
    }

    const kanal = supabase
      .channel(`${imza}-${Date.now().toString(36)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void yukle();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [demoMi, roomId, yukle]);

  const varlik = useOdaVarlik(demoMi ? null : roomId);
  const canliIdler = canliVarlikIdleri(varlik);
  const canliBekleniyor = !!varlik && !varlik.senkron && !varlik.hata;

  // Odaya yeni bağlanan ama üyelik listesinde henüz olmayan kişi → üyeleri tazele
  const istenenIdler = useRef(new Set<string>());
  useEffect(() => {
    if (!canliIdler) return;
    const bilinen = new Set(uyeler.map((u) => u.user_id));
    const yeni = canliIdler.filter(
      (id) => !bilinen.has(id) && !istenenIdler.current.has(id),
    );
    if (yeni.length === 0) return;
    const t = setTimeout(() => {
      yeni.forEach((id) => istenenIdler.current.add(id));
      void yukle();
    }, 600);
    return () => clearTimeout(t);
  }, [canliIdler, uyeler, yukle]);

  const liste = useMemo(() => {
    if (demoMi) return uyeler;
    if (canliBekleniyor) return [];
    // Yalnızca şu an bağlı olanlar; sıra: en son gelen önce
    const sira = canliIdler
      ? new Map(canliIdler.map((id, i) => [id, i]))
      : null;
    const mevcut = sira
      ? uyeler
          .filter((u) => sira.has(u.user_id))
          .sort((a, b) => (sira.get(a.user_id) ?? 0) - (sira.get(b.user_id) ?? 0))
      : uyeler;
    const ayik = OdaDinleyicileriniAyikla(mevcut, koltukUserIds);
    if (!sahipMi) return ayik;
    const gorunen = new Set(ayik.map((u) => u.user_id));
    const koltukta = new Set(koltukUserIds);
    const oturanYoneticiler = mevcut.filter(
      (u) =>
        u.role === 'cohost' &&
        u.user_id !== currentUserId &&
        koltukta.has(u.user_id) &&
        !gorunen.has(u.user_id),
    );
    return [...oturanYoneticiler, ...ayik];
  }, [
    demoMi,
    canliBekleniyor,
    canliIdler,
    uyeler,
    koltukUserIds,
    sahipMi,
    currentUserId,
  ]);

  const ac = () => {
    setAcik(true);
    if (!demoMi) {
      setYukleniyor(true);
      void yukle().finally(() => setYukleniyor(false));
    }
  };

  useEffect(() => {
    if (acik && !demoMi) {
      setYukleniyor(true);
      void yukle().finally(() => setYukleniyor(false));
    }
  }, [acik, demoMi, yukle]);

  const sayi = liste.length;
  const rozetYazi = sayi > 99 ? '99+' : String(sayi);

  return (
    <View>
      {gosterButon ? (
      <Pressable
        onPress={acik ? () => setAcik(false) : ac}
        style={[
          styles.buton,
          { width: btnPx, height: btnPx, borderRadius: btnPx / 2 },
          acik && styles.butonAcik,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('sesOda.dinleyenler')}
        accessibilityHint={
          sayi > 0
            ? t('sesOda.dinliyor', { sayi })
            : t('sesOda.koltuktaOlmayanYok')
        }
      >
        <Ionicons
          name={acik ? 'headset' : 'headset-outline'}
          size={iconPx}
          color={acik ? RenkTokenlari.mint : RenkTokenlari.textMuted}
        />
        {sayi > 0 ? (
          <View style={styles.rozet} pointerEvents="none">
            <Text style={styles.rozetYazi}>{rozetYazi}</Text>
          </View>
        ) : null}
      </Pressable>
      ) : null}

      <TamusoModal
        visible={acik}
        onClose={() => setAcik(false)}
        placement="bottom"
        animationType="fade"
      >
        <View
          style={[
            styles.kart,
            { paddingBottom: Math.max(insets.bottom, BoslukTokenlari.lg) },
          ]}
        >
          <View style={styles.kartBaslik}>
            <View style={styles.baslikSol}>
              <Ionicons
                name="headset"
                size={18}
                color={RenkTokenlari.primarySoft}
              />
              <Text style={styles.baslik}>{t('sesOda.dinleyenler')}</Text>
            </View>
            <View style={styles.baslikSag}>
              {canliIdler ? (
                <View
                  style={styles.canliNokta}
                  accessibilityLabel={t('sesOda.canliDinleyici')}
                />
              ) : null}
              <Text style={styles.sayiEtiket}>{sayi}</Text>
              <Pressable
                onPress={() => setAcik(false)}
                style={styles.kapatBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('ortak.kapat')}
              >
                <Ionicons name="close" size={18} color={RenkTokenlari.textMuted} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.altBaslik}>
            {t('sesOda.dinleyenAciklama')}
          </Text>

          {(yukleniyor || canliBekleniyor) && sayi === 0 ? (
            <ActivityIndicator
              color={RenkTokenlari.accent}
              style={styles.yukleniyor}
            />
          ) : sayi === 0 ? (
            <View style={styles.bosKutu}>
              <Ionicons
                name="headset-outline"
                size={28}
                color={RenkTokenlari.textDim}
              />
              <Text style={styles.bos}>{t('sesOda.koltuktaOlmayanYok')}</Text>
              <Text style={styles.bosAlt}>
                {t('sesOda.dinleyenAlt')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={liste}
              keyExtractor={(item) => item.user_id}
              style={styles.liste}
              contentContainerStyle={styles.listeIcerik}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const ad = adAl(item);
                const ben = !!currentUserId && item.user_id === currentUserId;
                const kullaniciAdi = item.profile?.username?.trim();
                const yoneticiGeriAl =
                  sahipMi && item.role === 'cohost' && !ben && !!onYoneticiKaldir;
                return (
                  <View style={styles.profilKart}>
                    <Pressable
                      onPress={() => {
                        if (demoMi) return;
                        setAcik(false);
                        onProfil?.(item.user_id);
                      }}
                      style={styles.profilDokun}
                      accessibilityRole="button"
                      accessibilityLabel={t('kisilerX.profilA11y', { isim: ad })}
                    >
                      <View style={styles.avatarKutu}>
                        <SeviyeTaci
                          level={item.profile?.level ?? 0}
                          size="sm"
                          avatarBoy={AVATAR}
                          animasyonluMu={false}
                        >
                          <ProfilAvatarKucuk
                            size={AVATAR}
                            displayName={item.profile?.display_name}
                            username={item.profile?.username}
                            avatarUrl={item.profile?.avatar_url}
                          />
                        </SeviyeTaci>
                      </View>
                      <View style={styles.profilMetin}>
                        <View style={styles.adSatir}>
                          <Text style={styles.ad} numberOfLines={1}>
                            {ben ? 'Sen' : ad}
                          </Text>
                          {item.profile?.is_verified ? (
                            <DogrulanmisTik size={14} />
                          ) : null}
                        </View>
                        <Text style={styles.altAd} numberOfLines={1}>
                          {kullaniciAdi ? `@${kullaniciAdi}` : t('sesOda.dinliyorKisa')}
                        </Text>
                      </View>
                      <Text style={styles.durum}>
                        {item.role === 'cohost' ? t('sesOda.yonetici') : t('sesOda.dinliyorKisa')}
                      </Text>
                    </Pressable>
                    {yoneticiGeriAl ? (
                      <Pressable
                        onPress={() => onYoneticiKaldir?.(item.user_id)}
                        style={styles.geriAl}
                        accessibilityRole="button"
                        accessibilityLabel={t('sesOda.menuYoneticiYetkisiniKaldir')}
                      >
                        <Text style={styles.geriAlYazi}>{t('sesOda.yoneticiGeriAl')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              }}
            />
          )}
          <Pressable
            onPress={() => setAcik(false)}
            style={styles.kapatSatir}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.kapat')}
          >
            <Text style={styles.kapatYazi}>{t('ortak.kapat')}</Text>
          </Pressable>
        </View>
      </TamusoModal>
    </View>
  );
}

const styles = StyleSheet.create({
  buton: {
    backgroundColor: 'rgba(42, 36, 56, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    flexShrink: 0,
  },
  butonAcik: {
    borderColor: 'rgba(61, 207, 176, 0.45)',
    backgroundColor: 'rgba(61, 207, 176, 0.18)',
  },
  rozet: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: RenkTokenlari.live,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  rozetYazi: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  kart: {
    borderTopLeftRadius: YaricapTokenlari.lg,
    borderTopRightRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    maxHeight: KART_MAX,
    minHeight: 280,
    width: '100%',
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 12,
  },
  kartBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  baslikSol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 18,
  },
  baslikSag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  canliNokta: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: RenkTokenlari.mint,
  },
  sayiEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  kapatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  altBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 4,
    marginBottom: BoslukTokenlari.md,
  },
  yukleniyor: { marginVertical: 28 },
  bosKutu: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    textAlign: 'center',
    fontWeight: '700',
  },
  bosAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
  },
  liste: { maxHeight: LISTE_MAX },
  listeIcerik: {
    paddingBottom: BoslukTokenlari.md,
    gap: 8,
  },
  profilKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profilDokun: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatarKutu: {
    width: TAC_SLOT,
    height: TAC_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  profilMetin: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  adSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    flexShrink: 1,
  },
  altAd: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  durum: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
    flexShrink: 0,
    marginLeft: 4,
  },
  geriAl: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(239,68,68,0.22)',
  },
  geriAlYazi: {
    ...TipografiTokenlari.micro,
    color: '#FECACA',
    fontWeight: '800',
  },
  kapatSatir: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  kapatYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
