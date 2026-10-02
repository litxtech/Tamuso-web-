import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import {
  AdminDogrulamaDashboardGetir,
  AdminDogrulamaKuyrukGetir,
  type AdminBasvuruKuyrukSatir,
  type AdminDogrulamaDashboard,
  type AdminKycKuyrukSatir,
} from '../../../src/moduller/admin/dogrulama/AdminDogrulamaIslemleri';
import { BasvuruDurumEtiket } from '../../../src/moduller/admin/dogrulama/DogrulamaDurumEtiketleri';

type Sekme = 'agency' | 'user_kyc';

function kisaId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : '—';
}

function Kpi({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <View style={[AdminStil.kart, { flex: 1, minWidth: '45%', paddingVertical: 12 }]}>
      <Text style={{ color: tint ?? RenkTokenlari.primarySoft, fontSize: 22, fontWeight: '700' }}>
        {value}
      </Text>
      <Text style={{ color: RenkTokenlari.textDim, fontSize: 12, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

export default function AdminDogrulamaMerkezi() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [sekme, setSekme] = useState<Sekme>('agency');
  const [dash, setDash] = useState<AdminDogrulamaDashboard | null>(null);
  const [liste, setListe] = useState<(AdminBasvuruKuyrukSatir | AdminKycKuyrukSatir)[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [d, q] = await Promise.all([
        AdminDogrulamaDashboardGetir(),
        AdminDogrulamaKuyrukGetir({ kind: sekme, limit: 60 }),
      ]);
      setDash(d);
      setListe(q);
    } catch (e) {
      Alert.alert('Doğrulama', e instanceof Error ? e.message : 'Yüklenemedi');
      setListe([]);
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

  if (!admin) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Doğrulama Merkezi"
        subtitle="Ajans KYC/KYB · kullanıcı doğrulama · inceleme kuyruğu"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        {dash ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <Kpi label="Bekleyen başvuru" value={dash.pending_applications} />
            <Kpi label="Bugün" value={dash.today} />
            <Kpi label="İncelemede" value={dash.in_review} tint={RenkTokenlari.accent} />
            <Kpi label="Belge bekleyen" value={dash.awaiting_docs} />
            <Kpi label="Doğrulanan" value={dash.verified} tint={RenkTokenlari.mint} />
            <Kpi label="Reddedilen" value={dash.rejected} tint={RenkTokenlari.danger} />
            <Kpi label="Süresi dolacak" value={dash.expiring_docs} />
            <Kpi label="Yüksek risk" value={dash.high_risk} tint={RenkTokenlari.danger} />
            <Kpi label="Cüzdan KYC bekleyen" value={dash.pending_kyc} />
          </View>
        ) : yukleniyor ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {(
            [
              ['agency', 'Ajans doğrulamaları'],
              ['user_kyc', 'Kullanıcı doğrulamaları'],
            ] as const
          ).map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => setSekme(k)}
              style={[
                AdminStil.kart,
                {
                  flex: 1,
                  paddingVertical: 10,
                  borderColor: sekme === k ? RenkTokenlari.primarySoft : 'transparent',
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={{
                  color: sekme === k ? RenkTokenlari.primarySoft : RenkTokenlari.text,
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[AdminStil.kart, { marginBottom: 12 }]}
          onPress={() => router.push('/admin/kyc' as any)}
        >
          <Text style={{ color: RenkTokenlari.text, fontWeight: '600' }}>
            Klasik cüzdan KYC kuyruğu →
          </Text>
          <Text style={{ color: RenkTokenlari.textDim, fontSize: 12, marginTop: 4 }}>
            Trade/cüzdan kimlik onayı ayrı akış olarak korunur
          </Text>
        </Pressable>

        {liste.map((row) => {
          if (sekme === 'user_kyc') {
            const r = row as AdminKycKuyrukSatir;
            return (
              <Pressable
                key={r.id}
                style={[AdminStil.kart, { marginBottom: 8 }]}
                onPress={() => router.push(`/admin/kyc/${r.id}` as any)}
              >
                <Text style={{ color: RenkTokenlari.text, fontWeight: '600' }}>
                  {r.display_name ?? r.public_user_id ?? kisaId(r.user_id)}
                </Text>
                <Text style={{ color: RenkTokenlari.textDim, fontSize: 12, marginTop: 4 }}>
                  {r.doc_type} · {BasvuruDurumEtiket(r.status)}
                </Text>
              </Pressable>
            );
          }
          const r = row as AdminBasvuruKuyrukSatir;
          return (
            <Pressable
              key={r.id}
              style={[AdminStil.kart, { marginBottom: 8 }]}
              onPress={() => router.push(`/admin/dogrulama/${r.id}` as any)}
            >
              <Text style={{ color: RenkTokenlari.text, fontWeight: '600' }}>{r.agency_name}</Text>
              <Text style={{ color: RenkTokenlari.textDim, fontSize: 12, marginTop: 4 }}>
                {r.agency_type ?? '—'} · {r.country ?? '—'} · {BasvuruDurumEtiket(r.status)}
                {r.risk_level && r.risk_level !== 'LOW' ? ` · Risk ${r.risk_level}` : ''}
              </Text>
              <Text style={{ color: RenkTokenlari.textMuted, fontSize: 11, marginTop: 2 }}>
                {r.applicant_name ?? r.applicant_public_id ?? kisaId(r.applicant_id)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
