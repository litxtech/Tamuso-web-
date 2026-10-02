import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { ulkeMetinNormalize } from '../../ulke-ligi/utils/UlkeListesi';

type Secenek = { id: string; label: string; alt?: string };

type Props = {
  label: string;
  valueLabel: string;
  placeholder?: string;
  options: Secenek[];
  onSelect: (id: string) => void;
  searchable?: boolean;
};

/** Profil alan secici — ulke / il / cinsiyet */
export function ProfilSecimAlani({
  label,
  valueLabel,
  placeholder,
  options,
  onSelect,
  searchable,
}: Props) {
  const { t } = useCeviri();
  const placeholderMetin = placeholder ?? t('olusturTab.sec');
  const [acik, setAcik] = useState(false);
  const [q, setQ] = useState('');

  const liste = useMemo(() => {
    const qNorm = ulkeMetinNormalize(q);
    if (!qNorm) return options;
    return options.filter((o) => {
      const labelN = ulkeMetinNormalize(o.label);
      const altN = ulkeMetinNormalize(o.alt ?? '');
      const idN = ulkeMetinNormalize(o.id);
      return labelN.includes(qNorm) || altN.includes(qNorm) || idN.includes(qNorm);
    });
  }, [options, q]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setAcik(true)}>
        <Text
          style={[styles.value, !valueLabel && styles.placeholder]}
          numberOfLines={1}
        >
          {valueLabel || placeholderMetin}
        </Text>
        <Ionicons name="chevron-down" size={18} color={RenkTokenlari.textDim} />
      </Pressable>

      <Modal visible={acik} animationType="slide" transparent onRequestClose={() => setAcik(false)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setAcik(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {searchable ? (
              <TextInput
                style={styles.search}
                value={q}
                onChangeText={setQ}
                placeholder={t('ortak.ara')}
                placeholderTextColor={RenkTokenlari.textDim}
                autoCorrect={false}
              />
            ) : null}
            <FlatList
              data={liste}
              keyExtractor={(i) => i.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onSelect(item.id);
                    setAcik(false);
                    setQ('');
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    {item.alt ? (
                      <Text style={styles.rowAlt}>{item.alt}</Text>
                    ) : null}
                  </View>
                  {valueLabel === item.label ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={RenkTokenlari.primarySoft}
                    />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    paddingHorizontal: BoslukTokenlari.md,
    gap: 8,
  },
  value: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    flex: 1,
  },
  placeholder: { color: RenkTokenlari.textDim },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 1,
    elevation: 1,
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingBottom: BoslukTokenlari.xl,
    zIndex: 3,
    elevation: 24,
  },
  sheetTitle: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    textAlign: 'center',
    paddingVertical: 14,
  },
  search: {
    marginHorizontal: BoslukTokenlari.lg,
    marginBottom: 8,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
    gap: 8,
  },
  rowLabel: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  rowAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
});
