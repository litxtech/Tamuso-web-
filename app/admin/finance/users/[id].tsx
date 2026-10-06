import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { AdminFinanceUserProfileGetir } from '../../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceCoin,
  FinanceKpiKart,
  FinanceNav,
  FinanceTry,
} from '../../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { AdminKullaniciCoinPaneli } from '../../../../src/moduller/admin/bilesenler/AdminKullaniciCoinPaneli';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

export default function FinanceUserDetailEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [data, setData] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    setHata(null);
    try {
      setData(await AdminFinanceUserProfileGetir(String(id)));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
      setData(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

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
  const p = data?.profile;
  const recon = data?.reconciliation;
  const matched = recon?.status === 'MATCHED';

  return (
    <Screen>
      <EkranBasligi
        title={p?.display_name ?? 'Kullanıcı'}
        subtitle={p?.username ? `@${p.username}` : 'Finans profili'}
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && !data ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <>
            <View style={AdminStil.kpiGrid}>
              <FinanceKpiKart label="Güncel coin" value={FinanceCoin(p?.current_coin)} />
              <FinanceKpiKart label="Elmas" value={FinanceCoin(p?.current_diamonds)} />
              <FinanceKpiKart label="Satın alınan" value={FinanceCoin(p?.coin_purchased)} />
              <FinanceKpiKart label="Harcanan" value={FinanceCoin(p?.coin_spent)} />
              <FinanceKpiKart label="Gönderilen" value={FinanceCoin(p?.coin_sent)} />
              <FinanceKpiKart label="Creator kazancı" value={FinanceTry(p?.creator_earnings_try)} />
            </View>

            {id ? (
              <AdminKullaniciCoinPaneli
                userRef={String(id)}
                baslik="Coin işle"
                alt="Yükle · eksilt · ceza (sunucu)"
                onBasarili={() => void yukle()}
              />
            ) : null}

            <Text style={AdminStil.sectionLabel}>Mutabakat</Text>
            <View
              style={[
                AdminStil.kart,
                {
                  borderColor: matched ? RenkTokenlari.mint : RenkTokenlari.danger,
                },
              ]}
            >
              <Text style={AdminStil.kartBaslik}>
                {matched ? 'Eşleşti' : 'Uyuşmazlık'}
              </Text>
              <Text style={AdminStil.kartAlt}>
                Cüzdan {FinanceCoin(recon?.wallet_balance)} · Ledger{' '}
                {FinanceCoin(recon?.ledger_derived_balance)}
              </Text>
            </View>

            {p?.agency_name ? (
              <Text style={AdminStil.kartAlt}>Ajans: {p.agency_name}</Text>
            ) : null}

            <Text style={AdminStil.sectionLabel}>Hareket geçmişi</Text>
            {(data?.timeline ?? []).map((t: any) => (
              <View key={t.transaction_id} style={AdminStil.kart}>
                <Text style={AdminStil.kartBaslik}>
                  {t.type ?? '—'} · {t.currency ?? 'coins'}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Δ {FinanceCoin(t.amount)} · {FinanceCoin(t.before_balance)} →{' '}
                  {FinanceCoin(t.after_balance)}
                </Text>
                <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
                  {t.ts ? new Date(t.ts).toLocaleString('tr-TR') : ''}
                  {t.source ? ` · ${t.source}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
