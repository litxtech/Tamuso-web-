import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SureFormat } from '../../ai-muzik/utils/SureFormat';
import {
  SesliMesajKayitBaslat,
  SesliMesajKayitBitir,
  SesliMesajKayitIptal,
  SesliMesajKayitSaniye,
} from '../../mesajlasma/ses/SesliMesajKayit';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

/** Gönderi ses kaydı üst sınırı */
export const DURUM_SES_MAX_SANIYE = 5 * 60;
const MIN_MS = 400;

type Props = {
  onBitti: (uri: string, durationMs: number) => void;
  onVazgec: () => void;
  onHata: (mesaj: string) => void;
};

/**
 * Gönderi oluştururken mikrofon kaydı.
 * Açılınca kayda başlar; en fazla 5 dakika.
 */
export function DurumSesKayitPaneli({ onBitti, onVazgec, onHata }: Props) {
  const { t } = useCeviri();
  const [saniye, setSaniye] = useState(0);
  const [hazir, setHazir] = useState(false);
  const aktifRef = useRef(false);
  const bitirRef = useRef<() => void>(() => {});
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onBittiRef = useRef(onBitti);
  const onVazgecRef = useRef(onVazgec);
  const onHataRef = useRef(onHata);
  onBittiRef.current = onBitti;
  onVazgecRef.current = onVazgec;
  onHataRef.current = onHata;

  const tickDurdur = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  useEffect(() => {
    let iptal = false;
    void (async () => {
      const r = await SesliMesajKayitBaslat();
      if (iptal) {
        await SesliMesajKayitIptal();
        return;
      }
      if (!r.ok) {
        onHataRef.current(r.hata);
        onVazgecRef.current();
        return;
      }
      aktifRef.current = true;
      setHazir(true);
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        /* optional */
      }
      tickRef.current = setInterval(() => {
        const sn = SesliMesajKayitSaniye();
        setSaniye(sn);
        if (sn >= DURUM_SES_MAX_SANIYE) bitirRef.current();
      }, 200);
    })();
    return () => {
      iptal = true;
      tickDurdur();
      if (aktifRef.current) {
        aktifRef.current = false;
        void SesliMesajKayitIptal();
      }
    };
  }, []);

  const vazgec = () => {
    tickDurdur();
    aktifRef.current = false;
    void SesliMesajKayitIptal();
    onVazgecRef.current();
  };

  const bitir = () => {
    if (!aktifRef.current) return;
    tickDurdur();
    aktifRef.current = false;
    void (async () => {
      const r = await SesliMesajKayitBitir();
      if (!r.ok) {
        onHataRef.current(r.hata);
        onVazgecRef.current();
        return;
      }
      if (r.durationMs < MIN_MS) {
        onHataRef.current(t('durum.sesCokKisa'));
        onVazgecRef.current();
        return;
      }
      const durationMs = Math.min(r.durationMs, DURUM_SES_MAX_SANIYE * 1000);
      onBittiRef.current(r.uri, durationMs);
    })();
  };
  bitirRef.current = bitir;

  return (
    <View style={styles.kutu}>
      <View style={styles.ust}>
        <View style={styles.nokta} />
        <Text style={styles.sure}>{SureFormat(saniye)}</Text>
        <Text style={styles.limit}>/ {SureFormat(DURUM_SES_MAX_SANIYE)}</Text>
      </View>
      <Text style={styles.alt}>
        {hazir ? t('durum.sesKaydediliyor') : t('ortak.yukleniyor')}
      </Text>
      <View style={styles.satir}>
        <Pressable
          onPress={vazgec}
          style={styles.iptal}
          accessibilityRole="button"
          accessibilityLabel={t('ortak.iptal')}
        >
          <Ionicons name="close" size={18} color={RenkTokenlari.text} />
          <Text style={styles.iptalYazi}>{t('ortak.iptal')}</Text>
        </Pressable>
        <Pressable
          onPress={bitir}
          disabled={!hazir}
          style={[styles.durdur, !hazir && styles.pasif]}
          accessibilityRole="button"
          accessibilityLabel={t('durum.sesDurdur')}
        >
          <Ionicons name="stop" size={18} color="#fff" />
          <Text style={styles.durdurYazi}>{t('durum.sesDurdur')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: {
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,80,96,0.45)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    gap: 8,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nokta: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff4d5e',
  },
  sure: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontVariant: ['tabular-nums'],
  },
  limit: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontVariant: ['tabular-nums'],
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  satir: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  iptal: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iptalYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  durdur: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ff4d5e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pasif: { opacity: 0.5 },
  durdurYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
});
