import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';

const OGE = [
  ['/admin/blog', 'Tüm yazılar'],
  ['/admin/blog/yeni', 'Yeni yazı'],
  ['/admin/blog/ceviriler', 'Çeviriler'],
  ['/admin/blog/diller', 'Diller'],
  ['/admin/blog/yazarlar', 'Yazarlar'],
  ['/admin/blog/medya', 'Medya'],
  ['/admin/blog/yonlendirmeler', 'Yönlendirmeler'],
  ['/admin/blog/kategoriler', 'Kategoriler'],
  ['/admin/blog/etiketler', 'Etiketler'],
  ['/admin/blog/taslaklar', 'Taslaklar'],
  ['/admin/blog/yayinda', 'Yayında'],
  ['/admin/blog/cop', 'Çöp'],
  ['/admin/blog/seo', 'SEO ayarları'],
] as const;

export function BlogAltMenu() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serit}>
      {OGE.map(([href, ad]) => (
        <Pressable key={href} onPress={() => router.push(href as never)} style={styles.oge}>
          <Text style={styles.yazi}>{ad}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  serit: { gap: 8, paddingVertical: 4 },
  oge: { borderWidth: 1, borderColor: R.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  yazi: { color: R.text, fontSize: 13 },
});
