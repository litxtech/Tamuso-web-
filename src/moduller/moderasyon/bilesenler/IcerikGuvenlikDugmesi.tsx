import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  IcerikBildirPaneli,
  type IcerikBildirTuru,
} from './IcerikBildirPaneli';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  tur: IcerikBildirTuru;
  contentId: string;
  roomId?: string | null;
  targetUserId?: string | null;
  title?: string | null;
  isGuest?: boolean;
  /** Kart üzerinde koyu overlay için */
  koyu?: boolean;
  /** Küçük sade metin buton (oda içi) · ikon: sadece bayrak · yok: yalnızca panel */
  varyant?: 'ucNokta' | 'metin' | 'ikon' | 'yok';
  /** Artınca bildir paneli açılır (üst menüden) */
  acikSinyal?: number;
  hitSlop?: number;
};

/**
 * Kart / oda / yayın — ⋮ menü, “Bildir” metni veya küçük bayrak.
 */
export function IcerikGuvenlikDugmesi({
  tur,
  contentId,
  roomId,
  targetUserId,
  title,
  isGuest,
  koyu = true,
  varyant = 'ucNokta',
  acikSinyal = 0,
  hitSlop = 8,
}: Props) {
  const { t } = useCeviri();
  const [menuAcik, setMenuAcik] = useState(false);
  const [bildirAcik, setBildirAcik] = useState(false);

  useEffect(() => {
    if (acikSinyal > 0) setBildirAcik(true);
  }, [acikSinyal]);

  const bildirAc = () => {
    setMenuAcik(false);
    setBildirAcik(true);
  };

  return (
    <>
      {varyant === 'yok' ? null : varyant === 'metin' ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            setBildirAcik(true);
          }}
          hitSlop={hitSlop}
          accessibilityLabel={t('bildir.baslik')}
          accessibilityRole="button"
          style={styles.metinBtn}
        >
          <Text style={styles.metinYazi}>{t('bildir.baslik')}</Text>
        </Pressable>
      ) : varyant === 'ikon' ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            setBildirAcik(true);
          }}
          hitSlop={hitSlop}
          accessibilityLabel={t('bildir.baslik')}
          accessibilityRole="button"
          style={[styles.ikonTaban, styles.ikonKare]}
        >
          <MaterialCommunityIcons
            name="flag-outline"
            size={12}
            color="rgba(255,255,255,0.7)"
          />
        </Pressable>
      ) : (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            setMenuAcik(true);
          }}
          hitSlop={hitSlop}
          accessibilityLabel={t('ortak.dahaFazla')}
          accessibilityRole="button"
          style={[styles.ucNokta, koyu ? styles.ucNoktaKoyu : styles.ucNoktaAcik]}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={14}
            color={koyu ? RenkTokenlari.textOnOverlay : RenkTokenlari.text}
          />
        </Pressable>
      )}

      <Modal
        visible={menuAcik}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAcik(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuAcik(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {title ??
                (tur === 'room'
                  ? t('moderasyon.sesOdasi')
                  : t('moderasyon.canliYayin'))}
            </Text>
            <Pressable style={styles.row} onPress={bildirAc}>
              <Ionicons
                name="flag-outline"
                size={18}
                color={RenkTokenlari.danger}
              />
              <Text style={[styles.rowText, styles.danger]}>{t('bildir.baslik')}</Text>
            </Pressable>
            <Pressable style={styles.row} onPress={() => setMenuAcik(false)}>
              <Text style={styles.rowMuted}>{t('ortak.vazgec')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <IcerikBildirPaneli
        visible={bildirAcik}
        onClose={() => setBildirAcik(false)}
        tur={tur}
        contentId={contentId}
        roomId={roomId}
        targetUserId={targetUserId}
        title={title}
        isGuest={isGuest}
      />
    </>
  );
}

const styles = StyleSheet.create({
  ucNokta: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ucNoktaKoyu: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  ucNoktaAcik: {
    backgroundColor: RenkTokenlari.pressFill,
  },
  metinBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  metinYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
  },
  ikonTaban: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ikonKare: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: RenkTokenlari.bgCard,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    padding: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxl,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  sheetTitle: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: BoslukTokenlari.sm,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: BoslukTokenlari.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  rowText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  danger: { color: RenkTokenlari.danger },
  rowMuted: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
  },
});
