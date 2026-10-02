import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { BosDurum } from '../../../src/components/BosDurum';
import { ModulHataSiniri } from '../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { AjansAtmosfer } from '../../../src/moduller/ajanslar/bilesenler/AjansAtmosfer';
import {
  AjansYonetimAjanslarim,
  type AjansYonetimOzet,
} from '../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import { AjansKayitDurum } from '../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { SahipOlunanAjanslariGetir } from '../../../src/moduller/ajanslar/okuma/AjanslariGetir';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../../src/tasarim-sistemi/tema/useTemayaAboneOl';

function seviyeEtiket(code: string | null | undefined) {
  return (code ?? '—').toUpperCase();
}

/** Ajans yetkisi olan kullanıcı — yönetim hub */
export default function AjansYonetimHubEkrani() {
  const { t } = useCeviri();
  useTemayaAboneOl();
  const [liste, setListe] = useState<AjansYonetimOzet[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  /** Tek ajansa otomatik geçiş yalnızca ilk hub girişinde — geri döngüsünü önler */
  const tekAjansYonlendirildi = useRef(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      let a = await AjansYonetimAjanslarim();
      if (!a.length) {
        const yedek = await SahipOlunanAjanslariGetir().catch(() => []);
        a = yedek.map((x) => ({
          id: x.id,
          agency_public_id: x.agency_public_id,
          name: x.name,
          status: x.status,
          is_coin_distributor: x.is_coin_distributor,
          invite_code: x.invite_code,
          host_count: x.host_count,
          level_code: x.level_code,
        }));
      }
      setListe(a);
      if (a.length === 1 && !tekAjansYonlendirildi.current) {
        tekAjansYonlendirildi.current = true;
        router.replace(`/ajans/${a[0].id}` as any);
      }
    } catch {
      try {
        const yedek = await SahipOlunanAjanslariGetir();
        const a = yedek.map((x) => ({
          id: x.id,
          agency_public_id: x.agency_public_id,
          name: x.name,
          status: x.status,
          is_coin_distributor: x.is_coin_distributor,
          invite_code: x.invite_code,
          host_count: x.host_count,
          level_code: x.level_code,
        }));
        setListe(a);
        if (a.length === 1 && !tekAjansYonlendirildi.current) {
          tekAjansYonlendirildi.current = true;
          router.replace(`/ajans/${a[0].id}` as any);
        }
      } catch {
        setListe([]);
      }
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ajans-yonetim" varyant="ekran" fallbackHref="/ajans">
        <View style={styles.root}>
          <AjansAtmosfer />
          <EkranBasligi
            title={t('ajans.ajanslarim')}
            subtitle={t('ajans.komutaMerkezi')}
            fallbackHref={'/(tabs)/profile' as any}
          />
          {yukleniyor ? (
            <ActivityIndicator
              color={RenkTokenlari.primarySoft}
              style={{ marginTop: 40 }}
            />
          ) : liste.length === 0 ? (
            <View style={styles.bosWrap}>
              <BosDurum
                title={t('ajans.bosYonetimBaslik')}
                body={t('ajans.bosYonetimBody')}
              />
              <Pressable
                style={styles.bosBtn}
                onPress={() => router.push('/ajans' as any)}
              >
                <Text style={styles.bosBtnYazi}>{t('ajans.ajansKur')}</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={liste}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.liste}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push(`/ajans/${item.id}` as any)}
                  style={styles.kartPress}
                >
                  <LinearGradient
                    colors={[...RenkTokenlari.gradientCard]}
                    style={styles.kart}
                  >
                    <View style={styles.logo}>
                      <Text style={styles.logoHarf}>
                        {(item.name || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.kartSol}>
                      <Text style={styles.ad} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.alt} numberOfLines={1}>
                        {item.agency_public_id} ·{' '}
                        {t('ajans.uyeSayisi', { count: item.host_count })}
                      </Text>
                      <View style={styles.chipSatir}>
                        <View style={styles.chip}>
                          <Text style={styles.chipYazi}>
                            {seviyeEtiket(item.level_code)}
                          </Text>
                        </View>
                        {item.is_coin_distributor ? (
                          <View style={[styles.chip, styles.chipCoin]}>
                            <Text style={styles.chipYazi}>{t('ajans.chipCoin')}</Text>
                          </View>
                        ) : null}
                        <View style={styles.chip}>
                          <Text style={styles.chipYazi}>
                            {AjansKayitDurum(String(item.status), t)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={RenkTokenlari.textDim}
                    />
                  </LinearGradient>
                </Pressable>
              )}
            />
          )}
        </View>
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  liste: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
  },
  kartPress: { borderRadius: YaricapTokenlari.lg, overflow: 'hidden' },
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: RenkTokenlari.pressFill,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHarf: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  kartSol: { flex: 1, gap: 4 },
  ad: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  chipSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipCoin: { borderColor: RenkTokenlari.borderAccent },
  chipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  bosWrap: { paddingTop: 24, gap: 16, alignItems: 'center' },
  bosBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.primary,
  },
  bosBtnYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
  },
});
