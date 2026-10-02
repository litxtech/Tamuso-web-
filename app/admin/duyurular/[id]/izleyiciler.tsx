import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminDuyuruDisaAktar,
  AdminDuyuruIzleyiciler,
} from '../../../../src/moduller/duyurular/islemler/DuyuruAdminIslemleri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

export default function AdminDuyuruIzleyicilerEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [q, setQ] = useState('');
  const [satirlar, setSatirlar] = useState<Array<Record<string, string | null>>>([]);
  const [hata, setHata] = useState('');

  const ara = async () => {
    if (!id) return;
    try {
      setHata('');
      setSatirlar(await AdminDuyuruIzleyiciler({ id, q }));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Forbidden');
      setSatirlar([]);
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Görüntüleyen kullanıcılar" subtitle="Yalnız announcement.view_users" />
      <ScrollView contentContainerStyle={AdminStil.content}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Kullanıcı adı veya Tamuso ID"
          placeholderTextColor={RenkTokenlari.textMuted}
          style={{ borderWidth: 1, borderColor: RenkTokenlari.border, color: RenkTokenlari.text, padding: 10, borderRadius: 10 }}
        />
        <Pressable style={AdminStil.aksiyon} onPress={() => void ara()}>
          <Text style={{ color: '#fff' }}>Ara</Text>
        </Pressable>
        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {satirlar.map((s) => (
          <Text key={String(s.user_id)} style={{ color: RenkTokenlari.text }}>
            {s.display_name} @{s.username} · {s.country} · {s.platform}
            {'\n'}Görüntülendi: {s.viewed_at ?? '—'} · Okundu: {s.read_at ?? '—'}
          </Text>
        ))}
        <Pressable
          onPress={() => {
            if (!id) return;
            void AdminDuyuruDisaAktar(id).then((r) => {
              if (!r.ok) Alert.alert('Dışa aktarma', r.hata);
              else Alert.alert('CSV hazır', `${r.csv.split('\n').length - 1} satır. Panoya kopyalamak için paylaşım sonraki sürümde.`);
            });
          }}
        >
          <Text style={TipografiTokenlari.caption}>CSV (announcement.export)</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
