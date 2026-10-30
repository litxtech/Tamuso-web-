import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import {
  KlavyeScrollView,
  type KlavyeScrollHandle,
} from '../../src/bilesenler/klavye/KlavyeScrollView';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth, useWallet } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import {
  HostBagimsizAktifEt,
  HostBasvurusuOlustur,
} from '../../src/moduller/hostlar/islemler/HostBasvuruIslemleri';
import {
  HostBasvurularimiGetir,
  HostProfilimiGetir,
  type HostBasvurusu,
  type HostProfil,
} from '../../src/moduller/hostlar/okuma/HostProfiliniGetir';
import {
  BekleyenAjansBasvurusu,
  HostAsamasiBul,
} from '../../src/moduller/hostlar/yardimcilar/HostAsamasi';
import { HostHeroKarti } from '../../src/moduller/hostlar/bilesenler/HostHeroKarti';
import { HostFaydaListesi } from '../../src/moduller/hostlar/bilesenler/HostFaydaListesi';
import { HostYolSecimi } from '../../src/moduller/hostlar/bilesenler/HostYolSecimi';
import { HostPaneli } from '../../src/moduller/hostlar/bilesenler/HostPaneli';
import { HostBasvuruGecmisi } from '../../src/moduller/hostlar/bilesenler/HostBasvuruGecmisi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  screenPaddingHorizontal,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function HostEkrani() {
  const { t } = useCeviri();
  const { isGuest, refreshProfile, profile } = useAuth();
  const { refreshWallet } = useWallet();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const scrollRef = useRef<KlavyeScrollHandle>(null);
  const [host, setHost] = useState<HostProfil | null>(null);
  const [basvurular, setBasvurular] = useState<HostBasvurusu[]>([]);
  const [ilkYukleme, setIlkYukleme] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [islem, setIslem] = useState<'bagimsiz' | 'ajans' | null>(null);
  const [davetKodu, setDavetKodu] = useState('');

  const load = useCallback(async () => {
    const [h, b] = await Promise.allSettled([
      HostProfilimiGetir(),
      HostBasvurularimiGetir(),
    ]);
    setHost(h.status === 'fulfilled' ? h.value : null);
    setBasvurular(b.status === 'fulfilled' ? b.value : []);
    setIlkYukleme(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const yenile = useCallback(async () => {
    setYenileniyor(true);
    await Promise.allSettled([load(), refreshProfile()]);
    setYenileniyor(false);
  }, [load, refreshProfile]);

  const asama = HostAsamasiBul(host, Boolean(profile?.is_host));
  const bekleyenAjans = BekleyenAjansBasvurusu(basvurular);

  const bagimsiz = () => {
    islemiDene('canli_ac', async () => {
      setIslem('bagimsiz');
      const a = await HostBasvurusuOlustur({ path: 'independent' });
      if (!a.ok) {
        setIslem(null);
        Alert.alert(t('host.alertBasvuru'), a.hata);
        return;
      }
      const b = await HostBagimsizAktifEt();
      setIslem(null);
      if (!b.ok) {
        Alert.alert(t('host.alertOnay'), b.hata);
        await load();
        return;
      }
      await refreshProfile();
      Alert.alert(t('host.alertAktifBaslik'), t('host.alertAktifBody'));
      await load();
    });
  };

  const ajansaKatil = () => {
    islemiDene('canli_ac', async () => {
      const kod = davetKodu.trim();
      if (!kod) {
        Alert.alert(t('host.alertDavetGerekli'));
        return;
      }
      setIslem('ajans');
      const sonuc = await HostBasvurusuOlustur({
        path: 'join_agency',
        inviteCode: kod,
      });
      setIslem(null);
      if (!sonuc.ok) {
        Alert.alert(t('host.alertBasvuru'), sonuc.hata);
        return;
      }
      setDavetKodu('');
      Alert.alert(t('host.alertGonderildiBaslik'), t('host.alertGonderildiBody'), [
        { text: t('ortak.tamam') },
        {
          text: t('host.paneleGit'),
          onPress: () => router.push('/ajans/uye' as any),
        },
      ]);
      await load();
    });
  };

  const yolSecimiModu =
    bekleyenAjans || asama === 'ajans' || asama === 'askida'
      ? null
      : asama === 'bagimsiz'
        ? 'sadeceAjans'
        : 'tam';

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="hostlar">
        <EkranBasligi title={t('host.baslik')} subtitle={t('host.alt')} />
        {ilkYukleme ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} style={styles.yukleniyor} />
        ) : (
          <KlavyeScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={yenileniyor}
                onRefresh={() => void yenile()}
                tintColor={RenkTokenlari.primarySoft}
                colors={[RenkTokenlari.primary]}
              />
            }
          >
            <HostHeroKarti asama={asama} basvuruBekliyor={!!bekleyenAjans} />

            {asama === 'askida' ? (
              <Pressable
                onPress={() => router.push('/destek' as any)}
                style={({ pressed }) => [styles.bilgi, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Ionicons name="chatbubbles-outline" size={20} color={RenkTokenlari.primarySoft} />
                <Text style={styles.bilgiBaslik}>{t('host.destegeYaz')}</Text>
                <Ionicons name="chevron-forward" size={18} color={RenkTokenlari.textDim} />
              </Pressable>
            ) : null}

            {bekleyenAjans ? (
              <View style={[styles.bilgi, styles.bilgiUyari]}>
                <Ionicons name="hourglass-outline" size={20} color={RenkTokenlari.warning} />
                <View style={styles.bilgiMetin}>
                  <Text style={styles.bilgiBaslik}>{t('host.bekleyenAjansBaslik')}</Text>
                  <Text style={styles.bilgiGovde}>{t('host.bekleyenAjansBody')}</Text>
                </View>
              </View>
            ) : null}

            {asama === 'bagimsiz' || asama === 'ajans' ? (
              <HostPaneli host={host} ajansHostu={asama === 'ajans'} />
            ) : null}

            {asama === 'yok' ? <HostFaydaListesi /> : null}

            {yolSecimiModu ? (
              <HostYolSecimi
                mod={yolSecimiModu}
                islem={islem}
                davetKodu={davetKodu}
                davetKoduDegisti={setDavetKodu}
                onBagimsiz={bagimsiz}
                onAjans={ajansaKatil}
                scrollRef={scrollRef}
              />
            ) : null}

            <HostBasvuruGecmisi basvurular={basvurular} asama={asama} />
          </KlavyeScrollView>
        )}
        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => {
            void refreshProfile();
            void refreshWallet();
          }}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  yukleniyor: { marginTop: BoslukTokenlari.xxxl },
  content: {
    flexGrow: 1,
    paddingHorizontal: screenPaddingHorizontal,
    paddingTop: BoslukTokenlari.xs,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.lg,
  },
  pressed: { opacity: 0.88 },
  bilgi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  bilgiUyari: {
    alignItems: 'flex-start',
    borderColor: `${RenkTokenlari.warning}59`,
  },
  bilgiMetin: { flex: 1, gap: 2 },
  bilgiBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    flex: 1,
  },
  bilgiGovde: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
