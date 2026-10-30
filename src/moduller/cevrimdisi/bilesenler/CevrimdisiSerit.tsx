import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCeviri } from '../../../i18n/useCeviri';
import { CevrimdisiAktifKullanici } from '../AktifKullanici';
import { AnlikZaman } from '../AnlikGoruntu';
import { AgDurumMerkezi, type CevrimdisiFaz, type CevrimdisiToast } from '../AgDurumMerkezi';

const TOAST_MS = 2800;

/**
 * Tam ekran offline duvarı yok. Üstte ince durum, geçişte kısa bildirim.
 * Web sitesinde gösterilmez.
 */
export function CevrimdisiSerit() {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [faz, setFaz] = useState<CevrimdisiFaz>('ONLINE');
  const [toast, setToast] = useState<CevrimdisiToast | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void AgDurumMerkezi.baslat();
    return AgDurumMerkezi.dinle((g) => {
      setFaz(g.faz);
      if (g.toast) {
        setToast(g.toast);
      }
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  if (Platform.OS === 'web') return null;
  if (faz === 'ONLINE' && !toast) return null;

  const etiket =
    faz === 'OFFLINE'
      ? t('cevrimdisi.cevrimdisi')
      : faz === 'RECONNECTING'
        ? t('cevrimdisi.baglandi')
        : faz === 'SYNCING'
          ? t('cevrimdisi.senkron')
          : faz === 'SYNC_ERROR'
            ? t('cevrimdisi.senkronHata')
            : null;

  const toastMetin =
    toast === 'offline'
      ? t('cevrimdisi.cevrimdisi')
      : toast === 'online'
        ? t('cevrimdisi.baglandi')
        : toast === 'syncing'
          ? t('cevrimdisi.senkron')
          : toast === 'done'
            ? t('cevrimdisi.guncel')
            : toast === 'error'
              ? t('cevrimdisi.senkronHata')
              : null;

  return (
    <View pointerEvents="none" style={[styles.kok, { top: Math.max(insets.top, 8) }]}>
      {etiket ? (
        <View style={styles.serit}>
          <Text style={styles.seritYazi}>{etiket}</Text>
        </View>
      ) : null}
      {toastMetin ? (
        <View style={styles.toast}>
          <Text style={styles.toastYazi}>{toastMetin}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function CevrimdisiKesfetNotu() {
  const { t } = useCeviri();
  const [faz, setFaz] = useState<CevrimdisiFaz>('ONLINE');
  const [zaman, setZaman] = useState<string | null>(null);
  useEffect(() => AgDurumMerkezi.dinle((g) => setFaz(g.faz)), []);
  useEffect(() => {
    if (faz !== 'OFFLINE') return;
    void AnlikZaman(CevrimdisiAktifKullanici(), 'kesfet').then(setZaman);
  }, [faz]);
  if (faz !== 'OFFLINE') return null;
  const etiket = zaman
    ? t('cevrimdisi.sonGuncelleme', { zaman: new Date(zaman).toLocaleString() })
    : t('cevrimdisi.kesfetEski');
  return (
    <Text style={styles.kesfet}>
      {t('cevrimdisi.kesfetEski')} · {etiket}
    </Text>
  );
}

export function CevrimdisiOdaNotu() {
  const { t } = useCeviri();
  const [faz, setFaz] = useState<CevrimdisiFaz>('ONLINE');
  useEffect(() => AgDurumMerkezi.dinle((g) => setFaz(g.faz)), []);
  if (faz !== 'OFFLINE') return null;
  return (
    <View style={styles.oda}>
      <Text style={styles.odaYazi}>{t('cevrimdisi.odaBaglanti')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kok: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 80,
    alignItems: 'center',
    gap: 6,
  },
  serit: {
    backgroundColor: 'rgba(20, 12, 18, 0.88)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  seritYazi: {
    color: '#F4E7D8',
    fontSize: 12,
    fontWeight: '600',
  },
  toast: {
    backgroundColor: 'rgba(32, 24, 28, 0.94)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toastYazi: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  oda: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
    zIndex: 40,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  odaYazi: {
    color: '#fff',
    fontSize: 12,
  },
  kesfet: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
});
