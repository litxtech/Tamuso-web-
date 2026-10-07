import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { blogCeviriTaslagi, blogDilleri, blogKardesler } from './blogApi';

const DURUM: Record<string, string> = {
  draft: 'Taslak',
  review: 'İnceleme',
  published: 'Yayında',
  outdated: 'Güncel değil',
};

export function BlogCeviriSeridi({ yaziId, grupId }: { yaziId?: string; grupId?: string }) {
  const [diller, setDiller] = useState<{ code: string; native_name: string }[]>([]);
  const [kardes, setKardes] = useState<{ id: string; language_code: string; translation_status: string }[]>([]);
  const [hata, setHata] = useState('');

  useEffect(() => {
    void blogDilleri().then((d) => setDiller(d as { code: string; native_name: string }[])).catch(() => undefined);
    if (grupId) void blogKardesler(grupId).then((k) => setKardes(k as { id: string; language_code: string; translation_status: string }[]));
  }, [grupId]);

  if (!yaziId) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: R.text, fontWeight: '700' }}>Çeviriler</Text>
      {hata ? <Text style={{ color: R.danger }}>{hata}</Text> : null}
      {diller.map((dil) => {
        const varOlan = kardes.find((k) => k.language_code === dil.code);
        const etiket = varOlan ? DURUM[varOlan.translation_status] || varOlan.translation_status : 'Yok';
        return (
          <View key={dil.code} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={{ color: R.text, width: 88 }}>{dil.native_name}</Text>
            <Text style={{ color: R.textMuted, width: 90 }}>{etiket}</Text>
            {varOlan ? (
              <Pressable onPress={() => router.push(`/admin/blog/${varOlan.id}` as never)}>
                <Text style={{ color: R.primarySoft }}>Düzenle</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => {
                void blogCeviriTaslagi(yaziId, dil.code).then((id) => router.push(`/admin/blog/${id}` as never)).catch((e) => setHata(e instanceof Error ? e.message : 'Taslak açılmadı'));
              }}>
                <Text style={{ color: R.primarySoft }}>Taslak oluştur</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      <Text style={{ color: R.textMuted, fontSize: 12 }}>Taslak çeviri yayınlanmaz ve dizine girmez. Türkçe metin kopyalanmaz.</Text>
    </View>
  );
}
