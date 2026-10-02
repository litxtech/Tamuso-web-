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
  AjansEkipListesi,
  AjansEkipOlustur,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import { useCeviri } from '../../../src/i18n/useCeviri';

export default function AjansEkiplerEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [liste, setListe] = useState<Array<Record<string, unknown>>>([]);
  const [ad, setAd] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      setListe(await AjansEkipListesi(id));
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
      title={t('ajans.ekipler')}
      subtitle={t('ajans.ekiplerAlt')}
      aktif="ekipler"
      yukleniyor={yukleniyor && liste.length === 0}
      refreshing={yukleniyor && liste.length > 0}
      onRefresh={() => void yukle()}
    >
      <AjansBolumBaslik>{t('ajans.yeniEkip')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput
          value={ad}
          onChangeText={setAd}
          placeholder={t('ajans.ekipPh')}
        />
        <AjansCta
          label={t('ortak.olustur')}
          onPress={() => {
            void (async () => {
              const r = await AjansEkipOlustur({ agencyId: id, name: ad.trim() });
              if (!r.ok) Alert.alert(t('ajans.alertEkip'), r.hata);
              else {
                setAd('');
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
              title={String(e.name)}
              subtitle={t('ajans.uyeRenk', {
                count: e.uye_sayisi ?? 0,
                renk: e.color ?? '',
              })}
            />
          ))
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}
