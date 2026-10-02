/**
 * Ajans paket satın alma fişi — Stripe ödeme kesinleşince DM.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import type { DirektMesaj } from '../okuma/MesajlariGetir';

type Props = {
  item: DirektMesaj;
  mine: boolean;
  onLongPress?: () => void;
};

function formatTry(n: number, locale: string): string {
  return `${n.toLocaleString(locale, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

function formatPaidAt(iso: string | null | undefined, locale: string): {
  tarih: string;
  saat: string;
} {
  if (!iso) return { tarih: '—', saat: '—' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { tarih: '—', saat: '—' };
  return {
    tarih: d.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    saat: d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function MesajAjansPaketFisKarti({ item, mine, onLongPress }: Props) {
  const { t, i18n } = useCeviri();
  const locale = i18n.language || 'tr';
  const meta = (item.media_meta ?? {}) as Record<string, unknown>;
  const title = String(meta.title ?? t('cuzdanX.ajansTeklifKart'));
  const coins = Number(meta.coins ?? 0);
  const amount = Number(meta.amount_try ?? 0);
  const liste = Number(meta.liste_fiyat_try ?? 0);
  const indirim = Number(meta.indirim_yuzde ?? 20);
  const buyerName = String(meta.buyer_name ?? t('ortak.kullanici'));
  const buyerUser = meta.buyer_username ? String(meta.buyer_username) : '';
  const receiptNo = String(meta.receipt_no ?? '').toUpperCase() || '—';
  const { tarih, saat } = formatPaidAt(
    (meta.paid_at as string | null) ?? item.created_at,
    locale,
  );

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={300}
      style={[styles.kart, mine && styles.kartMine]}
    >
      <LinearGradient
        colors={['#122018', '#0E1216', '#0C1014']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ic}
      >
        <View style={styles.ust}>
          <View style={styles.rozet}>
            <Ionicons name="checkmark-circle" size={12} color={RenkTokenlari.mint} />
            <Text style={styles.rozetYazi}>{t('cuzdanX.ajansFisBaslik')}</Text>
          </View>
          <Text style={styles.onay}>{t('cuzdanX.ajansFisKesinlesti')}</Text>
        </View>

        <Text style={styles.paket}>{title}</Text>
        <Text style={styles.coin}>
          {coins.toLocaleString(locale)} {t('cuzdan.coin')}
        </Text>

        <View style={styles.blok}>
          <Satir etiket={t('cuzdanX.ajansFisOdenen')} deger={formatTry(amount, locale)} vurgu />
          <Ayir />
          <Satir
            etiket={t('cuzdanX.ajansFisListe')}
            deger={`${formatTry(liste, locale)} · -%${indirim}`}
          />
          <Ayir />
          <Satir
            etiket={t('cuzdanX.ajansFisAlici')}
            deger={`${buyerName}${buyerUser ? ` · @${buyerUser}` : ''}`}
          />
          <Ayir />
          <Satir etiket={t('cuzdanX.ajansFisTarih')} deger={`${tarih} · ${saat}`} />
          <Ayir />
          <Satir etiket={t('cuzdanX.ajansFisNo')} deger={receiptNo} mono />
        </View>

        <Text style={styles.not}>{t('cuzdanX.ajansFisNot')}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function Satir({
  etiket,
  deger,
  vurgu,
  mono,
}: {
  etiket: string;
  deger: string;
  vurgu?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.satir}>
      <Text style={styles.etiket}>{etiket}</Text>
      <Text
        style={[styles.deger, vurgu && styles.degerVurgu, mono && styles.degerMono]}
        numberOfLines={1}
      >
        {deger}
      </Text>
    </View>
  );
}

function Ayir() {
  return <View style={styles.ayir} />;
}

const styles = StyleSheet.create({
  kart: {
    width: 280,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.28)',
  },
  kartMine: { alignSelf: 'flex-end' },
  ic: { padding: 12, gap: 8 },
  ust: { gap: 2 },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(110, 231, 183, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(110, 231, 183, 0.28)',
  },
  rozetYazi: {
    color: RenkTokenlari.mint,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  onay: {
    color: '#F7F2E8',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  paket: {
    color: '#F7F2E8',
    fontSize: 16,
    fontWeight: '900',
  },
  coin: {
    color: '#E8C36A',
    fontSize: 13,
    fontWeight: '900',
  },
  blok: {
    marginTop: 2,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  satir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  ayir: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  etiket: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  deger: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  degerVurgu: {
    color: '#E8C36A',
    fontSize: 15,
    fontWeight: '900',
  },
  degerMono: {
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
    color: 'rgba(255,255,255,0.55)',
  },
  not: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    lineHeight: 14,
  },
});
