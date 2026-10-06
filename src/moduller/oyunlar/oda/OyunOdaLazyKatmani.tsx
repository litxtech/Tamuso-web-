/**
 * Ses odası oyun katmanı — oda açılınca önceden yüklenir, tıklanınca beklemez.
 * React.lazy / Metro async chunk burada "unknown module" veriyordu;
 * dinamik import + modül önbelleği ile güvenilir ve hızlı açılış.
 *
 * Wrapper oda flex akışına asla girmez (position absolute).
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { GameCode, GameSession, RoomGameMeta } from '../ortak/tipler/OyunTipleri';

export type OyunOdaLazyKatmaniProps = {
  aktif: boolean;
  roomMeta: RoomGameMeta;
  isHost: boolean;
  hostDisplayName: string;
  selfUserId?: string;
  startModalVisible: boolean;
  onStartModalClose: () => void;
  /** Oyun seçilip başlayınca — parent dock'u gizli tutsun */
  onGameStarted?: () => void;
  inviteSession?: GameSession | null;
  onInviteDismiss?: () => void;
  onOverlayClosed?: () => void;
  visibleGameCodes?: readonly GameCode[];
  initialGameCode?: GameCode | null;
  bottomGap?: number;
};

type KatmanTipi = React.ComponentType<Omit<OyunOdaLazyKatmaniProps, 'aktif'>>;

let cachedKatman: KatmanTipi | null = null;
let loadPromise: Promise<KatmanTipi> | null = null;

function oyunKatmaniYukle(): Promise<KatmanTipi> {
  if (cachedKatman) return Promise.resolve(cachedKatman);
  if (!loadPromise) {
    loadPromise = import('./OyunOdaKatmani').then((mod) => {
      cachedKatman = mod.OyunOdaKatmani;
      return mod.OyunOdaKatmani;
    });
  }
  return loadPromise;
}

/** Oda mount olur olmaz çağır — ilk tıklamada import beklemesin. */
export function oyunOdaKatmaniOnYukle(): void {
  void oyunKatmaniYukle();
}

export function OyunOdaLazyKatmani({
  aktif,
  ...props
}: OyunOdaLazyKatmaniProps) {
  const [Katman, setKatman] = useState<KatmanTipi | null>(() => cachedKatman);

  // Oda açıkken her zaman ön-yükle (aktif olmayı bekleme)
  useEffect(() => {
    let iptal = false;
    void oyunKatmaniYukle().then((mod) => {
      if (!iptal) setKatman(() => mod);
    });
    return () => {
      iptal = true;
    };
  }, []);

  if (!aktif || !Katman) return null;
  return (
    <View
      pointerEvents="box-none"
      collapsable={false}
      style={styles.overlay}
    >
      <Katman {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 400,
    elevation: 400,
  },
});
