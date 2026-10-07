import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  placeholder?: string;
  disabled?: boolean;
  onGonder: (metin: string) => Promise<void> | void;
  onHediye?: () => void;
  onMenu?: () => void;
  onOdak?: (acik: boolean) => void;
};

export function HikayeYanitCubugu({
  placeholder,
  disabled,
  onGonder,
  onHediye,
  onMenu,
  onOdak,
}: Props) {
  const { t } = useCeviri();
  const [metin, setMetin] = useState('');
  const [busy, setBusy] = useState(false);

  const gonder = async () => {
    const body = metin.trim();
    if (!body || busy || disabled) return;
    setBusy(true);
    try {
      await onGonder(body);
      setMetin('');
      Keyboard.dismiss();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
        <TextInput
          value={metin}
          onChangeText={setMetin}
          placeholder={placeholder ?? t('hikaye.yanitYaz')}
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={styles.input}
          editable={!disabled && !busy}
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => void gonder()}
          onFocus={() => onOdak?.(true)}
          onBlur={() => onOdak?.(false)}
        />
        {onHediye ? (
          <Pressable
            onPress={onHediye}
            hitSlop={8}
            style={styles.ikon}
            accessibilityRole="button"
            accessibilityLabel={t('hikaye.hediye')}
          >
            <Ionicons name="gift-outline" size={22} color="#fff" />
          </Pressable>
        ) : null}
        {onMenu ? (
          <Pressable
            onPress={onMenu}
            hitSlop={8}
            style={styles.ikon}
            accessibilityRole="button"
            accessibilityLabel={t('hikaye.menu')}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => void gonder()}
          disabled={!metin.trim() || busy || disabled}
          style={[
            styles.gonder,
            (!metin.trim() || busy || disabled) && styles.gonderDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('ortak.gonder')}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
        </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 88,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    ...TipografiTokenlari.body,
  },
  ikon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  gonder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gonderDisabled: { opacity: 0.35 },
});
