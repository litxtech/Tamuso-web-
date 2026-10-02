import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FruitWheelKurallar } from '../../src/moduller/oyunlar/fruit-wheel/ekranlar/FruitWheelKurallar';

export default function FruitWheelKurallarSayfa() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>←</Text>
      </Pressable>
      <FruitWheelKurallar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07060F' },
  back: { paddingHorizontal: 16, paddingVertical: 8 },
  backText: { color: '#E6CE92', fontSize: 20 },
});
