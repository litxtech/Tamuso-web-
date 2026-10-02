import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { AdminDuyuruAnalitik } from '../../../../src/moduller/duyurular/islemler/DuyuruAdminIslemleri';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';

const SATIR = [
  ['target_users', 'Hedef kullanıcı'],
  ['impressions', 'Gösterim — kart viewport’a girdi'],
  ['unique_viewers', 'Tekil görüntüleyen'],
  ['opens', 'Duyuruyu açan'],
  ['reads', 'Okuyan'],
  ['cta_clicks', 'CTA tıklaması'],
  ['video_starts', 'Video başlatan'],
  ['video_completes', 'Video tamamlayan'],
  ['audio_listens', 'Ses dinleyen'],
] as const;

export default function AdminDuyuruAnalitikEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [veri, setVeri] = useState<Record<string, unknown> | null>(null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    if (!id) return;
    void AdminDuyuruAnalitik(id)
      .then(setVeri)
      .catch((e: Error) => setHata(e.message));
  }, [id]);

  const daily = (veri?.daily as Array<Record<string, number | string>>) ?? [];

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Duyuru analitiği" />
      <ScrollView contentContainerStyle={AdminStil.content}>
        {hata ? <Text>{hata}</Text> : null}
        {SATIR.map(([k, ad]) => (
          <View key={k} style={AdminStil.kpi}>
            <Text style={AdminStil.kpiN}>{String(veri?.[k] ?? '—')}</Text>
            <Text style={AdminStil.kpiL}>{ad}</Text>
          </View>
        ))}
        <Text style={TipografiTokenlari.h2}>Günlük trend</Text>
        {daily.map((d) => (
          <Text key={String(d.day)} style={{ color: RenkTokenlari.text }}>
            {String(d.day)} · gösterim {String(d.impressions ?? 0)} · açan {String(d.opens ?? 0)} · okuyan {String(d.reads ?? 0)}
          </Text>
        ))}
      </ScrollView>
    </Screen>
  );
}
