import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useKlavyeYuksekligi } from '../../bilesenler/klavye/useKlavyeYuksekligi';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCeviri } from '../../i18n/useCeviri';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { AnalyticsOlayEkle } from '../guvenlik/analytics/AnalyticsOlayEkle';
import {
  KESIT_CAPTION_MAX,
  KESIT_MAX_SANIYE,
  KESIT_SURELERI,
  KESIT_VARSAYILAN_SANIYE,
  type KesitSaniye,
} from './canliKesitDogrulama';
import {
  CanliKesitKamera,
  kesitKamerayiGeriVer,
  type KesitKameraDosya,
  type KesitKameraTutu,
} from './CanliKesitKamera';
import { canliKesitYerelKayitVarMi } from './CanliKesitKaydedici';
import {
  canliKesitDosyadanTaslak,
  canliKesitIstekAc,
  canliKesitIstekBirak,
  canliKesitOlustur,
  canliKesitVazgec,
  canliKesitYayinla,
  type KesitIstek,
  type KesitKaynak,
  type KesitTaslak,
} from './CanliKesitServisi';

type Asama = 'sure' | 'kayit' | 'baglaniyor' | 'onizleme' | 'yukleme';

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
  const [asama, setAsama] = useState<Asama>('kayit');
  const [saniye, setSaniye] = useState<KesitSaniye>(15);
  const [oran, setOran] = useState(0);
  const [taslak, setTaslak] = useState<KesitTaslak | null>(null);
  const [caption, setCaption] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [istek, setIstek] = useState<KesitIstek | null>(null);
  const [gecen, setGecen] = useState(0);
  const kameraRef = useRef<KesitKameraTutu>(null);
  const girdiRef = useRef<TextInput>(null);
  const { yukseklik: klavyeY, acik: klavyeAcik } = useKlavyeYuksekligi(8);
  const iptal = useRef<AbortController | null>(null);
  const kilit = useRef(false);
  const acildi = useRef(false);
  const kapali = useRef(false);
  const istekRef = useRef<KesitIstek | null>(null);
  const yerel = canliKesitYerelKayitVarMi();

  useEffect(() => {
    return () => {
      kapali.current = true;
      iptal.current?.abort();
      const id = istekRef.current?.istekId;
      if (id) void canliKesitIstekBirak(id, 'cancelled');
    };
  }, []);

  useEffect(() => {
    if (acildi.current) return;
    acildi.current = true;
    if (yerel) void baslat(KESIT_MAX_SANIYE);
  }, []);

  useEffect(() => {
    if (asama !== 'kayit' || yerel) return;
    const bas = Date.now();
    const id = setInterval(() => {
      setGecen(Math.min(KESIT_MAX_SANIYE, Math.floor((Date.now() - bas) / 1000)));
    }, 200);
    return () => clearInterval(id);
  }, [asama, yerel]);

  function klavyeyiKapat() {
    girdiRef.current?.blur();
    Keyboard.dismiss();
  }

  function istekYaz(sonraki: KesitIstek | null) {
    istekRef.current = sonraki;
    setIstek(sonraki);
  }

  async function baslat(secim: KesitSaniye) {
    if (kilit.current) return;
    kilit.current = true;
    const onceki = istekRef.current;
    const devredildi = Boolean(onceki);
    if (onceki) {
      istekYaz(null);
      void canliKesitIstekBirak(onceki.istekId, 'cancelled');
    }
    setSaniye(secim);
    setHata(null);
    setOran(0);
    setTaslak(null);
    setAsama('kayit');
    const kontrol = new AbortController();
    iptal.current = kontrol;
    void AnalyticsOlayEkle('live_clip_button_clicked', {
      live_id: kaynak.liveId,
      pk_id: kaynak.pkId ?? null,
      duration_sec: secim,
    });
    if (yerel) {
      const sonuc = await canliKesitOlustur({
        kaynak,
        saniye: secim,
        sinyal: kontrol.signal,
        onAsama: (_a, o) => setOran(o),
      });
      kilit.current = false;
      if (!sonuc.ok) {
        if (devredildi) kesitKamerayiGeriVer();
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
      return;
    }
    const acilan = await canliKesitIstekAc({ kaynak, saniye: secim });
    kilit.current = false;
    if (!acilan.ok) {
      if (devredildi) kesitKamerayiGeriVer();
      setHata(acilan.hata);
      setAsama('sure');
      return;
    }
    if (kontrol.signal.aborted) {
      if (devredildi) kesitKamerayiGeriVer();
      await canliKesitIstekBirak(acilan.data.istekId, 'cancelled');
      return;
    }
    istekYaz(acilan.data);
  }

  async function kameraBitti(dosya: KesitKameraDosya) {
    setAsama('baglaniyor');
    const acilan = await canliKesitIstekAc({ kaynak, saniye: dosya.saniye });
    if (kapali.current) {
      if (acilan.ok) void canliKesitIstekBirak(acilan.data.istekId, 'cancelled');
      return;
    }
    if (!acilan.ok) {
      setHata(acilan.hata);
      setAsama('sure');
      return;
    }
    if (dosya.bayt > acilan.data.maxBayt) {
      setHata(t('canliYayin.kesitCokBuyuk'));
      void canliKesitIstekBirak(acilan.data.istekId, 'failed');
      setAsama('sure');
      return;
    }
    void AnalyticsOlayEkle('live_clip_created', {
      live_id: kaynak.liveId,
      pk_id: kaynak.pkId ?? null,
      duration_sec: acilan.data.saniye,
      bytes: dosya.bayt,
      yol: 'cihaz',
    });
    istekYaz(acilan.data);
    setTaslak(canliKesitDosyadanTaslak(acilan.data, dosya));
    setAsama('onizleme');
  }

  function kameraHata() {
    if (istek) void canliKesitIstekBirak(istek.istekId, 'failed');
    istekYaz(null);
    setHata(t('canliYayin.kesitOlusturulamadi'));
    setAsama('sure');
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
    const acikIstek = istekRef.current;
    if (acikIstek && !taslak) {
      istekYaz(null);
      await canliKesitIstekBirak(acikIstek.istekId, 'cancelled');
    }
    await canliKesitVazgec(taslak);
    onKapat();
  }

  async function tekrar() {
    const onceki = taslak;
    setTaslak(null);
    await canliKesitVazgec(onceki);
    if (yerel) void baslat(saniye);
    else {
      setHata(null);
      setGecen(0);
      setAsama('kayit');
    }
  }

  const onizlemeUri = taslak?.yerelUri || taslak?.url || null;
  const yuzde = Math.round(Math.min(1, Math.max(0, oran)) * 100);

  return (
    <View
      style={[styles.perde, klavyeAcik ? { paddingBottom: klavyeY } : null]}
      pointerEvents="box-none"
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={klavyeyiKapat} />
      <View style={styles.kart}>
        {asama === 'sure' ? (
          <>
            <Text style={styles.baslik}>{t('canliYayin.kesitSure')}</Text>
            {yerel ? (
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
            ) : (
              <Pressable
                onPress={() => {
                  setHata(null);
                  setGecen(0);
                  setAsama('kayit');
                }}
                style={styles.ana}
              >
                <Text style={styles.anaYazi}>{t('canliYayin.kesitTekrar')}</Text>
              </Pressable>
            )}
            {hata ? <Text style={styles.hata}>{hata}</Text> : null}
            <Pressable onPress={onKapat} style={styles.hayalet}>
              <Text style={styles.hayaletYazi}>{t('ortak.iptal')}</Text>
            </Pressable>
          </>
        ) : null}

        {asama === 'kayit' ? (
          <>
            <Text style={styles.baslik}>{t('canliYayin.kesitCekiliyor')}</Text>
            {!yerel ? (
              <View style={styles.cekKutu}>
                <CanliKesitKamera
                  ref={kameraRef}
                  onBasladi={() => setGecen(0)}
                  onDone={(dosya) => void kameraBitti(dosya)}
                  onError={kameraHata}
                />
                <View style={styles.sureRozeti} pointerEvents="none">
                  <Text style={styles.sureRozetiYazi}>
                    {t('canliYayin.kesitSn', { n: gecen })}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.alt}>
                  {t('canliYayin.kesitKaydediliyor')} {yuzde}%
                </Text>
                <ActivityIndicator color="#fff" />
                <View style={styles.sureSatir}>
                  {KESIT_SURELERI.map((sn) => (
                    <Pressable
                      key={sn}
                      onPress={() => void baslat(sn)}
                      style={[styles.sureBtn, sn === saniye && styles.sureBtnVarsayilan]}
                    >
                      <Text style={styles.sureYazi}>{t('canliYayin.kesitSn', { n: sn })}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {!yerel ? (
              <Pressable onPress={() => kameraRef.current?.durdur()} style={styles.ana}>
                <Text style={styles.anaYazi}>{t('canliYayin.kesitBitir')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => void vazgec()} style={styles.hayalet}>
              <Text style={styles.hayaletYazi}>{t('ortak.iptal')}</Text>
            </Pressable>
          </>
        ) : null}

        {asama === 'baglaniyor' ? (
          <>
            <Text style={styles.baslik}>{t('canliYayin.kesitHazirlaniyor')}</Text>
            <ActivityIndicator color="#fff" />
          </>
        ) : null}

        {asama === 'onizleme' && onizlemeUri ? (
          <>
            <Text style={styles.baslik}>{t('canliYayin.kesitHazir')}</Text>
            {klavyeAcik ? null : (
              <>
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
              </>
            )}
            {klavyeAcik ? (
              <Pressable onPress={klavyeyiKapat} style={styles.klavyeKapat}>
                <Text style={styles.hayaletYazi}>{t('ortak.tamam')}</Text>
              </Pressable>
            ) : null}
            <TextInput
              ref={girdiRef}
              value={caption}
              onChangeText={(v) => setCaption(v.slice(0, KESIT_CAPTION_MAX))}
              placeholder={t('canliYayin.kesitCaption')}
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.girdi}
              maxLength={KESIT_CAPTION_MAX}
              multiline
              blurOnSubmit
              submitBehavior="blurAndSubmit"
              returnKeyType="done"
              onSubmitEditing={klavyeyiKapat}
            />
            {hata ? <Text style={styles.hata}>{hata}</Text> : null}
            <Pressable
              onPress={() => {
                klavyeyiKapat();
                void paylas();
              }}
              style={styles.ana}
            >
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
  cekKutu: {
    alignSelf: 'center',
    width: 210,
    height: 372,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  sureRozeti: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sureRozetiYazi: { color: '#fff', fontSize: 16, fontWeight: '800' },
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
  klavyeKapat: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 4 },
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
