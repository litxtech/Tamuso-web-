import React from 'react';
import { StyleSheet, View } from 'react-native';

/** Sessiz, dönen, gerçek çekim. Otomatik oynatma için sessiz olmalı. */
export function TanitimVideo({
  kaynak,
  poster,
}: {
  kaynak: string;
  poster: string;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {React.createElement('video', {
        src: kaynak,
        poster,
        autoPlay: true,
        muted: true,
        loop: true,
        playsInline: true,
        preload: 'auto',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          backgroundColor: '#080811',
        },
      })}
    </View>
  );
}
