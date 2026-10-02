import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { GAME_DISPLAY_NAME } from '../config/ZeusSabitleri';
import { useCeviri } from '../../../../i18n/useCeviri';

type Props = {
  multiplierTotal: number;
  persistentMultiplier?: number;
  bonusLabel?: string | null;
  onClose: () => void;
  onInfo: () => void;
  /** Ses odası kartı içinde — oda üstte görünür. */
  compact?: boolean;
};

function ZeusBaslikInner({
  multiplierTotal,
  persistentMultiplier = 0,
  bonusLabel,
  onClose,
  onInfo,
  compact = false,
}: Props) {
  const { t } = useCeviri();
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        style={styles.exitBtn}
        accessibilityLabel={t('zeusX.oyunuBitir')}
      >
        <Ionicons
          name={compact ? 'chevron-down' : 'arrow-back'}
          size={22}
          color={RenkTokenlari.text}
        />
        {compact ? null : (
          <Text style={styles.exitLabel}>{t('zeusX.oyunuBitir')}</Text>
        )}
      </Pressable>

      <View style={styles.brand}>
        <Text style={styles.logo}>{GAME_DISPLAY_NAME}</Text>
        <Text style={styles.subtitle}>
          {bonusLabel ?? t('zeusX.netKarolar')}
        </Text>
      </View>

      <View style={styles.right}>
        {multiplierTotal > 1 ? (
          <View style={styles.multChip}>
            <Text style={styles.multText}>{multiplierTotal}×</Text>
          </View>
        ) : null}
        {persistentMultiplier > 0 ? (
          <View style={[styles.multChip, styles.persistChip]}>
            <Text style={styles.persistText}>Σ {persistentMultiplier}×</Text>
          </View>
        ) : null}
        <Pressable
          onPress={onInfo}
          hitSlop={8}
          style={styles.iconBtn}
          accessibilityLabel={t('zeusX.bilgi')}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={RenkTokenlari.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

export const ZeusBaslik = memo(ZeusBaslikInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 6,
    gap: 8,
  },
  rowCompact: {
    paddingVertical: 2,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 6,
  },
  exitLabel: {
    color: RenkTokenlari.text,
    fontSize: 12,
    fontWeight: '700',
  },
  brand: { flex: 1 },
  logo: {
    color: RenkTokenlari.text,
    fontSize: TipografiTokenlari.h2.fontSize,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  subtitle: {
    color: '#E8C547',
    fontSize: TipografiTokenlari.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  multChip: {
    backgroundColor: 'rgba(232,197,71,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.45)',
  },
  persistChip: {
    backgroundColor: 'rgba(77,168,255,0.18)',
    borderColor: 'rgba(77,168,255,0.5)',
  },
  persistText: {
    color: '#4DA8FF',
    fontWeight: '800',
    fontSize: TipografiTokenlari.caption.fontSize,
  },
  multText: {
    color: '#F6E27A',
    fontWeight: '800',
    fontSize: TipografiTokenlari.caption.fontSize,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
