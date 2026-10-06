import React, { useMemo } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MedyaUriKucuk,
  MedyaUriOnizlemeGuvenli,
} from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  uri: string | null;
  onKapat: () => void;
  /** Kapak yatay, avatar kare — yalnızca erişilebilirlik */
  tur?: 'avatar' | 'cover';
};

/**
 * Profil / kapak tam ekran önizleme.
 * getSize beklemeden hemen çizilir — ağ gecikmesi yok.
 */
export function ProfilMedyaBuyutucu({ uri, onKapat, tur = 'avatar' }: Props) {
  const { t } = useCeviri();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const orijinal = MedyaUriOnizlemeGuvenli(uri);
  const acik = Boolean(orijinal);

  /** Yerel file:// olduğu gibi; uzak için orta boy render (hızlı) */
  const gosterUri = useMemo(() => {
    if (!orijinal) return null;
    if (/^(file|content|ph|assets-library):/i.test(orijinal)) return orijinal;
    const w = Math.round(Math.min(1400, width * 2));
    const h = Math.round(Math.min(1800, height * 2));
    return MedyaUriKucuk(orijinal, { w, h }) ?? orijinal;
  }, [orijinal, width, height]);

  const kutuW = width;
  const kutuH = Math.max(120, height - insets.top - insets.bottom - 56);

  return (
    <Modal
      visible={acik}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      onRequestClose={onKapat}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={styles.backdrop}
          onPress={onKapat}
          accessibilityRole="button"
          accessibilityLabel={t('ortak.kapat')}
        />

        {gosterUri ? (
          <View
            style={[styles.imageWrap, { width: kutuW, height: kutuH }]}
            pointerEvents="box-none"
          >
            <View style={styles.imageHit} pointerEvents="auto">
              <Image
                key={gosterUri}
                source={{ uri: gosterUri }}
                style={{ width: kutuW, height: kutuH }}
                resizeMode="contain"
                accessibilityLabel={
                  tur === 'cover'
                    ? t('profil.kapakFotografi')
                    : t('profil.profilFotografi')
                }
              />
            </View>
          </View>
        ) : null}

        <Pressable
          style={[styles.kapatBtn, { top: Math.max(12, insets.top + 8) }]}
          onPress={onKapat}
          hitSlop={12}
          accessibilityLabel={t('ortak.kapat')}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>

        <Text style={[styles.ipucu, { bottom: Math.max(16, insets.bottom + 12) }]}>
          {t('profil.boslugaDokunarakKapat')}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  imageWrap: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageHit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  kapatBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 3,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ipucu: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 3,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
  },
});
