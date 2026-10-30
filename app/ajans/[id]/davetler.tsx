import React, { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  AjansAltEkranKabuk,
  AjansBolumBaslik,
  AjansCta,
  AjansHint,
  AjansInput,
  AjansKart,
  AjansListeSatir,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansDavetAnalitik,
  AjansDavetIptal,
  AjansDavetListesi,
  AjansDavetOlustur,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import { AjansKayitDurum } from '../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { AjansProfilGetir } from '../../../src/moduller/ajanslar/okuma/AjansProfilGetir';
import { DurumAjansDavetOlustur } from '../../../src/moduller/durum/islemler/DurumIslemleri';
import { AjansDavetHttpsUrlOlustur } from '../../../src/moduller/paylasim-linkleri/PaylasimUrl';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

export default function AjansDavetlerEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [liste, setListe] = useState<Array<Record<string, unknown>>>([]);
  const [analitik, setAnalitik] = useState<Record<string, unknown> | null>(null);
  const [ajansAdi, setAjansAdi] = useState('');
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [l, a, profil] = await Promise.all([
        AjansDavetListesi(id),
        AjansDavetAnalitik(id).catch(() => null),
        AjansProfilGetir(id).catch(() => null),
      ]);
      setListe(l);
      setAnalitik(a);
      setAjansAdi(profil?.agency.name?.trim() || '');
    } catch {
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void yukle(); }, [yukle]));

  const linkPaylas = (kod: string) => {
    const url = AjansDavetHttpsUrlOlustur(kod);
    const ad = ajansAdi || t('ajans.katilBaslik');
    void Share.share({
      message: t('ajans.davetPaylasMetin', { ad, url }),
    }).catch(() => undefined);
  };

  const gonderiPaylas = (kod: string) => {
    void (async () => {
      const r = await DurumAjansDavetOlustur(kod);
      if (!r.ok) {
        Alert.alert(t('ajans.alertDavet'), r.hata ?? t('ajans.alertDavet'));
        return;
      }
      Alert.alert(t('ajans.alertDavet'), t('ajans.davetGonderiOldu'));
    })();
  };

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      title={t('ajans.davetler')}
      subtitle={t('ajans.davetlerAlt')}
      aktif="davetler"
      yukleniyor={yukleniyor && liste.length === 0}
      refreshing={yukleniyor && liste.length > 0}
      onRefresh={() => void yukle()}
    >
      <AjansBolumBaslik>{t('ajans.yeniDavet')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput
          value={label}
          onChangeText={setLabel}
          placeholder={t('ajans.phEtiketOpsiyonel')}
        />
        <AjansInput
          value={maxUses}
          onChangeText={setMaxUses}
          placeholder={t('ajans.phMaxKullanim')}
          keyboardType="number-pad"
        />
        <AjansCta
          label={t('ajans.davetOlustur')}
          onPress={() => {
            void (async () => {
              const n = maxUses.trim() === '' ? null : Math.max(1, Number(maxUses) || 1);
              const r = await AjansDavetOlustur({
                agencyId: id,
                maxUses: n,
                label: label.trim() || undefined,
              });
              if (!r.ok) Alert.alert(t('ajans.alertDavet'), r.hata);
              else {
                if (r.invite_code) linkPaylas(r.invite_code);
                await yukle();
              }
            })();
          }}
        />
        <Text style={styles.hint}>{t('ajans.qrTurleriHint')}</Text>
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.aktifDavetler')}</AjansBolumBaslik>
      <AjansKart>
        {liste.length === 0 ? (
          <AjansHint>{t('ajans.henuzVeriYok')}</AjansHint>
        ) : (
          liste.map((d) => (
            <View key={String(d.id)}>
              <AjansListeSatir
                title={String(d.invite_code)}
                subtitle={`${AjansKayitDurum(String(d.status), t)} · ${d.used_count ?? 0}/${d.max_uses ?? '∞'}${d.label ? ` · ${d.label}` : ''}`}
              />
              <AjansCta
                ghost
                label={t('ajans.davetLinkPaylas')}
                onPress={() => linkPaylas(String(d.invite_code))}
              />
              <AjansCta
                ghost
                label={t('ajans.davetGonderiPaylas')}
                onPress={() => gonderiPaylas(String(d.invite_code))}
              />
              <AjansCta
                ghost
                label={t('ortak.iptal')}
                onPress={() => {
                  void (async () => {
                    const r = await AjansDavetIptal(String(d.id));
                    if (!r.ok) Alert.alert(t('ajans.alertDavet'), r.hata);
                    else await yukle();
                  })();
                }}
              />
            </View>
          ))
        )}
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.davetAnalitik')}</AjansBolumBaslik>
      <AjansKart>
        {analitik ? (
          <Text style={styles.hint}>
            {t('ajans.toplamOlay', { n: String(analitik.toplam ?? 0) })}
            {'\n'}
            {t('ajans.tiplerJson', { json: JSON.stringify(analitik.by_type ?? {}) })}
            {'\n'}
            {t('ajans.kaynakJson', { json: JSON.stringify(analitik.by_source ?? {}) })}
          </Text>
        ) : (
          <AjansHint>{t('ajans.henuzVeriYok')}</AjansHint>
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  hint: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
});
