import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDil } from '../../../i18n/DilSaglayici';
import { useCeviri } from '../../../i18n/useCeviri';
import i18n from '../../../i18n';
import {
  DilCozumle,
  DESTEKLENEN_DILLER,
  DIL_ETIKETLERI,
  type UygulamaDili,
} from '../../../i18n/diller';
import { RtlYenidenBaslat } from '../../../i18n/RtlUygula';
import { isRtlDil } from '../../../i18n/rtl';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

/**
 * Giriş lobisi dil seçici — Sistem (cihaz/ülke) veya manuel sabit dil.
 */
export function GirisLobiDilSecici() {
  const { t } = useCeviri();
  const { dil, dilModu, dilDegistir, sistemDiliniKullan } = useDil();
  const [acik, setAcik] = useState(false);
  const [busy, setBusy] = useState(false);

  const uygulaSonrasi = (kod: UygulamaDili, reloadGerekli: boolean) => {
    setAcik(false);
    if (!reloadGerekli) return;
    Alert.alert(
      String(i18n.t('ayarlar.dilSecBaslik', { lng: kod })),
      String(i18n.t('ayarlar.rtlYenidenBaslat', { lng: kod })),
      [
        {
          text: String(i18n.t('ortak.tamam', { lng: kod })),
          onPress: () => {
            void RtlYenidenBaslat();
          },
        },
      ],
    );
  };

  const secManuel = async (kod: UygulamaDili) => {
    if (busy) return;
    if (dilModu === 'MANUAL' && kod === dil) {
      setAcik(false);
      return;
    }
    setBusy(true);
    try {
      const { reloadGerekli } = await dilDegistir(kod);
      uygulaSonrasi(kod, reloadGerekli);
    } finally {
      setBusy(false);
    }
  };

  const secSistem = async () => {
    if (busy) return;
    if (dilModu === 'SYSTEM') {
      setAcik(false);
      return;
    }
    setBusy(true);
    try {
      const kod = DilCozumle({ mod: 'SYSTEM' });
      const { reloadGerekli } = await sistemDiliniKullan();
      uygulaSonrasi(kod, reloadGerekli);
    } finally {
      setBusy(false);
    }
  };

  const triggerEtiket =
    dilModu === 'SYSTEM'
      ? t('ayarlar.sistemDiliniKullan')
      : DIL_ETIKETLERI[dil];

  return (
    <>
      <Pressable
        onPress={() => setAcik(true)}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={t('ayarlar.dil')}
      >
        <Ionicons name="language-outline" size={16} color="#fff" />
        <Text style={styles.triggerYazi} numberOfLines={1}>
          {triggerEtiket}
        </Text>
        <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.75)" />
      </Pressable>

      <Modal
        visible={acik}
        transparent
        animationType="fade"
        onRequestClose={() => !busy && setAcik(false)}
      >
        <Pressable style={styles.perde} onPress={() => !busy && setAcik(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetBaslik}>{t('ayarlar.dil')}</Text>
            <Text style={styles.sheetAlt}>{t('ayarlar.dilKilitHint')}</Text>
            <ScrollView
              style={styles.liste}
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                disabled={busy}
                onPress={() => void secSistem()}
                style={[styles.satir, dilModu === 'SYSTEM' && styles.satirSecili]}
                accessibilityRole="button"
                accessibilityState={{ selected: dilModu === 'SYSTEM' }}
              >
                <Text style={styles.satirYazi}>
                  {t('ayarlar.sistemDiliniKullan')}
                </Text>
                {dilModu === 'SYSTEM' ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={RenkTokenlari.primary}
                  />
                ) : (
                  <View style={styles.bos} />
                )}
              </Pressable>

              <View style={styles.ayrac} />

              {DESTEKLENEN_DILLER.map((kod) => {
                const secili = dilModu === 'MANUAL' && dil === kod;
                return (
                  <Pressable
                    key={kod}
                    disabled={busy}
                    onPress={() => void secManuel(kod)}
                    style={[styles.satir, secili && styles.satirSecili]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: secili }}
                  >
                    <Text style={styles.satirYazi}>{DIL_ETIKETLERI[kod]}</Text>
                    {secili ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={RenkTokenlari.primary}
                      />
                    ) : isRtlDil(kod) ? (
                      <Text style={styles.rtlRozet}>RTL</Text>
                    ) : (
                      <View style={styles.bos} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    maxWidth: 220,
  },
  triggerYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '700',
    flexShrink: 1,
  },
  perde: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.xl,
  },
  sheet: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    maxHeight: '70%',
  },
  sheetBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    marginBottom: 4,
  },
  sheetAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    lineHeight: 18,
    marginBottom: BoslukTokenlari.md,
  },
  liste: { maxHeight: 380 },
  ayrac: { height: 8 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.bg,
    marginBottom: 6,
  },
  satirSecili: {
    borderWidth: 1,
    borderColor: RenkTokenlari.primary,
  },
  satirYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
    flex: 1,
    paddingRight: 8,
  },
  bos: { width: 20, height: 20 },
  rtlRozet: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
});
