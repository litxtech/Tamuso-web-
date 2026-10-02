import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { DurumOyunKazanciPayload } from '../islemler/DurumIslemleri';
import { useCeviri } from '../../../i18n/useCeviri';
import { DilNormalizeEt, DIL_LOCALE_MAP } from '../../../i18n/diller';
import i18n from '../../../i18n';

const TIER_GRADIENTS: Record<string, readonly [string, string, string]> = {
  STORM: ['#1B2A4A', '#2C4A7A', '#4DA3FF'],
  THUNDER: ['#3B1F4A', '#6B2FA0', '#C43BFF'],
  COSMIC: ['#3B1F4A', '#E84091', '#F0B429'],
  DIVINE: ['#2A1040', '#E84091', '#FFE28A'],
};

const TIER_LABELS: Record<string, string> = {
  STORM: 'STORM WIN',
  THUNDER: 'THUNDER WIN',
  COSMIC: 'COSMIC STORM',
  DIVINE: 'DIVINE STORM',
};

function formatCoin(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  const dil = DilNormalizeEt(i18n.language);
  return Math.floor(v).toLocaleString(DIL_LOCALE_MAP[dil] ?? dil);
}

type Props = {
  payload: DurumOyunKazanciPayload;
  /** Profil ızgarası için kompakt kare */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function DurumOyunKazanciKart({ payload, compact, style }: Props) {
  const { t } = useCeviri();
  const tier = (payload.win_tier || 'STORM').toUpperCase();
  const gradient = TIER_GRADIENTS[tier] ?? TIER_GRADIENTS.STORM;
  const tierLabel = TIER_LABELS[tier] ?? 'WIN';
  const mult = Number(payload.total_multiplier ?? 1);
  const title = payload.game_title || 'Realm of Storms';

  if (compact) {
    return (
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.compact, style]}
      >
          <Ionicons name="trophy" size={12} color="rgba(255,255,255,0.9)" />
        <Text style={styles.compactAmount} numberOfLines={1}>
          {formatCoin(payload.total_win)}
        </Text>
        <Text style={styles.compactTier} numberOfLines={1}>
          {tierLabel.split(' ')[0]}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[...gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Ionicons name="game-controller" size={11} color="#fff" />
          <Text style={styles.badgeText}>{title}</Text>
        </View>
      </View>
      <Text style={styles.tier}>{tierLabel}</Text>
      {mult > 1 ? (
        <Text style={styles.formula}>
          {formatCoin(payload.base_win)} × {mult}
        </Text>
      ) : null}
      <Text style={styles.amount}>{formatCoin(payload.total_win)}</Text>
      <Text style={styles.coinHint}>{t('durumX.coinKazandi')}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 118,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  badgeText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tier: {
    marginTop: 4,
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 6,
  },
  formula: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
  },
  amount: {
    marginTop: 2,
    color: '#FFE28A',
    fontSize: 26,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 6,
  },
  coinHint: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  compact: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    padding: 4,
  },
  compactAmount: {
    color: '#FFE28A',
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  compactTier: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
