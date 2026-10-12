import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  SeoAnahtarDurum,
  SeoAnahtarGecmis,
  SeoAnahtarGeriAl,
  SeoAnahtarKaydet,
  SeoAnahtarListe,
  SeoAnahtarOnerileri,
  SeoAnahtarYayinla,
  type SeoAnahtarSatir,
  type SeoGecmisSatir,
} from '../../src/moduller/seo/SeoAnahtarIslemleri';
import {
  aciklamaOlcusu,
  baslikOlcusu,
  kelimeAnaliz,
  kelimeleriAyikla,
  SEO_HEDEF_SAYFALAR,
  type SeoOneri,
} from '../../src/moduller/seo/seoAnahtarMotor';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';

type Kart = {
  ifade: string;
  dil: 'tr' | 'en';
  kategori: string;
  niyet: string;
  uyari: string;
  yeniSayfa: boolean;
  hedefYol: string;
  oneriler: SeoOneri[];
  secili: Record<string, boolean>;
};

const ALAN_AD: Record<string, string> = {
  title: 'Sayfa başlığı',
  description: 'Meta açıklaması',
  h1: 'H1',
  h2: 'H2',
  intro: 'Tanıtım metni',
  faq: 'SSS',
  link: 'Dahili bağlantı',
};

function kartYap(ham: string, hedef = ''): Kart {
  const analiz = kelimeAnaliz(ham, hedef);
  const secili: Record<string, boolean> = {};
  for (const oneri of analiz.oneriler) {
    const degisti = oneri.onerilen.trim() !== oneri.onceki.trim();
    secili[oneri.alan] = !oneri.yeniSayfa && degisti && (oneri.alan === 'title' || oneri.alan === 'description');
  }
  return {
    ifade: analiz.sinif.ifade,
    dil: analiz.sinif.dil,
    kategori: analiz.sinif.kategori,
    niyet: analiz.sinif.niyet,
    uyari: analiz.oneriler[0]?.uyari || analiz.sinif.yazimUyarisi,
    yeniSayfa: analiz.oneriler.some((o) => o.yeniSayfa),
    hedefYol: analiz.oneriler.find((o) => o.hedefYol)?.hedefYol || '',
    oneriler: analiz.oneriler,
    secili,
  };
}

export default function SeoAnahtarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { width } = useWindowDimensions();
  const dar = width < 760;
  const [ham, setHam] = useState('');
  const [arama, setArama] = useState('');
  const [kartlar, setKartlar] = useState<Kart[]>([]);
  const [onizle, setOnizle] = useState<Kart | null>(null);
  const [liste, setListe] = useState<SeoAnahtarSatir[]>([]);
  const [gecmis, setGecmis] = useState<SeoGecmisSatir[]>([]);
  const [mesaj, setMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const yukle = useCallback(async (sorgu = arama) => {
    setListe(await SeoAnahtarListe(sorgu));
    setGecmis(await SeoAnahtarGecmis());
  }, [arama]);

  useFocusEffect(useCallback(() => {
    if (admin) void yukle();
  }, [admin, yukle]));

  function analizEt() {
    const kelimeler = kelimeleriAyikla(ham);
    setKartlar(kelimeler.map((k) => kartYap(k)));
    setOnizle(kelimeler[0] ? kartYap(kelimeler[0]) : null);
    setMesaj(kelimeler.length ? `${kelimeler.length} kelime hazır. İşaretlenenler yayınlanır.` : 'Yayınlanacak kelime kalmadı.');
  }

  function hedefDegistir(index: number, yol: string) {
    setKartlar((onceki) => onceki.map((kart, i) => (i === index ? kartYap(kart.ifade, yol) : kart)));
  }

  async function yayinla() {
    setYukleniyor(true);
    let adet = 0;
    let uyari = '';
    for (const kart of kartlar) {
      if (kart.yeniSayfa) {
        uyari = 'Yeni sayfa önerisi taslak kaldı. Onaysız sayfa açılmaz.';
      }
      const kayit = await SeoAnahtarKaydet({
        ifade: kart.ifade,
        dil: kart.dil,
        kategori: kart.kategori,
        niyet: kart.niyet,
        hedef_yol: kart.hedefYol,
        aktif: true,
        oneriler: kart.oneriler,
      });
      if (!kayit.ok || !kayit.id) {
        setMesaj(kayit.hata || 'Taslak kaydedilemedi');
        setYukleniyor(false);
        return;
      }
      const oneriler = await SeoAnahtarOnerileri(kayit.id);
      const idler = oneriler
        .filter((o) => kart.secili[o.alan] && !o.yeni_sayfa && o.durum === 'taslak')
        .map((o) => o.id);
      if (!idler.length) continue;
      const sonuc = await SeoAnahtarYayinla(idler);
      if (!sonuc.ok) {
        setMesaj(sonuc.hata || 'Yayınlanamadı');
        setYukleniyor(false);
        return;
      }
      adet += sonuc.adet;
      if (sonuc.uyari) uyari = sonuc.uyari;
    }
    await yukle();
    setYukleniyor(false);
    setMesaj(`Yayınlanan alan: ${adet}. ${uyari} Google taraması anlık değildir. Tanıtım sayfalarının HTML’i bir sonraki site yayınıyla güncellenir.`.trim());
  }

  if (!admin) {
    return (
      <Screen>
        <EkranBasligi title="Anahtar kelimeler" subtitle="SEO yönetimi" />
        <Text style={styles.yazi}>Bu ekran yönetici içindir.</Text>
      </Screen>
    );
  }

  const onizleBaslik = onizle?.oneriler.find((o) => o.alan === 'title');
  const onizleAciklama = onizle?.oneriler.find((o) => o.alan === 'description');

  return (
    <Screen>
      <EkranBasligi title="Anahtar kelimeler" subtitle="SEO yönetimi" />
      <ScrollView contentContainerStyle={[styles.govde, dar ? null : styles.genis]}>
        <View style={styles.kart}>
          <Text style={styles.baslik}>Kelime yaz, analiz et, yayınla</Text>
          <Text style={styles.yazi}>Virgül veya satır kullan. Kelime, sayfanın içine rastgele serpilmez. Önce taslak oluşur; yayın yalnızca işaretlediğin başlık ve metni yazar.</Text>
          <TextInput
            value={ham}
            onChangeText={setHam}
            placeholder={'tamuso\nsesli sohbet, coin'}
            placeholderTextColor={RenkTokenlari.textMuted}
            style={[styles.girdi, styles.cokSatir]}
            multiline
            autoCapitalize="none"
          />
          <View style={styles.satir}>
            <Pressable onPress={analizEt} style={styles.dugme}><Text style={styles.dugmeYazi}>SEO analiz et</Text></Pressable>
            <Pressable onPress={() => void yayinla()} style={styles.dugme} disabled={yukleniyor || kartlar.length === 0}>
              <Text style={styles.dugmeYazi}>{yukleniyor ? 'Yayınlanıyor' : 'Yayınla'}</Text>
            </Pressable>
          </View>
          {mesaj ? <Text style={styles.yazi}>{mesaj}</Text> : null}
        </View>

        {onizle && onizleBaslik && onizleAciklama ? (
          <View style={styles.kart}>
            <Text style={styles.baslik}>Arama önizlemesi</Text>
            <Text style={styles.sonucBaslik}>{onizle.secili.title ? onizleBaslik.onerilen : onizleBaslik.onceki}</Text>
            <Text style={styles.sonucYol}>https://www.tamuso.com{onizle.hedefYol || ''}</Text>
            <Text style={styles.yazi}>{onizle.secili.description ? onizleAciklama.onerilen : onizleAciklama.onceki}</Text>
            <Text style={styles.yazi}>{`Başlık ${baslikOlcusu(onizleBaslik.onerilen)} · açıklama ${aciklamaOlcusu(onizleAciklama.onerilen)}. Bu uzunluklar hedef aralıktır, Google sınırı değildir.`}</Text>
          </View>
        ) : null}

        {kartlar.map((kart, index) => (
          <View key={kart.ifade} style={styles.kart}>
            <Text style={styles.baslik}>{kart.ifade}</Text>
            <Text style={styles.yazi}>{`${kart.dil} · ${kart.kategori} · ${kart.niyet}${kart.yeniSayfa ? ' · yeni sayfa taslağı' : ''}`}</Text>
            {kart.uyari ? <Text style={styles.uyari}>{kart.uyari}</Text> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.satir}>
              {SEO_HEDEF_SAYFALAR.map((sayfa) => (
                <Pressable key={sayfa.yol} onPress={() => hedefDegistir(index, sayfa.yol)} style={[styles.filtre, kart.hedefYol === sayfa.yol && styles.secili]}>
                  <Text style={styles.yazi}>{sayfa.ad}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {kart.oneriler.map((oneri) => (
              <Pressable
                key={oneri.alan}
                onPress={() => {
                  setOnizle(kart);
                  setKartlar((onceki) => onceki.map((satir, i) => i === index ? { ...satir, secili: { ...satir.secili, [oneri.alan]: !satir.secili[oneri.alan] } } : satir));
                }}
                style={styles.oneri}
              >
                <Text style={styles.yazi}>{`${kart.secili[oneri.alan] ? '✓' : '○'} ${ALAN_AD[oneri.alan] || oneri.alan}`}</Text>
                {oneri.onceki ? <Text style={styles.eski}>{oneri.onceki}</Text> : null}
                <Text style={styles.yeni}>{oneri.onerilen}</Text>
              </Pressable>
            ))}
          </View>
        ))}

        <View style={styles.kart}>
          <Text style={styles.baslik}>Kayıtlı kelimeler</Text>
          <TextInput value={arama} onChangeText={setArama} onSubmitEditing={() => void yukle(arama)} placeholder="Ara" placeholderTextColor={RenkTokenlari.textMuted} style={styles.girdi} autoCapitalize="none" />
          {liste.map((satir) => (
            <View key={satir.id} style={styles.satir}>
              <Text style={styles.yazi}>{`${satir.ifade} · ${satir.durum}${satir.aktif ? '' : ' · pasif'} · ${satir.hedef_yol || 'hedef yok'}`}</Text>
              <Pressable onPress={() => void SeoAnahtarDurum(satir.id, satir.aktif ? 'pasif' : 'aktif').then(() => yukle())} style={styles.filtre}>
                <Text style={styles.yazi}>{satir.aktif ? 'Pasif' : 'Aktif'}</Text>
              </Pressable>
              <Pressable onPress={() => void SeoAnahtarDurum(satir.id, 'sil').then(() => yukle())} style={styles.filtre}>
                <Text style={styles.yazi}>Sil</Text>
              </Pressable>
            </View>
          ))}
          {liste.length === 0 ? <Text style={styles.yazi}>Henüz kayıt yok.</Text> : null}
        </View>

        <View style={styles.kart}>
          <Text style={styles.baslik}>Değişiklik geçmişi</Text>
          <Text style={styles.yazi}>Kimlik, saat ve alan sunucuda durur. Geri al, yayınlanan metni bir önceki değere çeker.</Text>
          {gecmis.map((satir) => (
            <View key={satir.id} style={styles.oneri}>
              <Text style={styles.yazi}>{`${satir.islem} · ${satir.yol} · ${ALAN_AD[satir.alan] || satir.alan} · ${satir.created_at.slice(0, 16).replace('T', ' ')}`}</Text>
              {satir.eski ? <Text style={styles.eski}>{satir.eski}</Text> : null}
              {satir.yeni ? <Text style={styles.yeni}>{satir.yeni}</Text> : null}
              {satir.islem === 'yayin' ? (
                <Pressable onPress={() => void SeoAnahtarGeriAl(satir.id).then((s) => { setMesaj(s.ok ? 'Önceki sürüme dönüldü' : s.hata || 'Geri alınamadı'); void yukle(); })} style={styles.filtre}>
                  <Text style={styles.yazi}>Geri al</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
        {yukleniyor ? <ActivityIndicator color={RenkTokenlari.accent} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  govde: { padding: 16, gap: 12, paddingBottom: 40 },
  genis: { maxWidth: 880, alignSelf: 'center', width: '100%' },
  kart: { borderWidth: 1, borderColor: RenkTokenlari.border, borderRadius: 12, padding: 12, gap: 8 },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  baslik: { color: RenkTokenlari.text, fontSize: 16 },
  yazi: { color: RenkTokenlari.textMuted, fontSize: 13 },
  uyari: { color: '#e8b4b4', fontSize: 13 },
  girdi: { color: RenkTokenlari.text, borderWidth: 1, borderColor: RenkTokenlari.border, borderRadius: 8, padding: 8 },
  cokSatir: { minHeight: 88, textAlignVertical: 'top' },
  dugme: { backgroundColor: RenkTokenlari.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  dugmeYazi: { color: '#140e08', fontSize: 14 },
  filtre: { borderWidth: 1, borderColor: RenkTokenlari.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  secili: { borderColor: RenkTokenlari.accent },
  oneri: { gap: 4, paddingTop: 6 },
  eski: { color: RenkTokenlari.textMuted, fontSize: 12, textDecorationLine: 'line-through' },
  yeni: { color: RenkTokenlari.text, fontSize: 14 },
  sonucBaslik: { color: '#8ab4f8', fontSize: 18 },
  sonucYol: { color: '#81c995', fontSize: 12 },
});
