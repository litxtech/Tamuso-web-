import { useEffect } from 'react';
import { AppState } from 'react-native';
import i18n from '../../../../i18n';
import { BildirimKuyrugaEkleDev } from '../../../bildirimler/okuma/BildirimKuyrugumuGetir';
import { StudioOyunlarim } from '../../StudioApi';
import { StudioV2Adim } from '../StudioV2Api';
import {
  uretimArkaPlan,
  uretimCalisiyor,
  uretimHaberVerildi,
  uretimIzlenenler,
  uretimOzetYaz,
} from './uretimKuyrugu';

function yuzde(phases: { state: string }[] | undefined) {
  if (!phases?.length) return null;
  const biten = phases.filter((f) => f.state === 'bitti').length;
  return biten > 0 ? Math.round((biten / phases.length) * 100) : null;
}

/**
 * Proje ekranı kapalıyken açık olan üretimleri ilerletir.
 * Uygulama arka plandayken tick atılmaz; ön plana dönünce sunucu durumu eşitlenir.
 * Sağlayıcıya gitmiş işler orada sürer. Yeni adımlar bu izleyici açıkken başlar.
 */
export function StudioUretimServisi() {
  useEffect(() => {
    let iptal = false;
    let zaman: ReturnType<typeof setTimeout> | null = null;
    let suruyor = false;

    const tara = async () => {
      const liste = await StudioOyunlarim();
      if (iptal) return;
      for (const oyun of liste) {
        if (oyun.runtime_type === 'tamuso_game_v2' && uretimCalisiyor(oyun.status)) uretimArkaPlan(oyun.id);
      }
    };

    const dongu = async () => {
      if (iptal) return;
      if (AppState.currentState !== 'active' || suruyor) {
        zaman = setTimeout(() => void dongu(), 8000);
        return;
      }
      const idler = uretimIzlenenler();
      if (!idler.length) {
        zaman = setTimeout(() => void dongu(), 12000);
        return;
      }
      suruyor = true;
      let bekle = 12000;
      for (const id of idler) {
        if (iptal || AppState.currentState !== 'active') break;
        const sonuc = await StudioV2Adim(id);
        if (!sonuc?.status) continue;
        const once = sonuc.status;
        uretimOzetYaz(id, {
          status: once,
          yuzde: yuzde(sonuc.phases),
          eta: sonuc.eta ?? null,
        });
        if (sonuc.pollAfterMs) bekle = Math.min(bekle, sonuc.pollAfterMs);
        if (once === 'READY_FOR_PREVIEW' && !uretimHaberVerildi(id)) {
          const ad = sonuc.title || 'Studio';
          void BildirimKuyrugaEkleDev({
            title: i18n.t('studio.oyununHazir'),
            body: i18n.t('studio.hazirBildirim', { ad }),
            category: 'system',
          });
        }
      }
      suruyor = false;
      if (iptal) return;
      zaman = setTimeout(() => void dongu(), Math.min(20000, Math.max(8000, bekle)));
    };

    void tara().then(() => void dongu());
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (zaman) clearTimeout(zaman);
        void dongu();
      }
    });
    return () => {
      iptal = true;
      if (zaman) clearTimeout(zaman);
      app.remove();
    };
  }, []);

  return null;
}
