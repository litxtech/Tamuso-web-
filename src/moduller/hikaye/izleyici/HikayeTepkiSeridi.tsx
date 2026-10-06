import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  HIKAYE_TEPKI_ANAHTARLARI,
  HIKAYE_TEPKI_GORUNUM,
  type HikayeTepkiAnahtari,
} from '../sabitler';

type Props = {
  /** Sunucu anahtarı: heart | fire | laugh | clap | heart_eyes */
  onSec: (anahtar: HikayeTepkiAnahtari) => void;
  secili?: string | null;
};

export function HikayeTepkiSeridi({ onSec, secili }: Props) {
  return (
    <View style={styles.wrap}>
      {HIKAYE_TEPKI_ANAHTARLARI.map((anahtar) => (
        <Pressable
          key={anahtar}
          onPress={() => onSec(anahtar)}
          style={[styles.btn, secili === anahtar && styles.secili]}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={HIKAYE_TEPKI_GORUNUM[anahtar]}
        >
          <Text style={styles.emoji}>{HIKAYE_TEPKI_GORUNUM[anahtar]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secili: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  emoji: { fontSize: 24 },
});
