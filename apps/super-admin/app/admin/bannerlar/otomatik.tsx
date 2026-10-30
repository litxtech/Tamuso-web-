import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminOtomatikBannerPaneli } from '../../../../../src/banner/admin/AdminOtomatikBannerPaneli';
import { AdminOzellikBayragiAyarla } from '../../../../../src/moduller/admin/platform/AdminPlatformIslemleri';
import { OzellikBayragiAktifMiSunucu } from '../../../../../src/moduller/ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import { OtomatikPromoCacheTemizle } from '../../../../../src/banner/services/PromoBannerAdapter';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { AdminStil } from '../../../../../src/moduller/admin/bilesenler/AdminStil';

/** Admin · otomatik oluşturulan bannerlar (hediye / eşik / patlama) */
export default function AdminOtomatikBannerlarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [promoAcik, setPromoAcik] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void OzellikBayragiAktifMiSunucu('auto_promo_banners_enabled').then(
        setPromoAcik,
      );
    }, [admin]),
  );

  const promoDegistir = async (v: boolean) => {
    const onceki = promoAcik;
    setPromoAcik(v);
    setKaydediyor(true);
    try {
      await AdminOzellikBayragiAyarla('auto_promo_banners_enabled', v);
      OtomatikPromoCacheTemizle();
    } catch (e) {
      setPromoAcik(onceki);
      Alert.alert(
        'Hata',
        e instanceof Error ? e.message : 'Promo ayarı kaydedilemedi',
      );
    } finally {
      setKaydediyor(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Otomatik bannerlar"
        subtitle="Hediye · eşik · yağmur · müdahale"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={AdminStil.content}>
        <View style={styles.sekme}>
          <Pressable
            onPress={() => router.replace('/admin/bannerlar' as never)}
            style={styles.sekmeBtn}
          >
            <Text style={styles.sekmeYazi}>Kampanyalar</Text>
          </Pressable>
          <Pressable style={[styles.sekmeBtn, styles.sekmeAktif]}>
            <Text style={[styles.sekmeYazi, styles.sekmeYaziAktif]}>
              Otomatik
            </Text>
          </Pressable>
        </View>

        <View style={styles.toggleCard}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>Popülerlik promo şeridi</Text>
            <Text style={styles.meta}>
              Kampanya yokken en popüler oda / canlı / oyun
            </Text>
          </View>
          <Switch
            value={promoAcik}
            onValueChange={(v) => void promoDegistir(v)}
            disabled={kaydediyor}
            trackColor={{
              false: RenkTokenlari.surface,
              true: RenkTokenlari.primary,
            }}
            thumbColor={RenkTokenlari.text}
          />
        </View>

        <AdminOtomatikBannerPaneli />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sekme: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  sekmeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    alignItems: 'center',
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  sekmeAktif: {
    backgroundColor: 'rgba(232,64,145,0.22)',
    borderColor: RenkTokenlari.borderAccent,
  },
  sekmeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  sekmeYaziAktif: {
    color: RenkTokenlari.text,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  name: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  meta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
