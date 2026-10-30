/**
 * Admin — Kişiler & Aramalar config (fiyat aralığı, komisyon, algoritma ağırlıkları)
 * Feature flag ON/OFF için /admin/ozellikler kullanılır.
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  AdminKisilerConfigGuncelle,
  KisilerConfigGetir,
} from '../../../../src/moduller/kisiler-kesif/islemler/KisilerKesifIslemleri';
import type { KisilerConfig } from '../../../../src/moduller/kisiler-kesif/tipler';

export default function AdminKisilerAramalar() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [cfg, setCfg] = useState<KisilerConfig | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [voiceMin, setVoiceMin] = useState('25');
  const [voiceMax, setVoiceMax] = useState('70');
  const [videoMin, setVideoMin] = useState('25');
  const [videoMax, setVideoMax] = useState('70');
  const [fee, setFee] = useState('0.20');
  const [freeGrantDk, setFreeGrantDk] = useState('5');
  const [wOnline, setWOnline] = useState('25');
  const [wPref, setWPref] = useState('40');
  const [wAvail, setWAvail] = useState('15');
  const [wNew, setWNew] = useState('12');
  const [wRepeat, setWRepeat] = useState('30');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const c = await KisilerConfigGetir();
      setCfg(c);
      setVoiceMin(String(c.voice_price_min));
      setVoiceMax(String(c.voice_price_max));
      setVideoMin(String(c.video_price_min));
      setVideoMax(String(c.video_price_max));
      setFee(String(c.platform_call_fee));
      setFreeGrantDk(String(Math.round((c.free_call_seconds_grant ?? 300) / 60)));
      setWOnline(String(c.weights?.online ?? 25));
      setWPref(String(c.weights?.preference ?? 40));
      setWAvail(String(c.weights?.availability ?? 15));
      setWNew(String(c.weights?.new_user ?? 12));
      setWRepeat(String(c.weights?.repeat_penalty ?? 30));
    } catch (e) {
      Alert.alert('Kişiler', e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  if (!admin) return null;

  const kaydet = async () => {
    try {
      const next = await AdminKisilerConfigGuncelle({
        voice_price_min: Number(voiceMin),
        voice_price_max: Number(voiceMax),
        video_price_min: Number(videoMin),
        video_price_max: Number(videoMax),
        platform_call_fee: Number(fee),
        free_call_seconds_grant: Math.max(0, Math.round(Number(freeGrantDk) * 60)),
        weights: {
          preference: Number(wPref),
          online: Number(wOnline),
          availability: Number(wAvail),
          new_user: Number(wNew),
          repeat_penalty: Number(wRepeat),
        },
      });
      setCfg(next);
      setFreeGrantDk(String(Math.round((next.free_call_seconds_grant ?? 300) / 60)));
      Alert.alert('Kaydedildi', 'Kişiler ekonomi/algoritma config güncellendi. Kullanıcı fiyatları yeni aralığa clamp edildi.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Kişiler & Aramalar"
        subtitle="Ekonomi · algoritma · bayraklar Özellikler’de"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl refreshing={yukleniyor} onRefresh={() => void yukle()} />
        }
      >
        {yukleniyor && !cfg ? (
          <ActivityIndicator color={RenkTokenlari.primary} />
        ) : (
          <>
            <Text style={styles.hint}>
              Master / alt bayraklar: Admin → Özellikler (people_*). Kill: kill_people_discovery.
              {'\n'}Algoritma: {cfg?.algorithm_version ?? 'v1'} · Billing: {cfg?.billing_mode}
              {'\n'}Effective master: {cfg?.people_discovery_enabled ? 'ON' : 'OFF'}
            </Text>

            <Text style={styles.bolum}>VOICE coin/dk</Text>
            <View style={styles.row}>
              <Alan label="Min" value={voiceMin} onChange={setVoiceMin} />
              <Alan label="Max" value={voiceMax} onChange={setVoiceMax} />
            </View>

            <Text style={styles.bolum}>VIDEO coin/dk</Text>
            <View style={styles.row}>
              <Alan label="Min" value={videoMin} onChange={setVideoMin} />
              <Alan label="Max" value={videoMax} onChange={setVideoMax} />
            </View>

            <Text style={styles.bolum}>Platform komisyon (0–1)</Text>
            <Alan label="Fee" value={fee} onChange={setFee} />

            <Text style={styles.bolum}>Ücretsiz arama hakkı (yeni hesap)</Text>
            <Alan label="Dakika" value={freeGrantDk} onChange={setFreeGrantDk} />

            <Text style={styles.bolum}>Algoritma ağırlıkları</Text>
            <View style={styles.row}>
              <Alan label="Pref" value={wPref} onChange={setWPref} />
              <Alan label="Online" value={wOnline} onChange={setWOnline} />
            </View>
            <View style={styles.row}>
              <Alan label="Avail" value={wAvail} onChange={setWAvail} />
              <Alan label="New" value={wNew} onChange={setWNew} />
            </View>
            <Alan label="Repeat penalty" value={wRepeat} onChange={setWRepeat} />

            <Pressable style={styles.btn} onPress={() => void kaydet()}>
              <Text style={styles.btnYazi}>Kaydet</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnAlt]}
              onPress={() => router.push('/admin/ozellikler' as any)}
            >
              <Text style={styles.btnYazi}>Özellik bayrakları →</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Alan({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.alan}>
      <Text style={styles.alanLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={styles.input}
        placeholderTextColor={RenkTokenlari.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: BoslukTokenlari.md,
  },
  bolum: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: BoslukTokenlari.md,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  alan: {
    flex: 1,
    marginBottom: 8,
  },
  alanLabel: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginBottom: 4,
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  btn: {
    marginTop: BoslukTokenlari.lg,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnAlt: {
    backgroundColor: RenkTokenlari.bgElevated,
    marginTop: 10,
  },
  btnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
