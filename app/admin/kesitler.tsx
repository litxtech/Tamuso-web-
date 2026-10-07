import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { supabase } from '../../src/lib/supabase';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';

type Satir = {
  id: string;
  owner_id?: string;
  username: string | null;
  display_name: string | null;
  source_type: string | null;
  source_live_id: string | null;
  source_pk_id: string | null;
  created_at: string;
  expires_at: string | null;
  byte_size: number | null;
  duration_ms: number | null;
  status: string;
  report_count: number;
};

type Ozet = {
  gunluk: number;
  haftalik: number;
  toplam_sure_ms: number;
  toplam_bayt: number;
  ortalama_bayt: number;
  basarisiz_oran: number;
};

const FILTRELER = [
  ['tumu', 'Tümü'],
  ['live', 'Canlı yayın'],
  ['pk', 'PK'],
  ['aktif', 'Aktif'],
  ['suresi_dolmus', 'Süresi dolmuş'],
  ['raporlanan', 'Raporlanan'],
] as const;

function mb(bayt: number | null | undefined): string {
  if (!bayt || bayt <= 0) return '—';
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminKesitler() {
  const { profile } = useAuth();
  const [filtre, setFiltre] = useState<(typeof FILTRELER)[number][0]>('tumu');
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const [liste, ozetSonuc] = await Promise.all([
      supabase.rpc('admin_canli_kesit_liste', { p_filtre: filtre, p_limit: 50 }),
      supabase.rpc('admin_canli_kesit_ozet'),
    ]);
    setYukleniyor(false);
    if (liste.error) {
      Alert.alert('Kesitler', liste.error.message);
      return;
    }
    const govde = (liste.data ?? {}) as { rows?: Satir[] };
    setSatirlar(Array.isArray(govde.rows) ? govde.rows : []);
    if (!ozetSonuc.error && ozetSonuc.data) setOzet(ozetSonuc.data as Ozet);
  }, [filtre]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  async function moderasyon(id: string, islem: 'gizle' | 'sil' | 'geri') {
    const { error } = await supabase.rpc('admin_canli_kesit_moderasyon', {
      p_item_id: id,
      p_islem: islem,
    });
    if (error) {
      Alert.alert('Kesitler', error.message);
      return;
    }
    void yukle();
  }

  if (!AdminYetkisiVarMi(profile)) {
    return (
      <Screen>
        <EkranBasligi title="Story kesitleri" fallbackHref="/admin" />
        <Text style={{ color: RenkTokenlari.textDim, padding: 16 }}>
          Bu ekran için admin yetkisi gerekir.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <EkranBasligi title="Story kesitleri" subtitle="Canlı ve PK kesitleri" fallbackHref="/admin" />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={() => void yukle()} />}
      >
        {ozet ? (
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#fff' }}>Günlük kesit: {ozet.gunluk}</Text>
            <Text style={{ color: '#fff' }}>Haftalık kesit: {ozet.haftalik}</Text>
            <Text style={{ color: '#fff' }}>
              Toplam video süresi: {Math.round((ozet.toplam_sure_ms || 0) / 1000)} sn
            </Text>
            <Text style={{ color: '#fff' }}>Toplam depolama: {mb(ozet.toplam_bayt)}</Text>
            <Text style={{ color: '#fff' }}>Ortalama dosya: {mb(ozet.ortalama_bayt)}</Text>
            <Text style={{ color: '#fff' }}>Başarısız işlem: %{ozet.basarisiz_oran}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FILTRELER.map(([id, ad]) => (
            <Pressable
              key={id}
              onPress={() => setFiltre(id)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: filtre === id ? RenkTokenlari.accent : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{ad}</Text>
            </Pressable>
          ))}
        </View>

        {yukleniyor && satirlar.length === 0 ? <ActivityIndicator color="#fff" /> : null}

        {satirlar.map((s) => (
          <View
            key={s.id}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.05)',
              gap: 4,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              {s.display_name || s.username || s.owner_id} · {s.source_type}
            </Text>
            <Text style={{ color: RenkTokenlari.textDim }}>
              {new Date(s.created_at).toLocaleString('tr-TR')} · {Math.round((s.duration_ms ?? 0) / 1000)} sn · {mb(s.byte_size)} · {s.status}
            </Text>
            <Text style={{ color: RenkTokenlari.textDim }}>
              Yayın {s.source_live_id ?? '—'} · PK {s.source_pk_id ?? '—'} · Rapor {s.report_count}
            </Text>
            <Text style={{ color: RenkTokenlari.textDim }}>
              Bitiş {s.expires_at ? new Date(s.expires_at).toLocaleString('tr-TR') : '—'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Pressable onPress={() => void moderasyon(s.id, 'gizle')}>
                <Text style={{ color: '#fff' }}>Gizle</Text>
              </Pressable>
              <Pressable onPress={() => void moderasyon(s.id, 'geri')}>
                <Text style={{ color: '#fff' }}>Geri al</Text>
              </Pressable>
              <Pressable onPress={() => void moderasyon(s.id, 'sil')}>
                <Text style={{ color: '#ff8a8a' }}>Sil</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
