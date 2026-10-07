import React, { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { DESTEKLENEN_DILLER, DIL_ETIKETLERI, UlkeKodundanDil } from '../../i18n/diller';
import { useDil } from '../../i18n/DilSaglayici';
import { PlatformIletisimAyariniGetir } from '../platform-iletisim/islemler/PlatformIletisimIslemleri';
import { RenkTokenlariKoyu as C } from '../../tasarim-sistemi/tema/RenkPaletleri';
import { UygulamaKimligi } from '../../yapilandirma/UygulamaKimligi';
import { tanitimMetin } from './tanitimMetin';

type Nav = { etiket: string; href?: Href; destek?: boolean };

function disAc(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

function WebSiteMobilOlcek() {
  const yol = usePathname();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined') return;
    const meta = document.querySelector('meta[name="viewport"]');
    const normal =
      'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content';
    const uzak =
      'width=device-width, initial-scale=0.75, minimum-scale=0.5, viewport-fit=cover, interactive-widget=resizes-content';
    const uygula = () => {
      const pazarlama = yol === '/' || yol.startsWith('/tanitim');
      const kisa = window.screen
        ? Math.min(window.screen.width, window.screen.height)
        : window.innerWidth;
      const dar = kisa < 760;
      document.documentElement.removeAttribute('data-web-site');
      meta?.setAttribute('content', pazarlama && dar ? uzak : normal);
    };
    uygula();
    window.addEventListener('resize', uygula);
    return () => {
      window.removeEventListener('resize', uygula);
      document.documentElement.removeAttribute('data-web-site');
      meta?.setAttribute('content', normal);
    };
  }, [yol]);
  return null;
}

export function WebTanitimKabuk({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const dar = width < 760;
  const { session } = useAuth();
  const { dil, dilModu, dilDegistir, geciciDilUygula } = useDil();
  const m = tanitimMetin(dil);
  const [menu, setMenu] = useState(false);
  const [diller, setDiller] = useState(false);
  const [destek, setDestek] = useState(false);
  const [eposta, setEposta] = useState(UygulamaKimligi.SUPPORT_EMAIL);
  const [whatsapp, setWhatsapp] = useState('905330483061');
  const [whatsappYazi, setWhatsappYazi] = useState('0533 048 30 61');

  const ulkeDenendi = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || dilModu !== 'SYSTEM' || ulkeDenendi.current) return;
    ulkeDenendi.current = true;
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), 2500);
    void fetch('https://ipwho.is/', { signal: kontrol.signal })
      .then((yanit) => yanit.json() as Promise<{ country_code?: string }>)
      .then((veri) => {
        const hedef = UlkeKodundanDil(veri.country_code);
        if (hedef !== dil) void geciciDilUygula(hedef);
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(zaman));
  }, [dil, dilModu, geciciDilUygula]);

  useEffect(() => {
    let iptal = false;
    void PlatformIletisimAyariniGetir().then((ayar) => {
      if (iptal) return;
      if (ayar.support_email) setEposta(ayar.support_email);
      if (ayar.whatsapp_e164) setWhatsapp(ayar.whatsapp_e164.replace(/\D/g, ''));
      if (ayar.whatsapp_gorunen) setWhatsappYazi(ayar.whatsapp_gorunen);
    });
    return () => {
      iptal = true;
    };
  }, []);

  const git = (href: Href) => {
    setMenu(false);
    setDiller(false);
    setDestek(false);
    router.push(href);
  };

  const nav: Nav[] = [
    { etiket: m.navAnasayfa, href: '/' as Href },
    { etiket: m.navBlog, href: '/blog' as Href },
    { etiket: m.navOzellik, href: '/tanitim/ozellikler' as Href },
    { etiket: m.navCoin, href: '/tanitim/coinler' as Href },
    { etiket: m.navMeyve, href: '/tanitim/meyve' as Href },
    { etiket: m.navHakkinda, href: '/tanitim/hakkinda' as Href },
    { etiket: m.navYatirim, href: '/tanitim/yatirim' as Href },
    { etiket: m.navIsbirligi, href: '/tanitim/isbirligi' as Href },
    { etiket: m.navPolitika, href: '/politika' as Href },
    { etiket: m.navDestek, destek: true },
  ];

  const giris = () => {
    setMenu(false);
    if (session) router.replace('/(tabs)' as Href);
    else router.push('/(auth)/login' as Href);
  };

  return (
    <View style={[styles.kok, { paddingTop: insets.top }]}>
      <WebSiteMobilOlcek />
      <View style={styles.ust}>
        <Pressable
          accessibilityLabel={m.menu}
          onPress={() => {
            setDiller(false);
            setMenu((v) => !v);
          }}
          style={styles.ikonBtn}
        >
          <Ionicons name={menu ? 'close' : 'menu'} size={26} color={C.text} />
        </Pressable>
        <Pressable onPress={() => git('/' as Href)} style={styles.marka}>
          <Text style={styles.markaYazi}>TAMUSO</Text>
          <View style={styles.markaCizgi} />
        </Pressable>
        <View style={styles.sag}>
          <Pressable
            accessibilityLabel={m.dil}
            onPress={() => {
              setMenu(false);
              setDiller((v) => !v);
            }}
            style={styles.dilBtn}
          >
            <Text style={styles.dilYazi}>{dil.toUpperCase()}</Text>
            <Ionicons name="chevron-down" size={14} color={C.text} />
          </Pressable>
          <Pressable onPress={giris} style={styles.girisBtn}>
            <Text style={styles.girisYazi}>
              {session ? m.uygulamayaGec : m.giris}
            </Text>
          </Pressable>
        </View>
      </View>

      {diller ? (
        <View style={styles.dilListe}>
          {DESTEKLENEN_DILLER.map((kod) => (
            <Pressable
              key={kod}
              onPress={() => {
                setDiller(false);
                if (kod !== dil) void dilDegistir(kod);
              }}
              style={[styles.dilSatir, kod === dil && styles.dilSatirAktif]}
            >
              <Text style={styles.dilSatirYazi}>{DIL_ETIKETLERI[kod]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ScrollView
        style={styles.kaydir}
        contentContainerStyle={styles.kaydirIc}
        showsVerticalScrollIndicator={false}
      >
        {children}
        <View style={styles.alt}>
          <Text style={styles.altSirket}>{m.footerSirket}</Text>
          <View style={styles.altLinkler}>
            <Pressable onPress={() => git('/blog' as Href)}>
              <Text style={styles.altLink}>{m.navBlog}</Text>
            </Pressable>
            <Pressable onPress={() => git('/politika' as Href)}>
              <Text style={styles.altLink}>{m.navPolitika}</Text>
            </Pressable>
            <Pressable onPress={() => git('/politika/tos' as Href)}>
              <Text style={styles.altLink}>{m.sartlar}</Text>
            </Pressable>
            <Pressable onPress={() => git('/politika/privacy' as Href)}>
              <Text style={styles.altLink}>{m.gizlilik}</Text>
            </Pressable>
            <Pressable onPress={() => git('/politika/child_safety' as Href)}>
              <Text style={styles.altLink}>{m.cocuk}</Text>
            </Pressable>
          </View>
          <Text style={styles.altKucuk}>© {new Date().getFullYear()} Tamuso · LitxTech LLC</Text>
        </View>
      </ScrollView>

      {menu ? (
        <View style={styles.menuPerde}>
          <Pressable style={styles.menuKarart} onPress={() => setMenu(false)} />
          <View style={[styles.menuCekmece, dar && styles.menuCekmeceDar]}>
            <Text style={styles.menuBaslik}>{m.menu}</Text>
            {nav.map((oge) => (
              <Pressable
                key={oge.etiket}
                style={styles.menuSatir}
                onPress={() => {
                  if (oge.destek) {
                    setMenu(false);
                    setDestek(true);
                    return;
                  }
                  if (oge.href) git(oge.href);
                }}
              >
                <Text style={styles.menuSatirYazi}>{oge.etiket}</Text>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </Pressable>
            ))}
            {!session ? (
              <Pressable
                style={styles.menuKayit}
                onPress={() => git('/(auth)/register' as Href)}
              >
                <Text style={styles.menuKayitYazi}>{m.kayit}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel={m.destekBaslik}
        onPress={() => {
          setMenu(false);
          setDestek((v) => !v);
        }}
        style={[styles.destekYuzer, { bottom: 18 + insets.bottom }]}
      >
        <Ionicons name="chatbubbles" size={22} color="#12040C" />
        {dar ? null : <Text style={styles.destekYuzerYazi}>{m.navDestek}</Text>}
      </Pressable>

      {destek ? (
        <View style={[styles.destekKart, { bottom: 78 + insets.bottom }]}>
          <View style={styles.destekUst}>
            <Text style={styles.destekBaslik}>{m.destekBaslik}</Text>
            <Pressable onPress={() => setDestek(false)} accessibilityLabel={m.kapat}>
              <Ionicons name="close" size={20} color={C.text} />
            </Pressable>
          </View>
          <Text style={styles.destekAlt}>{m.destekAlt}</Text>
          <Pressable
            style={styles.destekAna}
            onPress={() => {
              setDestek(false);
              if (session) git('/destek' as Href);
              else git('/(auth)/login' as Href);
            }}
          >
            <Text style={styles.destekAnaYazi}>
              {session ? m.destekAc : m.destekGiris}
            </Text>
          </Pressable>
          <Pressable style={styles.destekYan} onPress={() => disAc(`mailto:${eposta}`)}>
            <Text style={styles.destekYanYazi}>{m.destekYaz}</Text>
            <Text style={styles.destekInce}>{eposta}</Text>
          </Pressable>
          <Pressable
            style={styles.destekYan}
            onPress={() => disAc(`https://wa.me/${whatsapp}`)}
          >
            <Text style={styles.destekYanYazi}>{m.destekWhatsapp}</Text>
            <Text style={styles.destekInce}>{whatsappYazi}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1, backgroundColor: C.bg, minHeight: 0 },
  ust: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
    zIndex: 20,
  },
  ikonBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  marka: { flex: 1, justifyContent: 'center' },
  markaYazi: { color: C.text, fontSize: 20, fontWeight: '900', letterSpacing: 3.2 },
  markaCizgi: {
    marginTop: 3,
    width: 64,
    height: 2,
    borderRadius: 2,
    backgroundColor: C.primary,
  },
  sag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  dilYazi: { color: C.text, fontWeight: '700', fontSize: 13 },
  girisBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  girisYazi: { color: '#12040C', fontWeight: '800', fontSize: 14 },
  dilListe: {
    position: 'absolute',
    top: 72,
    right: 16,
    zIndex: 30,
    width: 200,
    borderRadius: 16,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 6,
  },
  dilSatir: { paddingHorizontal: 14, paddingVertical: 10 },
  dilSatirAktif: { backgroundColor: C.surface },
  dilSatirYazi: { color: C.text, fontSize: 15 },
  kaydir: { flex: 1 },
  kaydirIc: { paddingBottom: 96 },
  alt: {
    marginTop: 28,
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 12,
  },
  altSirket: { color: C.text, fontSize: 15, fontWeight: '700' },
  altLinkler: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  altLink: { color: C.primarySoft, fontSize: 14 },
  altKucuk: { color: C.textDim, fontSize: 12 },
  menuPerde: { ...StyleSheet.absoluteFillObject, zIndex: 40, flexDirection: 'row' },
  menuKarart: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  menuCekmece: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: C.bgElevated,
    paddingTop: 28,
    paddingHorizontal: 18,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  menuCekmeceDar: { width: '86%' },
  menuBaslik: { color: C.textDim, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  menuSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuSatirYazi: { color: C.text, fontSize: 17, fontWeight: '600' },
  menuKayit: {
    marginTop: 18,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuKayitYazi: { color: C.primarySoft, fontWeight: '800' },
  destekYuzer: {
    position: 'absolute',
    right: 16,
    zIndex: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: C.accent,
  },
  destekYuzerYazi: { color: '#12040C', fontWeight: '800' },
  destekKart: {
    position: 'absolute',
    right: 16,
    zIndex: 26,
    width: 320,
    maxWidth: '92%',
    backgroundColor: C.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  destekUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  destekBaslik: { color: C.text, fontSize: 18, fontWeight: '800' },
  destekAlt: { color: C.textMuted, fontSize: 14, lineHeight: 20 },
  destekAna: {
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destekAnaYazi: { color: '#12040C', fontWeight: '800' },
  destekYan: {
    borderRadius: 12,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  destekYanYazi: { color: C.text, fontWeight: '700' },
  destekInce: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});
