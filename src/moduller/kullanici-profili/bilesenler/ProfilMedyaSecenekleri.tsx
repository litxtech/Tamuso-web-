import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { ProfilMedyaTuru } from '../islemler/ProfilMedyasiYukle';
import { useCeviri } from '../../../i18n/useCeviri';
import { yonluIkon } from '../../../i18n/rtl';

/** Modal slide kapanmadan native picker açılırsa iOS/Android gecikir / takılır */
const MODAL_SONRASI_MS = Platform.OS === 'ios' ? 320 : 280;

type Props = {
  visible: boolean;
  tur: ProfilMedyaTuru | null;
  varMi: boolean;
  busy: boolean;
  onKapat: () => void;
  onGoruntule: (tur: ProfilMedyaTuru) => void;
  onEkleVeyaDegistir: (tur: ProfilMedyaTuru) => void;
  onSil: (tur: ProfilMedyaTuru) => void;
};

/** Kapak / profil fotoğrafı: görüntüle · ekle/değiştir · sil */
export function ProfilMedyaSecenekleri({
  visible,
  tur,
  varMi,
  busy,
  onKapat,
  onGoruntule,
  onEkleVeyaDegistir,
  onSil,
}: Props) {
  const { t } = useCeviri();
  const baslik =
    tur === 'cover' ? t('profil.kapakFotografi') : t('profil.profilFotografi');

  const hemen = (fn: (secilen: ProfilMedyaTuru) => void) => {
    if (!tur) return;
    const secilen = tur;
    onKapat();
    fn(secilen);
  };

  /** Native galeri: Modal kapanmadan açılırsa iOS/Android’de belirgin gecikme */
  const galeriIcin = (fn: (secilen: ProfilMedyaTuru) => void) => {
    if (!tur) return;
    const secilen = tur;
    onKapat();
    setTimeout(() => fn(secilen), MODAL_SONRASI_MS);
  };

  return (
    <TamusoModal
      visible={visible}
      onClose={onKapat}
      placement="bottom"
      animationType="slide"
      contentStyle={styles.sheet}
    >
      <View style={styles.card}>
        <View style={styles.handle} />
        <Text style={styles.title}>{baslik}</Text>

        {busy ? (
          <ActivityIndicator
            color={RenkTokenlari.primary}
            style={{ marginVertical: BoslukTokenlari.lg }}
          />
        ) : (
          <View style={styles.actions}>
            {varMi ? (
              <Secenek
                icon="expand-outline"
                label={t('profil.buyut')}
                onPress={() => hemen(onGoruntule)}
              />
            ) : null}
            <Secenek
              icon={varMi ? 'image-outline' : 'add-circle-outline'}
              label={varMi ? t('ortak.degistir') : t('ortak.ekle')}
              onPress={() => galeriIcin(onEkleVeyaDegistir)}
            />
            {varMi ? (
              <Secenek
                icon="trash-outline"
                label={t('ortak.sil')}
                danger
                onPress={() => hemen(onSil)}
              />
            ) : null}
          </View>
        )}

        <Pressable
          onPress={onKapat}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          disabled={busy}
        >
          <Text style={styles.cancelText}>{t('ortak.iptal')}</Text>
        </Pressable>
      </View>
    </TamusoModal>
  );
}

function Secenek({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.ikon, danger && styles.ikonDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? RenkTokenlari.danger : RenkTokenlari.primarySoft}
        />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowDanger]}>{label}</Text>
      <Ionicons
        name={yonluIkon('chevron-forward')}
        size={16}
        color={RenkTokenlari.textDim}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingBottom: 0,
  },
  card: {
    backgroundColor: RenkTokenlari.bgCard,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxl,
    paddingTop: BoslukTokenlari.sm,
    gap: BoslukTokenlari.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: 4,
  },
  title: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: 4,
  },
  actions: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  ikon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 64, 145, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 64, 145, 0.28)',
  },
  ikonDanger: {
    backgroundColor: 'rgba(255, 80, 80, 0.12)',
    borderColor: 'rgba(255, 80, 80, 0.28)',
  },
  rowLabel: {
    ...TipografiTokenlari.body,
    fontWeight: '700',
    color: RenkTokenlari.text,
    flex: 1,
  },
  rowDanger: { color: RenkTokenlari.danger },
  cancel: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
  },
  cancelText: {
    ...TipografiTokenlari.body,
    fontWeight: '700',
    color: RenkTokenlari.textMuted,
  },
  pressed: { opacity: 0.85 },
});
