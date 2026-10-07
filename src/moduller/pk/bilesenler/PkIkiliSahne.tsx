import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { RemoteVideoTrack } from 'livekit-client';
import { CanliYayinVideoSahne } from '../../canli-yayin/bilesenler/CanliYayinVideoSahne';
import { PkSkorSeridi } from './PkSkorSeridi';
import { usePkRakipGoruntu } from '../medya/usePkRakipGoruntu';
import { PkMacBitir } from '../islemler/PkMacBaslat';
import type { PkCanliMacDetay } from '../skor/PkCanliMaciniGetir';
import { LiveKitVideoViewAl } from '../../livekit/bilesenler/LiveKitVideoViewAl';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  rol: 'host' | 'izleyici';
  mock?: boolean;
  durumYazi?: string;
  mac: PkCanliMacDetay;
  selfLiveId: string;
  /** Skor şeridinin üstten boşluğu — videolar tam ekran */
  barUst: number;
  onBitti?: () => void;
};

function RakipKare({ track }: { track: RemoteVideoTrack | null }) {
  const VideoView = useMemo(() => LiveKitVideoViewAl(), []);

  if (VideoView && track) {
    return (
      <VideoView
        style={StyleSheet.absoluteFill}
        videoTrack={track}
        objectFit="cover"
        mirror={false}
        zOrder={0}
      />
    );
  }

  return (
    <LinearGradient colors={['#1A1020', '#0C0812']} style={StyleSheet.absoluteFill}>
      <View style={styles.bos}>
        <Ionicons name="person" size={36} color="rgba(255,255,255,0.75)" />
      </View>
    </LinearGradient>
  );
}

/** PK: sen üstte, rakip altta — geniş yatay bantlar. Bitince tek yayın kalır. */
export function PkIkiliSahne({
  rol,
  mock,
  durumYazi,
  mac,
  selfLiveId,
  onBitti,
}: Props) {
  const { t } = useCeviri();
  const [busy, setBusy] = useState(false);
  const senA = !!mac.live_a_id && mac.live_a_id === selfLiveId;
  const rakipOda = senA ? mac.oda_b : mac.oda_a;
  const rakip = usePkRakipGoruntu(rakipOda, mock, rol !== 'host');

  const bitir = () => {
    if (busy) return;
    Alert.alert(t('canliYayin.pkBitirOnay'), t('canliYayin.pkBitirOnayBody'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('canliYayin.pkBitir'),
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void PkMacBitir(mac.id).then((r) => {
            setBusy(false);
            if (!r.ok) {
              Alert.alert('PK', r.hata ?? t('canliYayin.pkBitirHata'));
              return;
            }
            onBitti?.();
          });
        },
      },
    ]);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.kare} pointerEvents="none">
        <View style={styles.yari}>
          <CanliYayinVideoSahne
            rol={rol === 'host' ? 'host' : 'izleyici'}
            mock={!!mock}
            durumYazi={durumYazi}
          />
        </View>
        <View style={styles.orta} />
        <View style={styles.yari}>
          <RakipKare track={rakip} />
        </View>
      </View>

      <View style={styles.barKat} pointerEvents="box-none">
        <PkSkorSeridi mac={mac} selfLiveId={selfLiveId} />
        {rol === 'host' ? (
          <Pressable
            onPress={bitir}
            disabled={busy}
            style={styles.bitir}
            accessibilityRole="button"
            accessibilityLabel={t('canliYayin.pkBitir')}
          >
            <Text style={styles.bitirYazi}>{t('canliYayin.pkBitir')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kare: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'column',
    backgroundColor: '#000',
  },
  yari: {
    flex: 1,
    backgroundColor: '#0A0810',
    overflow: 'hidden',
  },
  orta: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  bos: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barKat: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -36,
    zIndex: 6,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bitir: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bitirYazi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '800',
  },
});
