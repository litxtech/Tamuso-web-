import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import { isRtlDil } from '../../src/i18n/rtl';
import {
  DuyuruDetayGetir,
  DuyuruOkunduIsaretle,
  DuyuruTepkiVer,
  DuyuruYorumBildir,
  DuyuruYorumEkle,
  DuyuruYorumSil,
} from '../../src/moduller/duyurular/islemler/DuyuruIslemleri';
import { DuyuruOlayEkle } from '../../src/moduller/duyurular/islemler/DuyuruOlayKuyrugu';
import { DuyuruHedefCoz } from '../../src/moduller/duyurular/islemler/DuyuruHedefCoz';
import { DuyuruZenginMetin } from '../../src/moduller/duyurular/bilesenler/DuyuruZenginMetin';
import { DuyuruSesOynatici } from '../../src/moduller/duyurular/bilesenler/DuyuruSesOynatici';
import { DuyuruVideo } from '../../src/moduller/duyurular/bilesenler/DuyuruVideo';
import type { DuyuruDetay } from '../../src/moduller/duyurular/tipler';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../src/tasarim-sistemi/tema/useTemayaAboneOl';
import { BildirimHedefineGit } from '../../src/moduller/bildirimler/islemler/BildirimPushYonlendirme';

const TEPKILER = [
  { kod: 'heart', emoji: '❤️' },
  { kod: 'fire', emoji: '🔥' },
  { kod: 'clap', emoji: '👏' },
  { kod: 'party', emoji: '🎉' },
] as const;

function medyaEsik(oran: number): 'MEDIA_25' | 'MEDIA_50' | 'MEDIA_75' | null {
  if (oran >= 0.75) return 'MEDIA_75';
  if (oran >= 0.5) return 'MEDIA_50';
  if (oran >= 0.25) return 'MEDIA_25';
  return null;
}

export default function DuyuruDetayEkrani() {
  useTemayaAboneOl();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, dil } = useCeviri();
  const [detay, setDetay] = useState<DuyuruDetay | null>(null);
  const [yorum, setYorum] = useState('');
  const okundu = useRef(false);

  const yukle = useCallback(async () => {
    if (!id) return;
    const d = await DuyuruDetayGetir(id, dil);
    setDetay(d);
  }, [dil, id]);

  useEffect(() => {
    void yukle();
    if (id) DuyuruOlayEkle({ announcement_id: id, event_type: 'OPEN' });
  }, [id, yukle]);

  useEffect(() => {
    if (!id || okundu.current) return;
    const timer = setTimeout(() => {
      okundu.current = true;
      DuyuruOlayEkle({ announcement_id: id, event_type: 'READ', read_source: 'dwell' });
    }, 3000);
    return () => clearTimeout(timer);
  }, [id]);

  const rtl = isRtlDil(detay?.translation.locale);
  const yazi = rtl
    ? { textAlign: 'right' as const, writingDirection: 'rtl' as const }
    : { textAlign: 'left' as const, writingDirection: 'ltr' as const };

  const ctaGit = (cta: DuyuruDetay['ctas'][number]) => {
    const href = DuyuruHedefCoz(cta.destination_type, cta.destination);
    DuyuruOlayEkle({ announcement_id: detay!.id, event_type: 'CTA_CLICK', cta_id: cta.id });
    if (cta.destination_type === 'EXTERNAL_URL' || cta.destination_type === 'WEBVIEW') {
      const url = cta.destination?.url ?? '';
      if (!url.startsWith('https://') || url.includes('javascript:')) {
        Alert.alert(t('duyuru.alertBaslik'), t('duyuru.hedefKapali'));
        return;
      }
      void Linking.openURL(url);
      return;
    }
    if (!href) {
      Alert.alert(t('duyuru.alertBaslik'), t('duyuru.hedefKapali'));
      return;
    }
    if (href.startsWith('/')) void BildirimHedefineGit(href);
  };

  if (!detay) {
    return (
      <Screen edges={['top']}>
        <EkranBasligi title={t('duyuru.baslik')} />
      </Screen>
    );
  }

  const gorseller = detay.media.filter((m) => m.kind === 'IMAGE' && m.public_url);
  const hero = gorseller[0] ?? detay.media.find((m) => m.thumbnail_url);

  return (
    <Screen edges={['top']}>
      <EkranBasligi title={t('duyuru.baslik')} />
      <ScrollView
        contentContainerStyle={styles.icerik}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          if (
            !okundu.current &&
            contentOffset.y + layoutMeasurement.height > contentSize.height - 48
          ) {
            okundu.current = true;
            DuyuruOlayEkle({ announcement_id: detay.id, event_type: 'READ', read_source: 'scroll' });
          }
        }}
        scrollEventThrottle={200}
      >
        {detay.category ? (
          <Text style={[styles.kategori, { color: detay.category.theme_color }, yazi]}>
            {detay.category.name}
          </Text>
        ) : null}
        <Text style={[styles.baslik, yazi]}>{detay.translation.title}</Text>
        <Text style={[styles.tarih, yazi]}>
          {new Date(detay.publish_at).toLocaleString(detay.translation.locale)}
        </Text>
        {hero?.public_url || hero?.thumbnail_url ? (
          <Image
            source={{ uri: (hero.kind === 'IMAGE' ? hero.public_url : hero.thumbnail_url) ?? '' }}
            style={styles.hero}
          />
        ) : null}
        <DuyuruZenginMetin belge={detay.translation.body_doc} rtl={rtl} />
        {gorseller.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galeri}>
            {gorseller.slice(1).map((m) => (
              <Image key={m.id} source={{ uri: m.public_url! }} style={styles.galeriOge} />
            ))}
          </ScrollView>
        ) : null}
        {detay.media
          .filter((m) => m.kind === 'VIDEO' && m.public_url)
          .map((m) => (
            <DuyuruVideo
              key={m.id}
              uri={m.public_url!}
              thumbnail={m.thumbnail_url}
              onStart={() =>
                DuyuruOlayEkle({ announcement_id: detay.id, event_type: 'MEDIA_START', media_id: m.id })
              }
              onProgress={(oran) => {
                const tip = medyaEsik(oran);
                if (tip) DuyuruOlayEkle({ announcement_id: detay.id, event_type: tip, media_id: m.id });
              }}
              onComplete={() =>
                DuyuruOlayEkle({ announcement_id: detay.id, event_type: 'MEDIA_COMPLETE', media_id: m.id })
              }
            />
          ))}
        {detay.media
          .filter((m) => (m.kind === 'AUDIO' || m.kind === 'VOICE_RECORDING') && m.public_url)
          .map((m) => (
            <DuyuruSesOynatici
              key={m.id}
              uri={m.public_url!}
              durationMs={m.duration_ms}
              onStart={() =>
                DuyuruOlayEkle({ announcement_id: detay.id, event_type: 'MEDIA_START', media_id: m.id })
              }
              onProgress={(oran) => {
                const tip = medyaEsik(oran);
                if (tip) DuyuruOlayEkle({ announcement_id: detay.id, event_type: tip, media_id: m.id });
              }}
              onComplete={() =>
                DuyuruOlayEkle({ announcement_id: detay.id, event_type: 'MEDIA_COMPLETE', media_id: m.id })
              }
            />
          ))}
        {detay.media.some((m) => !m.public_url) ? (
          <Text style={styles.eksik}>{t('duyuru.medyaYok')}</Text>
        ) : null}
        <Pressable
          onPress={() => {
            void DuyuruOkunduIsaretle(detay.id).then(() => yukle());
          }}
        >
          <Text style={styles.link}>{t('duyuru.okundu')}</Text>
        </Pressable>
        {detay.show_view_count && detay.unique_view_count != null ? (
          <Text style={styles.sayac}>
            {t('duyuru.goruntulenme', { n: detay.unique_view_count.toLocaleString(dil) })}
          </Text>
        ) : null}
        <View style={styles.ctaSatir}>
          {detay.ctas.map((c) => (
            <Pressable key={c.id} style={styles.cta} onPress={() => ctaGit(c)}>
              <Text style={styles.ctaYazi}>{c.label || detay.translation.button_text || t('duyuru.ac')}</Text>
            </Pressable>
          ))}
        </View>
        {detay.allow_reactions ? (
          <View style={styles.tepkiSatir}>
            {TEPKILER.map((tp) => {
              const secili = detay.my_reaction === tp.kod;
              const n = detay.reaction_counts?.[tp.kod] ?? 0;
              return (
                <Pressable
                  key={tp.kod}
                  style={[styles.tepki, secili && styles.tepkiSecili]}
                  onPress={() => {
                    void DuyuruTepkiVer(detay.id, secili ? '' : tp.kod).then(() => yukle());
                  }}
                >
                  <Text>
                    {tp.emoji} {n > 0 ? n : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {detay.allow_comments ? (
          <View style={styles.yorumlar}>
            <Text style={styles.yorumBaslik}>{t('duyuru.yorumlar')}</Text>
            {detay.comments.map((c) => (
              <View key={c.id} style={styles.yorum}>
                <Text style={styles.yorumAd}>{c.display_name || c.username}</Text>
                <Text style={styles.yorumGovde}>{c.body}</Text>
                <View style={styles.yorumAksiyon}>
                  {c.is_mine ? (
                    <Pressable onPress={() => void DuyuruYorumSil(c.id).then(() => yukle())}>
                      <Text style={styles.link}>{t('duyuru.yorumSil')}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() =>
                        void DuyuruYorumBildir(c.id, 'other').then((r) => {
                          if (!r.ok) Alert.alert(t('duyuru.alertBaslik'), r.hata);
                        })
                      }
                    >
                      <Text style={styles.link}>{t('duyuru.yorumBildir')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
            <TextInput
              value={yorum}
              onChangeText={setYorum}
              placeholder={t('duyuru.yorumYaz')}
              placeholderTextColor={RenkTokenlari.textMuted}
              style={styles.girdi}
            />
            <Pressable
              style={styles.cta}
              onPress={() => {
                void DuyuruYorumEkle(detay.id, yorum).then((r) => {
                  if (!r.ok) Alert.alert(t('duyuru.alertBaslik'), r.hata);
                  else {
                    setYorum('');
                    void yukle();
                  }
                });
              }}
            >
              <Text style={styles.ctaYazi}>{t('duyuru.yorumGonder')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: BoslukTokenlari.lg, gap: BoslukTokenlari.md, paddingBottom: 80 },
  kategori: { ...TipografiTokenlari.caption, fontWeight: '700' },
  baslik: { ...TipografiTokenlari.h1, color: RenkTokenlari.text },
  tarih: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  hero: { width: '100%', height: 200, borderRadius: YaricapTokenlari.md },
  galeri: { gap: BoslukTokenlari.sm },
  galeriOge: { width: 140, height: 100, borderRadius: YaricapTokenlari.sm },
  eksik: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  sayac: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  ctaSatir: { gap: BoslukTokenlari.sm },
  cta: {
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaYazi: { color: '#fff', fontWeight: '700' },
  tepkiSatir: { flexDirection: 'row', gap: BoslukTokenlari.sm },
  tepki: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  tepkiSecili: { borderColor: RenkTokenlari.accent },
  yorumlar: { gap: BoslukTokenlari.sm },
  yorumBaslik: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  yorum: { gap: 2 },
  yorumAd: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, fontWeight: '700' },
  yorumGovde: { ...TipografiTokenlari.body, color: RenkTokenlari.text },
  yorumAksiyon: { flexDirection: 'row' },
  link: { ...TipografiTokenlari.caption, color: RenkTokenlari.accent },
  girdi: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.sm,
    color: RenkTokenlari.text,
    padding: BoslukTokenlari.sm,
  },
});
