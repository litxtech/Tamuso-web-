import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  SeoGuncelle,
  SeoKonuKaydet,
  SeoListeGetir,
  SeoOzetGetir,
  type SeoOzet,
  type SeoSatir,
} from '../../src/moduller/seo/SeoAdminIslemleri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';

const FILTRELER = [
  ['all', 'Tümü'],
  ['indexable', 'Indexable'],
  ['noindex', 'Noindex'],
  ['pending', 'Bekleyen'],
  ['low', 'Düşük kalite'],
  ['reported', 'Bildirilen'],
  ['removed', 'Kaldırılan'],
  ['high', 'Yüksek kalite'],
] as const;

export default function SeoIcerikEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [ozet, setOzet] = useState<SeoOzet | null>(null);
  const [satirlar, setSatirlar] = useState<SeoSatir[]>([]);
  const [filtre, setFiltre] = useState<string>('all');
  const [secili, setSecili] = useState<SeoSatir | null>(null);
  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [slug, setSlug] = useState('');
  const [kanonik, setKanonik] = useState('');
  const [og, setOg] = useState('');
  const [konuSlug, setKonuSlug] = useState('');
  const [konuBaslik, setKonuBaslik] = useState('');
  const [konuAciklama, setKonuAciklama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesaj, setMesaj] = useState('');

  const yukle = useCallback(async (sonraki = filtre) => {
    setYukleniyor(true);
    setOzet(await SeoOzetGetir());
    setSatirlar(await SeoListeGetir(sonraki));
    setYukleniyor(false);
  }, [filtre]);

  useFocusEffect(useCallback(() => {
    if (admin) void yukle();
  }, [admin, yukle]));

  function sec(satir: SeoSatir) {
    setSecili(satir);
    setBaslik(satir.title ?? '');
    setAciklama(satir.description ?? '');
    setSlug(satir.slug);
    setKanonik(satir.canonical ?? '');
    setOg(satir.og_image ?? '');
    setMesaj('');
  }

  async function uygula(alan: Record<string, unknown>) {
    if (!secili) return;
    const sonuc = await SeoGuncelle(secili.id, alan);
    setMesaj(sonuc.ok ? 'Kaydedildi' : sonuc.hata || 'Kaydedilemedi');
    await yukle();
  }

  if (!admin) {
    return (
      <Screen>
        <EkranBasligi title="SEO İçerik" />
        <Text style={styles.yazi}>Bu ekran yönetici içindir.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <EkranBasligi title="SEO İçerik" />
      <ScrollView contentContainerStyle={styles.govde}>
        {ozet ? (
          <Text style={styles.yazi}>
            {`Indexlenebilir paylaşım ${ozet.indexable_posts} · noindex ${ozet.noindex_posts} · gizli ${ozet.hidden_posts} · profil ${ozet.indexable_profiles} · şehir ${ozet.indexable_cities}`}
          </Text>
        ) : null}
        <View style={styles.satir}>
          {FILTRELER.map(([kod, ad]) => (
            <Pressable key={kod} onPress={() => { setFiltre(kod); void yukle(kod); }} style={styles.filtre}>
              <Text style={styles.yazi}>{ad}</Text>
            </Pressable>
          ))}
        </View>
        {yukleniyor ? <ActivityIndicator color={RenkTokenlari.accent} /> : null}
        {satirlar.map((satir) => (
          <Pressable key={satir.id} onPress={() => sec(satir)} style={styles.kart}>
            <Text style={styles.baslik}>{satir.title || satir.slug}</Text>
            <Text style={styles.yazi}>{`Skor ${satir.score}/100 · ${satir.reason} · ${satir.path || ''}`}</Text>
            {(satir.signals || []).slice(0, 8).map((s) => (
              <Text key={s.ad} style={styles.yazi}>{`${s.tamam ? '✓' : '⚠'} ${s.ad}`}</Text>
            ))}
          </Pressable>
        ))}
        {secili ? (
          <View style={styles.kart}>
            <Text style={styles.baslik}>Düzenle</Text>
            <TextInput value={baslik} onChangeText={setBaslik} placeholder="SEO başlık" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} />
            <TextInput value={aciklama} onChangeText={setAciklama} placeholder="Açıklama" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} />
            <TextInput value={slug} onChangeText={setSlug} placeholder="Slug" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} autoCapitalize="none" />
            <TextInput value={kanonik} onChangeText={setKanonik} placeholder="Canonical yol" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} autoCapitalize="none" />
            <TextInput value={og} onChangeText={setOg} placeholder="OG görsel https" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} autoCapitalize="none" />
            <View style={styles.satir}>
              <Pressable onPress={() => uygula({ manual_index: 'index' })} style={styles.filtre}><Text style={styles.yazi}>Index</Text></Pressable>
              <Pressable onPress={() => uygula({ manual_index: 'noindex' })} style={styles.filtre}><Text style={styles.yazi}>Noindex</Text></Pressable>
              <Pressable onPress={() => uygula({ manual_index: 'hide' })} style={styles.filtre}><Text style={styles.yazi}>Gizle</Text></Pressable>
              <Pressable onPress={() => uygula({ manual_index: 'restore' })} style={styles.filtre}><Text style={styles.yazi}>Geri al</Text></Pressable>
            </View>
            <Pressable
              onPress={() => uygula({
                manual_title: baslik,
                manual_description: aciklama,
                manual_slug: slug,
                canonical_path: kanonik,
                og_image: og,
                sitemap_blocked: secili.sitemap_blocked,
              })}
              style={styles.filtre}
            >
              <Text style={styles.yazi}>Metinleri kaydet</Text>
            </Pressable>
            <Pressable onPress={() => uygula({ sitemap_blocked: !secili.sitemap_blocked })} style={styles.filtre}>
              <Text style={styles.yazi}>{secili.sitemap_blocked ? 'Site haritasına al' : 'Site haritasından çıkar'}</Text>
            </Pressable>
            {mesaj ? <Text style={styles.yazi}>{mesaj}</Text> : null}
          </View>
        ) : null}
        <View style={styles.kart}>
          <Text style={styles.baslik}>Konu</Text>
          <TextInput value={konuSlug} onChangeText={setKonuSlug} placeholder="sehir-hayati" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} autoCapitalize="none" />
          <TextInput value={konuBaslik} onChangeText={setKonuBaslik} placeholder="Başlık" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} />
          <TextInput value={konuAciklama} onChangeText={setKonuAciklama} placeholder="En az 20 karakter açıklama" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} />
          <Pressable
            onPress={async () => {
              const sonuc = await SeoKonuKaydet(konuSlug, konuBaslik, konuAciklama, true);
              setMesaj(sonuc.ok ? 'Konu kaydedildi' : sonuc.hata || 'Konu kaydedilemedi');
            }}
            style={styles.filtre}
          >
            <Text style={styles.yazi}>Konuyu kaydet</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  govde: { padding: 16, gap: 12 },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kart: { borderWidth: 1, borderColor: RenkTokenlari.border, borderRadius: 12, padding: 12, gap: 6 },
  filtre: { borderWidth: 1, borderColor: RenkTokenlari.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  baslik: { color: RenkTokenlari.text, fontSize: 16 },
  yazi: { color: RenkTokenlari.textMuted, fontSize: 13 },
  girdi: { color: RenkTokenlari.text, borderWidth: 1, borderColor: RenkTokenlari.border, borderRadius: 8, padding: 8 },
});
