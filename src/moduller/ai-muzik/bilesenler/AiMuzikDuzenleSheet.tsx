import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
  title: string;
  prompt: string;
  durationSeconds: number;
  onClose: () => void;
  onKaydetBaslik: (title: string) => void | Promise<void>;
  onYenidenUret: (payload: {
    title: string;
    prompt: string;
    duration_seconds: number;
  }) => void | Promise<void>;
};

/**
 * Parça düzenleme — isim + yeni talimatla yeniden üretim.
 * KeyboardAvoidingView ile input klavye altında kalmaz.
 */
export function AiMuzikDuzenleSheet({
  visible,
  title: initialTitle,
  prompt: initialPrompt,
  durationSeconds,
  onClose,
  onKaydetBaslik,
  onYenidenUret,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initialTitle);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [uretiyor, setUretiyor] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      // Yeni talimat boş başlar — eski prompt otomatik uygulanmaz
      setPrompt('');
    }
  }, [visible, initialTitle]);

  const kaydetAd = async () => {
    const next = title.trim();
    if (!next || kaydediyor) return;
    setKaydediyor(true);
    try {
      await onKaydetBaslik(next);
    } finally {
      setKaydediyor(false);
    }
  };

  const yenidenUret = async () => {
    const p = prompt.trim();
    if (p.length < 3 || uretiyor) return;
    setUretiyor(true);
    try {
      await onYenidenUret({
        title: title.trim() || initialTitle,
        prompt: p,
        duration_seconds: durationSeconds,
      });
    } finally {
      setUretiyor(false);
    }
  };

  const promptDegisti = prompt.trim().length >= 3;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <CamArkaplan intensity={70} style={StyleSheet.absoluteFill} hafif />
          <View style={styles.tutamak} />
          <Text style={styles.baslik}>{t('ortak.duzenle')}</Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            bounces={false}
          >
            <Text style={styles.etiket}>{t('aiMuzik.sarkiAdi')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={(txt) => setTitle(txt.slice(0, 120))}
              placeholder={t('aiMuzik.sarkiAdi')}
              placeholderTextColor={RenkTokenlari.textDim}
              maxLength={120}
              returnKeyType="done"
            />

            <Pressable
              style={[styles.btnIkincil, (!title.trim() || kaydediyor) && styles.btnPasif]}
              onPress={() => void kaydetAd()}
              disabled={!title.trim() || kaydediyor}
            >
              <Text style={styles.btnIkincilYazi}>
                {kaydediyor ? t('ortak.kaydediliyor') : t('aiMuzik.adiKaydet')}
              </Text>
            </Pressable>

            <Text style={[styles.etiket, { marginTop: BoslukTokenlari.lg }]}>
              {t('aiMuzik.yeniTalimat')}
            </Text>
            <Text style={styles.ipucu}>{t('aiMuzik.yenidenUretIpucu')}</Text>
            {initialPrompt?.trim() ? (
              <Text style={styles.eskiPrompt} numberOfLines={3}>
                {t('aiMuzik.oncekiUygulanmaz', { prompt: initialPrompt.trim() })}
              </Text>
            ) : null}
            <TextInput
              style={[styles.input, styles.promptInput]}
              value={prompt}
              onChangeText={(txt) => setPrompt(txt.slice(0, 2000))}
              placeholder={t('aiMuzik.yeniTalimatPlaceholder')}
              placeholderTextColor={RenkTokenlari.textDim}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />

            <Pressable
              style={[
                styles.btn,
                (!promptDegisti || uretiyor) && styles.btnPasif,
              ]}
              onPress={() => void yenidenUret()}
              disabled={!promptDegisti || uretiyor}
            >
              <Text style={styles.btnYazi}>
                {uretiyor ? t('aiMuzik.yenidenUretiliyor') : t('aiMuzik.yeniTalimatlaUret')}
              </Text>
            </Pressable>

            <Pressable style={styles.vazgec} onPress={onClose}>
              <Text style={styles.vazgecYazi}>{t('ortak.kapat')}</Text>
            </Pressable>
          </ScrollView>
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
    maxHeight: '88%',
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
    marginBottom: BoslukTokenlari.md,
  },
  scroll: {
    paddingBottom: BoslukTokenlari.md,
  },
  etiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginBottom: 6,
  },
  ipucu: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: 8,
  },
  eskiPrompt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginBottom: 8,
    opacity: 0.75,
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.md,
    minHeight: 48,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  promptInput: {
    minHeight: 120,
  },
  btn: {
    marginTop: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: YaricapTokenlari.lg,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
  },
  btnIkincil: {
    marginTop: BoslukTokenlari.sm,
    borderRadius: YaricapTokenlari.lg,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.primarySoft + '88',
    backgroundColor: RenkTokenlari.primarySoft + '14',
  },
  btnIkincilYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  btnPasif: { opacity: 0.45 },
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
