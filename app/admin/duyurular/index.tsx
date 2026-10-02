import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminDuyuruAnalitikOzet,
  AdminDuyuruKaydet,
  AdminDuyuruListe,
} from '../../../src/moduller/duyurular/islemler/DuyuruAdminIslemleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

const SEKMELER = [
  { id: 'all', ad: 'Tümü' },
  { id: 'draft', ad: 'Taslak' },
  { id: 'scheduled', ad: 'Planlanan' },
  { id: 'published', ad: 'Yayında' },
  { id: 'expired', ad: 'Süresi Dolan' },
  { id: 'archived', ad: 'Arşivlenen' },
] as const;

const OZET_ANAHTAR = [
  ['total', 'Toplam duyuru'],
  ['active', 'Aktif'],
  ['scheduled', 'Planlanan'],
  ['impressions_7d', 'Son 7 gün görüntülenme'],
  ['unique_viewers', 'Unique viewers'],
  ['reads', 'Okuyan'],
  ['opens', 'Açan'],
  ['cta_clicks', 'CTA'],
  ['video_completes', 'Video tamamlama'],
  ['audio_listens', 'Ses dinleme'],
] as const;

export default function AdminDuyuruMerkezi() {
  const [sekme, setSekme] = useState('all');
  const [liste, setListe] = useState<Array<Record<string, unknown>>>([]);
  const [ozet, setOzet] = useState<Record<string, number>>({});

  const yukle = useCallback(async () => {
    try {
      setListe(await AdminDuyuruListe(sekme));
      setOzet(await AdminDuyuruAnalitikOzet());
    } catch {
      setListe([]);
    }
  }, [sekme]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Duyuru Merkezi" subtitle="Resmi duyurular" />
      <ScrollView contentContainerStyle={AdminStil.content}>
        <View style={AdminStil.kpiGrid}>
          {OZET_ANAHTAR.map(([k, ad]) => (
            <View key={k} style={AdminStil.kpi}>
              <Text style={AdminStil.kpiN}>{ozet[k] ?? 0}</Text>
              <Text style={AdminStil.kpiL}>{ad}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={AdminStil.aksiyon}
          onPress={() => {
            void AdminDuyuruKaydet(null, {
              action: 'draft',
              severity: 'NORMAL',
              translations: [
                { locale: 'tr', title: '', summary: '', body_doc: { blocks: [] } },
              ],
            }).then((r) => {
              if (r.ok) router.push(`/admin/duyurular/${r.id}` as never);
            });
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Yeni duyuru</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {SEKMELER.map((s) => (
            <Pressable key={s.id} onPress={() => setSekme(s.id)} style={{ padding: 8 }}>
              <Text style={{ color: sekme === s.id ? RenkTokenlari.accent : RenkTokenlari.textMuted }}>
                {s.ad}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {liste.map((a) => (
          <Pressable
            key={String(a.id)}
            style={AdminStil.kart}
            onPress={() => router.push(`/admin/duyurular/${String(a.id)}` as never)}
          >
            <Text style={AdminStil.kartBaslik}>{String(a.title || 'Taslak')}</Text>
            <Text style={TipografiTokenlari.caption}>
              {String(a.status)} · {String(a.severity)} · görüntülenme {String(a.unique_view_count ?? 0)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
