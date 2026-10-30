import React, { memo } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GEM_BASE_LABEL, GEM_ORDER, StormGems } from '../constants/symbols';
import { STORM_THEME } from '../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  tumble: string;
  orb: string;
  maxWin: string;
  nonCash: string;
  tier8: string;
  tier10: string;
  tier12: string;
};

export const PayTableSheet = memo(function PayTableSheet({
  visible,
  onClose,
  title,
  closeLabel,
  tumble,
  orb,
  maxWin,
  nonCash,
  tier8,
  tier10,
  tier12,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView>
            {GEM_ORDER.map((id) => (
              <View key={id} style={styles.row}>
                <Image source={StormGems[id]} style={styles.gem} resizeMode="contain" />
                <Text style={styles.name}>{id}</Text>
                <Text style={styles.pay}>{GEM_BASE_LABEL[id]}</Text>
              </View>
            ))}
            <Text style={styles.body}>{tier8}</Text>
            <Text style={styles.body}>{tier10}</Text>
            <Text style={styles.body}>{tier12}</Text>
            <Text style={styles.body}>{tumble}</Text>
            <Text style={styles.body}>{orb}</Text>
            <Text style={styles.body}>{maxWin}</Text>
            <Text style={styles.body}>{nonCash}</Text>
          </ScrollView>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button">
            <Text style={styles.closeText}>{closeLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '78%',
    backgroundColor: '#1A0B2E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: STORM_THEME.goldDeep,
  },
  title: { color: STORM_THEME.gold, fontWeight: '800', fontSize: 18, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  gem: { width: 42, height: 42 },
  name: { color: STORM_THEME.text, flex: 1, marginLeft: 8, textTransform: 'capitalize' },
  pay: { color: STORM_THEME.gold, fontWeight: '800' },
  body: { color: STORM_THEME.muted, marginTop: 8, lineHeight: 20 },
  close: { alignSelf: 'center', padding: 12 },
  closeText: { color: STORM_THEME.text, fontWeight: '700' },
});
