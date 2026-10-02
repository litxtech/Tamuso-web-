import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { CihazPushTokeniniKaydet } from '../../src/moduller/bildirimler/kayit/CihazPushTokeniniKaydet';
import {
  BildirimIzniDurumuAl,
  BildirimIzniIste,
} from '../../src/moduller/bildirimler/kayit/BildirimIzniIste';
import {
  BildirimAnahtariniKaydet,
  BildirimAnahtarlariniGetir,
  PushTercihiniKaydet,
  PushTercihleriniGetir,
  VarsayilanPushTercihleri,
} from '../../src/moduller/bildirimler/tercihler/PushTercihleriniYonet';
import {
  PUSH_TERCIH_KATALOGU,
  type BildirimAnahtari,
  type PushTercihAnahtari,
  type PushTercihleri,
} from '../../src/moduller/bildirimler/tercihler/PushTercihTipleri';
import type { CeviriAnahtari } from '../../src/i18n/useCeviri';
import { PushBildirimAyariniKaydet } from '../../src/moduller/ayarlar/islemler/KullaniciAyarlariniYonet';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';

const KATEGORI_IKON: Record<
  PushTercihAnahtari,
  keyof typeof Ionicons.glyphMap
> = {
  all_enabled: 'notifications',
  messages: 'chatbubble-ellipses-outline',
  calls: 'call-outline',
  gifts: 'gift-outline',
  live: 'radio-outline',
  rooms: 'musical-notes-outline',
  social: 'heart-outline',
  wallet: 'wallet-outline',
  agency: 'briefcase-outline',
  system: 'shield-checkmark-outline',
};

const GRUP_ETIKET: Record<string, CeviriAnahtari> = {
  messages: 'bildirimAyar.mesajlar',
  calls: 'bildirimAyar.aramalar',
  gifts: 'bildirimAyar.hediyeler',
  live: 'bildirimAyar.canli',
  rooms: 'bildirimAyar.odalar',
  social: 'bildirimAyar.sosyal',
  wallet: 'bildirimAyar.cuzdan',
  agency: 'bildirimAyar.ajans',
  system: 'bildirimAyar.sistem',
};

const GRUP_IKON: Record<string, keyof typeof Ionicons.glyphMap> = {
  messages: 'chatbubble-ellipses-outline',
  calls: 'call-outline',
  gifts: 'gift-outline',
  live: 'radio-outline',
  rooms: 'musical-notes-outline',
  social: 'heart-outline',
  wallet: 'wallet-outline',
  agency: 'briefcase-outline',
  system: 'shield-checkmark-outline',
};

/** Kullanıcı istediği push / uygulama bildirimlerini açıp kapatır */
export default function BildirimAyarlariEkrani() {
  const { t, dil } = useCeviri();
  const [prefs, setPrefs] = useState<PushTercihleri>(VarsayilanPushTercihleri());
  const [anahtarlar, setAnahtarlar] = useState<BildirimAnahtari[] | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [osIzin, setOsIzin] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined',
  );

  const osIzinYenile = useCallback(async () => {
    try {
      const status = await BildirimIzniDurumuAl();
      if (status === 'granted') setOsIzin('granted');
      else if (status === 'denied') setOsIzin('denied');
      else setOsIzin('undetermined');
    } catch {
      setOsIzin('undetermined');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setYukleniyor(true);
      void osIzinYenile();
      void Promise.all([
        PushTercihleriniGetir(),
        BildirimAnahtarlariniGetir(dil).catch(() => null),
      ])
        .then(([p, liste]) => {
          setPrefs(p);
          setAnahtarlar(liste);
          void PushBildirimAyariniKaydet(p.all_enabled);
          if (p.all_enabled) void CihazPushTokeniniKaydet();
        })
        .catch(() => {
          setPrefs(VarsayilanPushTercihleri());
          setAnahtarlar(null);
        })
        .finally(() => setYukleniyor(false));
    }, [dil, osIzinYenile]),
  );

  const gruplar = useMemo(() => {
    const sirali: { grup: string; ogeler: BildirimAnahtari[] }[] = [];
    for (const oge of anahtarlar ?? []) {
      const son = sirali[sirali.length - 1];
      if (!son || son.grup !== oge.grup) {
        sirali.push({ grup: oge.grup, ogeler: [oge] });
      } else {
        son.ogeler.push(oge);
      }
    }
    return sirali;
  }, [anahtarlar]);

  const anahtarDegistir = async (kod: string, value: boolean) => {
    const onceki = anahtarlar;
    setAnahtarlar((liste) =>
      (liste ?? []).map((oge) => (oge.kod === kod ? { ...oge, acik: value } : oge)),
    );
    setBusyKey(kod);
    try {
      await BildirimAnahtariniKaydet(kod, value);
    } catch (e) {
      setAnahtarlar(onceki);
      Alert.alert(
        t('ayarlar.bildirimler'),
        e instanceof Error ? e.message : t('ortak.kaydedilemedi'),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const degistir = async (key: PushTercihAnahtari, value: boolean) => {
    const onceki = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    setBusyKey(key);
    try {
      const guncel = await PushTercihiniKaydet(key, value);
      setPrefs(guncel);
      if (key === 'all_enabled') {
        await PushBildirimAyariniKaydet(value);
        if (value) void CihazPushTokeniniKaydet();
      }
    } catch (e) {
      setPrefs(onceki);
      Alert.alert(
        t('ayarlar.bildirimler'),
        e instanceof Error ? e.message : t('ortak.kaydedilemedi'),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const osIzinYonet = async () => {
    if (osIzin === 'granted') {
      await Linking.openSettings();
      return;
    }
    const ok = await BildirimIzniIste();
    await osIzinYenile();
    if (ok && prefs.all_enabled) void CihazPushTokeniniKaydet();
    if (!ok) {
      Alert.alert(t('bildirimAyar.osIzinBaslik'), t('bildirimAyar.osIzinRed'), [
        { text: t('ortak.iptal'), style: 'cancel' },
        {
          text: t('bildirimAyar.osAyarlar'),
          onPress: () => void Linking.openSettings(),
        },
      ]);
    }
  };

  const osDurumMetni =
    osIzin === 'granted'
      ? t('bildirimAyar.osIzinAcik')
      : osIzin === 'denied'
        ? t('bildirimAyar.osIzinKapali')
        : t('bildirimAyar.osIzinSor');

  const osIkonRengi =
    osIzin === 'granted' ? RenkTokenlari.success : RenkTokenlari.textDim;

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="bildirim-ayarlari">
        <EkranBasligi
          title={t('ayarlar.bildirimAyarlari')}
          subtitle={t('ayarlar.bildirimAyarAlt')}
          border
        />
        {yukleniyor ? (
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginTop: 40 }}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.aciklama}>
              {t('ayarlar.bildirimAyarAciklama')}
            </Text>

            <Text style={styles.bolum}>{t('bildirimAyar.bolumCihaz')}</Text>
            <View style={styles.liste}>
              <Pressable
                onPress={() => void osIzinYonet()}
                style={({ pressed }) => [
                  styles.satir,
                  styles.border,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <View style={[styles.ikonWrap, { backgroundColor: `${osIkonRengi}22` }]}>
                  <Ionicons
                    name={
                      osIzin === 'granted'
                        ? 'phone-portrait-outline'
                        : 'notifications-off-outline'
                    }
                    size={18}
                    color={osIkonRengi}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.baslik}>{t('bildirimAyar.osIzinBaslik')}</Text>
                  <Text style={styles.alt}>{osDurumMetni}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={RenkTokenlari.textDim}
                />
              </Pressable>
              <Pressable
                onPress={() => router.push('/ayarlar/kisiler-aramalar' as any)}
                style={({ pressed }) => [styles.satir, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <View style={styles.ikonWrap}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={RenkTokenlari.primarySoft}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.baslik}>{t('bildirimAyar.aramaTercih')}</Text>
                  <Text style={styles.alt}>{t('bildirimAyar.aramaTercihAlt')}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={RenkTokenlari.textDim}
                />
              </Pressable>
            </View>

            <Text style={styles.bolum}>{t('bildirimAyar.bolumKategori')}</Text>
            <View style={styles.liste}>
              <View style={[styles.satir, styles.border]}>
                <View style={[styles.ikonWrap, styles.ikonWrapAccent]}>
                  <Ionicons
                    name="notifications"
                    size={18}
                    color={RenkTokenlari.primarySoft}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.baslik}>{t('bildirimAyar.tumu')}</Text>
                  <Text style={styles.alt}>{t('bildirimAyar.tumuAlt')}</Text>
                </View>
                <Switch
                  value={prefs.all_enabled}
                  disabled={busyKey === 'all_enabled'}
                  onValueChange={(v) => void degistir('all_enabled', v)}
                  trackColor={{
                    true: RenkTokenlari.primarySoft,
                    false: RenkTokenlari.border,
                  }}
                />
              </View>
            </View>

            {anahtarlar ? (
              gruplar.map((grup) => {
                const etiket = GRUP_ETIKET[grup.grup];
                return (
                <View key={grup.grup}>
                  <Text style={styles.bolum}>
                    {etiket ? t(etiket) : grup.grup}
                  </Text>
                  <View style={styles.liste}>
                    {grup.ogeler.map((oge, index) => (
                      <View
                        key={oge.kod}
                        style={[
                          styles.satir,
                          index < grup.ogeler.length - 1 && styles.border,
                          !prefs.all_enabled && styles.soluk,
                        ]}
                      >
                        <View style={styles.ikonWrap}>
                          <Ionicons
                            name={GRUP_IKON[grup.grup] ?? 'notifications-outline'}
                            size={18}
                            color={RenkTokenlari.textMuted}
                          />
                        </View>
                        <View style={styles.copy}>
                          <Text style={styles.baslik}>{oge.baslik}</Text>
                          {oge.aciklama ? (
                            <Text style={styles.alt}>{oge.aciklama}</Text>
                          ) : null}
                        </View>
                        <Switch
                          value={oge.acik}
                          disabled={!prefs.all_enabled || busyKey === oge.kod}
                          onValueChange={(v) => void anahtarDegistir(oge.kod, v)}
                          trackColor={{
                            true: RenkTokenlari.primarySoft,
                            false: RenkTokenlari.border,
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </View>
                );
              })
            ) : (
              <View style={styles.liste}>
                {PUSH_TERCIH_KATALOGU.filter((item) => item.key !== 'all_enabled').map(
                  (item, index, liste) => {
                    const masterKapali = !prefs.all_enabled;
                    return (
                      <View
                        key={item.key}
                        style={[
                          styles.satir,
                          index < liste.length - 1 && styles.border,
                          masterKapali && styles.soluk,
                        ]}
                      >
                        <View style={styles.ikonWrap}>
                          <Ionicons
                            name={KATEGORI_IKON[item.key]}
                            size={18}
                            color={RenkTokenlari.textMuted}
                          />
                        </View>
                        <View style={styles.copy}>
                          <Text style={styles.baslik}>{item.baslik}</Text>
                          <Text style={styles.alt}>{item.alt}</Text>
                        </View>
                        <Switch
                          value={prefs[item.key]}
                          disabled={masterKapali || busyKey === item.key}
                          onValueChange={(v) => void degistir(item.key, v)}
                          trackColor={{
                            true: RenkTokenlari.primarySoft,
                            false: RenkTokenlari.border,
                          }}
                        />
                      </View>
                    );
                  },
                )}
              </View>
            )}

            {Platform.OS === 'ios' ? (
              <Text style={styles.dipnot}>{t('bildirimAyar.iosDipnot')}</Text>
            ) : (
              <Text style={styles.dipnot}>{t('bildirimAyar.androidDipnot')}</Text>
            )}
          </ScrollView>
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
    paddingTop: BoslukTokenlari.sm,
  },
  aciklama: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    lineHeight: 22,
  },
  bolum: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: BoslukTokenlari.sm,
    marginStart: 4,
  },
  liste: {
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    overflow: 'hidden',
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.78 },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  soluk: { opacity: 0.45 },
  ikonWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.chipFill,
  },
  ikonWrapAccent: {
    backgroundColor: `${RenkTokenlari.primarySoft}22`,
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 15,
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    letterSpacing: 0,
    lineHeight: 15,
  },
  dipnot: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    lineHeight: 16,
    letterSpacing: 0,
    paddingHorizontal: 4,
  },
});
