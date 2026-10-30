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
  AdminCocukKorumaListesi,
  type CocukKorumaKarar,
  type CocukKorumaKayit,
} from '../../../../src/moduller/cocuk-koruma/islemler/CocukKorumaIslemleri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Sekme = 'approved' | 'declined';

function kisiAd(r: CocukKorumaKayit): string {
  return (
    r.display_name_snapshot?.trim() ||
    r.display_name?.trim() ||
    (r.username_snapshot ? `@${r.username_snapshot}` : null) ||
    (r.username ? `@${r.username}` : null) ||
    r.public_user_id_snapshot ||
    r.user_id.slice(0, 8)
  );
}

function tarihKisa(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export default function AdminCocukKorumaEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [sekme, setSekme] = useState<Sekme>('declined');
  const [rows, setRows] = useState<CocukKorumaKayit[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [declinedCount, setDeclinedCount] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const data = await AdminCocukKorumaListesi(sekme as CocukKorumaKarar, 300);
      setRows(data.rows);
      setApprovedCount(data.approved_count);
      setDeclinedCount(data.declined_count);
    } catch (e) {
      Alert.alert(
        'Çocuk Koruma',
        e instanceof Error ? e.message : 'Liste alınamadı',
      );
      setRows([]);
    } finally {
      setYukleniyor(false);
    }
  }, [sekme]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  if (!admin) {
    return (
      <Screen>
        <EkranBasligi title="Çocuk Koruma" fallbackHref={'/admin' as any} />
        <Text style={AdminStil.bos}>Admin yetkisi gerekli</Text>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Çocuk Koruma"
        subtitle="Onay verenler · vermeyenler"
        fallbackHref={'/admin' as any}
      />

      <View style={styles.ozetSatir}>
        <View style={[styles.ozetKart, styles.ozetOnay]}>
          <Text style={styles.ozetSayi}>{approvedCount}</Text>
          <Text style={styles.ozetEtiket}>Onaylayan</Text>
        </View>
        <View style={[styles.ozetKart, styles.ozetRed]}>
          <Text style={styles.ozetSayi}>{declinedCount}</Text>
          <Text style={styles.ozetEtiket}>Vermeyen</Text>
        </View>
      </View>

      <View style={styles.filtreSatir}>
        {(
          [
            { kod: 'declined' as const, etiket: 'Vermeyenler' },
            { kod: 'approved' as const, etiket: 'Onaylayanlar' },
          ] as const
        ).map((f) => (
          <Pressable
            key={f.kod}
            style={[styles.chip, sekme === f.kod && styles.chipAktif]}
            onPress={() => setSekme(f.kod)}
          >
            <Text
              style={[styles.chipYazi, sekme === f.kod && styles.chipYaziAktif]}
            >
              {f.etiket}
            </Text>
          </Pressable>
        ))}
      </View>

      {yukleniyor && rows.length === 0 ? (
        <ActivityIndicator
          color={RenkTokenlari.primary}
          style={{ marginTop: 24 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={AdminStil.content}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={() => void yukle()}
            />
          }
        >
          {rows.length === 0 ? (
            <Text style={AdminStil.bos}>Kayıt yok</Text>
          ) : (
            rows.map((r) => (
              <Pressable
                key={r.id}
                style={[
                  AdminStil.kart,
                  r.decision === 'declined' && styles.kartRed,
                ]}
                onPress={() =>
                  router.push(`/admin/kullanicilar/${r.user_id}` as any)
                }
              >
                <Text style={AdminStil.kartBaslik}>{kisiAd(r)}</Text>
                <Text style={AdminStil.kartAlt}>
                  {r.decision === 'approved' ? 'Onayladı' : 'Onay vermedi'} ·{' '}
                  {tarihKisa(r.decided_at)}
                </Text>
                {r.deleted_at ? (
                  <Text style={[AdminStil.kartAlt, { color: RenkTokenlari.danger }]}>
                    Hesap kapatıldı
                  </Text>
                ) : null}
                {r.locale || r.app_version ? (
                  <Text style={AdminStil.kartAlt}>
                    {[r.locale, r.app_version].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ozetSatir: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.md,
    marginBottom: BoslukTokenlari.sm,
  },
  ozetKart: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  ozetOnay: {
    borderColor: 'rgba(125,255,179,0.35)',
  },
  ozetRed: {
    borderColor: 'rgba(255,100,100,0.35)',
  },
  ozetSayi: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  ozetEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 2,
  },
  filtreSatir: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.md,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  chipAktif: {
    borderColor: RenkTokenlari.primary,
    backgroundColor: 'rgba(125,255,179,0.12)',
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  chipYaziAktif: {
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  kartRed: {
    borderColor: 'rgba(255,100,100,0.35)',
  },
});
