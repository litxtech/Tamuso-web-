/**
 * Oda numarasına tıklanınca — kim kurdu, ne zaman, hediye toplamı vb.
 */

import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import type { Room } from '../../../types/models';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';

type Props = {
  visible: boolean;
  onClose: () => void;
  room: Room | null;
  hostAd?: string | null;
  hostUsername?: string | null;
  /** Host ise odayı kalıcı kapat */
  canCloseRoom?: boolean;
  onOdayiKapat?: () => void;
};

function formatTarih(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatSure(
  iso: string | null | undefined,
  t: (key: CeviriAnahtari, opts?: Record<string, unknown>) => string,
): string {
  if (!iso) return '—';
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '—';
  const dk = Math.max(0, Math.floor((Date.now() - ms) / 60_000));
  if (dk < 60) return t('sesOda.dk', { n: dk });
  const sa = Math.floor(dk / 60);
  const kalan = dk % 60;
  if (sa < 24) return kalan ? t('sesOda.saDk', { sa, dk: kalan }) : t('sesOda.sa', { n: sa });
  const gun = Math.floor(sa / 24);
  return t('sesOda.gun', { n: gun });
}

function formatSayi(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.floor(n)));
}

function Satir({
  etiket,
  deger,
}: {
  etiket: string;
  deger: string;
}) {
  return (
    <View style={styles.satir}>
      <Text style={styles.etiket}>{etiket}</Text>
      <Text style={styles.deger} numberOfLines={2}>
        {deger}
      </Text>
    </View>
  );
}

function OdaBilgiPaneliInner({
  visible,
  onClose,
  room,
  hostAd,
  hostUsername,
  canCloseRoom,
  onOdayiKapat,
}: Props) {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const insets = useSafeAreaInsets();
  const host =
    hostAd?.trim() ||
    (hostUsername?.trim() ? `@${hostUsername.trim()}` : null) ||
    '—';

  const satirlar = useMemo(() => {
    if (!room) return [];
    return [
      { id: 'oda_no', etiket: t('sesOda.odaNumarasi'), deger: room.room_code?.trim() || '—' },
      { etiket: t('sesOda.baslik'), deger: room.title?.trim() || '—', id: 'baslik' },
      { id: 'kurucu', etiket: t('sesOda.kurucu'), deger: host },
      { id: 'acilis', etiket: t('sesOda.acilis'), deger: formatTarih(room.created_at, locale) },
      { id: 'sure', etiket: t('sesOda.sure'), deger: formatSure(room.created_at, t) },
      {
        id: 'dinleyici',
        etiket: t('sesOda.dinleyici'),
        deger: formatSayi(room.listener_count ?? 0),
      },
      {
        id: 'hediye_coin',
        etiket: t('sesOda.hediyeCoin'),
        deger: formatSayi(room.total_coins_earned ?? 0),
      },
      {
        id: 'koltuk',
        etiket: t('sesOda.koltuk'),
        deger: String(room.max_seats ?? '—'),
      },
    ];
  }, [room, host, t, locale]);

  return (
    <TamusoModal
      visible={visible}
      onClose={onClose}
      placement="bottom"
      animationType="fade"
      backdropClosable
    >
      <View
        style={[
          styles.kart,
          { paddingBottom: Math.max(insets.bottom, 12) + 8 },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.baslikSatir}>
          <Text style={styles.baslik}>{t('sesOda.odaBilgileri')}</Text>
          <Pressable
            onPress={onClose}
            style={styles.kapat}
            hitSlop={12}
            accessibilityLabel={t('ortak.kapat')}
          >
            <Ionicons name="close" size={20} color="#F7F2E8" />
          </Pressable>
        </View>

        {satirlar.map((s) => (
          <Satir key={s.id} etiket={s.etiket} deger={s.deger} />
        ))}

        {canCloseRoom && onOdayiKapat ? (
          <Pressable
            style={styles.kapatOda}
            onPress={() => {
              onClose();
              onOdayiKapat();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('sesOda.odayiKaliciKapat')}
          >
            <Ionicons name="trash-outline" size={16} color="#F87171" />
            <Text style={styles.kapatOdaYazi}>{t('sesOda.odayiKaliciKapat')}</Text>
          </Pressable>
        ) : null}
      </View>
    </TamusoModal>
  );
}

export const OdaBilgiPaneli = memo(OdaBilgiPaneliInner);

const styles = StyleSheet.create({
  kart: {
    marginHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 14, 26, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginBottom: 10,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  baslik: {
    ...TipografiTokenlari.title,
    color: '#F7F2E8',
    fontWeight: '800',
    fontSize: 17,
    flex: 1,
  },
  kapat: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  etiket: {
    ...TipografiTokenlari.caption,
    color: 'rgba(247,242,232,0.55)',
    fontWeight: '600',
  },
  deger: {
    ...TipografiTokenlari.caption,
    color: '#F7F2E8',
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '62%',
  },
  kapatOda: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  kapatOdaYazi: {
    ...TipografiTokenlari.caption,
    color: '#F87171',
    fontWeight: '800',
  },
});
