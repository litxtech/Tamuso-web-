import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

type Props = {
  uri: string;
  muted?: boolean;
  trimStartSn?: number;
  trimEndSn?: number | null;
  contentFit?: 'contain' | 'cover';
  /** Gerçek video süresi (ms) — galeri bazen yanlış verir */
  onDurationMs?: (ms: number) => void;
};

function basaSar(
  player: { currentTime: number; play: () => void },
  basSn: number,
) {
  try {
    player.currentTime = Math.max(0, basSn);
    player.play();
  } catch {
    /* */
  }
}

/**
 * Story editör video önizleme — cover kırpma + trim aralığında döngü + müzikte sessiz.
 */
export function HikayeEditorVideo({
  uri,
  muted = false,
  trimStartSn = 0,
  trimEndSn = null,
  contentFit = 'cover',
  onDurationMs,
}: Props) {
  const trimBas = Math.max(0, trimStartSn);
  const trimBitRef = useRef(trimEndSn);
  trimBitRef.current = trimEndSn;
  const trimBasRef = useRef(trimBas);
  trimBasRef.current = trimBas;
  const sureBildirildi = useRef(false);
  const onDurRef = useRef(onDurationMs);
  onDurRef.current = onDurationMs;

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = muted;
    try {
      p.volume = muted ? 0 : 1;
    } catch {
      /* */
    }
    p.currentTime = trimBas;
    p.play();
  });

  useEffect(() => {
    sureBildirildi.current = false;
  }, [uri]);

  useEffect(() => {
    try {
      player.muted = muted;
      player.volume = muted ? 0 : 1;
    } catch {
      /* */
    }
  }, [muted, player]);

  useEffect(() => {
    basaSar(player, trimBas);
  }, [player, trimBas, uri]);

  useEffect(() => {
    const subEnd = player.addListener('playToEnd', () => {
      basaSar(player, trimBasRef.current);
    });

    const subStatus = player.addListener('statusChange', ({ status }) => {
      if (status !== 'readyToPlay' || sureBildirildi.current) return;
      try {
        const durSn = Number(player.duration ?? 0);
        if (durSn > 0.2) {
          sureBildirildi.current = true;
          onDurRef.current?.(Math.round(durSn * 1000));
        }
      } catch {
        /* */
      }
    });

    const id = setInterval(() => {
      // Süre geç gelirse bir kez bildir
      if (!sureBildirildi.current) {
        try {
          const durSn = Number(player.duration ?? 0);
          if (durSn > 0.2) {
            sureBildirildi.current = true;
            onDurRef.current?.(Math.round(durSn * 1000));
          }
        } catch {
          /* */
        }
      }

      const bit = trimBitRef.current;
      const bas = trimBasRef.current;
      if (bit == null || bit <= bas) return;
      try {
        const cur = Number(player.currentTime ?? 0);
        if (cur >= bit - 0.08) {
          basaSar(player, bas);
        }
      } catch {
        /* */
      }
    }, 180);

    return () => {
      try {
        subEnd.remove();
      } catch {
        /* */
      }
      try {
        subStatus.remove();
      } catch {
        /* */
      }
      clearInterval(id);
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      nativeControls={false}
    />
  );
}
