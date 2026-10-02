import React, { useRef } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  uri: string;
  thumbnail?: string | null;
  onStart?: () => void;
  onProgress?: (oran: number) => void;
  onComplete?: () => void;
};

/** Listede kullanılmaz. Detay açılınca kaynak yüklenir. */
export function DuyuruVideo({ uri, thumbnail, onStart, onProgress, onComplete }: Props) {
  const basladi = useRef(false);
  const esikler = useRef(new Set<number>());
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });

  React.useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying && !basladi.current) {
        basladi.current = true;
        onStart?.();
      }
    });
    const zaman = player.addListener('timeUpdate', ({ currentTime }) => {
      const dur = player.duration || 0;
      if (dur <= 0) return;
      const oran = currentTime / dur;
      for (const esik of [0.25, 0.5, 0.75]) {
        if (oran >= esik && !esikler.current.has(esik)) {
          esikler.current.add(esik);
          onProgress?.(esik);
        }
      }
      if (oran >= 0.9) onComplete?.();
    });
    return () => {
      sub.remove();
      zaman.remove();
    };
  }, [onComplete, onProgress, onStart, player]);

  return (
    <View style={styles.kutu}>
      {thumbnail && !basladi.current ? (
        <Image source={{ uri: thumbnail }} style={styles.kapak} />
      ) : null}
      <VideoView
        style={styles.video}
        player={player}
        nativeControls
        contentFit="contain"
      />
    </View>
  );
}

export function DuyuruVideoKapak({
  thumbnail,
  onPress,
}: {
  thumbnail?: string | null;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.kapakKutu}>
      {thumbnail ? (
        <Image source={{ uri: thumbnail }} style={styles.kapak} />
      ) : (
        <View style={[styles.kapak, styles.bos]} />
      )}
      <View style={styles.oynat}>
        <Ionicons name="play" size={18} color="#fff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kutu: { borderRadius: YaricapTokenlari.md, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', aspectRatio: 16 / 9 },
  kapakKutu: { borderRadius: YaricapTokenlari.md, overflow: 'hidden' },
  kapak: { width: '100%', aspectRatio: 16 / 9 },
  bos: { backgroundColor: RenkTokenlari.bgCard },
  oynat: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
