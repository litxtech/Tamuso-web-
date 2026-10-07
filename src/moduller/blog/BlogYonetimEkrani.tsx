import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { EkranBasligi } from '../../components/EkranBasligi';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { BlogAltMenu } from './BlogAltMenu';
import {
  blogCeviriGruplari,
  blogDilKaydet,
  blogDilleri,
  blogMedyaListele,
  blogYazarKaydet,
  blogYazarlar,
  blogYolYonlendirmeEkle,
  blogYolYonlendirmeleri,
} from './blogApi';

const DILLER = ['tr', 'en', 'de', 'es', 'ar', 'ru'];

export function BlogDilEkrani() {
  const [satirlar, setSatirlar] = useState<any[]>([]);
  const [hata, setHata] = useState('');
  const yukle = () => blogDilleri().then(setSatirlar).catch((e) => setHata(e.message));
  useEffect(() => { void yukle(); }, []);
  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Blog dilleri" subtitle="Yalnızca aktif diller yayınlanır" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <BlogAltMenu />
        {hata ? <Text style={{ color: R.danger }}>{hata}</Text> : null}
        {satirlar.map((d) => (
          <View key={d.code} style={{ gap: 4 }}>
            <Text style={{ color: R.text, fontWeight: '700' }}>{d.native_name} · {d.code}</Text>
            <Text style={{ color: R.textMuted }}>{d.is_active ? 'Aktif' : 'Pasif'} · {d.is_default ? 'Varsayılan' : ''} · {d.is_publishable ? 'Yayınlanabilir' : 'Yayın kapalı'}</Text>
            <Pressable onPress={() => void blogDilKaydet(d.code, { is_active: !d.is_active }).then(yukle)}><Text style={{ color: R.primarySoft }}>{d.is_active ? 'Pasif yap' : 'Aktif yap'}</Text></Pressable>
            <Pressable onPress={() => void blogDilKaydet(d.code, { is_publishable: !d.is_publishable }).then(yukle)}><Text style={{ color: R.primarySoft }}>{d.is_publishable ? 'Yayını kapat' : 'Yayına aç'}</Text></Pressable>
            {!d.is_default ? <Pressable onPress={() => void blogDilKaydet(d.code, { is_default: true, is_active: true }).then(yukle)}><Text style={{ color: R.primarySoft }}>Varsayılan yap</Text></Pressable> : null}
          </View>
        ))}
        <Text style={{ color: R.textMuted, fontSize: 12 }}>Türkçe adresler /blog olarak kalır. Boş dil için sayfa üretilmez.</Text>
      </ScrollView>
    </Screen>
  );
}

export function BlogCeviriEkrani() {
  const [satirlar, setSatirlar] = useState<any[]>([]);
  useEffect(() => { void blogCeviriGruplari().then(setSatirlar); }, []);
  const gruplar = new Map<string, any[]>();
  for (const s of satirlar) {
    const anahtar = s.content_group_id || s.id;
    gruplar.set(anahtar, [...(gruplar.get(anahtar) || []), s]);
  }
  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Çeviriler" subtitle="Eksik dil yayınlanmaz" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <BlogAltMenu />
        {[...gruplar.values()].map((liste) => (
          <View key={liste[0].content_group_id || liste[0].id} style={{ gap: 4 }}>
            <Text style={{ color: R.text, fontWeight: '700' }}>{liste.find((s) => s.language_code === 'tr')?.title || liste[0].title}</Text>
            <Text style={{ color: R.textMuted }}>{DILLER.map((kod) => {
              const varOlan = liste.find((s) => s.language_code === kod);
              return `${kod} ${varOlan ? varOlan.translation_status : 'yok'}`;
            }).join(' · ')}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

export function BlogYazarEkrani() {
  const [satirlar, setSatirlar] = useState<any[]>([]);
  const [ad, setAd] = useState('');
  const [bio, setBio] = useState('');
  const yukle = () => blogYazarlar().then(setSatirlar);
  useEffect(() => { void yukle(); }, []);
  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Yazarlar" subtitle="Kurumsal ekip veya gerçek kişi" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <BlogAltMenu />
        {satirlar.map((y) => (
          <Text key={y.id} style={{ color: R.text }}>{y.name} · {y.kind} · /yazar/{y.slug}</Text>
        ))}
        <TextInput value={ad} onChangeText={setAd} placeholder="Ad" placeholderTextColor={R.textMuted} style={{ color: R.text, borderWidth: 1, borderColor: R.border, borderRadius: 8, padding: 8 }} />
        <TextInput value={bio} onChangeText={setBio} placeholder="Kısa biyografi" placeholderTextColor={R.textMuted} style={{ color: R.text, borderWidth: 1, borderColor: R.border, borderRadius: 8, padding: 8 }} />
        <Pressable onPress={() => void blogYazarKaydet({ name: ad, bio, kind: 'organization' }).then(() => { setAd(''); setBio(''); return yukle(); })}>
          <Text style={{ color: R.primarySoft }}>Kurumsal yazar ekle</Text>
        </Pressable>
        <Text style={{ color: R.textMuted, fontSize: 12 }}>Gerçek olmayan kişi profili eklenmez. Kişi türü yalnızca gerçek editör içindir.</Text>
      </ScrollView>
    </Screen>
  );
}

export function BlogMedyaEkrani() {
  const [kind, setKind] = useState('');
  const [satirlar, setSatirlar] = useState<any[]>([]);
  useEffect(() => { void blogMedyaListele(kind || undefined).then(setSatirlar); }, [kind]);
  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Medya kütüphanesi" subtitle="blog-gorseller" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <BlogAltMenu />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['', 'image', 'cover', 'author', 'video'].map((k) => (
            <Pressable key={k || 'hepsi'} onPress={() => setKind(k)}><Text style={{ color: kind === k ? R.primarySoft : R.text }}>{k || 'Tümü'}</Text></Pressable>
          ))}
        </View>
        {satirlar.map((m) => (
          <Text key={m.id} style={{ color: R.textMuted }}>{m.filename} · {m.mime} · {m.alt_text}</Text>
        ))}
        {satirlar.length === 0 ? <Text style={{ color: R.textMuted }}>Kayıt yok. Yüklemeler blog/, authors/, social/ ve video/ klasörlerine gider.</Text> : null}
      </ScrollView>
    </Screen>
  );
}

export function BlogYonlendirmeEkrani() {
  const [satirlar, setSatirlar] = useState<any[]>([]);
  const [eski, setEski] = useState('');
  const [yeni, setYeni] = useState('');
  const [hata, setHata] = useState('');
  const yukle = () => blogYolYonlendirmeleri().then(setSatirlar);
  useEffect(() => { void yukle(); }, []);
  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Yönlendirmeler" subtitle="301" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <BlogAltMenu />
        {hata ? <Text style={{ color: R.danger }}>{hata}</Text> : null}
        <TextInput value={eski} onChangeText={setEski} placeholder="/blog/eski-adres" placeholderTextColor={R.textMuted} autoCapitalize="none" style={{ color: R.text, borderWidth: 1, borderColor: R.border, borderRadius: 8, padding: 8 }} />
        <TextInput value={yeni} onChangeText={setYeni} placeholder="/blog/yeni-adres" placeholderTextColor={R.textMuted} autoCapitalize="none" style={{ color: R.text, borderWidth: 1, borderColor: R.border, borderRadius: 8, padding: 8 }} />
        <Pressable onPress={() => void blogYolYonlendirmeEkle(eski.trim(), yeni.trim()).then(yukle).catch((e) => setHata(e.message))}><Text style={{ color: R.primarySoft }}>301 ekle</Text></Pressable>
        {satirlar.map((s) => <Text key={s.old_path} style={{ color: R.text }}>{s.old_path} → {s.new_path}</Text>)}
      </ScrollView>
    </Screen>
  );
}
