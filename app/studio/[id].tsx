import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import { StudioOyunKaydet, StudioOyunOku, type StudioOyun } from '../../src/moduller/studio/StudioApi';
import { StudioOnizleme } from '../../src/moduller/studio/StudioOnizleme';
import type { CalismaIstatistik } from '../../src/moduller/studio/v2/OyunCalismaAlani';
import {
  StudioV2Adim,
  StudioV2Adresler,
  StudioV2Basarisiz,
  StudioV2Baslat,
  StudioV2GeriAl,
  StudioV2Gorsel,
  StudioV2Tekrar,
  StudioV2Yama,
  StudioV2Yayin,
  StudioV2Durdur,
  StudioV2Devam,
  type StudioV2Gorunum,
} from '../../src/moduller/studio/v2/StudioV2Api';
import { StudioProje } from '../../src/moduller/studio/v2/ui/StudioProje';
import { uretimArkaPlan, uretimOzetYaz, uretimSahiplen } from '../../src/moduller/studio/v2/ui/uretimKuyrugu';
import { AnalyticsOlayEkle } from '../../src/moduller/guvenlik/analytics/AnalyticsOlayEkle';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

  const CALISAN = ['PLANNING', 'GENERATING_ASSETS', 'BUILDING_SCENE', 'BUILDING_GAMEPLAY', 'SCANNING'];
const HAZIR = ['READY_FOR_PREVIEW', 'PRIVATE_TEST', 'SUBMITTED'];
const STUDYO = '/studio' as Href;

function studyoyaDon(router: ReturnType<typeof useRouter>) {
  try {
    router.dismissTo(STUDYO);
  } catch {
    router.replace(STUDYO);
  }
}

export default function StudioOyunEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, dil, rtl } = useCeviri();
  const [oyun, setOyun] = useState<StudioOyun | null>(null);
  const [akis, setAkis] = useState<StudioV2Gorunum | null>(null);
  const [prompt, setPrompt] = useState('');
  const [paused, setPaused] = useState(true);
  const [restartKey, setRestartKey] = useState(0);
  const [tam, setTam] = useState(false);
  const [ist, setIst] = useState<CalismaIstatistik | null>(null);
  const [adres, setAdres] = useState<{ urls: Record<string, string>; allowedHosts: string[] } | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [baslamadi, setBaslamadi] = useState(false);
  const hizala = rtl ? 'right' : 'left';
  const v2 = oyun?.runtime_type === 'tamuso_game_v2';
  const durum = akis?.status || oyun?.status || 'DRAFT';
  const hazir = HAZIR.includes(durum);

  useEffect(() => {
    if (!id) return;
    const birak = uretimSahiplen(id);
    return () => {
      birak();
      uretimArkaPlan(id);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void AnalyticsOlayEkle('STUDIO_PROJECT_OPEN', { gameId: id });
    void StudioOyunOku(id).then((row) => {
      setOyun(row);
      setPrompt(row?.prompt ?? '');
      if (row?.runtime_type === 'tamuso_game_v2') {
        setAkis({
          ok: true,
          status: row.status,
          errorCode: row.error_code,
          specification: row.specification,
          design: row.design,
          scene: row.scene_graph,
          gameplay: row.gameplay_graph,
          manifest: row.manifest,
        });
      }
    });
  }, [id]);

  useEffect(() => {
    if (!v2 || !id || durum !== 'DRAFT') return;
    let iptal = false;
    void StudioV2Baslat(id, dil).then((sonuc) => {
      if (iptal || !sonuc) return;
      setAkis(sonuc);
      setBaslamadi(!sonuc.ok);
      if (!sonuc.ok) setMesaj(sonuc.code ?? sonuc.errorCode ?? 'HATA');
    });
    return () => {
      iptal = true;
    };
  }, [v2, id, durum, dil]);

  useEffect(() => {
    if (!v2 || !id || !CALISAN.includes(durum)) return;
    let iptal = false;
    let suruyor = false;
    let zaman: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (suruyor || iptal) return;
      suruyor = true;
      const sonuc = await StudioV2Adim(id);
      suruyor = false;
      if (iptal) return;
      if (sonuc?.status) {
        setAkis(sonuc);
        const biten = sonuc.phases?.filter((f) => f.state === 'bitti').length ?? 0;
        const toplam = sonuc.phases?.length ?? 0;
        uretimOzetYaz(id, {
          status: sonuc.status,
          yuzde: toplam && biten > 0 ? Math.round((biten / toplam) * 100) : null,
          eta: sonuc.eta ?? null,
        });
      }
      const bekle = Math.min(20000, Math.max(8000, sonuc?.pollAfterMs ?? 12000));
      zaman = setTimeout(() => void tick(), bekle);
    };
    void tick();
    return () => {
      iptal = true;
      if (zaman) clearTimeout(zaman);
    };
  }, [v2, id, durum]);

  useEffect(() => {
    if (!v2 || !id || !hazir) return;
    void StudioV2Adresler(id).then((sonuc) => {
      if (sonuc.ok && sonuc.urls && sonuc.allowedHosts) {
        setAdres({ urls: sonuc.urls, allowedHosts: sonuc.allowedHosts });
        if (sonuc.manifest) setAkis((once) => ({ ...(once ?? { ok: true }), manifest: sonuc.manifest as StudioV2Gorunum['manifest'] }));
      }
    });
  }, [v2, id, hazir, restartKey]);

  useEffect(() => {
    if (!oyun || !id || !v2 || prompt === oyun.prompt) return;
    const timer = setTimeout(() => {
      void StudioOyunKaydet({ id, prompt, title: oyun.title, options: oyun.options ?? {} }).then(() => {
        setOyun((once) => (once ? { ...once, prompt } : once));
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [prompt, id, oyun, v2]);

  const hataMetni = useMemo(() => {
    const kod = akis?.errorCode || oyun?.error_code || '';
    if (!kod || hazir) return null;
    if (String(kod).includes('AUDIO') || String(kod).includes('ELEVEN')) return t('studio.sesHata');
    if (String(kod).includes('MODEL') || String(kod).includes('MESHY') || kod === 'BAD_ASSET_PLAN' || kod === 'ASSET_MISSING') return t('studio.modelHata');
    if (String(kod).includes('R2') || String(kod).includes('UPLOAD')) return t('studio.yuklemeHata');
    if (durum === 'FAILED') return t('studio.onizlemeHata');
    return null;
  }, [akis?.errorCode, oyun?.error_code, hazir, durum, t]);

  const tekrar = () => {
    if (!id) return;
    setBaslamadi(false);
    setMesaj(null);
    const istek = durum === 'FAILED' ? StudioV2Tekrar(id) : StudioV2Baslat(id, dil);
    void istek.then((sonuc) => {
      setAkis(sonuc);
      setBaslamadi(!sonuc.ok);
      if (!sonuc.ok) setMesaj(sonuc.code ?? sonuc.errorCode ?? 'HATA');
    });
  };

  if (!oyun) {
    return (
      <Screen koyuSahne>
        <EkranBasligi title={t('studio.baslik')} fallbackHref={'/studio' as never} />
        <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 32 }} />
      </Screen>
    );
  }

  if (!v2) {
    return (
      <Screen>
        <EkranBasligi title={oyun.title || t('studio.taslak')} fallbackHref={'/studio' as never} />
        <ScrollView contentContainerStyle={styles.icerik}>
          <Text style={[styles.not, { textAlign: hizala }]}>{t('studio.legacyNot')}</Text>
          <TextInput value={prompt} onChangeText={setPrompt} multiline style={[styles.girdi, { textAlign: hizala }]} />
          {oyun.plan ? (
            <View style={styles.kart}>
              <Text style={[styles.baslik, { textAlign: hizala }]}>{oyun.plan.title}</Text>
              <Text style={[styles.metin, { textAlign: hizala }]}>{oyun.plan.summary}</Text>
              <StudioOnizleme plan={oyun.plan} />
            </View>
          ) : (
            <Text style={[styles.metin, { textAlign: hizala }]}>{t('studio.planYok')}</Text>
          )}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen koyuSahne>
      <StudioProje
        t={t}
        rtl={rtl}
        oyun={oyun}
        akis={akis}
        adres={adres}
        paused={paused}
        restartKey={restartKey}
        tam={tam}
        ist={ist}
        hazir={hazir}
        hataMetni={hataMetni}
        baslamadi={baslamadi}
        mesaj={mesaj}
        calisiyor={CALISAN.includes(durum) || (durum === 'DRAFT' && !baslamadi)}
        onGeri={() => studyoyaDon(router)}
        onDuraklat={() => setPaused((v) => !v)}
        onYeniden={() => { setRestartKey((n) => n + 1); setPaused(false); }}
        onTam={() => setTam((v) => !v)}
        onTekrar={tekrar}
        onDurdur={() => {
          if (!id) return;
          void StudioV2Durdur(id).then((sonuc) => { if (sonuc?.status) setAkis(sonuc); });
        }}
        onDevam={() => {
          if (!id) return;
          void StudioV2Devam(id).then((sonuc) => { if (sonuc?.status) setAkis(sonuc); });
        }}
        onBasarisiz={() => {
          if (!id) return;
          void StudioV2Basarisiz(id).then((sonuc) => { if (sonuc?.status) setAkis(sonuc); });
        }}
        onYama={async (yazi) => {
          if (!id) return;
          void AnalyticsOlayEkle('STUDIO_AI_EDIT_APPLY', { gameId: id });
          const sonuc = await StudioV2Yama(id, yazi, dil);
          if (sonuc?.status) setAkis(sonuc);
          else void StudioV2Adim(id).then(setAkis);
          return {
            ok: !!sonuc?.ok,
            summary: sonuc?.patch?.summary,
            operations: sonuc?.patch?.operations?.map((op) => op.operation),
          };
        }}
        onArkaPlan={() => {
          if (id) uretimArkaPlan(id);
          studyoyaDon(router);
        }}
        onGeriAl={() => {
          if (!id) return;
          void StudioV2GeriAl(id).then(() => StudioOyunOku(id).then((row) => { if (row) setOyun(row); }));
        }}
        onGorsel={(slot) => {
          if (!id) return;
          void (async () => {
            const secim = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: slot === 'cover' ? [16, 9] : [1, 1],
              quality: 0.55,
              base64: true,
            });
            const dosya = secim.assets?.[0];
            if (secim.canceled || !dosya?.base64) return;
            const mime = dosya.mimeType === 'image/png' ? 'image/png' : dosya.mimeType === 'image/webp' ? 'image/webp' : 'image/jpeg';
            const sonuc = await StudioV2Gorsel(id, slot, mime, dosya.base64);
            if (sonuc?.ok) setAkis(sonuc);
          })();
        }}
        onYayin={() => {
          if (!id) return;
          void StudioV2Yayin(id).then((sonuc) => {
            if (!sonuc.ok) setMesaj(sonuc.code === 'NOT_READY' ? t('studio.notReady') : sonuc.code ?? 'HATA');
            else {
              void AnalyticsOlayEkle('STUDIO_SUBMIT_REVIEW', { gameId: id });
              setAkis((once) => ({ ...(once ?? { ok: true }), status: 'SUBMITTED' }));
            }
          });
        }}
        onIssue={(kod) => setMesaj(kod)}
        onStats={setIst}
        onReady={() => undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: BoslukTokenlari.lg, gap: BoslukTokenlari.md, paddingBottom: 48 },
  girdi: { minHeight: 88, borderRadius: YaricapTokenlari.lg, borderWidth: 1, borderColor: RenkTokenlari.border, color: RenkTokenlari.text, padding: BoslukTokenlari.md, backgroundColor: RenkTokenlari.bgCard },
  kart: { borderRadius: YaricapTokenlari.lg, borderWidth: 1, borderColor: RenkTokenlari.border, padding: BoslukTokenlari.md, gap: 8, backgroundColor: RenkTokenlari.bgCard },
  baslik: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  metin: { ...TipografiTokenlari.body, color: RenkTokenlari.text, lineHeight: 22 },
  not: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, lineHeight: 18 },
});
