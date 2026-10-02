import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DirektMesaj } from '../okuma/MesajlariGetir';
import type { MesajSabitKayit } from '../islemler/MesajSabitle';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  pins: MesajSabitKayit[];
  mesajMap: Record<string, DirektMesaj>;
  onJump: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
};

function ozet(m: DirektMesaj | undefined, t: (k: any) => string): string {
  if (!m) return '…';
  if (m.message_type === 'voice') return t('mesajV2.voice');
  if (m.message_type === 'music') return t('mesajV2.music');
  if (m.message_type === 'agency_package_offer') return t('cuzdanX.ajansTeklifKart');
  if (m.message_type === 'agency_package_receipt') return t('cuzdanX.ajansFisBaslik');
  return (m.body ?? '').trim() || `[${m.message_type}]`;
}

export function MesajSabitBar({ pins, mesajMap, onJump, onUnpin }: Props) {
  const { t } = useCeviri();
  if (!pins.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.baslik}>
        <Ionicons name="pin" size={14} color={RenkTokenlari.accent} />
        <Text style={styles.baslikYazi}>{t('mesajV2.pinnedMessages')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {pins.map((p) => {
          const m = mesajMap[p.message_id];
          return (
            <Pressable
              key={`${p.thread_id}:${p.message_id}`}
              style={styles.chip}
              onPress={() => onJump(p.message_id)}
              onLongPress={() => onUnpin?.(p.message_id)}
              accessibilityRole="button"
            >
              <Text style={styles.chipYazi} numberOfLines={1}>
                {ozet(m, t)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
    backgroundColor: RenkTokenlari.bgCard,
  },
  baslik: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  baslikYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  scroll: { gap: 8, paddingRight: 8 },
  chip: {
    maxWidth: 180,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.pressFill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
  },
});
