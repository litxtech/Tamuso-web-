import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  AjansYonetimAjanslarim,
  type AjansYonetimOzet,
} from '../islemler/AjansPanelIslemleri';
import { SahipOlunanAjanslariGetir } from '../okuma/AjanslariGetir';

/** Ajans yetkisi olan kullanıcının sahip olduğu ajanslar (menü görünürlüğü). */
export function useAjansYonetim() {
  const [ajanslar, setAjanslar] = useState<AjansYonetimOzet[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yenile = useCallback(async () => {
    setYukleniyor(true);
    try {
      let liste = await AjansYonetimAjanslarim();
      // RPC yoksa / hata: doğrudan agencies tablosundan sahip ajansları al
      if (!liste.length) {
        const yedek = await SahipOlunanAjanslariGetir().catch(() => []);
        liste = yedek.map((a) => ({
          id: a.id,
          agency_public_id: a.agency_public_id,
          name: a.name,
          status: a.status,
          is_coin_distributor: a.is_coin_distributor,
          invite_code: a.invite_code,
          host_count: a.host_count,
          level_code: a.level_code,
          my_role: 'OWNER',
        }));
      }
      setAjanslar(liste);
    } catch {
      try {
        const yedek = await SahipOlunanAjanslariGetir();
        setAjanslar(
          yedek.map((a) => ({
            id: a.id,
            agency_public_id: a.agency_public_id,
            name: a.name,
            status: a.status,
            is_coin_distributor: a.is_coin_distributor,
            invite_code: a.invite_code,
            host_count: a.host_count,
            level_code: a.level_code,
            my_role: 'OWNER',
          })),
        );
      } catch {
        setAjanslar([]);
      }
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void yenile();
    }, [yenile]),
  );

  const yetkili = ajanslar.length > 0;
  const tekAjans = ajanslar.length === 1 ? ajanslar[0] : null;
  // Hub her zaman yükler ve tek ajansa yönlendirir — menü tıklamasında yarış yok
  const yonetimHref = '/ajans/yonetim' as const;

  return {
    ajanslar,
    yetkili,
    tekAjans,
    yonetimHref,
    yukleniyor,
    yenile,
  };
}
