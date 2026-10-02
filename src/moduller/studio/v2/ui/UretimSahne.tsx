import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CeviriAnahtari } from '../../../../i18n/useCeviri';
import type { StudioFaz, StudioVarlik, StudioV2Gorunum } from '../StudioV2Api';
import { StudioDurumRozet, StudioIlerleme, StudioKapak, StudioRenk } from './Bilesenler';
import { durumInsan, varlikAdi } from './insanMetni';
import { isAnahtari } from './studioDurum';

type Cevir = (key: CeviriAnahtari, opts?: Record<string, unknown>) => string;

const FAZ: Record<string, CeviriAnahtari> = {
  design: 'studio.asamaTasarim',
  scene_plan: 'studio.asamaSahne',
  models: 'studio.asamaModel',
  textures: 'studio.asamaDoku',
  audio: 'studio.asamaSes',
  gameplay: 'studio.asamaOynanis',
  preview: 'studio.asamaOnizleme',
};

function simge(state: string) {
  if (state === 'bitti') return '✓';
  if (state === 'oluyor') return '●';
  if (state === 'hata') return '!';
  return '○';
}

export function UretimSahne(props: {
  t: Cevir;
  hizala: 'left' | 'right';
  baslik: string;
  kapak?: string | null;
  suAn: string;
  yuzde: number | null;
  fazlar: StudioFaz[];
  varliklar: StudioVarlik[];
  etkinlik: NonNullable<StudioV2Gorunum['activity']>;
  teknik: boolean;
  calisiyor: boolean;
  hata: string | null;
  sure: string | null;
  durduruldu: boolean;
  onDurdur: () => void;
  onDevam: () => void;
  onArkaPlan: () => void;
  onTeknik: () => void;
  onTekrar: () => void;
  onBasarisiz: () => void;
}) {
  const { t } = props;
  const calisan = props.varliklar.filter((v) => v.status === 'RUNNING' || v.status === 'RETRYING');
  const basarisiz = props.varliklar.filter((v) => v.status === 'FAILED');
  const hataSatir = props.hata || (basarisiz[0]
    ? (basarisiz[0].type === 'audio' ? t('studio.sesHata') : t('studio.modelHata'))
    : null);

  return (
    <View style={styles.liste}>
      <StudioKapak uri={props.kapak} boy={210}>
        {props.calisiyor && props.yuzde != null ? (
          <View style={styles.kapakAlt}>
            <Text style={styles.kapakYuzde}>{props.yuzde}%</Text>
          </View>
        ) : null}
      </StudioKapak>

      <Text style={[styles.kicker, { textAlign: props.hizala }]}>
        {props.durduruldu ? t('studio.durumDurdu') : t('studio.olusturuluyor')}
      </Text>
      {props.yuzde != null ? <Text style={styles.yuzde}>{props.yuzde}%</Text> : props.calisiyor ? <ActivityIndicator color={StudioRenk.vurgu} /> : null}
      <StudioIlerleme yuzde={props.yuzde} />
      <Text style={[styles.not, { textAlign: props.hizala }]}>
        {t('studio.kalanSure')}: {props.sure || t('studio.sureHesap')}
      </Text>

      <Text style={[styles.bolum, { textAlign: props.hizala }]}>{t('studio.suAnda')}</Text>
      {calisan.length ? calisan.slice(0, 4).map((v) => (
        <View key={v.assetKey} style={styles.satirKart}>
          <Text style={styles.satirAd}>{varlikAdi(v.assetKey)}</Text>
          <StudioDurumRozet label={durumInsan(v.status, t)} tone="vurgu" />
          {props.teknik && v.provider ? <Text style={styles.not}>{v.provider}</Text> : null}
        </View>
      )) : (
        <Text style={[styles.suAn, { textAlign: props.hizala }]}>{props.suAn}</Text>
      )}

      <View style={styles.fazKutu}>
        {props.fazlar.map((f) => (
          <Text key={f.id} style={[styles.faz, f.state === 'hata' && styles.hata, f.state === 'bekliyor' && styles.soluk]}>
            {simge(f.state)} {t(FAZ[f.id] ?? 'studio.asamaTasarim')}{f.detail ? `  ${f.detail}` : ''}
          </Text>
        ))}
      </View>

      {props.varliklar.length ? (
        <View style={styles.varlikSatir}>
          {props.varliklar.map((v) => (
            <View key={v.assetKey} style={styles.varlikKart}>
              <Text style={styles.varlikAd} numberOfLines={2}>{varlikAdi(v.assetKey)}</Text>
              <Text style={styles.not}>{v.type === 'model' ? '3D' : v.type === 'audio' ? t('studio.ses') : v.type}</Text>
              <Text style={[styles.not, v.status === 'FAILED' && styles.hata]}>{durumInsan(v.status, t)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.not}>{t('studio.varlikYok')}</Text>
      )}

      {basarisiz.length ? (
        <View style={styles.liste}>
          <Text style={styles.hata}>{t('studio.birIslem', { sayi: basarisiz.length })}</Text>
          <Text style={styles.not}>{hataSatir}</Text>
          <Pressable style={styles.ikincil} onPress={props.onBasarisiz} accessibilityRole="button">
            <Text style={styles.ikincilYazi}>{t('studio.yenidenBasarisiz')}</Text>
          </Pressable>
        </View>
      ) : null}

      {props.teknik ? props.etkinlik.map((e, i) => (
        <Text key={`${e.kind}-${i}`} style={styles.not}>
          {saat(e.at)}{t(isAnahtari(e.kind))} · {durumInsan(e.status, t)} · {e.kind}{e.errorCode ? ` · ${e.errorCode}` : ''}
        </Text>
      )) : null}

      <Pressable onPress={props.onTeknik} accessibilityRole="button" style={styles.linkHit}>
        <Text style={styles.link}>{props.teknik ? t('studio.kapat') : t('studio.ayrintilar')}</Text>
      </Pressable>

      {props.calisiyor && !props.durduruldu ? (
        <View style={styles.satir}>
          <Pressable style={styles.tehlikeBtn} onPress={props.onDurdur} accessibilityRole="button">
            <Text style={styles.tehlikeYazi}>{t('studio.uretimiDurdur')}</Text>
          </Pressable>
          <Pressable style={styles.ikincil} onPress={props.onArkaPlan} accessibilityRole="button">
            <Text style={styles.ikincilYazi}>{t('studio.arkaPlanda')}</Text>
          </Pressable>
        </View>
      ) : null}
      {props.durduruldu ? (
        <Pressable style={styles.birincil} onPress={props.onDevam} accessibilityRole="button">
          <Text style={styles.birincilYazi}>{t('studio.uretimeDevam')}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.not}>{t('studio.arkaPlan')}</Text>
      {props.hata && !basarisiz.length ? (
        <View style={styles.liste}>
          <Text style={styles.hata}>{props.hata}</Text>
          <Pressable style={styles.birincil} onPress={props.onTekrar} accessibilityRole="button">
            <Text style={styles.birincilYazi}>{t('studio.tekrarDene')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function saat(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} `;
}

const styles = StyleSheet.create({
  liste: { gap: 10 },
  kapakAlt: { position: 'absolute', left: 12, bottom: 12 },
  kapakYuzde: { color: '#fff', fontWeight: '800', fontSize: 22 },
  kicker: { color: StudioRenk.vurgu, fontWeight: '800', letterSpacing: 1.1, fontSize: 12 },
  yuzde: { color: '#fff', fontSize: 42, fontWeight: '800' },
  suAn: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bolum: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.8, marginTop: 4 },
  fazKutu: { gap: 6, paddingVertical: 4 },
  faz: { color: '#fff', fontWeight: '700', fontSize: 15 },
  soluk: { color: 'rgba(255,255,255,0.45)' },
  not: { color: 'rgba(255,255,255,0.62)', lineHeight: 18, fontSize: 13 },
  hata: { color: StudioRenk.tehlike, fontWeight: '700' },
  satirKart: { borderRadius: 14, borderWidth: 1, borderColor: StudioRenk.cizgi, backgroundColor: StudioRenk.yuzey, padding: 12, gap: 6 },
  satirAd: { color: '#fff', fontWeight: '800', fontSize: 16 },
  varlikSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  varlikKart: { width: '47%', borderRadius: 14, backgroundColor: StudioRenk.yuzey2, padding: 12, gap: 4, minHeight: 92 },
  varlikAd: { color: '#fff', fontWeight: '800' },
  link: { color: StudioRenk.vurgu, fontWeight: '800' },
  linkHit: { minHeight: 44, justifyContent: 'center' },
  satir: { flexDirection: 'row', gap: 8 },
  birincil: { minHeight: 48, borderRadius: 14, backgroundColor: StudioRenk.vurgu, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  birincilYazi: { color: '#fff', fontWeight: '800' },
  ikincil: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: StudioRenk.cizgi, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: StudioRenk.yuzey },
  ikincilYazi: { color: '#fff', fontWeight: '800' },
  tehlikeBtn: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: StudioRenk.tehlike, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  tehlikeYazi: { color: StudioRenk.tehlike, fontWeight: '800' },
});
