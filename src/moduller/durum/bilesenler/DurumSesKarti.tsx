import React, { useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { SureFormat } from '../../ai-muzik/utils/SureFormat';
import {
  MesajSesYoneticisi,
  type MesajSesHiz,
} from '../../mesajlasma/ses/MesajSesYoneticisi';
import { MedyaUriOnizlemeGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

const ATLA_SN = 15;
const HIZLAR: MesajSesHiz[] = [1, 1.5, 2];

type Props = {
  oynaticiId: string;
  uri?: string | null;
  durationMs?: number | null;
  /** Feed görünürlüğü — false olunca bu kart duraklar */
  aktif?: boolean;
  /** Profil ızgarası — sadece süre rozeti */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function dakikaMetni(
  saniye: number,
  t: (key: 'durum.sesSn' | 'durum.sesDk' | 'durum.sesDkSn', o?: Record<string, unknown>) => string,
): string {
  const s = Math.max(0, Math.floor(saniye || 0));
  const dk = Math.floor(s / 60);
  const sn = s % 60;
  if (dk <= 0) return t('durum.sesSn', { n: sn });
  if (sn === 0) return t('durum.sesDk', { n: dk });
  return t('durum.sesDkSn', { n: dk, sn });
}

/**
 * Gönderideki ses kartı — cam (şeffaf), oynat/duraklat, ±15 sn ve sürükleyerek sarma.
 * Toplam süre dakika olarak görünür.
 */
export function DurumSesKarti({
  oynaticiId,
  uri,
  durationMs,
  aktif = true,
  compact,
  style,
}: Props) {
  const { t } = useCeviri();
  const kaynak = MedyaUriOnizlemeGuvenli(uri);
  const [, tick] = useState(0);
  const [suruklemeSn, setSuruklemeSn] = useState<number | null>(null);
  const genislikRef = useRef(1);
  const sureRef = useRef(0);
  const surukleRef = useRef<(x: number, birak: boolean) => void>(() => {});

  useEffect(() => MesajSesYoneticisi.aboneOl(() => tick((n) => n + 1)), []);

  const buAktif = !!kaynak && MesajSesYoneticisi.aktifAnahtar() === oynaticiId;
  const caliyor = buAktif && MesajSesYoneticisi.caliyorMu(oynaticiId);
  const poz = buAktif ? MesajSesYoneticisi.pozisyonSn() : 0;
  const sure =
    (buAktif && MesajSesYoneticisi.sureSn() > 0
      ? MesajSesYoneticisi.sureSn()
      : 0) || Math.max(0, (durationMs ?? 0) / 1000);
  sureRef.current = sure;
  const gosterilen = suruklemeSn ?? (buAktif ? poz : 0);
  const pct = sure > 0 ? Math.min(1, Math.max(0, gosterilen / sure)) : 0;
  const hiz = MesajSesYoneticisi.hizAl();

  useEffect(() => {
    if (aktif) return;
    if (MesajSesYoneticisi.aktifAnahtar() === oynaticiId) {
      void MesajSesYoneticisi.duraklat();
    }
  }, [aktif, oynaticiId]);

  useEffect(() => {
    return () => {
      if (MesajSesYoneticisi.aktifAnahtar() === oynaticiId) {
        void MesajSesYoneticisi.duraklat();
      }
    };
  }, [oynaticiId]);

  const oynaticiyiHazirla = async () => {
    if (!kaynak) return false;
    if (MesajSesYoneticisi.aktifAnahtar() === oynaticiId) return true;
    await MesajSesYoneticisi.cal(oynaticiId, kaynak, { autoplaySirasi: false });
    return MesajSesYoneticisi.aktifAnahtar() === oynaticiId;
  };

  const konumaGit = async (sn: number, oynat: boolean) => {
    const hazir = await oynaticiyiHazirla();
    if (!hazir) return;
    const hedef = Math.max(0, sn);
    if (oynat) await MesajSesYoneticisi.seekVeOynat(hedef);
    else await MesajSesYoneticisi.seek(hedef);
  };

  surukleRef.current = (x: number, birak: boolean) => {
    const w = Math.max(1, genislikRef.current);
    const oran = Math.min(1, Math.max(0, x / w));
    const sn = oran * Math.max(0, sureRef.current);
    if (!birak) {
      setSuruklemeSn(sn);
      return;
    }
    setSuruklemeSn(null);
    void konumaGit(sn, true);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => surukleRef.current(e.nativeEvent.locationX, false),
      onPanResponderMove: (e) => surukleRef.current(e.nativeEvent.locationX, false),
      onPanResponderRelease: (e) => surukleRef.current(e.nativeEvent.locationX, true),
      onPanResponderTerminate: () => setSuruklemeSn(null),
    }),
  ).current;

  const toggle = () => {
    if (!kaynak) return;
    void MesajSesYoneticisi.cal(oynaticiId, kaynak, { autoplaySirasi: false });
  };

  const atla = (delta: number) => {
    const taban = suruklemeSn ?? (buAktif ? poz : 0);
    const ust = sure > 0 ? sure : Math.max(0, taban + delta);
    const hedef = Math.min(ust, Math.max(0, taban + delta));
    void konumaGit(hedef, true);
  };

  if (compact) {
    return (
      <View style={[styles.compact, style]} pointerEvents="none">
        <CamArkaplan
          intensity={36}
          hafif
          fallbackColor="rgba(255,255,255,0.08)"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Ionicons name="mic" size={18} color={RenkTokenlari.text} />
        <Text style={styles.compactSure}>
          {dakikaMetni(sure, t)}
        </Text>
      </View>
    );
  }

  if (!kaynak) {
    return (
      <View style={[styles.kart, style]}>
        <CamArkaplan
          intensity={28}
          hafif
          fallbackColor="rgba(255,255,255,0.06)"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={styles.yok}>{t('durumX.sesYok')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.kart, style]}>
      <CamArkaplan
        intensity={42}
        fallbackColor="rgba(255,255,255,0.07)"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.ust}>
        <View style={styles.rozet}>
          <Ionicons name="mic" size={14} color={RenkTokenlari.text} />
          <Text style={styles.rozetYazi}>{t('durum.sesKaydi')}</Text>
        </View>
        <Text style={styles.dakika}>{dakikaMetni(sure, t)}</Text>
        <Pressable
          onPress={() => {
            const idx = HIZLAR.indexOf(hiz);
            const next = HIZLAR[(idx + 1) % HIZLAR.length];
            void MesajSesYoneticisi.hizAyarla(next);
          }}
          style={styles.hiz}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('durumX.sesHiz', { n: hiz })}
        >
          <Text style={styles.hizYazi}>{t('durumX.sesHiz', { n: hiz })}</Text>
        </Pressable>
      </View>

      <View style={styles.kontroller}>
        <Pressable
          onPress={() => atla(-ATLA_SN)}
          style={styles.atla}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('durumX.sesGeri')}
        >
          <Ionicons name="play-back" size={18} color={RenkTokenlari.text} />
          <Text style={styles.atlaYazi}>15</Text>
        </Pressable>
        <Pressable
          onPress={toggle}
          style={styles.play}
          accessibilityRole="button"
          accessibilityLabel={caliyor ? t('durumX.sesDuraklat') : t('durumX.sesCal')}
        >
          <Ionicons
            name={caliyor ? 'pause' : 'play'}
            size={26}
            color={RenkTokenlari.text}
            style={caliyor ? undefined : { marginLeft: 2 }}
          />
        </Pressable>
        <Pressable
          onPress={() => atla(ATLA_SN)}
          style={styles.atla}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('durumX.sesIleri')}
        >
          <Ionicons name="play-forward" size={18} color={RenkTokenlari.text} />
          <Text style={styles.atlaYazi}>15</Text>
        </Pressable>
      </View>

      <View
        style={styles.trackHit}
        onLayout={(e) => {
          genislikRef.current = e.nativeEvent.layout.width;
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={t('durumX.sesSar')}
        {...pan.panHandlers}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            { left: `${pct * 100}%` },
          ]}
        />
      </View>

      <View style={styles.sureSatir}>
        <Text style={styles.sure}>{SureFormat(gosterilen)}</Text>
        <Text style={styles.sure}>{SureFormat(sure)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kart: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  compact: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  compactSure: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  yok: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  rozetYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  dakika: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  hiz: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  hizYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  kontroller: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  play: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  atla: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  atlaYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontSize: 9,
    fontWeight: '800',
    marginTop: -2,
  },
  trackHit: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: RenkTokenlari.mint,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    backgroundColor: RenkTokenlari.text,
  },
  sureSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sure: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
