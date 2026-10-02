/**
 * Arama onay sheet — fiyat snapshot server'dan; client sadece UI.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  KisilerAramaKapaliBildir,
  KisilerAramaOnizlemeGetir,
} from '../islemler/KisilerKesifIslemleri';
import type { KisilerAramaOnizleme } from '../tipler';
import { saniyeMetni } from '../utils/KisilerYardimcilar';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  visible: boolean;
  calleeId: string | null;
  callType: 'audio' | 'video' | null;
  onKapat: () => void;
  onOnayla: () => void;
  busy?: boolean;
};

export function KisilerAramaOnaySheet({
  visible,
  calleeId,
  callType,
  onKapat,
  onOnayla,
  busy,
}: Props) {
  const { t } = useCeviri();
  const [onizleme, setOnizleme] = useState<KisilerAramaOnizleme | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const kapaliBildirimRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !calleeId || !callType) {
      setOnizleme(null);
      kapaliBildirimRef.current = null;
      return;
    }
    let iptal = false;
    setYukleniyor(true);
    void KisilerAramaOnizlemeGetir(calleeId, callType)
      .then((r) => {
        if (iptal) return;
        setOnizleme(r);
        if (r.block_reason === 'calls_closed') {
          const key = `${calleeId}:${callType}`;
          if (kapaliBildirimRef.current !== key) {
            kapaliBildirimRef.current = key;
            void KisilerAramaKapaliBildir(calleeId, callType);
          }
        }
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [visible, calleeId, callType]);

  const turLabel = callType === 'video' ? t('kisilerX.goruntuluArama') : t('kisilerX.sesliArama');
  const isim = onizleme?.display_name?.trim() || onizleme?.username || t('ortak.kullanici');
  const canStart = onizleme?.ok === true && onizleme.can_start === true;
  const uyari =
    onizleme?.message ??
    (onizleme?.block_reason === 'insufficient_coins'
      ? t('kisilerX.yetersizCoin')
      : null);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onKapat}>
      <Pressable style={styles.backdrop} onPress={onKapat}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.icerik}>
            <View style={styles.handle} />
            <View style={styles.baslikSatir}>
              {onizleme?.avatar_url ? (
                <Image source={{ uri: onizleme.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarBos]}>
                  <Ionicons name="person" size={22} color={RenkTokenlari.textMuted} />
                </View>
              )}
              <View style={styles.baslikMetin}>
                <Text style={styles.baslik}>
                  {t('kisilerX.ileArama', { isim, tur: turLabel })}
                </Text>
                {onizleme?.is_paid ? (
                  <Text style={styles.fiyat}>
                    {t('kisilerX.coinDk', { n: onizleme.price_per_minute ?? '—' })}
                  </Text>
                ) : (
                  <Text style={styles.fiyat}>{t('kisilerX.ucretsizArama')}</Text>
                )}
                {onizleme?.is_paid &&
                (onizleme.free_seconds_remaining ?? 0) > 0 ? (
                  <Text style={styles.ucretsizHak}>
                    {t('kisilerX.ucretsizHakKaldi', {
                      sure: saniyeMetni(onizleme.free_seconds_remaining),
                    })}
                  </Text>
                ) : null}
              </View>
            </View>

            {yukleniyor ? (
              <ActivityIndicator color={RenkTokenlari.primary} style={styles.bekliyor} />
            ) : (
              <View style={styles.bilgi}>
                <Satir
                  label={t('kisilerX.bakiyen')}
                  value={`${onizleme?.caller_balance ?? 0} coin`}
                />
                {onizleme?.is_paid && onizleme.block_reason !== 'calls_closed' ? (
                  <Satir
                    label={t('kisilerX.tahminiSure')}
                    value={saniyeMetni(onizleme.estimated_seconds)}
                  />
                ) : null}
                {onizleme?.is_paid &&
                (onizleme.free_seconds_remaining ?? 0) > 0 ? (
                  <Satir
                    label={t('kisilerX.ucretsizHak')}
                    value={saniyeMetni(onizleme.free_seconds_remaining)}
                  />
                ) : null}
                {uyari ? <Text style={styles.uyari}>{uyari}</Text> : null}
              </View>
            )}

            <Pressable
              style={[styles.cta, (!canStart || busy) && styles.ctaDisabled]}
              disabled={!canStart || !!busy || yukleniyor}
              onPress={onOnayla}
              accessibilityRole="button"
              accessibilityLabel={turLabel}
            >
              {busy ? (
                <ActivityIndicator color={RenkTokenlari.textOnPrimary} />
              ) : (
                <>
                  <Ionicons
                    name={callType === 'video' ? 'videocam' : 'call'}
                    size={18}
                    color={RenkTokenlari.textOnPrimary}
                  />
                  <Text style={styles.ctaYazi}>{turLabel}</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={onKapat} style={styles.vazgec}>
              <Text style={styles.vazgecYazi}>{t('ortak.vazgec')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Satir({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.satir}>
      <Text style={styles.satirLabel}>{label}</Text>
      <Text style={styles.satirValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: RenkTokenlari.scrim,
  },
  sheet: {
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  icerik: {
    padding: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xl,
    gap: BoslukTokenlari.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.divider,
    marginBottom: 4,
  },
  baslikSatir: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarBos: {
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baslikMetin: {
    flex: 1,
    minWidth: 0,
  },
  bekliyor: {
    marginVertical: BoslukTokenlari.lg,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  fiyat: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 2,
  },
  ucretsizHak: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
    letterSpacing: 0,
    marginTop: 2,
  },
  bilgi: {
    gap: 8,
    paddingVertical: 8,
  },
  satir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  satirLabel: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  satirValue: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  uyari: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.danger,
    marginTop: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.lg,
    paddingVertical: 14,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },
  vazgec: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  vazgecYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
