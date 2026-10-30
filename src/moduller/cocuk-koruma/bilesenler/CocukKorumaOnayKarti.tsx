import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useSegments } from 'expo-router';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  CocukKorumaOnayDurumuGetir,
  CocukKorumaOnayla,
  CocukKorumaReddetVeHesapKapat,
} from '../islemler/CocukKorumaIslemleri';

/**
 * Oturum açmış her kullanıcı için tek seferlik çocuk koruma onay kartı.
 * Backdrop kapatılmaz; onaylanana veya hesap kapanana kadar kalır.
 */
export function CocukKorumaOnayKarti() {
  const { t } = useCeviri();
  const segments = useSegments();
  const { user, profile, refreshProfile } = useAuth();
  const sesOdasiEkrani = segments.some((s) => s === 'room' || s === 'lobi');
  const [gerekli, setGerekli] = useState(false);
  const [kontrolEdildi, setKontrolEdildi] = useState(false);
  const [altOnay, setAltOnay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kontrolEt = useCallback(async () => {
    if (!user?.id || !profile || profile.deleted_at || profile.banned_at) {
      setGerekli(false);
      setKontrolEdildi(true);
      return;
    }
    if (profile.child_protection_consent_status === 'approved') {
      setGerekli(false);
      setKontrolEdildi(true);
      return;
    }
    try {
      const d = await CocukKorumaOnayDurumuGetir();
      setGerekli(d.gerekli === true);
    } catch {
      setGerekli(false);
    } finally {
      setKontrolEdildi(true);
    }
  }, [user?.id, profile]);

  useEffect(() => {
    void kontrolEt();
  }, [kontrolEt]);

  const onayla = async () => {
    setBusy(true);
    setHata(null);
    const r = await CocukKorumaOnayla();
    setBusy(false);
    if (!r.ok) {
      setHata(r.hata);
      return;
    }
    setGerekli(false);
    setAltOnay(false);
    await refreshProfile();
  };

  const reddetOnayla = async () => {
    setBusy(true);
    setHata(null);
    const r = await CocukKorumaReddetVeHesapKapat();
    setBusy(false);
    if (!r.ok) {
      setHata(r.hata);
      return;
    }
    setGerekli(false);
    setAltOnay(false);
    router.replace('/(auth)/login' as any);
  };

  if (!kontrolEdildi || !gerekli || sesOdasiEkrani) return null;

  return (
    <TamusoModal
      visible
      onClose={() => undefined}
      animationType="fade"
      placement="center"
      backdropClosable={false}
    >
      <View style={styles.wrap}>
        <LinearGradient
          colors={['#1A2E28', '#0F1A16', '#0B1411']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.kart}
        >
          <View style={styles.ustSerit} />
          <View style={styles.baslikSatir}>
            <View style={styles.ikonKutu}>
              <Ionicons name="shield-checkmark" size={22} color="#7DFFB3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.baslikTr}>{t('cocukKoruma.baslik')}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollIcerik}
            showsVerticalScrollIndicator
            bounces
          >
            <Text style={styles.govde}>{t('cocukKoruma.govde')}</Text>
          </ScrollView>

          {hata ? <Text style={styles.hata}>{hata}</Text> : null}

          {!altOnay ? (
            <View style={styles.aksiyonlar}>
              <Pressable
                style={[styles.btn, styles.btnOnay]}
                disabled={busy}
                onPress={() => void onayla()}
              >
                {busy ? (
                  <ActivityIndicator color="#0B1411" />
                ) : (
                  <Text style={styles.btnOnayYazi}>{t('cocukKoruma.btnBuyugum')}</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnRed]}
                disabled={busy}
                onPress={() => setAltOnay(true)}
              >
                <Text style={styles.btnRedYazi}>{t('cocukKoruma.btnDegilim')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.aksiyonlar}>
              <Text style={styles.uyari}>{t('cocukKoruma.onayUyari')}</Text>
              <Pressable
                style={[styles.btn, styles.btnTehlike]}
                disabled={busy}
                onPress={() => void reddetOnayla()}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnTehlikeYazi}>{t('cocukKoruma.btnOnayKapat')}</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnGhost]}
                disabled={busy}
                onPress={() => setAltOnay(false)}
              >
                <Text style={styles.btnGhostYazi}>{t('cocukKoruma.btnVazgec')}</Text>
              </Pressable>
            </View>
          )}
        </LinearGradient>
      </View>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: BoslukTokenlari.md,
  },
  kart: {
    borderRadius: YaricapTokenlari.xl,
    borderWidth: 1,
    borderColor: 'rgba(125,255,179,0.22)',
    overflow: 'hidden',
    maxHeight: '88%',
  },
  ustSerit: {
    height: 3,
    backgroundColor: '#7DFFB3',
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.sm,
  },
  ikonKutu: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(125,255,179,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baslikTr: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  scroll: { maxHeight: 280 },
  scrollIcerik: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.md,
  },
  govde: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    lineHeight: 22,
  },
  hata: {
    ...TipografiTokenlari.caption,
    color: '#FF6B6B',
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
  },
  aksiyonlar: {
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  btn: {
    borderRadius: YaricapTokenlari.md,
    paddingVertical: BoslukTokenlari.md,
    alignItems: 'center',
  },
  btnOnay: { backgroundColor: '#7DFFB3' },
  btnOnayYazi: {
    ...TipografiTokenlari.h2,
    color: '#0B1411',
  },
  btnRed: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  btnRedYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  uyari: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: BoslukTokenlari.sm,
  },
  btnTehlike: { backgroundColor: '#C0392B' },
  btnTehlikeYazi: {
    ...TipografiTokenlari.h2,
    color: '#fff',
  },
  btnGhost: { paddingVertical: BoslukTokenlari.sm },
  btnGhostYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
