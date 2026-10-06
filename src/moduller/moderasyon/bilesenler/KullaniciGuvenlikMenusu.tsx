import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BILDIRME_SEBEPLERI,
  BildirmeSebebiEtiketi,
  KullaniciBildir,
  KullaniciEngelle,
  RaporAlindiMesajEngelle,
} from '../islemler/ModerasyonIslemleri';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  visible: boolean;
  targetUserId: string;
  targetName?: string | null;
  roomId?: string | null;
  isGuest?: boolean;
  contentType?:
    | 'user'
    | 'dm_message'
    | 'room_chat'
    | 'live_chat'
    | 'room'
    | 'live'
    | 'profile'
    | 'status_post'
    | 'status_comment'
    | 'story'
    | 'story_item'
    | 'other';
  contentId?: string | null;
  contentPreview?: string | null;
  contentMediaUrl?: string | null;
  /** Takipçi listesi: menüde “Takipçilerden kaldır” satırı */
  onTakipciKaldir?: () => void;
  onClose: () => void;
  onBlocked?: () => void;
  onReported?: () => void;
};

/**
 * Apple / Google uyumlu: Engelle + Bildir menusu
 */
export function KullaniciGuvenlikMenusu({
  visible,
  targetUserId,
  targetName,
  roomId,
  isGuest,
  contentType,
  contentId,
  contentPreview,
  contentMediaUrl,
  onTakipciKaldir,
  onClose,
  onBlocked,
  onReported,
}: Props) {
  const { t } = useCeviri();
  const [adim, setAdim] = useState<'menu' | 'bildir'>('menu');
  const [sebepId, setSebepId] = useState<string | null>(null);
  const [detay, setDetay] = useState('');
  const [busy, setBusy] = useState(false);

  const kapat = () => {
    setAdim('menu');
    setSebepId(null);
    setDetay('');
    onClose();
  };

  const misafirUyar = () => {
    Alert.alert(t('guvenlik.bildirim'), t('moderasyon.misafirBildirUyari'));
  };

  const engelle = () => {
    if (isGuest) {
      Alert.alert(t('ortak.misafir'), t('moderasyon.misafirEngelle'));
      return;
    }
    Alert.alert(
      t('profil.engelle'),
      t('moderasyon.engelleOnay', {
        ad: targetName ?? t('moderasyon.buKisi'),
      }),
      [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('profil.engelle'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              const r = await KullaniciEngelle(targetUserId);
              setBusy(false);
              if (!r.ok) {
                Alert.alert(
                  t('profil.engelle'),
                  r.hata ?? t('moderasyon.engelleBasarisiz'),
                );
                return;
              }
              Alert.alert(
                t('moderasyon.engellendiBaslik'),
                t('moderasyon.engellendiBody'),
              );
              onBlocked?.();
              kapat();
            })();
          },
        },
      ],
    );
  };

  const bildir = async () => {
    if (!sebepId) {
      Alert.alert(t('bildir.baslik'), t('moderasyon.sebepSec'));
      return;
    }
    const etiket = BildirmeSebebiEtiketi(sebepId);
    setBusy(true);
    const r = await KullaniciBildir({
      reason: etiket,
      reasonCode: sebepId,
      targetUserId,
      roomId: roomId ?? undefined,
      details: detay.trim() || contentPreview || undefined,
      contentType: contentType ?? (contentId ? 'other' : 'user'),
      contentId: contentId ?? undefined,
      context: {
        body: (contentPreview ?? detay.trim()) || null,
        media_url: contentMediaUrl ?? null,
        target_name: targetName ?? null,
      },
    });
    setBusy(false);
    if (!r.ok) {
      Alert.alert(
        t('bildir.baslik'),
        r.hata ?? t('moderasyon.gonderilemedi'),
      );
      return;
    }
    Alert.alert(t('guvenlik.raporAlindi'), RaporAlindiMesajEngelle(), [
      {
        text: t('ortak.tamam'),
        onPress: () => {
          onReported?.();
          kapat();
        },
      },
      {
        text: t('profil.engelle'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await KullaniciEngelle(targetUserId);
            onBlocked?.();
            onReported?.();
            kapat();
          })();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={kapat}>
      <Pressable style={styles.backdrop} onPress={kapat}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {busy ? (
            <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginVertical: 24 }} />
          ) : adim === 'menu' ? (
            <>
              <Text style={styles.title} numberOfLines={1}>
                {targetName ?? t('ortak.kullanici')}
              </Text>
              <Text style={styles.hint}>{t('moderasyon.guvenlikHint')}</Text>
              {onTakipciKaldir ? (
                <Pressable
                  style={[styles.row, styles.rowDanger]}
                  onPress={() => {
                    kapat();
                    onTakipciKaldir();
                  }}
                >
                  <Text style={[styles.rowText, styles.danger]}>
                    {t('takip.takipciyiKaldir')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.row}
                onPress={() => {
                  if (isGuest) misafirUyar();
                  setAdim('bildir');
                }}
              >
                <Text style={styles.rowText}>{t('bildir.baslik')}</Text>
              </Pressable>
              <Pressable style={[styles.row, styles.rowDanger]} onPress={engelle}>
                <Text style={[styles.rowText, styles.danger]}>{t('profil.engelle')}</Text>
              </Pressable>
              <Pressable style={styles.row} onPress={kapat}>
                <Text style={styles.rowMuted}>{t('ortak.vazgec')}</Text>
              </Pressable>
            </>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>{t('bildir.baslik')}</Text>
              <Text style={styles.hint}>{t('moderasyon.neIcin')}</Text>
              {BILDIRME_SEBEPLERI.map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.sebep, sebepId === s.id && styles.sebepAktif]}
                  onPress={() => setSebepId(s.id)}
                >
                  <Text
                    style={[
                      styles.sebepText,
                      sebepId === s.id && styles.sebepTextAktif,
                    ]}
                  >
                    {BildirmeSebebiEtiketi(s.id)}
                  </Text>
                </Pressable>
              ))}
              <TextInput
                value={detay}
                onChangeText={setDetay}
                placeholder={t('moderasyon.ekDetay')}
                placeholderTextColor={RenkTokenlari.textDim}
                style={styles.input}
                multiline
                maxLength={500}
              />
              <Pressable style={styles.gonder} onPress={() => void bildir()}>
                <Text style={styles.gonderText}>{t('moderasyon.raporuGonder')}</Text>
              </Pressable>
              <Pressable style={styles.row} onPress={() => setAdim('menu')}>
                <Text style={styles.rowMuted}>{t('ortak.geri')}</Text>
              </Pressable>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    maxHeight: '85%',
    zIndex: 3,
    elevation: 24,
  },
  title: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: 4,
  },
  hint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: BoslukTokenlari.md,
  },
  row: {
    paddingVertical: BoslukTokenlari.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  rowDanger: {},
  rowText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  danger: { color: RenkTokenlari.danger },
  rowMuted: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  sebep: {
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.sm,
    backgroundColor: RenkTokenlari.surface,
  },
  sebepAktif: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: 'rgba(232,64,145,0.12)',
  },
  sebepText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
  },
  sebepTextAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  input: {
    minHeight: 72,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
    color: RenkTokenlari.text,
    padding: BoslukTokenlari.md,
    marginVertical: BoslukTokenlari.md,
    textAlignVertical: 'top',
  },
  gonder: {
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: BoslukTokenlari.md,
    alignItems: 'center',
    marginBottom: BoslukTokenlari.sm,
  },
  gonderText: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
});
