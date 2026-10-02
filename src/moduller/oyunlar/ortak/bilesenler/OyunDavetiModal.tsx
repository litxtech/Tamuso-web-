/**
 * Oyun daveti modal — Tamuso dark tema.
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCeviri } from '../../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

export type OyunDavetiBilgi = {
  hostName: string;
  gameName: string;
  durationSeconds: number;
  joinedCount: number;
  maxPlayers: number;
};

type Props = {
  visible: boolean;
  davet: OyunDavetiBilgi | null;
  onKatil: () => void;
  onIzle?: () => void;
  onReddet: () => void;
};

export function OyunDavetiModal({
  visible,
  davet,
  onKatil,
  onIzle,
  onReddet,
}: Props) {
  const { t } = useCeviri();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onReddet}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{t('oyun.davetEyebrow')}</Text>
          <Text style={styles.title}>{davet?.gameName ?? t('oyun.varsayilanAd')}</Text>
          <Text style={styles.body}>
            {t('oyun.davetBody', {
              host: davet?.hostName ?? t('oyun.birOyuncu'),
            })}
          </Text>
          <Text style={styles.meta}>
            {t('oyun.davetMeta', {
              sn: davet?.durationSeconds ?? 90,
              joined: davet?.joinedCount ?? 0,
              max: davet?.maxPlayers ?? 8,
            })}
          </Text>

          <Pressable style={styles.primary} onPress={onKatil}>
            <Text style={styles.primaryText}>{t('oyun.katil')}</Text>
          </Pressable>
          {onIzle ? (
            <Pressable style={styles.secondary} onPress={onIzle}>
              <Text style={styles.secondaryText}>{t('oyun.izle')}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.ghost} onPress={onReddet}>
            <Text style={styles.ghostText}>{t('oyun.simdiDegil')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    padding: BoslukTokenlari.xl,
  },
  card: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.xl,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    padding: BoslukTokenlari.xl,
  },
  eyebrow: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    marginBottom: BoslukTokenlari.sm,
  },
  title: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
  },
  body: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    marginTop: BoslukTokenlari.sm,
  },
  meta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: BoslukTokenlari.md,
    marginBottom: BoslukTokenlari.lg,
  },
  primary: {
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: BoslukTokenlari.md,
    alignItems: 'center',
  },
  primaryText: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  secondary: {
    marginTop: BoslukTokenlari.sm,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingVertical: BoslukTokenlari.md,
    alignItems: 'center',
  },
  secondaryText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  ghost: {
    marginTop: BoslukTokenlari.sm,
    paddingVertical: BoslukTokenlari.sm,
    alignItems: 'center',
  },
  ghostText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
