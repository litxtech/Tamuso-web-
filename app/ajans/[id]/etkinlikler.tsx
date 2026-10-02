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
  AjansEtkinlikListesi,
  AjansEtkinlikOlustur,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import {
  AjansKayitDurum,
  AjansTurEtiket,
} from '../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../src/i18n/diller';

export default function AjansEtkinliklerEkrani() {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const id = useAjansRouteId();
  const [liste, setListe] = useState<Array<Record<string, unknown>>>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      setListe(await AjansEtkinlikListesi(id));
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
      title={t('ajans.etkinliklerBaslik')}
      subtitle={t('ajans.etkinliklerAlt')}
      aktif="etkinlikler"
      yukleniyor={yukleniyor && liste.length === 0}
      refreshing={yukleniyor && liste.length > 0}
      onRefresh={() => void yukle()}
    >
      <AjansBolumBaslik>{t('ajans.yeniEtkinlik')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput value={title} onChangeText={setTitle} placeholder={t('ajans.phBaslik')} />
        <AjansInput
          value={desc}
          onChangeText={setDesc}
          placeholder={t('ajans.phAciklamaKisa')}
          multiline
        />
        <AjansCta
          label={t('ajans.scheduledOlustur')}
          onPress={() => {
            void (async () => {
              const r = await AjansEtkinlikOlustur({
                agencyId: id,
                title: title.trim() || t('ajans.varsayilanEtkinlik'),
                description: desc,
                startsAt: new Date(Date.now() + 86400000).toISOString(),
                status: 'SCHEDULED',
              });
              if (!r.ok) Alert.alert(t('ajans.alertEtkinlik'), r.hata);
              else {
                setTitle('');
                setDesc('');
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
          liste.map((e) => (
            <AjansListeSatir
              key={String(e.id)}
              title={String(e.title)}
              subtitle={t('ajans.etkinlikSatir', {
                status: AjansKayitDurum(String(e.status), t),
                kind: AjansTurEtiket(String(e.kind), t),
                zaman: new Date(String(e.starts_at)).toLocaleString(locale),
              })}
            />
          ))
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}
