import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import {
  ODA_DOCK_BTN,
  ODA_DOCK_ICON,
  ODA_UST_BTN,
  ODA_UST_ICON,
} from './OdaButonOlculeri';
import { useCeviri } from '../../../i18n/useCeviri';

const TRACK_H = 132;
const THUMB = 18;
const POPOVER_W = 56;

type Props = {
  hacim: number;
  onHacimDegisti: (hacim: number) => void;
  /** dock: alt bar · ust: üst bar (36px) */
  boyut?: 'dock' | 'ust';
};

function ikonAdi(
  hacim: number,
): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  if (hacim <= 0.02) return 'volume-off';
  if (hacim < 0.35) return 'volume-low';
  if (hacim < 0.7) return 'volume-medium';
  return 'volume-high';
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Dock ses butonu — tıklanınca dikey kaydırıcı açılır.
 * Yukarı = yüksek, aşağı = düşük / sessiz.
 */
export function OdaSesHacmiButonu({ hacim, onHacimDegisti, boyut = 'dock' }: Props) {
  const { t } = useCeviri();
  const [acik, setAcik] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number } | null>(
    null,
  );
  const hacimRef = useRef(hacim);
  hacimRef.current = hacim;
  const trackTopRef = useRef(0);
  const trackRef = useRef<View>(null);
  const btnRef = useRef<View>(null);
  const onDegistiRef = useRef(onHacimDegisti);
  onDegistiRef.current = onHacimDegisti;

  const yuzde = Math.round(clamp01(hacim) * 100);
  const btnSize = boyut === 'ust' ? ODA_UST_BTN : ODA_DOCK_BTN;
  const iconSize = boyut === 'ust' ? ODA_UST_ICON : ODA_DOCK_ICON;
  const aktif = hacim > 0.02;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const y = e.nativeEvent.locationY;
          const next = clamp01(1 - y / TRACK_H);
          hacimRef.current = next;
          onDegistiRef.current(next);
        },
        onPanResponderMove: (e) => {
          const pageY = e.nativeEvent.pageY;
          const y = pageY - trackTopRef.current;
          const next = clamp01(1 - y / TRACK_H);
          hacimRef.current = next;
          onDegistiRef.current(next);
        },
      }),
    [],
  );

  const ac = useCallback(() => {
    btnRef.current?.measureInWindow((x, y, w) => {
      setAnchor({ x, y, w });
      setAcik(true);
    });
  }, []);

  const kapat = useCallback(() => setAcik(false), []);

  const popoverLeft = anchor
    ? anchor.x + anchor.w / 2 - POPOVER_W / 2
    : 0;
  const popoverBottom = anchor
    ? undefined
    : 96;
  const popoverTop = anchor ? Math.max(48, anchor.y - 196) : undefined;

  return (
    <View ref={btnRef} style={styles.wrap} collapsable={false}>
      <Pressable
        onPress={acik ? kapat : ac}
        style={[
          styles.btn,
          { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
          aktif && styles.btnAktif,
        ]}
        accessibilityLabel={t('sesOda.odaSesiA11y', { yuzde })}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons
          name={ikonAdi(hacim)}
          size={iconSize}
          color={aktif ? colors.mint : colors.textMuted}
        />
      </Pressable>

      <Modal
        visible={acik}
        transparent
        animationType="fade"
        onRequestClose={kapat}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={kapat}>
          <Pressable
            style={[
              styles.popover,
              {
                position: 'absolute',
                left: popoverLeft,
                top: popoverTop,
                bottom: popoverBottom,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.yuzde}>{yuzde}%</Text>
            <View
              ref={trackRef}
              style={styles.track}
              onLayout={() => {
                trackRef.current?.measureInWindow((_x, y) => {
                  trackTopRef.current = y;
                });
              }}
              {...pan.panHandlers}
            >
              <View style={styles.trackBg} />
              <View
                style={[
                  styles.trackFill,
                  { height: Math.max(THUMB / 2, clamp01(hacim) * TRACK_H) },
                ]}
              />
              <View
                style={[
                  styles.thumb,
                  {
                    bottom: Math.max(
                      0,
                      clamp01(hacim) * TRACK_H - THUMB / 2,
                    ),
                  },
                ]}
              />
            </View>
            <Text style={styles.ipucu}>{t('sesOda.kaydir')}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 20,
  },
  btn: {
    backgroundColor: 'rgba(42, 36, 56, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    flexShrink: 0,
  },
  btnAktif: {
    borderColor: 'rgba(61, 207, 176, 0.45)',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  popover: {
    width: POPOVER_W,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 28,
    backgroundColor: 'rgba(26, 22, 36, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 8,
  },
  yuzde: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: 28,
    height: TRACK_H,
    borderRadius: 14,
    overflow: 'visible',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  trackBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: colors.mint,
    opacity: 0.85,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.mint,
    alignSelf: 'center',
  },
  ipucu: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
  },
});
