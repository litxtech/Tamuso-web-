/**
 * Canlı yayın tiyatrosu — tam ekran video + şeffaf overlay UI.
 * Video alt layer; yorum/hediye/kontroller absolute; video comment ile rerender olmaz.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useKlavyeYuksekligi } from '../../../bilesenler/klavye/useKlavyeYuksekligi';
import { ModulHataSiniri } from '../../../ortak/hata-sinirlari/ModulHataSiniri';
import { CanliYayinVideoSahne } from './CanliYayinVideoSahne';
import { CanliYorumAkisi } from './CanliYorumAkisi';
import { CanliYorumComposer } from './CanliYorumComposer';
import { CanliBegeniEfekti } from './CanliBegeniEfekti';
import { CanliIzleyiciPaneli } from './CanliIzleyiciPaneli';
import { CanliYayinBegen } from '../islemler/CanliYayinIslemleri';
import { TakipEt } from '../../kullanici-profili/okuma/TakipIslemleri';
import type { CanliSohbetMesajGorunum } from '../../canli-sohbet/bilesenler/CanliSohbetMesajKarti';
import { LiveKitBaglantiYoneticisi } from '../../livekit/baglanti/LiveKitBaglantiYoneticisi';
import { MedyaKameraCevir } from '../../livekit/MedyaBaglantisi';
import { supabase } from '../../../lib/supabase';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { IcerikGuvenlikDugmesi } from '../../moderasyon/bilesenler/IcerikGuvenlikDugmesi';
import { PkSkorSeridi } from '../../pk/bilesenler/PkSkorSeridi';
import type { PkCanliMacDetay } from '../../pk/skor/PkCanliMaciniGetir';
import { useCeviri } from '../../../i18n/useCeviri';
import { AktifDil } from '../../../i18n';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import i18n from '../../../i18n';

export type CanliYayinMeta = {
  id: string;
  host_id: string;
  title: string;
  viewer_count: number;
  like_count: number;
  gift_count: number;
  total_coins_earned: number;
  hostAd: string;
  hostAvatar?: string | null;
  /** Yayın başlangıcı — süre sayacı için */
  started_at?: string | null;
};

function canliSureYazi(sn: number): string {
  const h = Math.floor(sn / 3600);
  const m = Math.floor((sn % 3600) / 60);
  const s = sn % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

type Props = {
  rol: 'host' | 'izleyici';
  meta: CanliYayinMeta;
  medyaDurum?: string | null;
  medyaMock?: boolean;
  currentUserId?: string | null;
  canSend: boolean;
  walletCoins?: number | null;
  onNeedUpgrade?: () => void;
  onHediye?: () => void;
  /** Alt bardaki coin chip — aynı sayfada yükleme paneli */
  onCoinYukle?: () => void;
  onBitir?: () => void;
  onCikis?: () => void;
  onPk?: () => void;
  onMeta?: (patch: Partial<CanliYayinMeta>) => void;
  pkMac?: PkCanliMacDetay | null;
  isGuest?: boolean;
};

const VideoKatmani = memo(function VideoKatmani({
  rol,
  mock,
  durumYazi,
}: {
  rol: 'host' | 'izleyici';
  mock?: boolean;
  durumYazi?: string;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <CanliYayinVideoSahne
        rol={rol === 'host' ? 'host' : 'izleyici'}
        mock={!!mock}
        durumYazi={durumYazi}
      />
    </View>
  );
});

export function CanliYayinTiyatro({
  rol,
  meta,
  medyaDurum,
  medyaMock,
  currentUserId,
  canSend,
  walletCoins,
  onNeedUpgrade,
  onHediye,
  onCoinYukle,
  onBitir,
  onCikis,
  onPk,
  onMeta,
  pkMac,
  isGuest = false,
}: Props) {
  const { t } = useCeviri();
  const locale = DIL_LOCALE_MAP[AktifDil()];
  const insets = useSafeAreaInsets();
  const { yukseklik: klavyeH, acik: klavyeAcik } = useKlavyeYuksekligi(0);
  const [yorumYenile, setYorumYenile] = useState(0);
  const [burst, setBurst] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const [composerH, setComposerH] = useState(52);
  const [takipBusy, setTakipBusy] = useState(false);
  const [takipEdildi, setTakipEdildi] = useState(false);
  const [kameraCevirBusy, setKameraCevirBusy] = useState(false);
  const [baglantiBanner, setBaglantiBanner] = useState<string | null>(null);
  const [izleyiciAcik, setIzleyiciAcik] = useState(false);
  const [sureSn, setSureSn] = useState(0);
  const begeniKilit = useRef(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const bas = meta.started_at ? Date.parse(meta.started_at) : NaN;
    if (!Number.isFinite(bas)) {
      setSureSn(0);
      return;
    }
    const tick = () => {
      setSureSn(Math.max(0, Math.floor((Date.now() - bas) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [meta.started_at]);

  useEffect(() => {
    return LiveKitBaglantiYoneticisi.dinle((_durum, detay) => {
      if (detay === 'reconnecting' || detay === 'signal-reconnecting') {
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        setBaglantiBanner(i18n.t('canliYayin.baglantiYeniden'));
      } else if (detay === 'reconnected' || detay === 'connected') {
        setBaglantiBanner((onceki) => {
          if (
            onceki === i18n.t('canliYayin.baglantiYeniden') ||
            onceki === i18n.t('canliYayin.baglantiKoptu')
          ) {
            return i18n.t('canliYayin.baglantiYenidenKuruldu');
          }
          return null;
        });
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(() => setBaglantiBanner(null), 1600);
      } else if (detay === 'disconnected') {
        // Kasitli leave / rol yükseltme 'left' yayınlar — koptu göstermeyiz.
        // Gerçek kopmada kısa debounce: hemen reconnect gelirse banner yok.
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(() => {
          setBaglantiBanner(i18n.t('canliYayin.baglantiKoptu'));
        }, 1600);
      } else if (detay === 'left' || detay === 'connecting') {
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        setBaglantiBanner(null);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel(`canli-meta-${meta.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          filter: `id=eq.${meta.id}`,
          table: 'live_sessions',
        },
        (payload: { new?: Record<string, unknown> }) => {
          const n = payload.new;
          if (!n) return;
          onMeta?.({
            viewer_count: Number(n.viewer_count ?? meta.viewer_count),
            like_count: Number(n.like_count ?? meta.like_count),
            gift_count: Number(n.gift_count ?? meta.gift_count),
            total_coins_earned: Number(
              n.total_coins_earned ?? meta.total_coins_earned,
            ),
            title: typeof n.title === 'string' ? n.title : meta.title,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [meta.id]); // eslint-disable-line react-hooks/exhaustive-deps -- sadece session

  const ekranaDokun = useCallback(
    (e: { nativeEvent: { locationX: number; locationY: number } }) => {
      if (klavyeAcik) {
        Keyboard.dismiss();
        return;
      }
      const x = e.nativeEvent.locationX;
      const y = e.nativeEvent.locationY;
      setBurst({ id: `${Date.now()}-${Math.random()}`, x, y });

      if (rol === 'host') return;
      if (!canSend) {
        onNeedUpgrade?.();
        return;
      }
      if (begeniKilit.current) return;
      begeniKilit.current = true;
      void CanliYayinBegen(meta.id).then((r) => {
        begeniKilit.current = false;
        if (r.ok) onMeta?.({ like_count: r.like_count });
        else if (r.hata.includes('Misafir')) onNeedUpgrade?.();
      });
    },
    [canSend, klavyeAcik, meta.id, onMeta, onNeedUpgrade, rol],
  );

  const cikisIste = () => {
    if (rol === 'host' && onBitir) {
      Alert.alert(t('canliYayin.yayiniBitir'), t('canliYayin.yayiniBitirBodyKisa'), [
        { text: t('ortak.vazgec'), style: 'cancel' },
        { text: t('canliYayin.bitir'), style: 'destructive', onPress: () => onBitir() },
      ]);
      return;
    }
    onCikis?.();
  };

  const takipEt = () => {
    if (rol === 'host' || !currentUserId || takipEdildi || takipBusy) return;
    if (!canSend) {
      onNeedUpgrade?.();
      return;
    }
    setTakipBusy(true);
    void TakipEt(meta.host_id).then((r) => {
      setTakipBusy(false);
      if (r.ok) setTakipEdildi(true);
      else Alert.alert(t('canliYayin.takipBaslik'), r.hata ?? t('canliYayin.takipEdilemedi'));
    });
  };

  const profilAc = useCallback((userId: string) => {
    if (!userId) return;
    router.push(`/kullanici/${userId}` as any);
  }, []);

  const yorumProfilAc = useCallback(
    (item: CanliSohbetMesajGorunum) => {
      profilAc(item.user_id);
    },
    [profilAc],
  );

  // Yorumlar yalnızca composer + klavyenin hemen üstünde dursun.
  // Eski: altBarH (klavye pad dahil) + klavyeH tekrar eklenince üst çentiğe fırlıyordu.
  const yorumBottom =
    10 +
    composerH +
    (klavyeAcik
      ? Platform.OS === 'ios'
        ? klavyeH
        : 0
      : Math.max(insets.bottom, 8));
  const altPad = klavyeAcik
    ? Platform.OS === 'android'
      ? 8
      : Math.max(8, klavyeH)
    : Math.max(insets.bottom, 8);
  const yorumYukseklik = klavyeAcik ? 140 : 220;

  return (
    <View style={styles.root}>
      <Pressable style={styles.stage} onPress={ekranaDokun}>
        <VideoKatmani
          rol={rol}
          mock={medyaMock}
          durumYazi={medyaDurum ?? undefined}
        />

        {/* Hafif okunabilirlik — videoyu karartmaz */}
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'transparent']}
          style={styles.gradUst}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[
            'transparent',
            'rgba(0,0,0,0.15)',
            'rgba(0,0,0,0.40)',
          ]}
          locations={[0, 0.55, 1]}
          style={styles.gradAlt}
          pointerEvents="none"
        />

        <CanliBegeniEfekti burst={burst} />

        {baglantiBanner ? (
          <View
            style={[
              styles.baglantiBanner,
              { top: Math.max(6, insets.top) + 52 },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.baglantiBannerYazi}>{baglantiBanner}</Text>
          </View>
        ) : null}

        {/* Üst sol: yayıncı */}
        <View
          style={[styles.topOverlay, { paddingTop: Math.max(6, insets.top + 2) }]}
          pointerEvents="box-none"
        >
          <View style={styles.hostSatir} pointerEvents="box-none">
            <Pressable
              style={styles.hostKart}
              onPress={() => profilAc(meta.host_id)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarHarf}>
                  {(meta.hostAd || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.hostMetin}>
                <Text style={styles.hostAd} numberOfLines={1}>
                  {meta.hostAd}
                </Text>
                <Text style={styles.hostAlt} numberOfLines={1}>
                  🪙 {meta.total_coins_earned.toLocaleString(locale)}
                  {meta.like_count > 0
                    ? ` · ♥ ${meta.like_count.toLocaleString(locale)}`
                    : ''}
                </Text>
              </View>
            </Pressable>

            {rol === 'izleyici' && !takipEdildi ? (
              <Pressable
                style={styles.takipBtn}
                onPress={takipEt}
                disabled={takipBusy}
              >
                <Text style={styles.takipYazi}>{t('canliYayin.takipEt')}</Text>
              </Pressable>
            ) : null}
            {takipEdildi ? (
              <View style={styles.takipEdildi}>
                <Text style={styles.takipEdildiYazi}>{t('canliYayin.takipEdildi')}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sagUst}>
            {walletCoins != null ? (
              <Pressable
                style={styles.coinChipUst}
                onPress={() => {
                  if (!canSend) {
                    onNeedUpgrade?.();
                    return;
                  }
                  onCoinYukle?.();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('canliYayin.a11yCoinYukle')}
              >
                <Text style={styles.coinText}>
                  🪙 {walletCoins.toLocaleString(locale)}
                </Text>
                {onCoinYukle ? (
                  <Ionicons name="add-circle" size={15} color="#F0B429" />
                ) : null}
              </Pressable>
            ) : null}
            <Pressable
              style={styles.izleyiciChip}
              onPress={() => setIzleyiciAcik(true)}
              accessibilityRole="button"
              accessibilityLabel={t('canliYayin.a11yIzleyenler')}
              hitSlop={6}
            >
              <Ionicons name="eye" size={13} color="#fff" />
              <Text style={styles.izleyiciSayi}>
                {meta.viewer_count >= 1000
                  ? `${(meta.viewer_count / 1000).toFixed(1)}K`
                  : meta.viewer_count}
              </Text>
            </Pressable>
            {rol === 'izleyici' ? (
              <IcerikGuvenlikDugmesi
                tur="live"
                contentId={meta.id}
                targetUserId={meta.host_id}
                title={meta.title}
                isGuest={isGuest}
                varyant="metin"
              />
            ) : null}
            {rol === 'host' ? (
              <Pressable
                onPress={() => {
                  if (kameraCevirBusy) return;
                  setKameraCevirBusy(true);
                  void Promise.resolve(MedyaKameraCevir()).finally(() => {
                    setKameraCevirBusy(false);
                  });
                }}
                style={[
                  styles.kameraCevirBtn,
                  kameraCevirBusy ? styles.kameraCevirBusy : null,
                ]}
                disabled={kameraCevirBusy}
                accessibilityLabel={t('canliYayin.a11yKameraCevir')}
                hitSlop={6}
              >
                <Ionicons name="camera-reverse" size={20} color="#fff" />
              </Pressable>
            ) : null}
            <Pressable
              onPress={cikisIste}
              style={styles.kapatBtn}
              accessibilityLabel={rol === 'host' ? t('canliYayin.a11yYayiniBitir') : t('canliYayin.a11yCik')}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Chip satırı */}
        <View
          style={[styles.chipSatir, { top: Math.max(6, insets.top) + 52 }]}
          pointerEvents="box-none"
        >
          <View style={styles.chip}>
            <Text style={styles.chipYazi}>🔥 {t('canliYayin.saatlik')}</Text>
          </View>
          {meta.started_at ? (
            <View
              style={styles.surePill}
              accessibilityLabel={`${t('canliYayin.sure')} ${canliSureYazi(sureSn)}`}
            >
              <Ionicons name="time-outline" size={11} color="#fff" />
              <Text style={styles.sureText}>{canliSureYazi(sureSn)}</Text>
            </View>
          ) : null}
          <View style={styles.livePill}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>{t('canliYayin.rozetCanli')}</Text>
          </View>
        </View>

        {pkMac ? (
          <View style={[styles.pkWrap, { top: Math.max(6, insets.top) + 88 }]}>
            <PkSkorSeridi mac={pkMac} selfLiveId={meta.id} />
          </View>
        ) : null}
      </Pressable>

      {/* Yorumlar — alt barın üstünde, input'u örtmez */}
      <View
        style={[
          styles.yorumFloat,
          { bottom: yorumBottom, height: yorumYukseklik },
        ]}
        pointerEvents="box-none"
      >
        <ModulHataSiniri modulAdi="canli-sohbet" varyant="kart">
          <CanliYorumAkisi
            sessionId={meta.id}
            currentUserId={currentUserId}
            hostId={meta.host_id}
            yenileSinyali={yorumYenile}
            baslikGizle
            maxMesaj={80}
            floatMod
            onProfil={yorumProfilAc}
          />
        </ModulHataSiniri>
      </View>

      {/* Alt etkileşim çubuğu — şeffaf */}
      <View
        style={[styles.altBar, { paddingBottom: altPad }]}
      >
        <View
          style={styles.composerRow}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 30 && Math.abs(h - composerH) > 2) setComposerH(h);
          }}
        >
          <CanliYorumComposer
            sessionId={meta.id}
            canSend={canSend}
            onNeedUpgrade={onNeedUpgrade}
            onSent={() => {
              setYorumYenile((n) => n + 1);
            }}
            placeholder={t('canliYayin.yorumEkle')}
          />
          {!klavyeAcik ? (
            <View style={styles.aksiyonlar}>
              {onHediye ? (
                <Pressable
                  onPress={() => onHediye()}
                  style={styles.aksiyonBtn}
                  accessibilityLabel={t('hediye.baslik')}
                >
                  <Text style={styles.aksiyonEmoji}>🎁</Text>
                </Pressable>
              ) : null}
              {rol === 'host' &&
              OzellikBayragiAktifMi('pk_enabled') &&
              onPk ? (
                <Pressable onPress={onPk} style={styles.aksiyonBtn}>
                  <Ionicons name="flash" size={20} color="#F0B429" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      <CanliIzleyiciPaneli
        sessionId={meta.id}
        visible={izleyiciAcik}
        onClose={() => setIzleyiciAcik(false)}
        currentUserId={currentUserId}
        onProfil={profilAc}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  stage: { ...StyleSheet.absoluteFill },
  baglantiBanner: {
    position: 'absolute',
    alignSelf: 'center',
    left: 24,
    right: 24,
    zIndex: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  baglantiBannerYazi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '700',
  },
  gradUst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 2,
  },
  gradAlt: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 2,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    gap: 8,
  },
  hostSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    maxWidth: '72%',
  },
  hostKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    paddingRight: 10,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.28)',
    maxWidth: '100%',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(232,64,145,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHarf: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  hostMetin: { flexShrink: 1, minWidth: 0, gap: 1 },
  hostAd: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  hostAlt: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
  },
  takipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  takipYazi: {
    ...TipografiTokenlari.micro,
    color: '#1A1220',
    fontWeight: '800',
  },
  takipEdildi: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  takipEdildiYazi: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
  sagUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  izleyiciChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  izleyiciSayi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '800',
  },
  kapatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kameraCevirBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  kameraCevirBusy: {
    opacity: 0.55,
  },
  chipSatir: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  chipYazi: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    fontSize: 11,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(232,64,145,0.35)',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.live,
  },
  liveText: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
  },
  pkWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
  },
  yorumFloat: {
    position: 'absolute',
    left: 8,
    width: '78%',
    maxWidth: 340,
    height: 220,
    zIndex: 7,
  },
  altBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    paddingTop: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  aksiyonlar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  aksiyonBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  aksiyonEmoji: { fontSize: 20 },
  coinChipUst: {
    paddingHorizontal: 9,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(240,180,41,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(240,180,41,0.4)',
  },
  coinText: {
    ...TipografiTokenlari.micro,
    color: '#FFE08A',
    fontWeight: '800',
    fontSize: 12,
  },
  surePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sureText: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
