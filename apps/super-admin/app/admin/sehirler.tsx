import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminSehirHaftalikEslestir,
  AdminSehirSezonOdulDagit,
} from '../../../../src/moduller/sehirler/islemler/SehirModernIslemleri';
import { AktifSehirSavaslariniGetir } from '../../../../src/moduller/sehir-savaslari/okuma/AktifSehirSavaslariniGetir';
import { AktifLigSezonunuGetir } from '../../../../src/moduller/sehir-ligi/okuma/SehirLigiSiralamasiniGetir';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

export default function AdminSehirlerEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [season, setSeason] = useState('—');
  const [battles, setBattles] = useState(0);
  const [live, setLive] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [s, b] = await Promise.all([
        AktifLigSezonunuGetir().catch(() => null),
        AktifSehirSavaslariniGetir().catch(() => []),
      ]);
      setSeason(s?.title ?? 'Aktif sezon yok');
      setBattles(b.length);
      setLive(b.filter((x) => x.status === 'live').length);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  if (!admin) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Şehir operasyon"
        subtitle="Savaş · sezon ödülü · seçim"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl refreshing={yukleniyor} onRefresh={() => void yukle()} />
        }
      >
        {yukleniyor ? <ActivityIndicator color={RenkTokenlari.accent} /> : null}

        <View style={AdminStil.kpiGrid}>
          <View style={AdminStil.kpi}>
            <Text style={AdminStil.kpiN}>{live}</Text>
            <Text style={AdminStil.kpiL}>Canlı savaş</Text>
          </View>
          <View style={AdminStil.kpi}>
            <Text style={AdminStil.kpiN}>{battles}</Text>
            <Text style={AdminStil.kpiL}>Aktif eşleşme</Text>
          </View>
        </View>

        <View style={AdminStil.kart}>
          <Text style={AdminStil.kartBaslik}>Sezon</Text>
          <Text style={AdminStil.kartAlt}>{season}</Text>
        </View>

        <Text style={AdminStil.sectionLabel}>Hızlı işlemler</Text>
        <View style={AdminStil.kart}>
          <Pressable
            style={[styles.btn, busy && { opacity: 0.5 }]}
            disabled={busy}
            onPress={() => {
              void (async () => {
                setBusy(true);
                const r = await AdminSehirHaftalikEslestir(48);
                setBusy(false);
                if (!r.ok) Alert.alert('Eşleştirme', r.hata ?? 'Başarısız');
                else {
                  Alert.alert('Tamam', `${r.created ?? 0} savaş açıldı (top güç).`);
                  await yukle();
                }
              })();
            }}
          >
            <Text style={styles.btnText}>Haftalık savaş eşleştir</Text>
            <Text style={styles.btnAlt}>En güçlü 20 şehirden komşu maçlar</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, busy && { opacity: 0.5 }]}
            disabled={busy}
            onPress={() => {
              Alert.alert(
                'Sezon ödülü',
                'Top 3 şehir liderlerine coin dağıtılsın mı?',
                [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Dağıt',
                    onPress: () => {
                      void (async () => {
                        setBusy(true);
                        const r = await AdminSehirSezonOdulDagit(3);
                        setBusy(false);
                        if (!r.ok) Alert.alert('Ödül', r.hata ?? 'Başarısız');
                        else
                          Alert.alert(
                            'Dağıtıldı',
                            `${r.distributed_to_leaders ?? 0} lidere ödül yazıldı.`,
                          );
                      })();
                    },
                  },
                ],
              );
            }}
          >
            <Text style={styles.btnText}>Sezon ödülü dağıt</Text>
            <Text style={styles.btnAlt}>1./2./3. şehir liderine coin</Text>
          </Pressable>

          <Pressable
            style={styles.btn}
            onPress={() => router.push('/admin/sehir-secim' as any)}
          >
            <Text style={styles.btnText}>Seçim yönetimi</Text>
            <Text style={styles.btnAlt}>Adaylık · oylama · sonuç</Text>
          </Pressable>

          <Pressable style={styles.btn} onPress={() => router.push('/sehir' as any)}>
            <Text style={styles.btnText}>Kullanıcı şehir hub’ı</Text>
            <Text style={styles.btnAlt}>Önizleme</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
    gap: 2,
  },
  btnText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  btnAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
});
