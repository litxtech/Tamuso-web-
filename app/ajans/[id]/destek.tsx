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
  AjansDestekListesi,
  AjansDestekOlustur,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import { AjansKayitDurum } from '../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { useCeviri } from '../../../src/i18n/useCeviri';

export default function AjansDestekEkrani() {
  const { t, dil } = useCeviri();
  const id = useAjansRouteId();
  const [liste, setListe] = useState<Array<Record<string, unknown>>>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      setListe(await AjansDestekListesi(id));
    } catch {
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void yukle(); }, [yukle]));

  const locale =
    dil === 'tr' ? 'tr-TR' : dil === 'es' ? 'es-ES' : dil === 'ar' ? 'ar' : 'en-US';

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      title={t('ajans.rayDestek')}
      subtitle={t('ajans.destekAlt')}
      aktif="destek"
      yukleniyor={yukleniyor && liste.length === 0}
      refreshing={yukleniyor && liste.length > 0}
      onRefresh={() => void yukle()}
    >
      <AjansBolumBaslik>{t('ajans.yeniTalep')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput
          value={subject}
          onChangeText={setSubject}
          placeholder={t('ajans.phKonu')}
        />
        <AjansInput
          value={body}
          onChangeText={setBody}
          placeholder={t('ajans.phAciklamaKisa')}
          multiline
        />
        <AjansCta
          label={t('ortak.gonder')}
          onPress={() => {
            void (async () => {
              const r = await AjansDestekOlustur({
                agencyId: id,
                subject: subject.trim(),
                body: body.trim(),
              });
              if (!r.ok) Alert.alert(t('ajans.rayDestek'), r.hata);
              else {
                setSubject('');
                setBody('');
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
          liste.map((row) => (
            <AjansListeSatir
              key={String(row.id)}
              title={String(row.subject)}
              subtitle={`${AjansKayitDurum(String(row.status), t)} · ${row.creator_name ?? ''} · ${new Date(String(row.created_at)).toLocaleString(locale)}`}
            />
          ))
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}
