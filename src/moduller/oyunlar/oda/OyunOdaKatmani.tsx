/**
 * Oda oyun katmani — overlay orchestrator.
 * ASLA MedyaOdasiKes / router leave cagirmaz.
 * Kart oda layout'una girmez; koltuk ve dock yerinde kalır, üstünden açılır.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerKozmikKaskad } from '../kaskad/KaskadKayit';
import { KozmikKaskadEkrani } from '../kaskad/ekranlar/KozmikKaskadEkrani';
import { registerZeus } from '../zeus/ZeusKayit';
import { ZeusEkrani } from '../zeus/ekranlar/ZeusEkrani';
import { warmZeusAssetsEarly } from '../zeus/assets/preloadZeusAssets';
import { registerNoxReels } from '../slot/SlotKayit';
import { SlotOyunEkrani } from '../slot/ekranlar/SlotOyunEkrani';
import { warmNoxAssetsEarly } from '../slot/assets/preloadNoxAssets';
import { warmKaskadAssetsEarly } from '../kaskad/assets/preloadKaskadAssets';
import { router } from 'expo-router';
import { registerFairSpin } from '../fair-spin/FairSpinKayit';
import { registerFruitWheel } from '../fruit-wheel/FruitWheelKayit';
import { FairSpinEkrani } from '../fair-spin/ekranlar/FairSpinEkrani';
import { registerAstralFalls } from '../astral-falls/AstralFallsKayit';
import { AstralFallsEkrani } from '../astral-falls/ekranlar/AstralFallsEkrani';
import { OyunBaslatModal } from '../ortak/bilesenler/OyunBaslatModal';
import { OyunCalismaAlani } from '../../studio/v2/OyunCalismaAlani';
import { dedeManifest } from '../../studio/v2/runtime/dede/onizleme';
import { StudioV2Canli, StudioV2Yayindaki } from '../../studio/v2/StudioV2Api';
import { useGorunurOyunKodlari } from '../ortak/hooks/useGorunurOyunKodlari';
import type { GameCode, GameSession, RoomGameMeta } from '../ortak/tipler/OyunTipleri';
import { OyunOdaAltKart } from './OyunOdaAltKart';
import { SisSpinEkrani } from '../sis-spin/SisSpinEkrani';

export type OyunOdaKatmaniProps = {
  roomMeta: RoomGameMeta;
  isHost: boolean;
  hostDisplayName: string;
  selfUserId?: string;
  startModalVisible: boolean;
  onStartModalClose: () => void;
  /** Oyun oturumu başlayınca (modal kapansa bile dock gizli kalsın) */
  onGameStarted?: () => void;
  inviteSession?: GameSession | null;
  onInviteDismiss?: () => void;
  onOverlayClosed?: () => void;
  /** Disaridan verilirse yeniden fetch edilmez (oda zaten yuklemis olabilir). */
  visibleGameCodes?: readonly GameCode[];
  /** Balondan gelince dogrudan bu oyunu ac. */
  initialGameCode?: GameCode | null;
  /** Eski API — oda layout'unu değiştirmez; kart butonların ÜSTÜNDEN açılır. */
  bottomGap?: number;
};

type Phase = 'idle' | 'kaskad' | 'zeus' | 'nox' | 'fair_spin' | 'fruit_wheel' | 'astral_falls' | 'studio' | 'dede' | 'sis_spin';
type MeyveEkrani = React.ComponentType<{
  onClose: () => void;
  onHistory: () => void;
  onRules: () => void;
}>;
type StudioKart = { id: string; title: string; coverUrl: string | null };

export function OyunOdaKatmani({
  roomMeta,
  startModalVisible,
  onStartModalClose,
  onGameStarted,
  inviteSession,
  onInviteDismiss,
  onOverlayClosed,
  visibleGameCodes: visibleGameCodesProp,
  initialGameCode,
}: OyunOdaKatmaniProps) {
  useEffect(() => {
    registerKozmikKaskad();
    registerZeus();
    registerNoxReels();
    registerFairSpin();
    registerFruitWheel();
    registerAstralFalls();
  }, []);

  const [phase, setPhase] = useState<Phase>('idle');
  const [MeyveEkrani, setMeyveEkrani] = useState<MeyveEkrani | null>(null);
  const meyveYukle = useCallback(() => {
    void import('../fruit-wheel/ekranlar/FruitWheelEkrani').then((mod) => {
      setMeyveEkrani(() => mod.FruitWheelEkrani);
    });
  }, []);
  const [studioOyunlar, setStudioOyunlar] = useState<StudioKart[]>([]);
  const [studioSahne, setStudioSahne] = useState<{ manifest: unknown; urls: Record<string, string>; hosts: string[] } | null>(null);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!initialGameCode || phase !== 'idle') return;
    if (initialGameCode === 'kozmik_kaskad') {
      setPhase('kaskad');
    } else if (initialGameCode === 'zeus') {
      setPhase('zeus');
    } else if (initialGameCode === 'nox_reels') {
      setPhase('nox');
    } else if (initialGameCode === 'fair_spin') {
      setPhase('fair_spin');
    } else if (initialGameCode === 'fruit_wheel') {
      meyveYukle();
      setPhase('fruit_wheel');
    } else if (initialGameCode === 'astral_falls') {
      setPhase('astral_falls');
    }
  }, [initialGameCode, meyveYukle, phase]);

  useEffect(() => {
    if (phase === 'idle') return;
    onGameStarted?.();
  }, [phase, onGameStarted]);
  const gorunurHook = useGorunurOyunKodlari({
    enabled: visibleGameCodesProp == null,
  });
  const visibleGameCodes = visibleGameCodesProp ?? gorunurHook.codes;
  const visibilityReady = visibleGameCodesProp != null || !gorunurHook.loading;

  useEffect(() => {
    if (startModalVisible && visibleGameCodes.includes('fruit_wheel')) {
      const id = setTimeout(() => meyveYukle(), 0);
      return () => clearTimeout(id);
    }
  }, [meyveYukle, startModalVisible, visibleGameCodes]);
  const yenileGorunur = gorunurHook.yenile;

  useEffect(() => {
    if (startModalVisible && visibleGameCodesProp == null) {
      const id = setTimeout(() => void yenileGorunur(), 0);
      return () => clearTimeout(id);
    }
  }, [startModalVisible, visibleGameCodesProp, yenileGorunur]);

  useEffect(() => {
    if (!startModalVisible) return;
    const id = setTimeout(() => {
      void StudioV2Yayindaki().then((sonuc) => {
        if (sonuc.ok && sonuc.games) setStudioOyunlar(sonuc.games);
      });
    }, 120);
    return () => clearTimeout(id);
  }, [startModalVisible]);

  const canliOyunAc = useCallback((id: string) => {
    void StudioV2Canli(id).then((sonuc) => {
      if (!sonuc.ok || !sonuc.manifest) return;
      setStudioSahne({
        manifest: sonuc.manifest,
        urls: sonuc.urls ?? {},
        hosts: sonuc.allowedHosts ?? [],
      });
      onGameStarted?.();
      onStartModalClose();
      setPhase('studio');
    });
  }, [onGameStarted, onStartModalClose]);

  // Erken heat (3 oyunun tüm sembol/SFX ısıtması) ses odasında CPU/GPU şişiriyordu.
  // Tam preload her oyunun kendi ekranında başlarken yapılır.

  // Eski Match-3 davetleri (veya kapali oyunlar) sessizce kapatilir.
  useEffect(() => {
    if (!inviteSession) return;
    if (!visibilityReady) return;
    onInviteDismiss?.();
  }, [inviteSession, visibilityReady, onInviteDismiss]);

  const closeOverlay = useCallback(() => {
    // Ekran unmount öncesi / async race — müzik arka planda kalmasın
    void import('../kaskad/ses/GameAudioManager').then((m) => {
      m.stopAllKaskadAudio();
    });
    void import('../slot/ses/SlotSesYoneticisi').then((m) => {
      m.stopAllSlotAudio();
    });
    setPhase('idle');
    setStudioSahne(null);
    onOverlayClosed?.();
    // Oyun SFX LiveKit AVAudioSession'i bozmus olabilir — ses odasini toparla
    void import('../../livekit/MedyaBaglantisi').then((m) => {
      m.MedyaSesOturumunuYenile(true);
    });
  }, [onOverlayClosed]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase !== 'idle') {
        closeOverlay();
        return true;
      }
      if (startModalVisible) {
        onStartModalClose();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [closeOverlay, onStartModalClose, phase, startModalVisible]);

  const aktif = startModalVisible || phase !== 'idle';
  const oyunModu = phase !== 'idle';
  const meyveAcik = phase === 'fruit_wheel';
  const topGap = useMemo(() => {
    if (meyveAcik) return Math.max(insets.top, 8);
    const oran = oyunModu ? 0.18 : 0.1;
    const minGap = (oyunModu ? 88 : 56) + Math.max(insets.top * 0.1, 0);
    return Math.max(minGap, Math.round(height * oran));
  }, [height, insets.top, meyveAcik, oyunModu]);
  // Dock / alt bar yerinde kalır; kart onun ÜSTÜNDEN açılır.
  const dibine = phase === 'sis_spin' || meyveAcik;
  const bottomGap = dibine ? Math.max(insets.bottom, 0) : Math.max(insets.bottom, 8) + 58;

  if (!aktif) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <OyunOdaAltKart
        topGap={topGap}
        bottomGap={bottomGap}
        dibine={dibine}
        oyunModu={oyunModu}
        onGapPress={
          phase === 'idle' ? onStartModalClose : closeOverlay
        }
      >
        <OyunBaslatModal
          visible={startModalVisible && phase === 'idle'}
          onClose={onStartModalClose}
          onBaslatKaskad={
            visibleGameCodes.includes('kozmik_kaskad')
              ? () => {
                  warmKaskadAssetsEarly();
                  onGameStarted?.();
                  onStartModalClose();
                  setPhase('kaskad');
                }
              : undefined
          }
          onBaslatZeus={
            visibleGameCodes.includes('zeus')
              ? () => {
                  warmZeusAssetsEarly();
                  onGameStarted?.();
                  onStartModalClose();
                  setPhase('zeus');
                }
              : undefined
          }
          onBaslatNox={
            visibleGameCodes.includes('nox_reels')
              ? () => {
                  warmNoxAssetsEarly();
                  onGameStarted?.();
                  onStartModalClose();
                  setPhase('nox');
                }
              : undefined
          }
          onBaslatFairSpin={
            visibleGameCodes.includes('fair_spin')
              ? () => {
                  onGameStarted?.();
                  onStartModalClose();
                  setPhase('fair_spin');
                }
              : undefined
          }
          onBaslatFruitWheel={
            visibleGameCodes.includes('fruit_wheel')
              ? () => {
                  meyveYukle();
                  onGameStarted?.();
                  onStartModalClose();
                  setPhase('fruit_wheel');
                }
              : undefined
          }
          onBaslatAstralFalls={
            visibleGameCodes.includes('astral_falls')
              ? () => {
                  onGameStarted?.();
                  onStartModalClose();
                  setPhase('astral_falls');
                }
              : undefined
          }
          visibleGameCodes={visibleGameCodes}
          studioOyunlar={studioOyunlar}
          onBaslatSisSpin={() => {
            onGameStarted?.();
            onStartModalClose();
            setPhase('sis_spin');
          }}
          onBaslatDede={() => {
            onGameStarted?.();
            onStartModalClose();
            setPhase('dede');
          }}
          onBaslatStudio={canliOyunAc}
        />

        {phase === 'kaskad' ? (
          <KozmikKaskadEkrani
            roomId={roomMeta.roomId}
            voiceActive={roomMeta.micEnabled || true}
            onClose={closeOverlay}
            embedded
          />
        ) : null}

        {phase === 'zeus' ? (
          <ZeusEkrani
            roomId={roomMeta.roomId}
            voiceActive={roomMeta.micEnabled || true}
            onClose={closeOverlay}
            embedded
          />
        ) : null}

        {phase === 'nox' ? (
          <SlotOyunEkrani
            roomId={roomMeta.roomId}
            voiceActive={roomMeta.micEnabled || true}
            onClose={closeOverlay}
            embedded
          />
        ) : null}

        {phase === 'fruit_wheel' && MeyveEkrani ? (
          <MeyveEkrani
            onClose={closeOverlay}
            onHistory={() => router.push('/oyun/fruit-wheel-gecmis' as never)}
            onRules={() => router.push('/oyun/fruit-wheel-kurallar' as never)}
          />
        ) : null}

        {phase === 'fair_spin' ? (
          <FairSpinEkrani
            roomId={roomMeta.roomId}
            onClose={closeOverlay}
            embedded
          />
        ) : null}

        {phase === 'astral_falls' ? (
          <AstralFallsEkrani
            roomId={roomMeta.roomId}
            onClose={closeOverlay}
            embedded
          />
        ) : null}

        {phase === 'sis_spin' ? (
          <View style={styles.stadyo}>
            <SisSpinEkrani onClose={closeOverlay} embedded />
          </View>
        ) : null}

        {phase === 'dede' ? (
          <View style={styles.stadyo}>
            <OyunCalismaAlani
              manifest={dedeManifest()}
              urls={{}}
              allowedHosts={[]}
              paused={false}
              restartKey={0}
              guvenliUst={insets.top}
              guvenliAlt={bottomGap}
            />
          </View>
        ) : null}

        {phase === 'studio' && studioSahne ? (
          <View style={styles.stadyo}>
            <OyunCalismaAlani
              manifest={studioSahne.manifest}
              urls={studioSahne.urls}
              allowedHosts={studioSahne.hosts}
              paused={false}
              restartKey={0}
            />
          </View>
        ) : null}
      </OyunOdaAltKart>
    </View>
  );
}

const styles = StyleSheet.create({
  stadyo: { flex: 1, backgroundColor: '#070810' },
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 400,
    elevation: 400,
  },
});
