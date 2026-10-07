import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCeviri } from '../../i18n/useCeviri';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { AnalyticsOlayEkle } from '../guvenlik/analytics/AnalyticsOlayEkle';
import {
  KESIT_CAPTION_MAX,
  KESIT_SURELERI,
  KESIT_VARSAYILAN_SANIYE,
  type KesitSaniye,
} from './canliKesitDogrulama';
import {
  canliKesitOlustur,
  canliKesitVazgec,
  canliKesitYayinla,
  type KesitKaynak,
  type KesitTaslak,
} from './CanliKesitServisi';

type Asama = 'sure' | 'kayit' | 'onizleme' | 'yukleme';

type Props = {
  kaynak: KesitKaynak;
  onKapat: () => void;
  onPaylasildi: () => void;
};

function OnizlemeVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      p.volume = 0;
    } catch {
      /* yayın mikrofonu açıkken hoparlör yankı yapmasın */
    }
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.onizleme}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function CanliKesitPaneli({ kaynak, onKapat, onPaylasildi }: Props) {
  const { t } = useCeviri();
  const [asama, setAsama] = useState<Asama>('sure');
  const [saniye, setSaniye] = useState<KesitSaniye>(KESIT_VARSAYILAN_SANIYE);
  const [oran, setOran] = useState(0);
  const [taslak, setTaslak] = useState<KesitTaslak | null>(null);
  const [caption, setCaption] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const iptal = useRef<AbortController | null>(null);
  const kilit = useRef(false);

  useEffect(() => {
    return () => {
      iptal.current?.abort();
    };
  }, []);

  async function baslat(secim: KesitSaniye) {
    if (kilit.current) return;
    kilit.current = true;
    setSaniye(secim);
    setHata(null);
    setOran(0);
    setAsama('kayit');
    const kontrol = new AbortController();
    iptal.current = kontrol;
    void AnalyticsOlayEkle('live_clip_button_clicked', {
      live_id: kaynak.liveId,
      pk_id: kaynak.pkId ?? null,
      duration_sec: secim,
    });
    const sonuc = await canliKesitOlustur({
      kaynak,
      saniye: secim,
      sinyal: kontrol.signal,
      onAsama: (_a, o) => setOran(o),
    });
    kilit.current = false;
    if (!sonuc.ok) {
      if (sonuc.kod === 'iptal') {
        onKapat();
        return;
      }
      setHata(sonuc.hata);
      setAsama('sure');
      return;
    }
    setTaslak(sonuc.data);
    setAsama('onizleme');
  }

  async function paylas() {
    if (!taslak || kilit.current) return;
    kilit.current = true;
    setHata(null);
    setAsama('yukleme');
    setOran(0);
    const sonuc = await canliKesitYayinla({
      taslak,
      caption,
      onOran: setOran,
    });
    kilit.current = false;
    if (!sonuc.ok) {
      setHata(sonuc.hata);
      setAsama('onizleme');
      return;
    }
    onPaylasildi();
  }

  async function vazgec() {
    iptal.current?.abort();
    await canliKesitVazgec(taslak);
    onKapat();
  }

  async function tekrar() {
    const onceki = taslak;
    setTaslak(null);
    await canliKesitVazgec(onceki);
    void baslat(saniye);
  }

  const onizlemeUri = taslak?.yerelUri || taslak?.url || null;
  const yuzde = Math.round(Math.min(1, Math.max(0, oran)) * 100);

  return (
    <View style={styles.perde} pointerEvents="box-none">
      <View style={styles.kart}>
        {asama === 'sure' ? (
          <>
            <Text style={styles.baslik}>{t('canliYayin.kesitSure')}</Text>
            <View style={styles.sureSatir}>
              {KESIT_SURELERI.map((sn) => (
                <Pressable
                  key={sn}
                  onPress={() => void baslat(sn)}
                  style={[styles.sureBtn, sn === KESIT_VARSAYILAN_SANIYE && styles.sureBtnVarsayilan]}
                >
                  <Text style={styles.sureYazi}>{t('canliYayin.kesitSn', { n: sn })}</Text>
                </Pressable>
              ))}
            </View>
            {hata ? <Text style={styles.hata}>{hata}</Text> : null}
            <Pressable onPress={onKapat} style={styles.hayalet}>
              <Text style={styles.hayaletYazi}>{t('ortak.iptal')}</Text>
            </Pressable>
          </>
        ) : null}

        {asama === 'kayit' ? (
          <>
            <Text style={styles.baslik}>{t('canliYayin.kesitHazirlaniyor')}</Text>
            <Text style={styles.alt}>
              {t('canliYayin.kesitKaydediliyor')} {yuzde}%
            </Text>
            <ActivityIndicator color="#fff" />
            <Pressable onPress={() => void vazgec()} style={styles.hayalet}>
              <Text style={styles.hayaletYazi}>{t('ortak.iptal')}</Text>
            </Pressable>
          </>
        ) : null}

        {asama === 'onizleme' && onizlemeUri ? (
          <>
            <Text style={styles.baslik}>{t('canliYayin.kesitHazir')}</Text>
            <View style={styles.onizlemeKutu}>
              <OnizlemeVideo uri={onizlemeUri} />
              <View style={styles.rozet} pointerEvents="none">
                <Text style={styles.rozetYazi}>
                  {kaynak.pkId
                    ? `PK · ${kaynak.hostAd ?? ''} × ${kaynak.rakipAd ?? ''}`
                    : t('canliYayin.kesitCanliYayindan')}
                </Text>
              </View>
            </View>
            <Text style={styles.sessizNot}>{t('canliYayin.kesitOnizlemeSessiz')}</Text>
            <TextInput
              value={caption}
              onChangeText={(v) => setCaption(v.slice(0, KESIT_CAPTION_MAX))}
              placeholder={t('canliYayin.kesitCaption')}
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.girdi}
              maxLength={KESIT_CAPTION_MAX}
              multiline
            />
            {hata ? <Text style={styles.hata}>{hata}</Text> : null}
            <Pressable onPress={() => void paylas()} style={styles.ana}>
              <Text style={styles.anaYazi}>{t('canliYayin.kesitStoryPaylas')}</Text>
            </Pressable>
            <View style={styles.altSatir}>
              <Pressable onPress={() => void tekrar()} style={styles.hayalet}>
                <Text style={styles.hayaletYazi}>{t('canliYayin.kesitTekrar')}</Text>
              </Pressable>
              <Pressable onPress={() => void vazgec()} style={styles.hayalet}>
                <Text style={styles.hayaletYazi}>{t('ortak.iptal')}</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {asama === 'yukleme' ? (
          <>
            <Text style={styles.baslik}>{t('canliYayin.kesitYukleniyor', { n: yuzde })}</Text>
            <ActivityIndicator color="#fff" />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  perde: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 40,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  kart: {
    margin: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(12,12,16,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: 10,
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  sureSatir: { flexDirection: 'row', gap: 8 },
  sureBtn: {
    flex: 1,
    height: 44,
    borderRadius: YaricapTokenlari.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sureBtnVarsayilan: { backgroundColor: RenkTokenlari.accent },
  sureYazi: { color: '#fff', fontWeight: '800' },
  onizlemeKutu: {
    alignSelf: 'center',
    width: 140,
    height: 248,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  onizleme: { width: '100%', height: '100%' },
  rozet: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  rozetYazi: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sessizNot: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  girdi: {
    minHeight: 44,
    maxHeight: 88,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ana: {
    height: 46,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anaYazi: { color: '#fff', fontWeight: '800' },
  altSatir: { flexDirection: 'row', justifyContent: 'space-between' },
  hayalet: { paddingVertical: 8, paddingHorizontal: 8 },
  hayaletYazi: { color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  hata: { color: '#ff8a8a', fontSize: 13 },
});
