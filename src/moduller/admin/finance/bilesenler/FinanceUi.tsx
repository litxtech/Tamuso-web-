import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FINANCE_NAV } from '../tipler';
import { RenkTokenlari } from '../../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

export function FinanceNav() {
  const path = usePathname();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FINANCE_NAV.map((n) => {
        const active =
          n.href === '/admin/finance'
            ? path === '/admin/finance' || path === '/admin/finance/'
            : path?.startsWith(n.href);
        return (
          <Pressable
            key={n.href}
            onPress={() => router.push(n.href as any)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Ionicons
              name={n.icon}
              size={13}
              color={active ? RenkTokenlari.text : RenkTokenlari.textMuted}
            />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {n.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function FinanceTry(n: number | null | undefined): string {
  return `${Number(n || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₺`;
}

export function FinanceCoin(n: number | null | undefined): string {
  return Number(n || 0).toLocaleString('tr-TR');
}

export function FinanceDelta(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(Number(pct))) return '—';
  const v = Number(pct);
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

type KpiProps = {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  estimate?: boolean;
  onPress?: () => void;
};

export function FinanceKpiKart({
  label,
  value,
  delta,
  hint,
  tone = 'default',
  estimate,
  onPress,
}: KpiProps) {
  const valueColor =
    tone === 'positive'
      ? RenkTokenlari.mint
      : tone === 'negative'
        ? RenkTokenlari.danger
        : tone === 'warning'
          ? RenkTokenlari.accent
          : RenkTokenlari.text;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.kpi}>
      <View style={styles.kpiTop}>
        <Text style={styles.kpiL} numberOfLines={2}>
          {label}
        </Text>
        {estimate ? (
          <View style={styles.badge}>
            <Text style={styles.badgeT}>TAHMİN</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.kpiN, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      {delta && delta !== '—' ? <Text style={styles.delta}>{delta}</Text> : null}
      {hint ? (
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: BoslukTokenlari.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  chipActive: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  chipText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: RenkTokenlari.text,
  },
  kpi: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 6,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  kpiL: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    flex: 1,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  kpiN: {
    ...TipografiTokenlari.title,
    fontSize: 22,
    fontWeight: '700',
  },
  delta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  hint: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 64, 145, 0.12)',
  },
  badgeT: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.8,
  },
});
