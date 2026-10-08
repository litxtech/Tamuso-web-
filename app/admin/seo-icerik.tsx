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
  SeoZayiflariCikar,
  type SeoOzet,
  type SeoSatir,
} from '../../src/moduller/seo/SeoAdminIslemleri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';

const GRUPLAR = [
  ['tut', 'Google’da kalsın'],
  ['cikar', 'Çıkarılacaklar'],
  ['incele', 'İncele'],
  ['gizli', 'Yayında değil'],
] as const;

const SABIT = [
  ['Ana sayfa, tanıtım, oyunlar', 'Google’da. Metinleri tanıtım sayfalarında.'],
  ['Gizlilik, koşullar, topluluk, çocuk güvenliği', 'Google’da. Metinler politika sayfalarında.'],
  ['Blog', 'Google’da. Yazı yazılınca adresi oluşur.'],
  ['Giriş ve kayıt', 'Kapalı. Form sayfası siteyi zayıflatır. Katılım ana sayfa ve tanıtımdan gider.'],
  ['Mesaj, cüzdan, ayarlar', 'Kapalı. Kişiye özel.'],
];

function kararMetni(satir: SeoSatir) {
  if (satir.neden_tr) return satir.neden_tr;
  if (satir.oneri === 'tut') return 'Kalite yeterli. Google’da kalsın.';
  if (satir.oneri === 'gizli') return 'Herkese açık değil veya kaldırıldı.';
  if (satir.oneri === 'incele') return 'Bildirim veya kontrol var. Karar sende.';
  return 'Metin zayıf veya eşik altında. Google’dan çıkar.';
}

export default function SeoIcerikEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [ozet, setOzet] = useState<SeoOzet | null>(null);
  const [satirlar, setSatirlar] = useState<SeoSatir[]>([]);
  const [grup, setGrup] = useState<string>('cikar');
  const [secili, setSecili] = useState<SeoSatir | null>(null);
  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [og, setOg] = useState('');
  const [adresAcik, setAdresAcik] = useState(false);
  const [slug, setSlug] = useState('');
  const [konuSlug, setKonuSlug] = useState('');
  const [konuBaslik, setKonuBaslik] = useState('');
  const [konuAciklama, setKonuAciklama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesaj, setMesaj] = useState('');

  const yukle = useCallback(async (sonraki = grup) => {
    setYukleniyor(true);
    setOzet(await SeoOzetGetir());
    setSatirlar(await SeoListeGetir(sonraki));
    setYukleniyor(false);
  }, [grup]);

  useFocusEffect(useCallback(() => {
    if (admin) void yukle();
  }, [admin, yukle]));

  function sec(satir: SeoSatir) {
    setSecili(satir);
    setBaslik(satir.title ?? '');
    setAciklama(satir.description ?? '');
    setOg(satir.og_image ?? '');
    setSlug(satir.slug);
    setMesaj('');
  }

  async function uygula(alan: Record<string, unknown>, not: string) {
    if (!secili) return;
    const sonuc = await SeoGuncelle(secili.id, alan);
    setMesaj(sonuc.ok ? not : sonuc.hata || 'Kaydedilemedi');
    await yukle();
  }

  if (!admin) {
    return (
      <Screen>
        <EkranBasligi title="Arama görünürlüğü" />
        <Text style={styles.yazi}>Bu ekran yönetici içindir.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <EkranBasligi title="Arama görünürlüğü" />
      <ScrollView contentContainerStyle={styles.govde}>
        <View style={styles.kart}>
          <Text style={styles.baslik}>Ne Google’da kalır</Text>
          <Text style={styles.yazi}>Herkese açık, özgün ve anlamlı yazı kalır. Görseli veya videosu olan paylaşım aynı kuraldan geçer; kapak ve açıklama sayfaya yazılır.</Text>
          <Text style={styles.yazi}>18+ yetişkin paylaşım, çocuk güvenliği, şiddet veya kendine zarar içermiyorsa diğer herkese açık paylaşımlarla aynı şekilde yayınlanır.</Text>
          <Text style={styles.yazi}>Kısa selam, tekrar, spam, gizli hesap, silinen paylaşım ve açık bildirim Google’a çıkmaz.</Text>
        </View>
        {ozet ? (
          <Text style={styles.yazi}>
            {`Kalsın ${ozet.keep_posts ?? ozet.indexable_posts} · çıkarılacak ${ozet.weak_posts ?? 0} · incele ${ozet.review_posts ?? 0} · yayında değil ${ozet.hidden_posts} · profil ${ozet.indexable_profiles} · şehir ${ozet.indexable_cities} · ajans ${ozet.agency_ready ?? 0}`}
          </Text>
        ) : null}
        <Text style={styles.yazi}>Ajans sayfası, ajans aktifse ve açıklaması en az 40 karakterse açılır. Davet kodu ve kazanç yazılmaz.</Text>
        <Pressable
          onPress={async () => {
            const sonuc = await SeoZayiflariCikar();
            setMesaj(sonuc.ok ? `${sonuc.adet} zayıf sayfa Google’dan çıkarıldı. Paylaşım uygulamada durur.` : sonuc.hata || 'Çıkarılamadı');
            await yukle();
          }}
          style={styles.tehlike}
        >
          <Text style={styles.tehlikeYazi}>Zayıf sayfaları Google’dan çıkar</Text>
        </Pressable>
        <View style={styles.satir}>
          {GRUPLAR.map(([kod, ad]) => (
            <Pressable key={kod} onPress={() => { setGrup(kod); void yukle(kod); }} style={[styles.filtre, grup === kod && styles.seciliFiltre]}>
              <Text style={styles.yazi}>{ad}</Text>
            </Pressable>
          ))}
        </View>
        {yukleniyor ? <ActivityIndicator color={RenkTokenlari.accent} /> : null}
        {!yukleniyor && satirlar.length === 0 ? <Text style={styles.yazi}>Bu grupta kayıt yok.</Text> : null}
        {satirlar.map((satir) => (
          <Pressable key={satir.id} onPress={() => sec(satir)} style={styles.kart}>
            <Text style={styles.baslik}>{satir.title || satir.slug}</Text>
            <Text style={styles.yazi}>{kararMetni(satir)}</Text>
            <Text style={styles.yazi}>{`Kalite ${satir.score}/100`}</Text>
            {(satir.signals || []).slice(0, 6).map((s) => (
              <Text key={s.ad} style={styles.yazi}>{`${s.tamam ? 'Tamam' : 'Eksik'} · ${s.ad}`}</Text>
            ))}
          </Pressable>
        ))}
        {secili ? (
          <View style={styles.kart}>
            <Text style={styles.baslik}>Seçilen sayfa</Text>
            <Text style={styles.yazi}>{kararMetni(secili)}</Text>
            <View style={styles.satir}>
              <Pressable onPress={() => uygula({ manual_index: 'hide', sitemap_blocked: true }, 'Google’dan kaldırıldı')} style={styles.tehlike}>
                <Text style={styles.tehlikeYazi}>Google’dan kaldır</Text>
              </Pressable>
              <Pressable onPress={() => uygula({ manual_index: 'index', sitemap_blocked: false }, 'Google’da tutulsun dendi')} style={styles.filtre}>
                <Text style={styles.yazi}>Google’da tut</Text>
              </Pressable>
              <Pressable onPress={() => uygula({ manual_index: 'restore' }, 'Otomatik karara döndü')} style={styles.filtre}>
                <Text style={styles.yazi}>Otomatiğe bırak</Text>
              </Pressable>
            </View>
            <TextInput value={baslik} onChangeText={setBaslik} placeholder="Arama başlığı" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} />
            <TextInput value={aciklama} onChangeText={setAciklama} placeholder="Arama açıklaması" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} />
            <TextInput value={og} onChangeText={setOg} placeholder="Kapak görseli https" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} autoCapitalize="none" />
            <Pressable onPress={() => uygula({ manual_title: baslik, manual_description: aciklama, og_image: og }, 'Başlık ve açıklama kaydedildi')} style={styles.filtre}>
              <Text style={styles.yazi}>Başlığı kaydet</Text>
            </Pressable>
            <Pressable onPress={() => setAdresAcik((v) => !v)} style={styles.filtre}>
              <Text style={styles.yazi}>{adresAcik ? 'Adresi gizle' : 'Adresi değiştir'}</Text>
            </Pressable>
            {adresAcik ? (
              <TextInput value={slug} onChangeText={setSlug} placeholder="Kısa adres" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} autoCapitalize="none" />
            ) : null}
            {adresAcik ? (
              <Pressable onPress={() => uygula({ manual_slug: slug }, 'Adres kaydedildi')} style={styles.filtre}>
                <Text style={styles.yazi}>Adresi kaydet</Text>
              </Pressable>
            ) : null}
            {mesaj ? <Text style={styles.yazi}>{mesaj}</Text> : null}
          </View>
        ) : null}
        <View style={styles.kart}>
          <Text style={styles.baslik}>Hazır sayfalar</Text>
          {SABIT.map(([ad, not]) => (
            <Text key={ad} style={styles.yazi}>{`${ad}: ${not}`}</Text>
          ))}
        </View>
        <View style={styles.kart}>
          <Text style={styles.baslik}>Konu sayfası</Text>
          <Text style={styles.yazi}>Yalnızca gerçekten yazdığın bir konu açılır. Boş konu sayfası üretilmez.</Text>
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
  seciliFiltre: { borderColor: RenkTokenlari.accent },
  tehlike: { borderWidth: 1, borderColor: '#a33', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tehlikeYazi: { color: '#e8b4b4', fontSize: 13 },
  baslik: { color: RenkTokenlari.text, fontSize: 16 },
  yazi: { color: RenkTokenlari.textMuted, fontSize: 13 },
  girdi: { color: RenkTokenlari.text, borderWidth: 1, borderColor: RenkTokenlari.border, borderRadius: 8, padding: 8 },
});
