import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import {
  KameraOnizlemeBirakildi,
  KameraOnizlemeTutuldu,
} from '../../livekit/kamera/KameraOnizlemeKilidi';

type Props = {
  aktif: boolean;
  facing?: 'front' | 'back';
};

/**
 * Canlı yayın stüdyo önizleme — LiveKit bağlanmadan ÖNCE kapatılmalı.
 * CameraView kamerayı tutar; unmount’ta kilidi serbest bırakır.
 */
export function CanliKameraOnizleme({ aktif, facing = 'front' }: Props) {
  const { t } = useCeviri();
  const [permission, requestPermission] = useCameraPermissions();
  const [hata, setHata] = useState<string | null>(null);
  const [kameraKirildi, setKameraKirildi] = useState(false);
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    if (!aktif) {
      setGorunur(false);
      KameraOnizlemeBirakildi();
      return;
    }
    if (!permission) return;
    if (!permission.granted) {
      void requestPermission()
        .then((r) => {
          if (!r.granted) setHata(t('canliYayin.kameraIzni'));
        })
        .catch(() => setHata(t('canliYayin.kameraKullanilamiyor')));
      return;
    }
    setGorunur(true);
    KameraOnizlemeTutuldu();
    return () => {
      setGorunur(false);
      KameraOnizlemeBirakildi();
    };
  }, [aktif, permission, requestPermission, t]);

  if (!aktif) return null;

  if (hata || kameraKirildi || !permission?.granted || !gorunur) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          {kameraKirildi
            ? t('canliYayin.kameraOnizlemeYok')
            : (hata ?? t('canliYayin.kameraIzniBekleniyor'))}
        </Text>
      </View>
    );
  }

  try {
    return (
      <View style={styles.wrap}>
        <CameraView
          style={styles.camera}
          facing={facing}
          onCameraReady={() => KameraOnizlemeTutuldu()}
          onMountError={() => {
            setKameraKirildi(true);
            KameraOnizlemeBirakildi();
          }}
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('canliYayin.canliOnizleme')}</Text>
        </View>
      </View>
    );
  } catch {
    KameraOnizlemeBirakildi();
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          {t('canliYayin.kameraOnizlemeKapali')}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  camera: { flex: 1 },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
  },
  badgeText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
});
