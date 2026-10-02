import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  fruitWheelAdminAudit,
  fruitWheelAdminDashboard,
  fruitWheelAdminForceNext,
  fruitWheelAdminMath,
  fruitWheelAdminPublish,
  fruitWheelAdminSetEnabled,
} from '../../src/moduller/oyunlar/fruit-wheel/servisler/FruitWheelApi';

type Fruit = {
  id: string;
  multiplier: number;
  weight: number;
  enabled: boolean;
  tier: string;
  accent?: string;
};

export default function AdminFruitWheel() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [math, setMath] = useState<Record<string, unknown> | null>(null);
  const [audit, setAudit] = useState<string>('');
  const [note, setNote] = useState('');

  const yukle = useCallback(async () => {
    const d = (await fruitWheelAdminDashboard()) as { ok?: boolean; fruits?: Fruit[]; gameEnabled?: boolean };
    if (!d?.ok) {
      setNote('Yetki veya bağlantı yok');
      return;
    }
    setDash(d as Record<string, unknown>);
    setFruits(Array.isArray(d.fruits) ? d.fruits : []);
    const m = (await fruitWheelAdminMath()) as Record<string, unknown>;
    if (m?.ok) setMath(m);
    const a = (await fruitWheelAdminAudit()) as { ok?: boolean; items?: { action: string; createdAt: string }[] };
    if (a?.ok && a.items) {
      setAudit(a.items.slice(0, 8).map((i) => `${i.action} · ${i.createdAt}`).join('\n'));
    }
  }, []);

  useFocusEffect(useCallback(() => { if (admin) void yukle(); }, [admin, yukle]));

  if (!admin) {
    return (
      <Screen>
        <EkranBasligi title="Fruit Wheel" />
        <Text style={styles.note}>Bu ekran yalnız admin içindir.</Text>
      </Screen>
    );
  }

  const enabled = Boolean(dash?.gameEnabled);
  const round = dash?.currentRound as { roundNo?: number; status?: string } | null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <EkranBasligi title="Fruit Wheel" />
        <View style={styles.row}>
          <Text style={styles.label}>Oyun açık</Text>
          <Switch
            value={enabled}
            onValueChange={async (v) => {
              await fruitWheelAdminSetEnabled(v);
              void yukle();
            }}
          />
        </View>
        <Text style={styles.meta}>
          Tur {round?.roundNo ?? '—'} · {round?.status ?? 'yok'} · sürüm {String(dash?.configVersion ?? '—')}
        </Text>
        <Text style={styles.meta}>Ekonomi varsayılanı test bakiyesidir. Platform coin ayrı policy kapısı ister.</Text>
        {fruits.map((f, i) => (
          <View key={f.id} style={styles.card}>
            <Text style={styles.label}>{f.id}</Text>
            <Text style={styles.meta}>çarpan</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={String(f.multiplier)}
              onChangeText={(t) => {
                const n = Number(t);
                setFruits((prev) => prev.map((x, idx) => (idx === i ? { ...x, multiplier: n } : x)));
              }}
            />
            <Text style={styles.meta}>sunucu ağırlığı</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={String(f.weight)}
              onChangeText={(t) => {
                const n = Math.floor(Number(t));
                setFruits((prev) => prev.map((x, idx) => (idx === i ? { ...x, weight: Number.isFinite(n) ? n : 0 } : x)));
              }}
            />
            <View style={styles.row}>
              <Text style={styles.meta}>aktif</Text>
              <Switch
                value={f.enabled !== false}
                onValueChange={(v) => setFruits((prev) => prev.map((x, idx) => (idx === i ? { ...x, enabled: v } : x)))}
              />
            </View>
          </View>
        ))}
        <Pressable
          style={styles.btn}
          onPress={async () => {
            const res = (await fruitWheelAdminPublish(fruits)) as { ok?: boolean; message?: string };
            setNote(res?.ok ? 'Sonraki turdan geçerli' : res?.message || 'Kayıt reddedildi');
            void yukle();
          }}
        >
          <Text style={styles.btnText}>Sonraki tura yayınla</Text>
        </Pressable>
        {math ? (
          <Text style={styles.meta}>
            Eşit dağılım beklenen dönüş: {String(math.equalSpreadExpectedReturn ?? '')}
          </Text>
        ) : null}
        <Text style={styles.meta}>{note}</Text>
        <Text style={styles.label}>Denetim</Text>
        <Text style={styles.meta}>{audit || '—'}</Text>
        <Text style={styles.label}>Test sonucu (yalnız test bakiyesi)</Text>
        <View style={styles.rowWrap}>
          {fruits.map((f) => (
            <Pressable
              key={f.id}
              style={styles.chip}
              onPress={async () => {
                const res = (await fruitWheelAdminForceNext(f.id)) as { ok?: boolean; code?: string };
                setNote(res?.ok ? `${f.id} sonraki tura işlendi` : res?.code || 'olmadı');
              }}
            >
              <Text style={styles.chipText}>{f.id}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 10, paddingBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { color: '#F7F1E4', fontWeight: '800', fontSize: 16 },
  meta: { color: '#D9CCB0' },
  note: { color: '#F0C9A0', padding: 16 },
  card: { backgroundColor: '#141022', borderRadius: 12, padding: 12, gap: 4 },
  input: { borderWidth: 1, borderColor: '#3A3158', borderRadius: 8, color: '#F7F1E4', padding: 8 },
  btn: { backgroundColor: '#C6A15A', borderRadius: 12, padding: 12, alignItems: 'center' },
  btnText: { color: '#1A1208', fontWeight: '800' },
  chip: { backgroundColor: '#241C38', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  chipText: { color: '#F3E6C4' },
});
