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
  AjansProgramListesi,
  AjansProgramOlustur,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import {
  AjansKayitDurum,
  AjansTurEtiket,
} from '../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../src/i18n/diller';

export default function AjansProgramEkrani() {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const id = useAjansRouteId();
  const [liste, setListe] = useState<Array<Record<string, unknown>>>([]);
  const [title, setTitle] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      setListe(await AjansProgramListesi(id));
    } catch {
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void yukle(); }, [yukle]));

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      title={t('ajans.programBaslik')}
      subtitle={t('ajans.programAlt')}
      aktif="program"
      yukleniyor={yukleniyor && liste.length === 0}
      refreshing={yukleniyor && liste.length > 0}
      onRefresh={() => void yukle()}
    >
      <AjansBolumBaslik>{t('ajans.yeniProgram')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput value={title} onChangeText={setTitle} placeholder={t('ajans.phBaslik')} />
        <AjansCta
          label={t('ajans.canliPlanla')}
          onPress={() => {
            void (async () => {
              const starts = new Date(Date.now() + 3600000).toISOString();
              const r = await AjansProgramOlustur({
                agencyId: id,
                title: title.trim() || t('ajans.varsayilanProgram'),
                kind: 'live',
                startsAt: starts,
              });
              if (!r.ok) Alert.alert(t('ajans.alertProgram'), r.hata);
              else {
                setTitle('');
                await yukle();
              }
            })();
          }}
        />
      </AjansKart>
      <AjansKart>
        {liste.length === 0 ? (
          <AjansHint>{t('ajans.henuzVeriYok')}</AjansHint>
        ) : (
          liste.map((p) => (
            <AjansListeSatir
              key={String(p.id)}
              title={String(p.title)}
              subtitle={t('ajans.programListeSatir', {
                kind: AjansTurEtiket(String(p.kind), t),
                status: AjansKayitDurum(String(p.status), t),
                zaman: new Date(String(p.starts_at)).toLocaleString(locale),
                host: p.host_name ?? '',
              })}
            />
          ))
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}
