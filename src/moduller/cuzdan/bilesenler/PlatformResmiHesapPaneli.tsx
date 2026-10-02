import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaviTikRozeti } from '../../mesajlasma/bilesenler/MaviTikRozeti';
import {
  PlatformResmiHesaplariListele,
  type PlatformResmiHesap,
} from '../takas/TakasMahkemeIslemleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';

type Props = {
  acik: boolean;
  onKapat: () => void;
};

/** Yargıç / mavi tik tıklanınca platform resmi hesapları */
export function PlatformResmiHesapPaneli({ acik, onKapat }: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [liste, setListe] = useState<PlatformResmiHesap[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!acik) return;
    setYukleniyor(true);
    void PlatformResmiHesaplariListele()
      .then(setListe)
      .finally(() => setYukleniyor(false));
  }, [acik]);

  return (
    <Modal visible={acik} animationType="slide" transparent onRequestClose={onKapat}>
      <Pressable style={styles.overlay} onPress={onKapat}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.baslikSatir}>
            <LinearGradient
              colors={['#4DA3FF', '#1D6FE8']}
              style={styles.ikon}
            >
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.baslik}>{t('takas.resmiHesapBaslik')}</Text>
              <Text style={styles.alt}>{t('takas.resmiHesapAlt')}</Text>
            </View>
            <Pressable onPress={onKapat} hitSlop={10}>
              <Ionicons name="close" size={22} color={RenkTokenlari.textMuted} />
            </Pressable>
          </View>

          {yukleniyor ? (
            <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 24 }} />
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {liste.length === 0 ? (
                <Text style={styles.bos}>{t('takas.resmiHesapBos')}</Text>
              ) : (
                liste.map((h) => {
                  const avatar = MedyaUriGuvenli(h.avatar_url);
                  return (
                  <View key={h.id} style={styles.satir}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarBos]}>
                        <Ionicons name="person" size={18} color={RenkTokenlari.textDim} />
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.adSatir}>
                        <Text style={styles.ad} numberOfLines={1}>
                          {h.display_name || h.username || 'Platform'}
                        </Text>
                        <MaviTikRozeti size={16} />
                      </View>
                      <Text style={styles.meta} numberOfLines={1}>
                        {h.is_platform_yargic ? t('takas.yargicEtiket') : ''}
                        {h.username ? `@${h.username}` : h.public_user_id ?? ''}
                      </Text>
                    </View>
                  </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: RenkTokenlari.surface,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: 4,
  },
  baslikSatir: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ikon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: 2,
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    paddingVertical: 20,
    textAlign: 'center',
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.divider,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarBos: {
    backgroundColor: RenkTokenlari.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adSatir: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    flexShrink: 1,
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: 2,
  },
});
