import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { BlogSonYazilar } from '../blog/BlogSonYazilar';
import { TanitimSeo } from './TanitimSeo';
import { useAuth } from '../../contexts/AuthContext';
import { useDil } from '../../i18n/DilSaglayici';
import { RenkTokenlariKoyu as C } from '../../tasarim-sistemi/tema/RenkPaletleri';
import { tanitimMetin } from './tanitimMetin';
import { TanitimVideo } from './TanitimVideo';
import {
  TanitimMedyaUri,
  VARSAYILAN_TANITIM_MEDYA,
  WebTanitimMedyaGetir,
  type WebTanitimMedya,
} from './WebTanitimMedya';

function posterYolu(url: string): string {
  if (url.startsWith('/tanitim/') && url.endsWith('.mp4')) return url.replace(/\.mp4$/, '.jpg');
  return '/tanitim/gorusme.jpg';
}

export function WebTanitimAnasayfa() {
  const { dil } = useDil();
  const { session } = useAuth();
  const m = tanitimMetin(dil);
  const { width } = useWindowDimensions();
  const genis = width >= 980;
  const dar = width < 760;
  const nabiz = useRef(new Animated.Value(1)).current;
  const [sohbetN, setSohbetN] = useState(1);
  const [klipler, setKlipler] = useState<WebTanitimMedya[]>(VARSAYILAN_TANITIM_MEDYA);
  const [kaydir, setKaydir] = useState(0);

  useEffect(() => {
    let iptal = false;
    void WebTanitimMedyaGetir('anasayfa').then((rows) => {
      if (iptal || rows.length === 0) return;
      setKlipler(rows);
      setKaydir(0);
    });
    return () => {
      iptal = true;
    };
  }, []);

  useEffect(() => {
    if (klipler.length < 2) return;
    const t = setInterval(() => {
      setKaydir((n) => (n + 1) % klipler.length);
    }, 9000);
    return () => clearInterval(t);
  }, [klipler.length]);

  const al = (i: number) => {
    const oge = klipler[(i + kaydir) % klipler.length];
    const url = TanitimMedyaUri(oge.public_url, false);
    return { url, poster: posterYolu(url) };
  };
  const yeniSahne = '/tanitim/gorusme-yeni.mp4';
  const kullanilan = new Set<string>([yeniSahne]);
  const benzersiz = (tercih: number) => {
    const adet = Math.max(klipler.length, 1);
    for (let adim = 0; adim < adet; adim += 1) {
      const aday = al((tercih + adim) % adet);
      if (kullanilan.has(aday.url)) continue;
      kullanilan.add(aday.url);
      return aday;
    }
    return al(tercih % adet);
  };
  const gorusme = benzersiz(0);
  const canli = benzersiz(1);
  const arkadas = benzersiz(2);

  useEffect(() => {
    const dongu = Animated.loop(
      Animated.sequence([
        Animated.timing(nabiz, { toValue: 0.25, duration: 700, useNativeDriver: false }),
        Animated.timing(nabiz, { toValue: 1, duration: 700, useNativeDriver: false }),
      ]),
    );
    dongu.start();
    return () => dongu.stop();
  }, [nabiz]);

  useEffect(() => {
    setSohbetN(1);
    const t = setInterval(() => {
      setSohbetN((n) => (n >= m.sohbet.length ? 1 : n + 1));
    }, 1600);
    return () => clearInterval(t);
  }, [dil, m.sohbet.length]);

  return (
    <View>
      <TanitimSeo yol="/" />

      <View style={[styles.hero, dar && styles.heroDar]}>
        <TanitimVideo key={gorusme.url} kaynak={gorusme.url} poster={gorusme.poster} />
        <LinearGradient
          colors={['rgba(8,8,17,0.15)', 'rgba(8,8,17,0.55)', '#080811']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroIc, genis && styles.heroIcGenis, dar && styles.heroIcDar]}>
          <View style={styles.rozet}>
            <Animated.View style={[styles.rozetNokta, { opacity: nabiz }]} />
            <Text style={styles.rozetYazi}>{m.heroRozet}</Text>
          </View>
          <Text style={[styles.heroBaslik, dar && styles.heroBaslikDar]}>{m.heroBaslik}</Text>
          <Text style={[styles.heroAlt, dar && styles.heroAltDar]}>{m.heroAlt}</Text>
          <View style={styles.heroBtnler}>
            <Pressable
              style={styles.anaBtn}
              onPress={() =>
                router.push(
                  (session ? '/(tabs)' : '/(auth)/register') as Href,
                )
              }
            >
              <Text style={styles.anaBtnYazi}>
                {session ? m.uygulamayaGec : m.kayit}
              </Text>
            </Pressable>
            <Pressable
              style={styles.ikincilBtn}
              onPress={() => router.push('/tanitim/ozellikler' as Href)}
            >
              <Text style={styles.ikincilBtnYazi}>{m.navOzellik}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.serit}>
        <Animated.View style={[styles.rozetNokta, { opacity: nabiz }]} />
        {m.canliSerit.map((satir) => (
          <Text key={satir} style={styles.seritYazi}>
            {satir}
          </Text>
        ))}
      </View>

      <View style={[styles.izgara, genis && styles.izgaraGenis]}>
        <Sahne
          key={yeniSahne}
          video={yeniSahne}
          poster="/tanitim/gorusme-yeni.jpg"
          baslik={m.sahneGorusme}
          alt={m.sahneGorusmeAlt}
          canli={m.heroRozet}
          nabiz={nabiz}
        />
        <Sahne
          key={canli.url}
          video={canli.url}
          poster={canli.poster}
          baslik={m.sahneCanli}
          alt={m.sahneCanliAlt}
          canli={m.heroRozet}
          nabiz={nabiz}
        />
      </View>

      <View style={[styles.ikili, genis && styles.ikiliGenis]}>
        <View style={styles.sohbetKart}>
          <Text style={styles.kartBaslik}>{m.sahneMesaj}</Text>
          <Text style={styles.kartAlt}>{m.sahneMesajAlt}</Text>
          <View style={styles.sohbetKutu}>
            {m.sohbet.slice(0, sohbetN).map((satir, i) => (
              <View
                key={satir}
                style={[styles.balon, i % 2 === 1 ? styles.balonSag : styles.balonSol]}
              >
                <Text style={styles.balonYazi}>{satir}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.kesfetKart}>
          <TanitimVideo key={arkadas.url} kaynak={arkadas.url} poster={arkadas.poster} />
          <LinearGradient
            colors={['rgba(8,8,17,0.05)', '#080811']}
            style={styles.kesfetGradient}
          />
          <View style={styles.kesfetIc}>
            <Text style={styles.kartBaslik}>{m.sahneKesfet}</Text>
            <Text style={styles.kartAlt}>{m.sahneKesfetAlt}</Text>
            <View style={styles.cipSatir}>
              {m.kesfetKart.map((ad) => (
                <View key={ad} style={styles.cip}>
                  <Text style={styles.cipYazi}>{ad}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.blok}>
        <Text style={styles.blokBaslik}>{m.ozelliklerBaslik}</Text>
        <Text style={styles.blokAlt}>{m.ozelliklerAlt}</Text>
        <View style={[styles.ozellikIzgara, genis && styles.ozellikIzgaraGenis]}>
          {m.ozellikler.map((oge, i) => (
            <View key={oge.baslik} style={styles.ozellikKart}>
              <Text style={styles.ozellikNo}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.ozellikBaslik}>{oge.baslik}</Text>
              <Text style={styles.ozellikMetin}>{oge.metin}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.ikili, genis && styles.ikiliGenis, styles.blok]}>
        <BilgiKart
          baslik={m.coinBaslik}
          alt={m.coinAlt}
          buton={m.coinButon}
          href={'/tanitim/coinler' as Href}
        />
        <BilgiKart
          baslik={m.meyveBaslik}
          alt={m.meyveAlt}
          buton={m.meyveButon}
          href={'/tanitim/meyve' as Href}
        />
      </View>

      <View style={styles.blok}>
        <Text style={styles.blokBaslik}>{m.vizyonBaslik}</Text>
        <Text style={styles.vizyon}>{m.vizyonGovde}</Text>
        <Pressable style={styles.ikincilBtn} onPress={() => router.push('/tanitim/hakkinda' as Href)}>
          <Text style={styles.ikincilBtnYazi}>{m.navHakkinda}</Text>
        </Pressable>
      </View>

      <View style={[styles.ikili, genis && styles.ikiliGenis, styles.blok]}>
        <BilgiKart
          baslik={m.hakkindaBaslik}
          alt={m.hakkindaGovde}
          buton={m.hakkindaButon}
          href={'/tanitim/hakkinda' as Href}
        />
        <BilgiKart
          baslik={m.politikaBaslik}
          alt={m.politikaAlt}
          buton={m.politikaButon}
          href={'/politika' as Href}
        />
      </View>
      <BlogSonYazilar />
    </View>
  );
}

function Sahne({
  video,
  poster,
  baslik,
  alt,
  canli,
  nabiz,
}: {
  video: string;
  poster: string;
  baslik: string;
  alt: string;
  canli: string;
  nabiz: Animated.Value;
}) {
  return (
    <View style={styles.sahne}>
      <TanitimVideo kaynak={video} poster={poster} />
      <LinearGradient
        colors={['rgba(8,8,17,0.05)', 'rgba(8,8,17,0.88)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.sahneUst}>
        <View style={styles.rozet}>
          <Animated.View style={[styles.rozetNokta, { opacity: nabiz }]} />
          <Text style={styles.rozetYazi}>{canli}</Text>
        </View>
      </View>
      <View style={styles.sahneAlt}>
        <Text style={styles.kartBaslik}>{baslik}</Text>
        <Text style={styles.kartAltAcik}>{alt}</Text>
      </View>
    </View>
  );
}

function BilgiKart({
  baslik,
  alt,
  buton,
  href,
}: {
  baslik: string;
  alt: string;
  buton: string;
  href: Href;
}) {
  return (
    <View style={styles.bilgi}>
      <Text style={styles.kartBaslik}>{baslik}</Text>
      <Text style={styles.kartAlt}>{alt}</Text>
      <Pressable style={styles.ikincilBtn} onPress={() => router.push(href)}>
        <Text style={styles.ikincilBtnYazi}>{buton}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  serit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  seritYazi: { color: C.textMuted, fontWeight: '700', fontSize: 13 },
  vizyon: { color: C.textMuted, fontSize: 16, lineHeight: 26, maxWidth: 760 },
  hero: { minHeight: 520, justifyContent: 'flex-end' },
  heroDar: { minHeight: 460 },
  heroIc: { paddingHorizontal: 22, paddingBottom: 36, paddingTop: 80, maxWidth: 760 },
  heroIcDar: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 96 },
  heroIcGenis: { paddingHorizontal: 48, paddingBottom: 56 },
  rozet: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232,64,145,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  rozetNokta: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D6D' },
  rozetYazi: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.6 },
  heroBaslik: { color: '#fff', fontSize: 40, lineHeight: 46, fontWeight: '800' },
  heroBaslikDar: { fontSize: 32, lineHeight: 40 },
  heroAlt: { color: 'rgba(255,255,255,0.82)', fontSize: 17, lineHeight: 26, marginTop: 12 },
  heroAltDar: { fontSize: 16, lineHeight: 26, marginTop: 14 },
  heroBtnler: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  anaBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anaBtnYazi: { color: '#12040C', fontWeight: '800', fontSize: 15 },
  ikincilBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  ikincilBtnYazi: { color: '#fff', fontWeight: '700' },
  izgara: { paddingHorizontal: 22, gap: 18, marginTop: 28 },
  izgaraGenis: { flexDirection: 'row', paddingHorizontal: 40 },
  sahne: {
    flex: 1,
    minHeight: 360,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: C.bgCard,
  },
  sahneUst: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sahneAlt: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  ikili: { paddingHorizontal: 22, gap: 18, marginTop: 22 },
  ikiliGenis: { flexDirection: 'row', paddingHorizontal: 40 },
  sohbetKart: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 320,
  },
  kesfetKart: {
    flex: 1,
    minHeight: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: C.bgCard,
  },
  kesfetGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  kesfetIc: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  kartEtiket: { color: C.accent, fontSize: 12, fontWeight: '700' },
  kartBaslik: { color: C.text, fontSize: 24, fontWeight: '800', marginTop: 6 },
  kartAlt: { color: C.textMuted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  kartAltAcik: { color: 'rgba(255,255,255,0.86)', fontSize: 15, lineHeight: 22, marginTop: 6 },
  sohbetKutu: { marginTop: 16, gap: 8 },
  balon: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  balonSol: { alignSelf: 'flex-start', backgroundColor: C.surface },
  balonSag: { alignSelf: 'flex-end', backgroundColor: C.deepPlum },
  balonYazi: { color: C.text, fontSize: 15 },
  cipSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  cip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cipYazi: { color: '#fff', fontSize: 12, fontWeight: '700' },
  blok: { paddingHorizontal: 22, marginTop: 48 },
  blokBaslik: { color: C.text, fontSize: 32, fontWeight: '800' },
  blokAlt: { color: C.textMuted, marginTop: 6, marginBottom: 14, fontSize: 15 },
  ozellikIzgara: { gap: 10 },
  ozellikIzgaraGenis: { flexDirection: 'row', flexWrap: 'wrap' },
  ozellikKart: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    flexGrow: 1,
    flexBasis: 240,
  },
  ozellikNo: { color: C.primary, fontWeight: '800', fontSize: 13 },
  ozellikBaslik: { color: C.text, fontSize: 17, fontWeight: '800', marginTop: 6 },
  ozellikMetin: { color: C.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  bilgi: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
});
