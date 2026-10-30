import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ListeGrubu, ListeSatiri } from '../../src/components/ListeSatiri';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCeviri, type CeviriAnahtari } from '../../src/i18n/useCeviri';
import {
  CevrimdisiAyarOku,
  CevrimdisiAyarYaz,
  type CevrimdisiAyar,
  VARSAYILAN_AYAR,
} from '../../src/moduller/cevrimdisi/AyarDeposu';
import { AnlikBoyutlari, AnlikZaman, OnbellekParcaSil } from '../../src/moduller/cevrimdisi/AnlikGoruntu';
import { cevrimdisiOku } from '../../src/moduller/cevrimdisi/CevrimdisiDeposu';
import { IslemKuyruguListele } from '../../src/moduller/cevrimdisi/IslemKuyrugu';
import { TaslaklariGetir, type CevrimdisiTaslak } from '../../src/moduller/cevrimdisi/TaslakDeposu';
import { TaslakSimdiPaylas } from '../../src/moduller/cevrimdisi/TaslakPaylas';
import { SenkronCalistir } from '../../src/moduller/cevrimdisi/SenkronMotoru';
import { baytEtiket } from '../../src/moduller/cevrimdisi/saf/KotaHesabi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

function zamanMetni(
  iso: string | null,
  t: (k: CeviriAnahtari, o?: Record<string, unknown>) => string,
): string {
  if (!iso) return t('cevrimdisi.hic');
  const fark = Date.now() - Date.parse(iso);
  if (!Number.isFinite(fark) || fark < 60_000) return t('cevrimdisi.azOnce');
  const dk = Math.floor(fark / 60_000);
  if (dk < 60) return t('cevrimdisi.dkOnce', { n: dk });
  const saat = Math.floor(dk / 60);
  if (saat < 24) {
    const tarih = new Date(iso);
    const bugun = new Date();
    if (tarih.toDateString() === bugun.toDateString()) {
      const hh = String(tarih.getHours()).padStart(2, '0');
      const mm = String(tarih.getMinutes()).padStart(2, '0');
      return t('cevrimdisi.bugun', { saat: `${hh}:${mm}` });
    }
    return t('cevrimdisi.saatOnce', { n: saat });
  }
  return t('cevrimdisi.gunOnce', { n: Math.floor(saat / 24) });
}

export default function VeriCevrimdisiEkrani() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const uid = user?.id ?? '';
  const [ayar, setAyar] = useState<CevrimdisiAyar>(VARSAYILAN_AYAR);
  const [boyut, setBoyut] = useState<Record<string, number>>({});
  const [bekleyen, setBekleyen] = useState(0);
  const [taslak, setTaslak] = useState(0);
  const [taslakListe, setTaslakListe] = useState<CevrimdisiTaslak[]>([]);
  const [paylasId, setPaylasId] = useState<string | null>(null);
  const [son, setSon] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!uid) return;
    const [a, b, kuyruk, taslaklar, meta, kesfetZaman] = await Promise.all([
      CevrimdisiAyarOku(uid),
      AnlikBoyutlari(uid),
      IslemKuyruguListele(uid),
      TaslaklariGetir(uid),
      cevrimdisiOku<{ sonSenkron?: string } | null>(uid, 'meta', null),
      AnlikZaman(uid, 'kesfet'),
    ]);
    setAyar(a);
    setBoyut(b);
    setBekleyen(kuyruk.filter((k) => k.status === 'PENDING' || k.status === 'FAILED').length);
    setTaslak(taslaklar.length);
    setTaslakListe(taslaklar);
    setSon(meta?.sonSenkron ?? kesfetZaman);
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const toplam =
    (boyut.feed ?? 0) +
    (boyut.hikaye ?? 0) +
    (boyut.profil ?? 0) +
    (boyut.kesfet ?? 0) +
    (boyut.bildirim ?? 0) +
    (boyut.oda ?? 0) +
    (boyut.medya ?? 0) +
    (boyut.taslak ?? 0) +
    (boyut.kuyruk ?? 0);

  const temizle = (parca: 'feed' | 'hikaye' | 'kesfet' | 'image' | 'video') => {
    if (!uid) return;
    void OnbellekParcaSil(uid, parca).then(() => yukle());
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('cevrimdisi.veriBaslik')}
        subtitle={t('cevrimdisi.veriAlt')}
        fallbackHref="/ayarlar"
      />
      <ScrollView contentContainerStyle={styles.icerik}>
        <ListeGrubu title={t('cevrimdisi.onbellek')}>
          <ListeSatiri icon="server-outline" label={t('cevrimdisi.onbellek')} value={baytEtiket(toplam)} showChevron={false} />
          <ListeSatiri icon="images-outline" label={t('cevrimdisi.medya')} value={baytEtiket(boyut.medya ?? 0)} showChevron={false} />
          <ListeSatiri icon="home-outline" label={t('cevrimdisi.feed')} value={baytEtiket(boyut.feed ?? 0)} showChevron={false} />
          <ListeSatiri icon="albums-outline" label={t('cevrimdisi.story')} value={baytEtiket(boyut.hikaye ?? 0)} showChevron={false} />
          <ListeSatiri icon="chatbubble-outline" label={t('cevrimdisi.mesajlar')} value={baytEtiket(boyut.kuyruk ?? 0)} showChevron={false} />
          <ListeSatiri icon="document-outline" label={t('cevrimdisi.taslaklar')} value={String(taslak)} showChevron={false} />
          <ListeSatiri icon="time-outline" label={t('cevrimdisi.bekleyen')} value={String(bekleyen)} showChevron={false} />
          <ListeSatiri
            icon="sync-outline"
            label={t('cevrimdisi.sonSenkron')}
            value={zamanMetni(son, t)}
            showChevron={false}
            last
          />
        </ListeGrubu>

        <Text style={styles.not}>{t('cevrimdisi.sonGuncelleme', { zaman: zamanMetni(son, t) })}</Text>

        {taslakListe.length > 0 ? (
          <ListeGrubu title={t('cevrimdisi.taslaklar')}>
            {taslakListe.map((d, i) => (
              <View key={d.id} style={styles.taslak}>
                <Text style={styles.etiket} numberOfLines={2}>
                  {d.text.trim() || t('cevrimdisi.taslakKaydedildi')}
                </Text>
                {d.type === 'post' ? (
                  <Pressable
                    disabled={paylasId === d.id}
                    onPress={() => {
                      if (!uid || paylasId) return;
                      setPaylasId(d.id);
                      void TaslakSimdiPaylas(uid, d.id).then((r) => {
                        setPaylasId(null);
                        if (r.ok) {
                          Alert.alert(t('cevrimdisi.guncel'));
                          void yukle();
                          return;
                        }
                        Alert.alert(t('cevrimdisi.taslaklar'), r.hata ?? t('cevrimdisi.senkronHata'));
                      });
                    }}
                  >
                    <Text style={styles.paylas}>
                      {paylasId === d.id ? t('cevrimdisi.bekliyor') : t('cevrimdisi.simdiPaylas')}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.alt}>{t('cevrimdisi.bekliyor')}</Text>
                )}
                {i < taslakListe.length - 1 ? <View style={styles.ayir} /> : null}
              </View>
            ))}
          </ListeGrubu>
        ) : null}

        <ListeGrubu title={t('cevrimdisi.temizle')}>
          <ListeSatiri icon="home-outline" label={t('cevrimdisi.temizleFeed')} onPress={() => temizle('feed')} />
          <ListeSatiri icon="albums-outline" label={t('cevrimdisi.temizleStory')} onPress={() => temizle('hikaye')} />
          <ListeSatiri icon="compass-outline" label={t('cevrimdisi.temizleKesfet')} onPress={() => temizle('kesfet')} />
          <ListeSatiri icon="image-outline" label={t('cevrimdisi.temizleFoto')} onPress={() => temizle('image')} />
          <ListeSatiri icon="videocam-outline" label={t('cevrimdisi.temizleVideo')} onPress={() => temizle('video')} last />
        </ListeGrubu>
        <Text style={styles.not}>{t('cevrimdisi.taslakKorunur')}</Text>

        <View style={styles.switchSatir}>
          <View style={styles.switchYazi}>
            <Text style={styles.etiket}>{t('cevrimdisi.mobilMedya')}</Text>
          </View>
          <Switch
            value={ayar.mobilMedya}
            onValueChange={(v) => {
              setAyar((p) => ({ ...p, mobilMedya: v }));
              if (uid) void CevrimdisiAyarYaz(uid, { mobilMedya: v });
            }}
          />
        </View>
        <View style={styles.switchSatir}>
          <View style={styles.switchYazi}>
            <Text style={styles.etiket}>{t('cevrimdisi.videoOnbellek')}</Text>
            <Text style={styles.alt}>
              {ayar.videoOnbellek === 'wifi' ? t('cevrimdisi.wifi') : t('cevrimdisi.wifiMobil')}
            </Text>
          </View>
          <Switch
            value={ayar.videoOnbellek === 'wifi_ve_mobil'}
            onValueChange={(v) => {
              const videoOnbellek = v ? 'wifi_ve_mobil' : 'wifi';
              setAyar((p) => ({ ...p, videoOnbellek }));
              if (uid) void CevrimdisiAyarYaz(uid, { videoOnbellek });
            }}
          />
        </View>
        <View style={styles.switchSatir}>
          <View style={styles.switchYazi}>
            <Text style={styles.etiket}>{t('cevrimdisi.otomatikPaylas')}</Text>
            <Text style={styles.alt}>{t('cevrimdisi.otomatikPaylasAlt')}</Text>
          </View>
          <Switch
            value={ayar.otomatikPaylas}
            onValueChange={(v) => {
              setAyar((p) => ({ ...p, otomatikPaylas: v }));
              if (uid) void CevrimdisiAyarYaz(uid, { otomatikPaylas: v });
            }}
          />
        </View>

        <Pressable
          style={styles.dugme}
          onPress={() => {
            if (!uid) return;
            void SenkronCalistir(uid).then(() => {
              Alert.alert(t('cevrimdisi.guncel'));
              void yukle();
            });
          }}
        >
          <Text style={styles.dugmeYazi}>{t('cevrimdisi.bekleyen')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icerik: { paddingBottom: 48, gap: 8 },
  not: {
    color: RenkTokenlari.textMuted,
    fontSize: 13,
    marginHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.md,
  },
  switchSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: 10,
    gap: 12,
  },
  switchYazi: { flex: 1 },
  etiket: { color: RenkTokenlari.text, fontSize: 15, fontWeight: '600' },
  alt: { color: RenkTokenlari.textMuted, fontSize: 12, marginTop: 2 },
  dugme: {
    marginHorizontal: BoslukTokenlari.lg,
    marginTop: 8,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dugmeYazi: { color: '#fff', fontWeight: '700' },
  taslak: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: 10,
    gap: 6,
  },
  paylas: { color: RenkTokenlari.primary, fontWeight: '700', fontSize: 14 },
  ayir: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: RenkTokenlari.border,
    marginTop: 8,
  },
});
