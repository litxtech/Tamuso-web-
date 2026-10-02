import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useCeviri } from '../../../../i18n/useCeviri';
import { fruitWheelOlay } from '../analitik/FruitWheelAnalitik';

export function FruitWheelKurallar() {
  const { t } = useCeviri();
  useEffect(() => {
    fruitWheelOlay('rules_open');
  }, []);
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      <Text style={styles.title}>{t('oyun.fwRules')}</Text>
      <Text style={styles.text}>{t('oyun.fwRulesBody')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07060F' },
  body: { padding: 20 },
  title: { color: '#F7F1E4', fontSize: 22, fontWeight: '800', marginBottom: 12 },
  text: { color: '#E8DCC4', fontSize: 16, lineHeight: 24 },
});
