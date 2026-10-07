import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminPlatformIletisimAyarla,
  PlatformIletisimAyariniGetir,
  VARSAYILAN_PLATFORM_ILETISIM,
  type PlatformIletisimAyar,
} from '../../src/moduller/platform-iletisim/islemler/PlatformIletisimIslemleri';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AdminIletisimEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [ayar, setAyar] = useState<PlatformIletisimAyar>(
    VARSAYILAN_PLATFORM_ILETISIM,
  );
  const [email, setEmail] = useState(VARSAYILAN_PLATFORM_ILETISIM.support_email);
  const [wa, setWa] = useState(VARSAYILAN_PLATFORM_ILETISIM.whatsapp_e164);
  const [waG, setWaG] = useState(VARSAYILAN_PLATFORM_ILETISIM.whatsapp_gorunen);
  const [baslik, setBaslik] = useState(VARSAYILAN_PLATFORM_ILETISIM.baslik);
  const [alt, setAlt] = useState(VARSAYILAN_PLATFORM_ILETISIM.alt_metin);
  const [adres, setAdres] = useState(VARSAYILAN_PLATFORM_ILETISIM.adres);
  const [ig, setIg] = useState('');
  const [tt, setTt] = useState('');
  const [x, setX] = useState('');
  const [yt, setYt] = useState('');
  const [fb, setFb] = useState('');
  const [li, setLi] = useState('');
  const [tg, setTg] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const a = await PlatformIletisimAyariniGetir(true);
    setAyar(a);
    setEmail(a.support_email);
    setWa(a.whatsapp_e164);
    setWaG(a.whatsapp_gorunen);
    setBaslik(a.baslik);
    setAlt(a.alt_metin);
    setAdres(a.adres);
    setIg(a.instagram_url);
    setTt(a.tiktok_url);
    setX(a.x_url);
    setYt(a.youtube_url);
    setFb(a.facebook_url);
    setLi(a.linkedin_url);
    setTg(a.telegram_url);
    setYukleniyor(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  if (!admin) return null;

  const kaydet = async () => {
    setBusy(true);
    const r = await AdminPlatformIletisimAyarla({
      support_email: email.trim(),
      whatsapp_e164: wa.trim(),
      whatsapp_gorunen: waG.trim(),
      baslik: baslik.trim(),
      alt_metin: alt.trim(),
      adres: adres.trim(),
      instagram_url: ig.trim(),
      tiktok_url: tt.trim(),
      x_url: x.trim(),
      youtube_url: yt.trim(),
      facebook_url: fb.trim(),
      linkedin_url: li.trim(),
      telegram_url: tg.trim(),
    });
    setBusy(false);
    if (!r.ok) {
      Alert.alert('Hata', r.hata);
      return;
    }
    setAyar(r.veri);
    Alert.alert('Kaydedildi', 'Footer ve destek kartı güncellendi.');
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Kurumsal iletişim"
        subtitle="Footer · mail · sosyal ağ"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={AdminStil.kartAlt}>
          Site footer’ında ve destek kartında görünür. Sosyal adres boşsa o
          düğme çıkmaz. Bağlantılar https ile başlamalı. Değişiklik anında
          yayına alınır.
        </Text>

        {yukleniyor ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Başlık</Text>
            <TextInput
              style={AdminStil.input}
              value={baslik}
              onChangeText={setBaslik}
              placeholder="Kurumsal iletişim"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Text style={styles.label}>Alt metin</Text>
            <TextInput
              style={AdminStil.input}
              value={alt}
              onChangeText={setAlt}
              placeholder="Şikayet · destek · uygunsuz içerik"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Text style={styles.label}>Destek e-posta</Text>
            <TextInput
              style={AdminStil.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="support@litxtech.com"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Text style={styles.label}>WhatsApp (ülke koduyla, sadece rakam)</Text>
            <TextInput
              style={AdminStil.input}
              value={wa}
              onChangeText={setWa}
              keyboardType="phone-pad"
              placeholder="905330483061"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Text style={styles.label}>WhatsApp görünen</Text>
            <TextInput
              style={AdminStil.input}
              value={waG}
              onChangeText={setWaG}
              placeholder="0533 048 30 61"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Text style={styles.label}>Adres</Text>
            <TextInput
              style={AdminStil.input}
              value={adres}
              onChangeText={setAdres}
              placeholder="15442 VENTURA BLVD STE 201-183, USA"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            {(
              [
                ['Instagram', ig, setIg],
                ['TikTok', tt, setTt],
                ['X', x, setX],
                ['YouTube', yt, setYt],
                ['Facebook', fb, setFb],
                ['LinkedIn', li, setLi],
                ['Telegram', tg, setTg],
              ] as const
            ).map(([ad, deger, yaz]) => (
              <View key={ad}>
                <Text style={styles.label}>{ad} URL</Text>
                <TextInput
                  style={AdminStil.input}
                  value={deger}
                  onChangeText={yaz}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="https://"
                  placeholderTextColor={RenkTokenlari.textDim}
                />
              </View>
            ))}

            <Pressable
              style={[AdminStil.aksiyon, styles.kaydet, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={() => void kaydet()}
            >
              {busy ? (
                <ActivityIndicator color={RenkTokenlari.primarySoft} />
              ) : (
                <Text style={AdminStil.aksiyonYazi}>Kaydet</Text>
              )}
            </Pressable>

            <Text style={styles.onizleme}>
              Önizleme: {ayar.support_email} · {ayar.whatsapp_gorunen}
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  label: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 6,
  },
  kaydet: {
    marginTop: BoslukTokenlari.md,
    alignItems: 'center',
    borderColor: RenkTokenlari.primarySoft,
  },
  onizleme: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 8,
  },
});
