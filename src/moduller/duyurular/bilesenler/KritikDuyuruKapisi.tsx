import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCeviri } from '../../../i18n/useCeviri';
import { isRtlDil } from '../../../i18n/rtl';
import {
  DuyuruAcilisGetir,
  DuyuruAcilisGoruldu,
} from '../islemler/DuyuruIslemleri';
import { DuyuruOlayEkle } from '../islemler/DuyuruOlayKuyrugu';
import { BildirimHedefineGit } from '../../bildirimler/islemler/BildirimPushYonlendirme';
import { DuyuruHedefCoz } from '../islemler/DuyuruHedefCoz';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

const oturumdaGizlenen = new Set<string>();

/**
 * Açılış katmanı uygulamayı kilitlemez.
 * Kapatılamaz duyuruda da "Sonra" bu oturum için gizler; okunana kadar sonraki açılışta yine gelir.
 */
export function KritikDuyuruKapisi() {
  const { t, dil } = useCeviri();
  const [duyuru, setDuyuru] = useState<Awaited<ReturnType<typeof DuyuruAcilisGetir>>>(null);

  useEffect(() => {
    let iptal = false;
    void DuyuruAcilisGetir(dil).then((d) => {
      if (iptal || !d || oturumdaGizlenen.has(d.id)) return;
      setDuyuru(d);
      DuyuruOlayEkle({ announcement_id: d.id, event_type: 'OPEN' });
      if (d.launch_frequency === 'ONCE_PER_USER') void DuyuruAcilisGoruldu(d.id);
    });
    return () => {
      iptal = true;
    };
  }, [dil]);

  if (!duyuru) return null;
  const rtl = isRtlDil(duyuru.content_locale);
  const yazi = rtl
    ? { textAlign: 'right' as const, writingDirection: 'rtl' as const }
    : undefined;

  const kapat = (okundu: boolean) => {
    oturumdaGizlenen.add(duyuru.id);
    if (okundu) {
      DuyuruOlayEkle({ announcement_id: duyuru.id, event_type: 'READ', read_source: 'manual' });
    } else {
      DuyuruOlayEkle({ announcement_id: duyuru.id, event_type: 'DISMISS' });
    }
    setDuyuru(null);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => kapat(false)}>
      <View style={styles.perde}>
        <View style={styles.kart}>
          <Text style={[styles.baslik, yazi]}>{duyuru.title}</Text>
          <Text style={[styles.govde, yazi]}>{duyuru.summary || duyuru.body_plain}</Text>
          {duyuru.ctas.slice(0, 2).map((c) => (
            <Pressable
              key={c.id}
              style={styles.cta}
              onPress={() => {
                DuyuruOlayEkle({ announcement_id: duyuru.id, event_type: 'CTA_CLICK', cta_id: c.id });
                const href = DuyuruHedefCoz(c.destination_type, c.destination);
                kapat(true);
                if (href && href.startsWith('/')) void BildirimHedefineGit(href);
              }}
            >
              <Text style={styles.ctaYazi}>{c.label || t('duyuru.ac')}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => kapat(false)}>
            <Text style={styles.sonra}>{t('duyuru.sonra')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  perde: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: BoslukTokenlari.lg,
  },
  kart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  baslik: { ...TipografiTokenlari.h1, color: RenkTokenlari.text },
  govde: { ...TipografiTokenlari.body, color: RenkTokenlari.textMuted },
  cta: {
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaYazi: { color: '#fff', fontWeight: '700' },
  sonra: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, textAlign: 'center' },
});
