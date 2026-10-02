import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';

type Props = {
  visible: boolean;
  trackTitle: string;
  onClose: () => void;
  onPaylas: (caption: string) => void | Promise<void>;
};

/** Durumda paylaş — metin isteğe bağlı */
export function AiMuzikDurumPaylasSheet({
  visible,
  trackTitle,
  onClose,
  onPaylas,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [gonderiyor, setGonderiyor] = useState(false);

  const gonder = async () => {
    if (gonderiyor) return;
    setGonderiyor(true);
    try {
      await onPaylas(caption.trim());
      setCaption('');
    } finally {
      setGonderiyor(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}
        >
          <CamArkaplan intensity={70} style={StyleSheet.absoluteFill} hafif />
          <View style={styles.tutamak} />
          <Text style={styles.baslik}>{t('aiMuzik.durumdaPaylas')}</Text>
          <Text style={styles.alt} numberOfLines={2}>
            {trackTitle}
          </Text>
          <TextInput
            style={styles.input}
            value={caption}
            onChangeText={(txt) => setCaption(txt.slice(0, 500))}
            placeholder={t('aiMuzik.captionPlaceholder')}
            placeholderTextColor={RenkTokenlari.textDim}
            multiline
            maxLength={500}
            accessibilityLabel={t('aiMuzik.durumMetniA11y')}
          />
          <Text style={styles.sayac}>{caption.length}/500</Text>
          <Pressable
            style={[styles.btn, gonderiyor && styles.btnPasif]}
            onPress={() => void gonder()}
            disabled={gonderiyor}
            accessibilityRole="button"
          >
            <Text style={styles.btnYazi}>
              {gonderiyor ? t('aiMuzik.paylasiliyor') : t('ortak.paylas')}
            </Text>
          </Pressable>
          <Pressable style={styles.vazgec} onPress={onClose}>
            <Text style={styles.vazgecYazi}>{t('ortak.vazgec')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgGlass,
  },
  tutamak: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.md,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 4,
    marginBottom: BoslukTokenlari.md,
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    minHeight: 100,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    textAlignVertical: 'top',
  },
  sayac: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'right',
    marginTop: 6,
  },
  btn: {
    marginTop: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: YaricapTokenlari.lg,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
  },
  btnPasif: { opacity: 0.6 },
  btnYazi: {
    ...TipografiTokenlari.h2,
    color: '#fff',
  },
  vazgec: {
    alignItems: 'center',
    paddingVertical: BoslukTokenlari.md,
    minHeight: 44,
  },
  vazgecYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
  },
});
