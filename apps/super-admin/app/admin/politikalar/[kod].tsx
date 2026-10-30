import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminPolitikaGorselSecVeYukle,
  AdminPolitikaGuncelle,
  AdminPolitikaListele,
  AdminPolitikaOlustur,
} from '../../../../../src/moduller/admin/politikalar/AdminPolitikaIslemleri';
import {
  PolitikaGorselMarkdown,
  PolitikaLinkMarkdown,
} from '../../../../../src/moduller/politikalar/bilesenler/PolitikaZenginGovde';
import { PolitikaKodundanGetir } from '../../../../../src/moduller/politikalar/icerik/PolitikaMetinleri';
import { AdminStil } from '../../../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AdminPolitikaDuzenleEkrani() {
  const { kod } = useLocalSearchParams<{ kod: string }>();
  const yeni = kod === 'yeni';
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [consentLabel, setConsentLabel] = useState('');
  const [body, setBody] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isRequired, setIsRequired] = useState(true);
  const [yeniSurum, setYeniSurum] = useState(true);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [linkEtiket, setLinkEtiket] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [yukleniyor, setYukleniyor] = useState(!yeni);
  const [kaydediyor, setKaydediyor] = useState(false);

  const yukle = useCallback(async () => {
    if (yeni || !kod) return;
    setYukleniyor(true);
    try {
      const liste = await AdminPolitikaListele();
      const row = liste.find((r) => r.code === kod);
      if (!row) {
        Alert.alert('Politika', 'Bulunamadı');
        router.back();
        return;
      }
      setTitle(row.title);
      setCode(row.code);
      setDescription(row.description ?? '');
      setLinkLabel(row.link_label ?? '');
      setConsentLabel(row.consent_label ?? '');
      setShowRegister(row.show_on_register);
      setShowLogin(row.show_on_login);
      setIsRequired(row.is_required);
      let govde = row.body_md ?? '';
      const yerel = PolitikaKodundanGetir(row.code);
      if (
        yerel &&
        (!govde.trim() ||
          govde.includes('Placeholder') ||
          govde.length < 80)
      ) {
        govde = yerel.govde;
      }
      setBody(govde);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, [yeni, kod]);

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

  const metinEkle = (ek: string) => {
    const s = selection.start;
    const e = selection.end;
    const next = body.slice(0, s) + ek + body.slice(e);
    setBody(next);
    const pos = s + ek.length;
    setSelection({ start: pos, end: pos });
  };

  const gorselEkle = async () => {
    const hedefKod = yeni ? code.trim() || 'draft' : kod!;
    try {
      const url = await AdminPolitikaGorselSecVeYukle(hedefKod);
      metinEkle(`\n${PolitikaGorselMarkdown(url)}\n`);
    } catch (e) {
      if (e instanceof Error && e.message === 'İptal') return;
      Alert.alert('Görsel', e instanceof Error ? e.message : 'Yüklenemedi');
    }
  };

  const linkEkle = () => {
    if (!linkUrl.trim()) {
      Alert.alert('Bağlantı', 'URL gir');
      return;
    }
    const md = PolitikaLinkMarkdown(
      linkEtiket || 'bağlantı',
      linkUrl.trim(),
    );
    metinEkle(md);
    setLinkEtiket('');
    setLinkUrl('');
  };

  const kaydet = async () => {
    if (!title.trim()) {
      Alert.alert('Politika', 'Başlık gerekli');
      return;
    }
    setKaydediyor(true);
    try {
      if (yeni) {
        const row = await AdminPolitikaOlustur({
          title: title.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          linkLabel: linkLabel.trim() || null,
          consentLabel: consentLabel.trim() || null,
          showOnRegister: showRegister,
          showOnLogin: showLogin,
          isRequired,
          bodyMd: body,
        });
        Alert.alert('Oluşturuldu', `/politika/${row.code}`);
        router.replace(`/admin/politikalar/${row.code}` as any);
      } else {
        await AdminPolitikaGuncelle({
          code: kod!,
          title: title.trim(),
          description: description.trim(),
          linkLabel: linkLabel.trim(),
          consentLabel: consentLabel.trim(),
          showOnRegister: showRegister,
          showOnLogin: showLogin,
          isRequired,
          bodyMd: body,
          yeniSurum,
        });
        Alert.alert('Kaydedildi', yeniSurum ? 'Yeni sürüm yayınlandı' : 'Güncellendi');
      }
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt başarısız');
    } finally {
      setKaydediyor(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={yeni ? 'Yeni politika' : 'Politika düzenle'}
        subtitle={yeni ? 'Otomatik link üretilir' : `/politika/${kod}`}
        fallbackHref="/admin/politikalar"
      />
      {yukleniyor ? (
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginTop: 24 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={AdminStil.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Başlık (istediğin türden ad)</Text>
          <TextInput
            style={AdminStil.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={RenkTokenlari.textDim}
          />

          {yeni ? (
            <>
              <Text style={styles.label}>
                Link kodu (boş = başlıktan otomatik)
              </Text>
              <TextInput
                style={AdminStil.input}
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                placeholder="ornek-politika"
                placeholderTextColor={RenkTokenlari.textDim}
              />
            </>
          ) : (
            <Text style={AdminStil.kartAlt}>
              Kalıcı link: /politika/{kod}
            </Text>
          )}

          <Text style={styles.label}>Kısa açıklama</Text>
          <TextInput
            style={AdminStil.input}
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={RenkTokenlari.textDim}
          />

          <Text style={styles.label}>Giriş formu altındaki ad</Text>
          <TextInput
            style={AdminStil.input}
            value={linkLabel}
            onChangeText={setLinkLabel}
            placeholderTextColor={RenkTokenlari.textDim}
          />

          <Text style={styles.label}>Kayıt onay kutusu metni</Text>
          <TextInput
            style={AdminStil.input}
            value={consentLabel}
            onChangeText={setConsentLabel}
            multiline
            placeholderTextColor={RenkTokenlari.textDim}
          />

          <View style={AdminStil.satir}>
            <Text style={[styles.label, { flex: 1 }]}>Kayıtta onay kutusu</Text>
            <Switch value={showRegister} onValueChange={setShowRegister} />
          </View>
          <View style={AdminStil.satir}>
            <Text style={[styles.label, { flex: 1 }]}>Giriş kartı altında link</Text>
            <Switch value={showLogin} onValueChange={setShowLogin} />
          </View>
          <View style={AdminStil.satir}>
            <Text style={[styles.label, { flex: 1 }]}>Zorunlu onay</Text>
            <Switch value={isRequired} onValueChange={setIsRequired} />
          </View>
          {!yeni ? (
            <View style={AdminStil.satir}>
              <Text style={[styles.label, { flex: 1 }]}>
                Kaydetince yeni sürüm
              </Text>
              <Switch value={yeniSurum} onValueChange={setYeniSurum} />
            </View>
          ) : null}

          <Text style={styles.label}>
            Metin (sınırsız) · satır içi bağlantı: [görünen yazı](https://…)
          </Text>
          <TextInput
            style={[AdminStil.input, styles.govde]}
            value={body}
            onChangeText={setBody}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            multiline
            textAlignVertical="top"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <Text style={AdminStil.kartAlt}>
            {body.length.toLocaleString('tr-TR')} karakter
          </Text>

          <View style={AdminStil.aksiyonSatir}>
            <Pressable style={AdminStil.aksiyon} onPress={() => void gorselEkle()}>
              <Text style={AdminStil.aksiyonYazi}>Resim ekle</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Bağlantıyı istediğin metnin yanına ekle</Text>
          <TextInput
            style={AdminStil.input}
            value={linkEtiket}
            onChangeText={setLinkEtiket}
            placeholder="Görünen yazı"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <TextInput
            style={AdminStil.input}
            value={linkUrl}
            onChangeText={setLinkUrl}
            autoCapitalize="none"
            placeholder="https://…"
            placeholderTextColor={RenkTokenlari.textDim}
          />
          <Pressable style={AdminStil.aksiyon} onPress={linkEkle}>
            <Text style={AdminStil.aksiyonYazi}>İmleç konumuna bağlantı ekle</Text>
          </Pressable>

          <Pressable
            style={[styles.kaydet, kaydediyor && { opacity: 0.6 }]}
            disabled={kaydediyor}
            onPress={() => void kaydet()}
          >
            <Text style={styles.kaydetYazi}>
              {kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: BoslukTokenlari.sm,
  },
  govde: {
    minHeight: 280,
    fontSize: 15,
    lineHeight: 22,
  },
  kaydet: {
    marginTop: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.xxxl,
    backgroundColor: RenkTokenlari.mint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  kaydetYazi: {
    color: '#0a0a0a',
    fontWeight: '800',
    fontSize: 16,
  },
});
