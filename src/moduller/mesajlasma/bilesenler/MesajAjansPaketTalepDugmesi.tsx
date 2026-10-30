/**
 * Alıcının paket talebi mesajı altında — ajans sahibi tek dokunuşla
 * aynı paketin ödeme kartını gönderir.
 */

import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AjansPaketTeklifOlustur } from '../../cuzdan/islemler/AjansPaketTeklifIslemleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import type { DirektMesaj } from '../okuma/MesajlariGetir';

type Props = {
  item: DirektMesaj;
  /** Bu talepten sonra aynı paketin teklif kartı sohbete düştü mü */
  gonderildi: boolean;
};

export function AjansPaketTalebiMi(item: DirektMesaj): boolean {
  return item.message_type === 'text' && item.media_meta?.kind === 'agency_package_request';
}

export function MesajAjansPaketTalepDugmesi({ item, gonderildi }: Props) {
  const { t } = useCeviri();
  const [busy, setBusy] = useState(false);
  const meta = item.media_meta ?? {};
  const agencyId = String(meta.agency_id ?? '');
  const listeFiyatTry = Number(meta.liste_fiyat_try ?? 0);

  if (!agencyId || !(listeFiyatTry > 0)) return null;

  const gonder = async () => {
    if (busy) return;
    setBusy(true);
    const r = await AjansPaketTeklifOlustur({
      agencyId,
      listeFiyatTry,
      threadId: item.thread_id,
    });
    setBusy(false);
    if (!r.ok) Alert.alert(t('cuzdanX.alertMesaj'), r.hata);
  };

  return (
    <Pressable
      onPress={() => void gonder()}
      disabled={busy}
      style={[styles.cta, gonderildi && styles.ctaIkincil, busy && styles.ctaBusy]}
      accessibilityRole="button"
      accessibilityLabel={t('cuzdanX.talepPaketGonder')}
    >
      {busy ? (
        <ActivityIndicator color={RenkTokenlari.text} />
      ) : (
        <>
          <Ionicons
            name={gonderildi ? 'checkmark-circle' : 'card-outline'}
            size={15}
            color={gonderildi ? RenkTokenlari.mint : '#120E08'}
          />
          <Text style={[styles.yazi, gonderildi && styles.yaziIkincil]}>
            {gonderildi ? t('cuzdanX.talepPaketTekrar') : t('cuzdanX.talepPaketGonder')}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    marginTop: 8,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#E8C36A',
  },
  ctaIkincil: {
    backgroundColor: 'rgba(110, 231, 183, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(110, 231, 183, 0.4)',
  },
  ctaBusy: { opacity: 0.6 },
  yazi: {
    ...TipografiTokenlari.caption,
    color: '#120E08',
    fontWeight: '800',
  },
  yaziIkincil: {
    color: RenkTokenlari.mint,
  },
});
