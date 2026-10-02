import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCeviri } from '../../../../i18n/useCeviri';
import { fruitWheelOlay } from '../analitik/FruitWheelAnalitik';
import { fruitWheelHistory } from '../servisler/FruitWheelApi';

type Item = {
  id: string;
  roundNo: number;
  winningFruitId: string;
  multiplier: number;
  settledAt: string;
  stakeTotal: number;
  payoutTotal: number;
  selections: { fruitId: string; amount: number; matched: boolean; payout: number }[];
};

export function FruitWheelGecmis() {
  const { t } = useCeviri();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fruitWheelOlay('history_open');
    void fruitWheelHistory().then((raw) => {
      const data = raw as { ok?: boolean; items?: Item[] };
      if (data?.ok && Array.isArray(data.items)) setItems(data.items);
    });
  }, []);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('oyun.fwEmptyHistory')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.title}>#{item.roundNo} · {item.winningFruitId}</Text>
          <Text style={styles.meta}>x{item.multiplier}</Text>
          <Text style={styles.meta}>
            {t('oyun.fwStake')} {item.stakeTotal} · {t('oyun.fwPayout')} {item.payoutTotal}
          </Text>
          {item.selections.map((s) => (
            <Text key={s.fruitId} style={styles.line}>
              {s.fruitId} {s.amount} · {s.matched ? t('oyun.fwMatched') : t('oyun.fwUnmatched')} · {s.payout}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07060F' },
  list: { padding: 16, gap: 10 },
  empty: { flex: 1, backgroundColor: '#07060F', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#E8DCC4', textAlign: 'center' },
  card: { backgroundColor: '#141022', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2C2640' },
  title: { color: '#F7F1E4', fontWeight: '800', fontSize: 16 },
  meta: { color: '#E6CE92', marginTop: 4 },
  line: { color: '#D9CCB0', marginTop: 4, fontSize: 13 },
});
