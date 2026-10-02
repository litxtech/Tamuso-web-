import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { BenimIslemHacmimiGetir, IslemHacmiAyarlariniKaydet } from '../../src/moduller/islem-hacmi/islemler/IslemHacmiApi';
import { IslemHacmiGorunurlukSheet } from '../../src/moduller/islem-hacmi/bilesenler/IslemHacmiGorunurlukSheet';
import { IslemHacmiBilgiSheet } from '../../src/moduller/islem-hacmi/bilesenler/IslemHacmiBilgiSheet';
import { IslemHacmiMetin } from '../../src/moduller/islem-hacmi/metinler/IslemHacmiMetinleri';
import { formatTierLabel, formatTryExact } from '../../src/moduller/islem-hacmi/utils/IslemHacmiFormat';
import type { BenimIslemHacmim, IslemHacmiGorunurluk } from '../../src/moduller/islem-hacmi/tipler';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { DIL_LOCALE_MAP } from '../../src/i18n/diller';
import { useCeviri } from '../../src/i18n/useCeviri';

export default function IslemHacmiDetayEkrani() {
  const { t, dil } = useCeviri();
  const m = IslemHacmiMetin(dil);
  const sayiLocale = DIL_LOCALE_MAP[dil];
  const [veri, setVeri] = useState<BenimIslemHacmim | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gorunurlukAcik, setGorunurlukAcik] = useState(false);
  const [bilgiAcik, setBilgiAcik] = useState(false);
  const [kaydediyor, setKaydediyor] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      setVeri(await BenimIslemHacmimiGetir());
    } catch {
      setVeri(null);
      Alert.alert(m.detayBaslik, m.yukleHata);
    } finally {
      setYukleniyor(false);
    }
  }, [m.detayBaslik, m.yukleHata]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const ayarKaydet = async (patch: Parameters<typeof IslemHacmiAyarlariniKaydet>[0]) => {
    setKaydediyor(true);
    const onceki = veri;
    if (veri) {
      setVeri({
        ...veri,
        visibility: patch.visibility ?? veri.visibility,
        show_badge: patch.show_badge ?? veri.show_badge,
        show_frame: patch.show_frame ?? veri.show_frame,
        show_effect: patch.show_effect ?? veri.show_effect,
        show_in_leaderboard: patch.show_in_leaderboard ?? veri.show_in_leaderboard,
        hidden_from_others: (patch.visibility ?? veri.visibility) === 'PRIVATE',
      });
    }
    const r = await IslemHacmiAyarlariniKaydet(patch);
    setKaydediyor(false);
    if (!r.ok) {
      setVeri(onceki);
      Alert.alert(m.detayBaslik, r.hata ?? m.kaydetHata);
      return;
    }
    void yukle();
  };

  const progress = Math.max(0, Math.min(1, Number(veri?.progress_01 ?? 0)));

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="islem-hacmi-detay">
        <EkranBasligi
          title={t('islemHacmi.baslik')}
          subtitle={m.detayAltBaslik}
          fallbackHref="/(tabs)/profile"
          right={
            <Pressable onPress={() => setBilgiAcik(true)} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={22} color={RenkTokenlari.text} />
            </Pressable>
          }
        />
        {yukleniyor && !veri ? (
          <ActivityIndicator color={RenkTokenlari.accent} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Text style={styles.heroEtiket}>{m.toplamEtiket}</Text>
              <Text style={styles.heroDeger}>
                {formatTryExact(veri?.amount_try ?? 0, sayiLocale)}
              </Text>
              {veri?.hidden_from_others ? (
                <View style={styles.gizliChip}>
                  <Ionicons name="lock-closed" size={12} color={RenkTokenlari.textMuted} />
                  <Text style={styles.gizliYazi}>{m.kartGizliSahibi}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.kart}>
              <Text style={styles.satirEtiket}>{m.kademeEtiket}</Text>
              <Text style={styles.satirDeger}>
                {veri?.tier
                  ? `${veri.tier.name} · ${formatTierLabel(veri.tier)}`
                  : m.kademeYok}
              </Text>
              {veri?.next_tier ? (
                <>
                  <Text style={[styles.satirEtiket, { marginTop: 12 }]}>
                    {m.sonrakiKademe}
                  </Text>
                  <Text style={styles.satirDeger}>
                    {veri.next_tier.name} · {formatTierLabel(veri.next_tier)}
                  </Text>
                  <Text style={styles.kalan}>
                    {m.kalanEtiket}: {formatTryExact(veri.remaining_try, sayiLocale)}
                  </Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
                  </View>
                </>
              ) : null}
              <Text style={[styles.kalan, { marginTop: 10 }]}>
                {m.uygunIslemEtiket}: {veri?.eligible_purchase_count ?? 0}
              </Text>
            </View>

            <Pressable
              style={styles.gorunurlukBtn}
              onPress={() => setGorunurlukAcik(true)}
              disabled={kaydediyor}
            >
              <Ionicons name="eye-outline" size={18} color={RenkTokenlari.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gorunurlukBaslik}>{m.gorunurlukBaslik}</Text>
                <Text style={styles.gorunurlukAlt}>{m.gorunurlukAlt}</Text>
              </View>
              <Text style={styles.gorunurlukDeger}>
                {veri?.visibility === 'FULL'
                  ? m.gorunurlukFull
                  : veri?.visibility === 'TIER_ONLY'
                    ? m.gorunurlukTier
                    : m.gorunurlukPrivate}
              </Text>
            </Pressable>

            <View style={styles.kart}>
              {(
                [
                  ['show_badge', m.rozetGoster],
                  ['show_frame', m.cerceveGoster],
                  ['show_effect', m.efektGoster],
                  ['show_in_leaderboard', m.liderlikGoster],
                ] as const
              ).map(([key, label], i, arr) => (
                <View
                  key={key}
                  style={[styles.switchSatir, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={styles.switchLabel}>{label}</Text>
                  <Switch
                    value={!!veri?.[key]}
                    onValueChange={(v) => void ayarKaydet({ [key]: v })}
                    disabled={kaydediyor || !veri}
                    trackColor={{
                      false: RenkTokenlari.surface,
                      true: RenkTokenlari.accent,
                    }}
                  />
                </View>
              ))}
            </View>

            {!veri?.amount_try ? (
              <Text style={styles.bos}>{m.bosDurum}</Text>
            ) : null}
          </ScrollView>
        )}

        <IslemHacmiGorunurlukSheet
          visible={gorunurlukAcik}
          secili={(veri?.visibility ?? 'TIER_ONLY') as IslemHacmiGorunurluk}
          onSec={(v) => {
            setGorunurlukAcik(false);
            void ayarKaydet({ visibility: v });
          }}
          onKapat={() => setGorunurlukAcik(false)}
        />
        <IslemHacmiBilgiSheet visible={bilgiAcik} onKapat={() => setBilgiAcik(false)} />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxl,
    gap: BoslukTokenlari.md,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: BoslukTokenlari.lg,
    gap: 6,
  },
  heroEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroDeger: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    fontWeight: '900',
  },
  gizliChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
  },
  gizliYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  kart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.md,
    padding: BoslukTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  satirEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  satirDeger: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    marginTop: 2,
  },
  kalan: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 6,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: RenkTokenlari.surface,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: RenkTokenlari.accent,
    borderRadius: 4,
  },
  gorunurlukBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.md,
    padding: BoslukTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  gorunurlukBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  gorunurlukAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  gorunurlukDeger: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '800',
  },
  switchSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  switchLabel: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    flex: 1,
    paddingRight: 12,
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    marginTop: BoslukTokenlari.md,
  },
});
