import React, { useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KlavyeGuvenliAlan } from '../../../bilesenler/klavye/KlavyeGuvenliAlan';
import {
  KlavyeFocusKaydir,
  KlavyeScrollView,
  type KlavyeScrollHandle,
} from '../../../bilesenler/klavye/KlavyeScrollView';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { AiMuzikLyricsMode } from '../tipler';

export type GelismisAyarlar = {
  structure_hint: string;
  bpm: string;
  instruments: string;
  lyrics_mode: AiMuzikLyricsMode;
  lyrics: string;
  force_instrumental: boolean;
};

type Props = {
  visible: boolean;
  value: GelismisAyarlar;
  lyricsMax: number;
  onChange: (next: GelismisAyarlar) => void;
  onClose: () => void;
};

export function GelismisAyarlarSheet({
  visible,
  value,
  lyricsMax,
  onChange,
  onClose,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const kaydirRef = useRef<KlavyeScrollHandle>(null);
  const patch = (p: Partial<GelismisAyarlar>) => onChange({ ...value, ...p });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KlavyeGuvenliAlan style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <View style={styles.tutamak} />
          <Text style={styles.baslik}>{t('aiMuzik.gelismisBaslik')}</Text>
          <Text style={styles.alt}>{t('aiMuzik.gelismisAlt')}</Text>
          <KlavyeScrollView
            ref={kaydirRef}
            style={styles.kaydir}
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <Text style={styles.etiket}>{t('aiMuzik.yapiIpucu')}</Text>
            <TextInput
              style={styles.input}
              value={value.structure_hint}
              onChangeText={(txt) => patch({ structure_hint: txt })}
              onFocus={(e) => KlavyeFocusKaydir(kaydirRef.current, e)}
              blurOnSubmit={false}
              placeholder={t('aiMuzik.yapiPlaceholder')}
              placeholderTextColor={RenkTokenlari.textDim}
            />

            <Text style={styles.etiket}>{t('aiMuzik.bpm')}</Text>
            <TextInput
              style={styles.input}
              value={value.bpm}
              onChangeText={(txt) => patch({ bpm: txt.replace(/[^\d]/g, '') })}
              onFocus={(e) => KlavyeFocusKaydir(kaydirRef.current, e)}
              placeholder="120"
              keyboardType="number-pad"
              placeholderTextColor={RenkTokenlari.textDim}
            />

            <Text style={styles.etiket}>{t('aiMuzik.enstrumanlarVirgul')}</Text>
            <TextInput
              style={styles.input}
              value={value.instruments}
              onChangeText={(txt) => patch({ instruments: txt })}
              onFocus={(e) => KlavyeFocusKaydir(kaydirRef.current, e)}
              blurOnSubmit={false}
              placeholder={t('aiMuzik.enstrumanPlaceholder')}
              placeholderTextColor={RenkTokenlari.textDim}
            />

            <Text style={styles.etiket}>{t('aiMuzik.sozModu')}</Text>
            <View style={styles.chipRow}>
              {(['ai', 'user', 'instrumental'] as const).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.chip, value.lyrics_mode === m && styles.chipAktif]}
                  onPress={() =>
                    patch({
                      lyrics_mode: m,
                      force_instrumental: m === 'instrumental',
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chipYazi,
                      value.lyrics_mode === m && styles.chipYaziAktif,
                    ]}
                  >
                    {m === 'ai'
                      ? t('aiMuzik.sozAi')
                      : m === 'user'
                        ? t('aiMuzik.sozKendi')
                        : t('aiMuzik.vokalEnstr')}
                  </Text>
                </Pressable>
              ))}
            </View>

            {value.lyrics_mode === 'user' ? (
              <>
                <Text style={styles.etiket}>{t('aiMuzik.chipSozler')}</Text>
                <TextInput
                  style={[styles.input, styles.cokSatir]}
                  value={value.lyrics}
                  onChangeText={(txt) => patch({ lyrics: txt.slice(0, lyricsMax) })}
                  onFocus={(e) => KlavyeFocusKaydir(kaydirRef.current, e)}
                  multiline
                  scrollEnabled={false}
                  blurOnSubmit={false}
                  placeholder={t('aiMuzik.sozlerPlaceholder')}
                  placeholderTextColor={RenkTokenlari.textDim}
                />
              </>
            ) : null}

            <View style={styles.switchRow}>
              <Text style={styles.etiketInline}>{t('aiMuzik.enstrZorla')}</Text>
              <Switch
                value={value.force_instrumental}
                onValueChange={(v) =>
                  patch({
                    force_instrumental: v,
                    lyrics_mode: v
                      ? 'instrumental'
                      : value.lyrics_mode === 'instrumental'
                        ? 'ai'
                        : value.lyrics_mode,
                  })
                }
              />
            </View>
          </KlavyeScrollView>
          <Pressable style={styles.tamam} onPress={onClose} accessibilityRole="button">
            <Text style={styles.tamamYazi}>{t('ortak.tamam')}</Text>
          </Pressable>
        </View>
      </KlavyeGuvenliAlan>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scroll: {
    paddingBottom: BoslukTokenlari.md,
  },
  sheet: {
    backgroundColor: RenkTokenlari.surface,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    maxHeight: '88%',
  },
  kaydir: {
    flexGrow: 0,
    flexShrink: 1,
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
    marginBottom: BoslukTokenlari.md,
    marginTop: 2,
  },
  etiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: BoslukTokenlari.sm,
    marginBottom: 4,
  },
  etiketInline: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 12,
    minHeight: 44,
    backgroundColor: RenkTokenlari.bg,
  },
  cokSatir: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    justifyContent: 'center',
  },
  chipAktif: {
    backgroundColor: RenkTokenlari.primarySoft + '22',
    borderColor: RenkTokenlari.primarySoft,
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  chipYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.md,
    minHeight: 44,
  },
  tamam: {
    alignItems: 'center',
    paddingVertical: BoslukTokenlari.md,
    minHeight: 48,
    marginTop: BoslukTokenlari.sm,
    backgroundColor: RenkTokenlari.primarySoft + '18',
    borderRadius: YaricapTokenlari.lg,
  },
  tamamYazi: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.primarySoft,
  },
});
