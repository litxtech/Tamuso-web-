import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useDil } from '../../i18n/DilSaglayici';
import { blogListeHerkese } from '../blog/blogApi';
import { PolitikalariListele } from '../politikalar/islemler/PolitikaIslemleri';
import { PlatformIletisimAyariniGetir } from '../platform-iletisim/islemler/PlatformIletisimIslemleri';
import { RenkTokenlariKoyu as C } from '../../tasarim-sistemi/tema/RenkPaletleri';
import { UygulamaKimligi } from '../../yapilandirma/UygulamaKimligi';
import { siteMetin } from './siteMetin';
import { tanitimMetin } from './tanitimMetin';
import { VARSAYILAN_ADRES, WEB_SAYFALARI } from './webSayfaKatalogu';

type Bag = { etiket: string; href: string };
type Sosyal = { ad: string; url: string; ikon: keyof typeof Ionicons.glyphMap };

function disAc(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

function webLink(
  href: string,
  etiket: string,
  git: (href: Href) => void,
  dis = false,
) {
  if (Platform.OS === 'web') {
    return React.createElement(
      'a',
      {
        key: href + etiket,
        href,
        target: dis ? '_blank' : undefined,
        rel: dis ? 'noopener noreferrer' : undefined,
        onClick: (e: { preventDefault: () => void }) => {
          if (dis) return;
          e.preventDefault();
          git(href as Href);
        },
        style: {
          color: '#F4D7E6',
          fontSize: 14,
          lineHeight: '28px',
          textDecoration: 'none',
        },
      },
      etiket,
    );
  }
  return (
    <Pressable key={href + etiket} onPress={() => (dis ? disAc(href) : git(href as Href))}>
      <Text style={styles.link}>{etiket}</Text>
    </Pressable>
  );
}

function DisHap({
  href,
  ikon,
  yazi,
  renk = C.text,
}: {
  href: string;
  ikon: keyof typeof Ionicons.glyphMap;
  yazi: string;
  renk?: string;
}) {
  const ic = (
    <>
      <Ionicons name={ikon} size={16} color={renk} />
      <Text style={styles.btnAcik}>{yazi}</Text>
    </>
  );
  if (Platform.OS === 'web') {
    return React.createElement(
      'a',
      {
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: {
          height: 40,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 999,
          border: `1px solid ${C.border}`,
          backgroundColor: C.surface,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          textDecoration: 'none',
        },
      },
      ic,
    );
  }
  return (
    <Pressable accessibilityLabel={yazi} style={styles.btnKenar} onPress={() => disAc(href)}>
      {ic}
    </Pressable>
  );
}

function Sutun({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <View style={styles.sutun}>
      <Text style={styles.sutunBaslik}>{baslik}</Text>
      <View style={styles.sutunIc}>{children}</View>
    </View>
  );
}

export function WebTanitimFooter({
  git,
  onDestek,
}: {
  git: (href: Href) => void;
  onDestek: () => void;
}) {
  const { dil } = useDil();
  const { session } = useAuth();
  const m = tanitimMetin(dil);
  const s = siteMetin(dil);
  const [adres, setAdres] = useState(VARSAYILAN_ADRES);
  const [eposta, setEposta] = useState(UygulamaKimligi.SUPPORT_EMAIL);
  const [whatsapp, setWhatsapp] = useState('905330483061');
  const [whatsappYazi, setWhatsappYazi] = useState('0533 048 30 61');
  const [sosyal, setSosyal] = useState<Sosyal[]>([]);
  const [yazilar, setYazilar] = useState<Bag[]>([]);
  const [yasal, setYasal] = useState<Bag[]>([
    { etiket: m.navPolitika, href: '/politika' },
    { etiket: m.sartlar, href: '/politika/tos' },
    { etiket: m.gizlilik, href: '/politika/privacy' },
    { etiket: m.cocuk, href: '/politika/child_safety' },
  ]);

  useEffect(() => {
    let iptal = false;
    void PlatformIletisimAyariniGetir().then((ayar) => {
      if (iptal) return;
      if (ayar.adres) setAdres(ayar.adres);
      if (ayar.support_email) setEposta(ayar.support_email);
      if (ayar.whatsapp_e164) setWhatsapp(ayar.whatsapp_e164.replace(/\D/g, ''));
      if (ayar.whatsapp_gorunen) setWhatsappYazi(ayar.whatsapp_gorunen);
      const aday: Sosyal[] = [
        { ad: 'Instagram', url: ayar.instagram_url, ikon: 'logo-instagram' },
        { ad: 'TikTok', url: ayar.tiktok_url, ikon: 'logo-tiktok' },
        { ad: 'X', url: ayar.x_url, ikon: 'logo-twitter' },
        { ad: 'YouTube', url: ayar.youtube_url, ikon: 'logo-youtube' },
        { ad: 'Facebook', url: ayar.facebook_url, ikon: 'logo-facebook' },
        { ad: 'LinkedIn', url: ayar.linkedin_url, ikon: 'logo-linkedin' },
        { ad: 'Telegram', url: ayar.telegram_url, ikon: 'paper-plane' },
      ];
      setSosyal(aday.filter((a) => a.url.startsWith('https://')));
    });
    return () => {
      iptal = true;
    };
  }, []);

  useEffect(() => {
    let iptal = false;
    const kod = dil.toLowerCase().split('-')[0] || 'tr';
    void blogListeHerkese(0, 8, kod).then(async (gelen) => {
      const liste = (gelen.satirlar as { title?: string; slug?: string; language_code?: string }[]) ?? [];
      const sonuc =
        liste.length || kod === 'tr'
          ? liste
          : ((await blogListeHerkese(0, 8, 'tr')).satirlar as typeof liste);
      if (iptal) return;
      setYazilar(
        sonuc
          .filter((y) => y.slug && y.title)
          .map((y) => {
            const dilKod = y.language_code || kod;
            return {
              etiket: y.title as string,
              href: dilKod === 'tr' ? `/blog/${y.slug}` : `/${dilKod}/blog/${y.slug}`,
            };
          }),
      );
    });
    return () => {
      iptal = true;
    };
  }, [dil]);

  useEffect(() => {
    let iptal = false;
    void PolitikalariListele('all')
      .then((liste) => {
        if (iptal || !liste.length) return;
        const gorulen = new Set<string>();
        const baglar: Bag[] = [{ etiket: m.navPolitika, href: '/politika' }];
        gorulen.add('/politika');
        for (const p of liste) {
          const href = `/politika/${p.kod}`;
          if (gorulen.has(href)) continue;
          gorulen.add(href);
          baglar.push({ etiket: p.linkEtiketi || p.baslik, href });
        }
        setYasal(baglar);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [dil, m.navPolitika]);

  const sayfalar = WEB_SAYFALARI.map((sayfa) => ({
    etiket: String(m[sayfa.etiket]),
    href: sayfa.href,
  }));

  const ic = (
    <View style={styles.ic}>
      <LinearGradient
        colors={['transparent', C.primary, C.magenta, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.cizgi}
      />
      <View style={styles.izgara}>
        <View style={styles.marka}>
          <Text style={styles.markaYazi}>TAMUSO</Text>
          <Text style={styles.sirket}>{m.footerSirket}</Text>
          {Platform.OS === 'web'
            ? React.createElement(
                'address',
                {
                  style: {
                    color: '#C9B3C2',
                    fontStyle: 'normal',
                    fontSize: 13,
                    lineHeight: '20px',
                    margin: 0,
                  },
                },
                adres,
              )
            : <Text style={styles.adres}>{adres}</Text>}
          <Text style={styles.ince}>18+</Text>
        </View>
        <Sutun baslik={s.sayfalar}>
          {sayfalar.map((b) => webLink(b.href, b.etiket, git))}
        </Sutun>
        <Sutun baslik={s.yazilar}>
          {webLink('/blog', m.navBlog, git)}
          {yazilar.map((b) => webLink(b.href, b.etiket, git))}
        </Sutun>
        <Sutun baslik={s.yasal}>{yasal.map((b) => webLink(b.href, b.etiket, git))}</Sutun>
        <Sutun baslik={s.iletisim}>
          {webLink(`mailto:${eposta}`, eposta, git, true)}
          {webLink(`https://wa.me/${whatsapp}`, `WhatsApp · ${whatsappYazi}`, git, true)}
        </Sutun>
      </View>

      <View style={styles.btnSatir}>
        <Pressable style={styles.btn} onPress={() => git((session ? '/(tabs)' : '/(auth)/login') as Href)}>
          <Ionicons name="log-in-outline" size={16} color="#12040C" />
          <Text style={styles.btnKoyu}>{session ? m.uygulamayaGec : m.giris}</Text>
        </Pressable>
        <Pressable style={styles.btnKenar} onPress={onDestek}>
          <Ionicons name="chatbubbles-outline" size={16} color={C.text} />
          <Text style={styles.btnAcik}>{m.navDestek}</Text>
        </Pressable>
        <DisHap href={`mailto:${eposta}`} ikon="mail-outline" yazi={m.destekYaz} />
        <DisHap href={`https://wa.me/${whatsapp}`} ikon="logo-whatsapp" yazi="WhatsApp" renk="#25D366" />
        {sosyal.map((ag) => (
          <DisHap key={ag.ad} href={ag.url} ikon={ag.ikon} yazi={ag.ad} />
        ))}
      </View>

      <Text style={styles.telif}>
        © {new Date().getFullYear()} Tamuso · LitxTech LLC
      </Text>
    </View>
  );

  if (Platform.OS === 'web') {
    return React.createElement('footer', null, ic);
  }
  return ic;
}

const styles = StyleSheet.create({
  ic: {
    marginTop: 48,
    paddingHorizontal: 22,
    paddingBottom: 28,
    gap: 22,
  },
  cizgi: { height: 2, borderRadius: 2, marginBottom: 8 },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: 28 },
  marka: { width: 240, maxWidth: '100%', gap: 8, flexGrow: 1 },
  markaYazi: { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 2.4 },
  sirket: { color: C.textMuted, fontSize: 14, lineHeight: 21 },
  adres: { color: C.textMuted, fontSize: 13, lineHeight: 20 },
  ince: { color: C.textDim, fontSize: 12, fontWeight: '700' },
  sutun: { width: 180, maxWidth: '100%', flexGrow: 1, gap: 8 },
  sutunBaslik: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sutunIc: { gap: 2 },
  link: { color: '#F4D7E6', fontSize: 14, lineHeight: 28 },
  btnSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnKenar: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnKoyu: { color: '#12040C', fontWeight: '800', fontSize: 13 },
  btnAcik: { color: C.text, fontWeight: '700', fontSize: 13 },
  telif: { color: C.textDim, fontSize: 12, lineHeight: 18 },
});
