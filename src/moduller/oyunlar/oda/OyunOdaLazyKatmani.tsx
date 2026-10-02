/**
 * Ses odası oyun katmanı — aktif olunca mount.
 * React.lazy / Metro async chunk burada "unknown module" veriyordu;
 * statik import + aktif kapısı ile güvenilir yükleme.
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

export function OyunOdaLazyKatmani({
  aktif,
  ...props
}: OyunOdaLazyKatmaniProps) {
  const [Katman, setKatman] = useState<React.ComponentType<Omit<OyunOdaLazyKatmaniProps, 'aktif'>> | null>(null);

  useEffect(() => {
    if (!aktif || Katman) return;
    let iptal = false;
    void import('./OyunOdaKatmani').then((mod) => {
      if (!iptal) setKatman(() => mod.OyunOdaKatmani);
    });
    return () => {
      iptal = true;
    };
  }, [aktif, Katman]);

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
