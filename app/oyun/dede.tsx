import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OyunCalismaAlani } from '../../src/moduller/studio/v2/OyunCalismaAlani';
import { dedeManifest } from '../../src/moduller/studio/v2/runtime/dede/onizleme';

export default function DedeOyunSayfasi() {
  const insets = useSafeAreaInsets();
  const manifest = useMemo(() => dedeManifest(), []);
  const kapat = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  return (
    <View style={styles.root}>
      <OyunCalismaAlani
        manifest={manifest}
        urls={{}}
        allowedHosts={[]}
        paused={false}
        restartKey={0}
        guvenliUst={insets.top}
        guvenliAlt={insets.bottom}
      />
      <Pressable style={[styles.geri, { top: insets.top + 8 }]} onPress={kapat} accessibilityRole="button">
        <Text style={styles.geriYazi}>Kapat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#120818' },
  geri: {
    position: 'absolute',
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(18,8,28,0.72)',
  },
  geriYazi: { color: '#f6e7bf', fontWeight: '800' },
});
