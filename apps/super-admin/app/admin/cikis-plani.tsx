import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  cikisBpsKaydet,
  cikisKuralEkle,
  cikisKuralSil,
  cikisPanoGetir,
  cikisSiraKaydet,
  cikisTabanKaydet,
  type CikisAdim,
  type CikisPano,
} from '../../../../src/moduller/oyunlar/ortak/servisler/OyunCikisAdminApi';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

const GUNLER = [
  { id: 'bugun', ad: 'Bugün' },
  { id: 'her', ad: 'Her gün' },
  { id: '1', ad: 'Pzt' },
  { id: '2', ad: 'Sal' },
  { id: '3', ad: 'Çar' },
  { id: '4', ad: 'Per' },
  { id: '5', ad: 'Cum' },
  { id: '6', ad: 'Cmt' },
  { id: '7', ad: 'Paz' },
];

const SAATLER = [
  { bas: '0', bit: '24', ad: 'Tüm gün' },
  { bas: '0', bit: '12', ad: '00–12' },
  { bas: '12', bit: '18', ad: '12–18' },
  { bas: '18', bit: '24', ad: '18–24' },
];

function payYazi(agirlik: number, toplam: number): string {
  if (toplam <= 0 || agirlik <= 0) return 'çıkmaz';
  const yuzde = Math.round((100 * agirlik) / toplam);
  return yuzde < 1 ? 'seyrek' : `yaklaşık %${yuzde}`;
}

function tam(metin: string): number | null {
  const n = Math.floor(Number(metin));
  return Number.isFinite(n) ? n : null;
}

export default function CikisPlaniAdmin() {
  const { profile } = useAuth();
  const yetkili = AdminYetkisiVarMi(profile);
  const params = useLocalSearchParams<{ oyun?: string }>();
  const [pano, setPano] = useState<CikisPano | null>(null);
  const oyunRef = useRef(typeof params.oyun === 'string' ? params.oyun : '');
  const [oyun, setOyun] = useState(oyunRef.current);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [not, setNot] = useState('');
  const [sira, setSira] = useState<CikisAdim[]>([]);
  const [taban, setTaban] = useState<Record<string, string>>({});
  const [gun, setGun] = useState('bugun');
  const [saatBas, setSaatBas] = useState('0');
  const [saatBit, setSaatBit] = useState('24');
  const [kuralOge, setKuralOge] = useState('');
  const [kuralSiklik, setKuralSiklik] = useState('400');
  const [enFazla, setEnFazla] = useState('');
  const [yuzde, setYuzde] = useState('3.5');

  const uygula = useCallback((gelen: CikisPano) => {
    setPano(gelen);
    const kod = gelen.oyun?.kod ?? '';
    if (kod) {
      oyunRef.current = kod;
      setOyun(kod);
    }
    setSira(gelen.sira ?? []);
    const agirliklar: Record<string, string> = {};
    for (const oge of gelen.ogeler ?? []) agirliklar[oge.anahtar] = String(oge.agirlik);
    setTaban(agirliklar);
    if (gelen.oyun?.carpanBps != null) {
      setYuzde((gelen.oyun.carpanBps / 100).toFixed(1).replace(/\.0$/, ''));
    }
    setKuralOge((onceki) => {
      const varMi = (gelen.ogeler ?? []).some((oge) => oge.anahtar === onceki);
      return varMi ? onceki : (gelen.ogeler?.[0]?.anahtar ?? '');
    });
  }, []);

  const yukle = useCallback(async (kod: string) => {
    setYukleniyor(true);
    try {
      uygula(await cikisPanoGetir(kod || null));
    } catch (error) {
      setNot(error instanceof Error ? error.message : 'Yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, [uygula]);

  useFocusEffect(useCallback(() => {
    if (!yetkili) return;
    if (typeof params.oyun === 'string' && params.oyun) oyunRef.current = params.oyun;
    void yukle(oyunRef.current);
  }, [yetkili, params.oyun, yukle]));

  const siraAyni = useMemo(() => {
    const sunucu = (pano?.sira ?? []).map((adim) => adim.anahtar).join('|');
    return sunucu === sira.map((adim) => adim.anahtar).join('|');
  }, [pano?.sira, sira]);

  const tabanToplam = useMemo(
    () => Object.values(taban).reduce((sum, value) => sum + (tam(value) ?? 0), 0),
    [taban],
  );

  async function calistir(is: Promise<CikisPano>, mesaj: string) {
    try {
      const gelen = await is;
      uygula(gelen);
      const tur = gelen.oyun?.tur;
      setNot(
        tur === 'carpan'
          ? `${mesaj} Sonraki çevirmede geçerli.`
          : `${mesaj} Sonraki turda geçerli. Açık tur değişmez.`,
      );
    } catch (error) {
      setNot(error instanceof Error ? error.message : 'Kayıt olmadı');
    }
  }

  if (!yetkili) {
    return (
      <Screen>
        <EkranBasligi title="Çıkış planı" onBack={() => router.back()} />
        <Text style={styles.uyari}>Bu ekran yalnız admin içindir.</Text>
      </Screen>
    );
  }

  const secili = pano?.oyun;
  const carpan = secili?.tur === 'carpan';

  return (
    <Screen>
      <EkranBasligi title="Çıkış planı" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.icerik}>
        <Text style={styles.not}>
          Kaydettiğin anda canlıya yazılır. Sıra kesin çıkar. Sıra bitince saat kuralı, o da yoksa normal sıklık seçer.
        </Text>
        {pano?.simdi ? <Text style={styles.saat}>İstanbul saati {pano.simdi.etiket}</Text> : null}

        <View style={styles.satir}>
          {(pano?.oyunlar ?? []).map((oge) => (
            <Pressable
              key={oge.kod}
              onPress={() => {
                oyunRef.current = oge.kod;
                setOyun(oge.kod);
                void yukle(oge.kod);
              }}
              style={[styles.cip, oyun === oge.kod && styles.cipAcik]}
            >
              <Text style={[styles.cipYazi, oyun === oge.kod && styles.cipYaziAcik]}>{oge.ad}</Text>
            </Pressable>
          ))}
        </View>

        {yukleniyor ? <ActivityIndicator color={RenkTokenlari.accent} /> : null}
        {secili ? <Text style={styles.aciklama}>{secili.aciklama}</Text> : null}
        {not ? <Text style={styles.sonuc}>{not}</Text> : null}

        {secili ? (
          <>
            <View style={styles.kart}>
              <Text style={styles.baslik}>Sıradaki çıkışlar</Text>
              <Text style={styles.yardim}>
                {carpan
                  ? 'Küre çıktığında üstten alta bu değerler gelir. Tahmin yazanlar kesin değildir.'
                  : 'Üstteki sıra kesin. Tahmin yazan satırlar sıklığa göre örnektir, tur açılınca yeniden seçilir.'}
              </Text>
              {(pano?.onizleme ?? []).length === 0 ? (
                <Text style={styles.yardim}>Henüz öğe yok.</Text>
              ) : (
                (pano?.onizleme ?? []).map((adim, index) => (
                  <Text key={`${adim.anahtar}-${index}`} style={styles.satirYazi}>
                    {index + 1}. {adim.ad}
                    {adim.kaynak === 'sira' ? '  ·  sıra' : '  ·  tahmin'}
                  </Text>
                ))
              )}
            </View>

            <View style={styles.kart}>
              <Text style={styles.baslik}>{carpan ? 'Sıradaki çarpanlar' : 'Meyve sırası'}</Text>
              <Text style={styles.yardim}>
                {carpan
                  ? 'Ekle, yukarı aşağı diz, kaydet. Bu liste kürenin değeridir; kürenin çıkıp çıkmaması alttaki yüzdedir.'
                  : 'Ekle, yukarı aşağı diz, kaydet. Bir sonraki tur 1. satırdaki meyvedir.'}
              </Text>
              {sira.length === 0 ? <Text style={styles.yardim}>Sıra boş. Saat kuralı ve normal sıklık kullanılır.</Text> : null}
              {sira.map((adim, index) => (
                <View key={adim.id} style={styles.adim}>
                  <Text style={styles.satirYazi}>{index + 1}. {adim.ad}</Text>
                  <View style={styles.satir}>
                    <Pressable onPress={() => tasi(index, -1)} style={styles.kucuk}><Text style={styles.kucukYazi}>Yukarı</Text></Pressable>
                    <Pressable onPress={() => tasi(index, 1)} style={styles.kucuk}><Text style={styles.kucukYazi}>Aşağı</Text></Pressable>
                    <Pressable onPress={() => setSira((onceki) => onceki.filter((_, i) => i !== index))} style={styles.kucuk}>
                      <Text style={styles.kucukYazi}>Sil</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <View style={styles.satir}>
                {(pano?.ogeler ?? []).map((oge) => (
                  <Pressable
                    key={oge.anahtar}
                    onPress={() => setSira((onceki) => [
                      ...onceki,
                      { id: `yeni-${oge.anahtar}-${onceki.length}-${Date.now()}`, anahtar: oge.anahtar, ad: oge.ad },
                    ])}
                    style={styles.cip}
                  >
                    <Text style={styles.cipYazi}>{oge.ad}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[styles.kaydet, siraAyni && styles.kaydetSoluk]}
                disabled={siraAyni}
                onPress={() => void calistir(
                  cikisSiraKaydet(secili.kod, sira.map((adim) => adim.anahtar)),
                  'Sıra kaydedildi.',
                )}
              >
                <Text style={styles.kaydetYazi}>Sırayı kaydet</Text>
              </Pressable>
            </View>

            {carpan ? (
              <View style={styles.kart}>
                <Text style={styles.baslik}>Çarpan ne sıklıkla çıksın</Text>
                <Text style={styles.yardim}>
                  100 kutudan kaçı çarpan olsun. Şu an yüksekse büyük kazanç sıklaşır. 0 yazarsan çarpan çıkmaz.
                </Text>
                <TextInput
                  style={styles.girdi}
                  keyboardType="decimal-pad"
                  value={yuzde}
                  onChangeText={setYuzde}
                />
                <Pressable
                  style={styles.kaydet}
                  onPress={() => {
                    const yuz = Number(yuzde.replace(',', '.'));
                    if (!Number.isFinite(yuz) || yuz < 0 || yuz > 30) {
                      setNot('Yüzde 0 ile 30 arasında olmalı');
                      return;
                    }
                    void calistir(cikisBpsKaydet(secili.kod, Math.round(yuz * 100)), 'Çarpan sıklığı kaydedildi.');
                  }}
                >
                  <Text style={styles.kaydetYazi}>Yüzdeyi kaydet</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.kart}>
              <Text style={styles.baslik}>Hangi gün, hangi saat</Text>
              <Text style={styles.yardim}>
                Seçtiğin aralıkta bu öğe daha sık çıkar. En fazla dolunca normal sıklığa döner. Boş bırakırsan sınır yoktur. Bugün seçeneği gece yarısı kapanır.
              </Text>
              <View style={styles.satir}>
                {(pano?.ogeler ?? []).map((oge) => (
                  <Pressable
                    key={oge.anahtar}
                    onPress={() => setKuralOge(oge.anahtar)}
                    style={[styles.cip, kuralOge === oge.anahtar && styles.cipAcik]}
                  >
                    <Text style={[styles.cipYazi, kuralOge === oge.anahtar && styles.cipYaziAcik]}>{oge.ad}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.satir}>
                {GUNLER.map((secim) => (
                  <Pressable key={secim.id} onPress={() => setGun(secim.id)} style={[styles.cip, gun === secim.id && styles.cipAcik]}>
                    <Text style={[styles.cipYazi, gun === secim.id && styles.cipYaziAcik]}>{secim.ad}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.satir}>
                {SAATLER.map((secim) => (
                  <Pressable
                    key={secim.ad}
                    onPress={() => { setSaatBas(secim.bas); setSaatBit(secim.bit); }}
                    style={styles.cip}
                  >
                    <Text style={styles.cipYazi}>{secim.ad}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.ikili}>
                <View style={styles.alan}>
                  <Text style={styles.etiket}>Başlangıç saati</Text>
                  <TextInput style={styles.girdi} keyboardType="number-pad" value={saatBas} onChangeText={setSaatBas} />
                </View>
                <View style={styles.alan}>
                  <Text style={styles.etiket}>Bitiş saati</Text>
                  <TextInput style={styles.girdi} keyboardType="number-pad" value={saatBit} onChangeText={setSaatBit} />
                </View>
              </View>
              <Text style={styles.etiket}>Sıklık — büyük sayı daha sık</Text>
              <TextInput style={styles.girdi} keyboardType="number-pad" value={kuralSiklik} onChangeText={setKuralSiklik} />
              <Text style={styles.etiket}>En fazla kaç kez — boşsa sınırsız</Text>
              <TextInput style={styles.girdi} keyboardType="number-pad" value={enFazla} onChangeText={setEnFazla} placeholder="sınır yok" placeholderTextColor="rgba(255,255,255,0.35)" />
              <Pressable
                style={styles.kaydet}
                onPress={() => {
                  const bas = tam(saatBas);
                  const bit = tam(saatBit);
                  const siklik = tam(kuralSiklik);
                  const sinir = enFazla.trim() === '' ? null : tam(enFazla);
                  if (bas === null || bit === null || siklik === null || (enFazla.trim() !== '' && sinir === null)) {
                    setNot('Saat ve sıklık sayı olmalı');
                    return;
                  }
                  void calistir(
                    cikisKuralEkle(secili.kod, kuralOge, gun, bas, bit, siklik, sinir),
                    'Saat kuralı kaydedildi.',
                  );
                }}
              >
                <Text style={styles.kaydetYazi}>Kuralı kaydet</Text>
              </Pressable>
              {(pano?.kurallar ?? []).map((kural) => (
                <View key={kural.id} style={styles.adim}>
                  <Text style={styles.satirYazi}>
                    {kural.ad} · {kural.gun} {String(kural.saatBas).padStart(2, '0')}–{String(kural.saatBit).padStart(2, '0')}
                  </Text>
                  <Text style={styles.yardim}>
                    Sıklık {kural.agirlik}
                    {kural.enFazla == null ? ' · sınır yok' : ` · ${kural.kullanilan}/${kural.enFazla}`}
                    {kural.uyuyor ? ' · şu an geçerli' : ''}
                  </Text>
                  <Pressable
                    onPress={() => Alert.alert('Kural silinsin mi?', `${kural.ad} kuralı kalkar.`, [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'Sil', style: 'destructive', onPress: () => void calistir(cikisKuralSil(kural.id), 'Kural silindi.') },
                    ])}
                    style={styles.kucuk}
                  >
                    <Text style={styles.kucukYazi}>Sil</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.kart}>
              <Text style={styles.baslik}>Normal sıklık</Text>
              <Text style={styles.yardim}>
                Kural yokken veya kuralın sınırı dolunca bu sayılar geçerlidir. Yüzde, bu listedeki paydır.
              </Text>
              {(pano?.ogeler ?? []).map((oge) => (
                <View key={oge.anahtar} style={styles.adim}>
                  <Text style={styles.etiket}>
                    {oge.ad} · {payYazi(tam(taban[oge.anahtar] ?? '') ?? 0, tabanToplam)}
                  </Text>
                  <TextInput
                    style={styles.girdi}
                    keyboardType="number-pad"
                    value={taban[oge.anahtar] ?? ''}
                    onChangeText={(value) => setTaban((onceki) => ({ ...onceki, [oge.anahtar]: value }))}
                  />
                </View>
              ))}
              <Pressable
                style={styles.kaydet}
                onPress={() => {
                  const ogeler = (pano?.ogeler ?? []).map((oge) => ({
                    anahtar: oge.anahtar,
                    agirlik: tam(taban[oge.anahtar] ?? '') ?? -1,
                  }));
                  if (ogeler.some((oge) => oge.agirlik < 0)) {
                    setNot('Sıklıklar sayı olmalı');
                    return;
                  }
                  void calistir(cikisTabanKaydet(secili.kod, ogeler), 'Normal sıklık kaydedildi.');
                }}
              >
                <Text style={styles.kaydetYazi}>Sıklığı kaydet</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );

  function tasi(index: number, yon: -1 | 1) {
    setSira((onceki) => {
      const hedef = index + yon;
      if (hedef < 0 || hedef >= onceki.length) return onceki;
      const sonraki = onceki.slice();
      const [satir] = sonraki.splice(index, 1);
      if (!satir) return onceki;
      sonraki.splice(hedef, 0, satir);
      return sonraki;
    });
  }
}

const styles = StyleSheet.create({
  icerik: { padding: 16, gap: 12, paddingBottom: 48 },
  not: { ...TipografiTokenlari.body, color: 'rgba(255,255,255,0.78)', lineHeight: 22 },
  aciklama: { ...TipografiTokenlari.caption, color: 'rgba(255,255,255,0.62)', lineHeight: 18 },
  saat: { ...TipografiTokenlari.caption, color: '#F6E27A' },
  sonuc: { ...TipografiTokenlari.caption, color: '#D9CCB0' },
  uyari: { color: '#F0C9A0', padding: 16 },
  kart: {
    backgroundColor: 'rgba(12,14,22,0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 8,
  },
  baslik: { ...TipografiTokenlari.h2, color: '#FBF7EE', fontWeight: '700' },
  yardim: { ...TipografiTokenlari.caption, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },
  satirYazi: { ...TipografiTokenlari.body, color: '#FBF7EE' },
  etiket: { ...TipografiTokenlari.caption, color: 'rgba(255,255,255,0.7)' },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ikili: { flexDirection: 'row', gap: 10 },
  alan: { flex: 1, gap: 4 },
  adim: { gap: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  girdi: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FBF7EE',
  },
  cip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cipAcik: { borderColor: '#E8C547', backgroundColor: 'rgba(232,197,71,0.12)' },
  cipYazi: { ...TipografiTokenlari.caption, color: 'rgba(255,255,255,0.75)' },
  cipYaziAcik: { color: '#F6E27A' },
  kucuk: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  kucukYazi: { ...TipografiTokenlari.caption, color: 'rgba(255,255,255,0.8)' },
  kaydet: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(232,197,71,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.4)',
  },
  kaydetSoluk: { opacity: 0.4 },
  kaydetYazi: { color: '#F6E27A', fontWeight: '700' },
});
