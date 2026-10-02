import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
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
  AjansGorevListesi,
  AjansGorevOlustur,
  AjansHedefListesi,
  AjansHedefOlustur,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import {
  AjansKayitDurum,
  AjansTurEtiket,
} from '../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { useCeviri } from '../../../src/i18n/useCeviri';

export default function AjansGorevlerEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [gorevler, setGorevler] = useState<Array<Record<string, unknown>>>([]);
  const [hedefler, setHedefler] = useState<Array<Record<string, unknown>>>([]);
  const [title, setTitle] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [g, h] = await Promise.all([
        AjansGorevListesi(id),
        AjansHedefListesi(id).catch(() => []),
      ]);
      setGorevler(g);
      setHedefler(h);
    } catch {
      setGorevler([]);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void yukle(); }, [yukle]));

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      title={t('ajans.gorevlerBaslik')}
      subtitle={t('ajans.gorevlerAlt')}
      aktif="gorevler"
      yukleniyor={yukleniyor && gorevler.length === 0}
      refreshing={yukleniyor && gorevler.length > 0}
      onRefresh={() => void yukle()}
    >
      <AjansBolumBaslik>{t('ajans.gorevOlustur')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('ajans.phGorevOrnek')}
        />
        <AjansCta
          label={t('ajans.gorevEkle')}
          onPress={() => {
            void (async () => {
              const r = await AjansGorevOlustur({
                agencyId: id,
                title: title.trim() || t('ajans.varsayilanGorev'),
                verificationType: 'live_count',
                verificationTarget: 3,
              });
              if (!r.ok) Alert.alert(t('ajans.alertGorev'), r.hata);
              else {
                setTitle('');
                await yukle();
              }
            })();
          }}
        />
        <AjansCta
          ghost
          label={t('ajans.hedef100Saat')}
          onPress={() => {
            void (async () => {
              const r = await AjansHedefOlustur({
                agencyId: id,
                title: t('ajans.hedef100SaatTitle'),
                metric: 'live_hours',
                targetValue: 100,
              });
              if (!r.ok) Alert.alert(t('ajans.alertHedef'), r.hata);
              else await yukle();
            })();
          }}
        />
      </AjansKart>
      <AjansKart>
        {gorevler.length === 0 ? (
          <AjansHint>{t('ajans.henuzVeriYok')}</AjansHint>
        ) : (
          gorevler.map((g) => (
            <AjansListeSatir
              key={String(g.id)}
              title={String(g.title)}
              subtitle={t('ajans.ilerlemeSatir', {
                status: AjansKayitDurum(String(g.status), t),
                type: AjansTurEtiket(String(g.verification_type), t),
                progress: g.progress,
                target: g.verification_target,
              })}
            />
          ))
        )}
      </AjansKart>
      <AjansBolumBaslik>{t('ajans.hedeflerBolum')}</AjansBolumBaslik>
      <AjansKart>
        {hedefler.length === 0 ? (
          <AjansHint>{t('ajans.henuzVeriYok')}</AjansHint>
        ) : (
          hedefler.map((h) => (
            <AjansListeSatir
              key={String(h.id)}
              title={String(h.title)}
              subtitle={t('ajans.hedefSatir', {
                cur: h.current_value,
                target: h.target_value,
                pct: h.progress_pct,
              })}
            />
          ))
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}
