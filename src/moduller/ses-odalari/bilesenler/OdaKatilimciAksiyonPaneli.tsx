/**
 * Koltuk katılımcı aksiyonları — Android Alert yerine sheet.
 * Çarpı + boşluğa tıklayınca kapanır.
 */

import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { KatilimciMenuAksiyonu } from '../yetki/OdaRolKontrol';
import { useCeviri } from '../../../i18n/useCeviri';

export type KatilimciAksiyonSatiri = {
  id: KatilimciMenuAksiyonu;
  etiket: string;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  baslik: string;
  altBaslik?: string;
  aksiyonlar: KatilimciAksiyonSatiri[];
  onAksiyon: (id: KatilimciMenuAksiyonu) => void;
};

function OdaKatilimciAksiyonPaneliInner({
  visible,
  onClose,
  baslik,
  altBaslik,
  aksiyonlar,
  onAksiyon,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useCeviri();

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
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.baslik} numberOfLines={1}>
              {baslik}
            </Text>
            {altBaslik ? (
              <Text style={styles.alt} numberOfLines={1}>
                {altBaslik}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            style={styles.kapat}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.kapat')}
          >
            <Ionicons name="close" size={22} color="#F7F2E8" />
          </Pressable>
        </View>

        {aksiyonlar.map((a) => (
          <Pressable
            key={a.id}
            style={styles.satir}
            onPress={() => {
              onClose();
              onAksiyon(a.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={a.etiket}
          >
            <Text
              style={[styles.satirYazi, a.destructive && styles.satirTehlikeli]}
            >
              {a.etiket}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={a.destructive ? '#F87171' : 'rgba(255,255,255,0.35)'}
            />
          </Pressable>
        ))}
      </View>
    </TamusoModal>
  );
}

export const OdaKatilimciAksiyonPaneli = memo(OdaKatilimciAksiyonPaneliInner);

const styles = StyleSheet.create({
  kart: {
    marginHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 14, 26, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: 10,
    overflow: 'hidden',
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
    gap: 10,
    marginBottom: 8,
  },
  baslik: {
    ...TipografiTokenlari.title,
    color: '#F7F2E8',
    fontWeight: '800',
    fontSize: 17,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: 'rgba(247,242,232,0.55)',
    marginTop: 2,
  },
  kapat: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  satirYazi: {
    ...TipografiTokenlari.body,
    color: '#F7F2E8',
    fontWeight: '600',
  },
  satirTehlikeli: {
    color: '#F87171',
  },
});
