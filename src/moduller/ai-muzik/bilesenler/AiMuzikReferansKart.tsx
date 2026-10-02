import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  AiMuzikCal,
  AiMuzikCaliyorMu,
  AiMuzikCaliyorTrackId,
  AiMuzikDuraklat,
  AiMuzikDurdur,
} from '../oynatici/AiMuzikOynatici';
import { GaleriAc } from '../../../ortak/medya/ImagePickerHazirMi';
import { useCeviri } from '../../../i18n/useCeviri';

export type AiMuzikReferansSecim = {
  uri: string;
  mime: string;
  name: string;
  kind: 'audio' | 'video' | 'record';
};

type Props = {
  value: AiMuzikReferansSecim | null;
  onChange: (v: AiMuzikReferansSecim | null) => void;
};

const REF_TRACK = 'ai-ref-preview';

/** Referans ses/video seç + dinlet — benzer şarkı üretimi için */
export function AiMuzikReferansKart({ value, onChange }: Props) {
  const { t } = useCeviri();
  const [caliyor, setCaliyor] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCaliyor(
        AiMuzikCaliyorTrackId() === REF_TRACK && AiMuzikCaliyorMu(),
      );
    }, 400);
    return () => {
      clearInterval(timer);
      if (AiMuzikCaliyorTrackId() === REF_TRACK) void AiMuzikDurdur();
    };
  }, []);

  const sesSec = async () => {
    setYukleniyor(true);
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      const mime = a.mimeType ?? 'audio/mpeg';
      const kind: 'audio' | 'video' = mime.startsWith('video/')
        ? 'video'
        : 'audio';
      onChange({
        uri: a.uri,
        mime,
        name: a.name ?? (kind === 'video' ? 'referans.mp4' : 'referans.mp3'),
        kind,
      });
    } catch (e) {
      Alert.alert(
        t('aiMuzik.referansAlert'),
        e instanceof Error ? e.message : t('aiMuzik.dosyaSecilemedi'),
      );
    } finally {
      setYukleniyor(false);
    }
  };

  const videoSec = async () => {
    setYukleniyor(true);
    try {
      const galeri = await GaleriAc({
        mediaTypes: ['videos'],
        quality: 1,
        videoMaxDuration: 60,
      });
      if (!galeri.ok) {
        if (!galeri.iptal) Alert.alert(t('aiMuzik.referansAlert'), galeri.hata);
        return;
      }
      const asset = galeri.asset;
      onChange({
        uri: asset.uri,
        mime: asset.mimeType ?? 'video/mp4',
        name: `referans-${Date.now()}.mp4`,
        kind: 'video',
      });
    } catch (e) {
      Alert.alert(
        t('aiMuzik.referansAlert'),
        e instanceof Error ? e.message : t('aiMuzik.videoSecilemedi'),
      );
    } finally {
      setYukleniyor(false);
    }
  };

  const dinle = async () => {
    if (!value?.uri) return;
    if (AiMuzikCaliyorTrackId() === REF_TRACK && AiMuzikCaliyorMu()) {
      AiMuzikDuraklat();
      return;
    }
    await AiMuzikCal(value.uri, REF_TRACK);
  };

  return (
    <View style={styles.kart}>
      <CamArkaplan intensity={56} style={StyleSheet.absoluteFill} />
      <View style={styles.baslikRow}>
        <Ionicons name="disc-outline" size={18} color={RenkTokenlari.primarySoft} />
        <Text style={styles.baslik}>{t('aiMuzik.benzerSarki')}</Text>
      </View>
      <Text style={styles.alt}>{t('aiMuzik.referansAlt')}</Text>

      {value ? (
        <View style={styles.secili}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.dosya} numberOfLines={1}>
              {value.name}
            </Text>
            <Text style={styles.tur}>
              {value.kind === 'video' ? t('ortak.video') : t('aiMuzik.ses')} · {value.mime}
            </Text>
          </View>
          <Pressable
            onPress={() => void dinle()}
            style={styles.dinleBtn}
            accessibilityLabel={caliyor ? t('durumX.duraklat') : t('aiMuzik.dinle')}
          >
            <Ionicons
              name={caliyor ? 'pause' : 'play'}
              size={18}
              color="#fff"
            />
          </Pressable>
          <Pressable
            onPress={() => {
              if (AiMuzikCaliyorTrackId() === REF_TRACK) void AiMuzikDurdur();
              onChange(null);
            }}
            hitSlop={8}
            accessibilityLabel={t('aiMuzik.referansiKaldir')}
          >
            <Ionicons name="close-circle" size={22} color={RenkTokenlari.textDim} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.aksiyonlar}>
          <Pressable
            style={styles.chip}
            onPress={() => void sesSec()}
            disabled={yukleniyor}
          >
            {yukleniyor ? (
              <ActivityIndicator size="small" color={RenkTokenlari.primarySoft} />
            ) : (
              <Ionicons name="musical-notes" size={16} color={RenkTokenlari.primarySoft} />
            )}
            <Text style={styles.chipYazi}>{t('aiMuzik.sesDosya')}</Text>
          </Pressable>
          <Pressable
            style={styles.chip}
            onPress={() => void videoSec()}
            disabled={yukleniyor}
          >
            <Ionicons name="videocam-outline" size={16} color={RenkTokenlari.primarySoft} />
            <Text style={styles.chipYazi}>{t('ortak.video')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kart: {
    borderRadius: YaricapTokenlari.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: RenkTokenlari.bgGlass,
    padding: BoslukTokenlari.md,
    marginBottom: BoslukTokenlari.md,
  },
  baslikRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    zIndex: 1,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginBottom: BoslukTokenlari.sm,
    lineHeight: 18,
    zIndex: 1,
  },
  aksiyonlar: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  secili: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  dosya: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  tur: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  dinleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primarySoft,
  },
});
