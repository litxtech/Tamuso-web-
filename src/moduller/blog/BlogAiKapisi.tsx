import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';

type Props = {
  baslik: string;
  calisiyor: boolean;
  kapat: () => void;
  gonder: (istek: string) => void;
};

export function BlogAiKapisi({ baslik, calisiyor, kapat, gonder }: Props) {
  const [istek, setIstek] = useState('');
  return (
    <View style={styles.kutu}>
      <View style={styles.ust}>
        <Text style={styles.baslik}>DeepSeek · {baslik}</Text>
        <View style={styles.ustAksiyon}>
          {istek.trim() ? (
            <Pressable onPress={() => setIstek('')} hitSlop={8} accessibilityLabel="Komutu temizle">
              <Text style={styles.kapat}>Temizle</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={kapat} hitSlop={8} accessibilityLabel="Kapat">
            <Text style={styles.kapat}>Kapat</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.not}>Komut yazının konusu olsun. Asistan o konuyu açar; başlık, metin, SEO ve etiketleri ona göre doldurur.</Text>
      <TextInput
        value={istek}
        onChangeText={setIstek}
        placeholder="Örn. Canlı yayında hediye nasıl çalışır, yeni kullanıcıya anlat"
        placeholderTextColor={R.textMuted}
        style={styles.girdi}
        multiline
        autoFocus
        editable={!calisiyor}
      />
      <Pressable
        style={[styles.dugme, calisiyor && styles.soluk]}
        disabled={calisiyor}
        onPress={() => gonder(istek.trim())}
        accessibilityLabel="DeepSeek doldursun"
      >
        {calisiyor ? <ActivityIndicator color="#fff" /> : <Text style={styles.dugmeYazi}>Doldur</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: {
    borderTopWidth: 1,
    borderTopColor: R.border,
    backgroundColor: '#161222',
    padding: 12,
    gap: 8,
  },
  ust: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ustAksiyon: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  baslik: { color: R.text, fontWeight: '700' },
  kapat: { color: R.textMuted },
  not: { color: R.textMuted, fontSize: 12 },
  girdi: {
    borderWidth: 1,
    borderColor: R.border,
    borderRadius: 10,
    color: R.text,
    padding: 10,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  dugme: { backgroundColor: R.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  dugmeYazi: { color: '#fff', fontWeight: '700' },
  soluk: { opacity: 0.7 },
});
