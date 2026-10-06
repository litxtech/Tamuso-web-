import React, { useEffect, useRef } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, router } from 'expo-router';
import Head from 'expo-router/head';
import { useAuth } from '../../contexts/AuthContext';
import { useDil } from '../../i18n/DilSaglayici';
import { RenkTokenlariKoyu as C } from '../../tasarim-sistemi/tema/RenkPaletleri';
import { tanitimMetin } from './tanitimMetin';

const MEYVELER = [
  { simge: '🍒', renk: '#C4314B' },
  { simge: '🍋', renk: '#E6B325' },
  { simge: '🍇', renk: '#6B3FA0' },
  { simge: '🍉', renk: '#2E8B57' },
  { simge: '🍊', renk: '#E07A2F' },
  { simge: '🥝', renk: '#3D8C4A' },
  { simge: '🍎', renk: '#D64545' },
  { simge: '🍓', renk: '#C23B5A' },
];

function Sayfa({
  baslik,
  alt,
  children,
}: {
  baslik: string;
  alt: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.sayfa}>
      <Head>
        <title>{`${baslik} · Tamuso`}</title>
        <meta name="description" content={alt} />
      </Head>
      <Text style={styles.baslik}>{baslik}</Text>
      <Text style={styles.alt}>{alt}</Text>
      {children}
    </View>
  );
}

export function WebTanitimOzellikler() {
  const { dil } = useDil();
  const m = tanitimMetin(dil);
  return (
    <Sayfa baslik={m.ozelliklerBaslik} alt={m.ozelliklerAlt}>
      {m.ozellikler.map((oge, i) => (
        <View key={oge.baslik} style={styles.satir}>
          <Text style={styles.no}>{String(i + 1).padStart(2, '0')}</Text>
          <View style={styles.satirMetin}>
            <Text style={styles.satirBaslik}>{oge.baslik}</Text>
            <Text style={styles.satirAlt}>{oge.metin}</Text>
          </View>
        </View>
      ))}
    </Sayfa>
  );
}

export function WebTanitimCoinler() {
  const { dil } = useDil();
  const m = tanitimMetin(dil);
  return (
    <Sayfa baslik={m.coinBaslik} alt={m.coinAlt}>
      {m.coinMaddeler.map((madde) => (
        <Text key={madde} style={styles.madde}>
          {madde}
        </Text>
      ))}
      <Pressable style={styles.btn} onPress={() => router.push('/(auth)/login' as Href)}>
        <Text style={styles.btnYazi}>{m.giris}</Text>
      </Pressable>
    </Sayfa>
  );
}

export function WebTanitimMeyve() {
  const { dil } = useDil();
  const { session } = useAuth();
  const m = tanitimMetin(dil);
  const don = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dongu = Animated.loop(
      Animated.timing(don, {
        toValue: 1,
        duration: 9000,
        useNativeDriver: false,
      }),
    );
    dongu.start();
    return () => dongu.stop();
  }, [don]);

  const aci = don.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const ters = don.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <Sayfa baslik={m.meyveBaslik} alt={m.meyveAlt}>
      <View style={styles.carkAlan}>
        <View style={styles.carkOk} />
        <Animated.View style={[styles.cark, { transform: [{ rotate: aci }] }]}>
          {MEYVELER.map((meyve, i) => {
            const rad = (Math.PI * 2 * i) / MEYVELER.length - Math.PI / 2;
            const x = Math.cos(rad) * 108;
            const y = Math.sin(rad) * 108;
            return (
              <Animated.View
                key={meyve.simge}
                style={[
                  styles.dilim,
                  {
                    backgroundColor: meyve.renk,
                    left: 140 + x - 26,
                    top: 140 + y - 26,
                    transform: [{ rotate: ters }],
                  },
                ]}
              >
                <Text style={styles.meyve}>{meyve.simge}</Text>
              </Animated.View>
            );
          })}
        </Animated.View>
        <View style={styles.gobek} pointerEvents="none">
          <Text style={styles.gobekSayi}>8</Text>
          <Text style={styles.gobekYazi}>FRUIT</Text>
        </View>
      </View>
      {m.meyveMaddeler.map((madde) => (
        <Text key={madde} style={styles.madde}>
          {madde}
        </Text>
      ))}
      <Pressable
        style={styles.btn}
        onPress={() =>
          router.push((session ? '/oyun/fruit-wheel' : '/(auth)/login') as Href)
        }
      >
        <Text style={styles.btnYazi}>{session ? m.meyveButon : m.meyveGiris}</Text>
      </Pressable>
    </Sayfa>
  );
}

export function WebTanitimHakkinda() {
  const { dil } = useDil();
  const m = tanitimMetin(dil);
  return (
    <Sayfa baslik={m.hakkindaBaslik} alt={m.hakkindaGovde}>
      {m.hakkindaMaddeler.map((madde) => (
        <Text key={madde} style={styles.madde}>
          {madde}
        </Text>
      ))}
      <Text style={styles.araBaslik}>{m.vizyonBaslik}</Text>
      <Text style={styles.govde}>{m.vizyonGovde}</Text>
      {m.vizyonMaddeler.map((madde) => (
        <Text key={madde} style={styles.madde}>
          {madde}
        </Text>
      ))}
      <Pressable
        style={styles.btn}
        onPress={() => router.push('/tanitim/ozellikler' as Href)}
      >
        <Text style={styles.btnYazi}>{m.navOzellik}</Text>
      </Pressable>
    </Sayfa>
  );
}

function YazismaSayfasi({
  baslik,
  govde,
  maddeler,
  mail,
}: {
  baslik: string;
  govde: string;
  maddeler: string[];
  mail: string;
}) {
  return (
    <Sayfa baslik={baslik} alt={govde}>
      {maddeler.map((madde) => (
        <Text key={madde} style={styles.madde}>
          {madde}
        </Text>
      ))}
      <Pressable
        style={styles.btn}
        onPress={() => void Linking.openURL('mailto:support@litxtech.com')}
      >
        <Text style={styles.btnYazi}>{mail}</Text>
      </Pressable>
    </Sayfa>
  );
}

export function WebTanitimYatirim() {
  const { dil } = useDil();
  const m = tanitimMetin(dil);
  return (
    <YazismaSayfasi
      baslik={m.yatirimBaslik}
      govde={m.yatirimGovde}
      maddeler={m.yatirimMaddeler}
      mail={m.mailYaz}
    />
  );
}

export function WebTanitimIsbirligi() {
  const { dil } = useDil();
  const m = tanitimMetin(dil);
  return (
    <YazismaSayfasi
      baslik={m.isbirligiBaslik}
      govde={m.isbirligiGovde}
      maddeler={m.isbirligiMaddeler}
      mail={m.mailYaz}
    />
  );
}

const styles = StyleSheet.create({
  sayfa: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 28,
    gap: 10,
  },
  baslik: { color: C.text, fontSize: 36, fontWeight: '800' },
  alt: { color: C.textMuted, fontSize: 16, lineHeight: 24, marginBottom: 8 },
  satir: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: C.bgCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  no: { color: C.primary, fontWeight: '800', width: 28, marginTop: 2 },
  satirMetin: { flex: 1 },
  satirBaslik: { color: C.text, fontSize: 17, fontWeight: '800' },
  satirAlt: { color: C.textMuted, marginTop: 4, lineHeight: 20 },
  madde: {
    color: C.text,
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  btn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnYazi: { color: '#12040C', fontWeight: '800' },
  araBaslik: { color: C.text, fontSize: 28, fontWeight: '800', marginTop: 18 },
  govde: { color: C.textMuted, fontSize: 16, lineHeight: 26 },
  carkAlan: { height: 360, alignItems: 'center', justifyContent: 'center' },
  carkOk: {
    position: 'absolute',
    top: 18,
    zIndex: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F4D27A',
  },
  cark: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 10,
    borderColor: '#F4D27A',
    backgroundColor: '#120814',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dilim: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  meyve: { fontSize: 26 },
  gobek: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#1C1024',
    borderWidth: 2,
    borderColor: '#F4D27A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gobekSayi: { color: '#F4D27A', fontSize: 28, fontWeight: '900' },
  gobekYazi: { color: C.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
});
