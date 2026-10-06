import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { AdminFinanceOverviewGetir } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import type { FinanceOverview } from '../../../src/moduller/admin/finance/tipler';
import {
  FinanceCoin,
  FinanceDelta,
  FinanceKpiKart,
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { supabase } from '../../../src/lib/supabase';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

function olayTuruTr(t: string | null | undefined): string {
  switch (t) {
    case 'COIN_PURCHASE':
      return 'Coin satın alma';
    case 'GIFT_SENT':
      return 'Hediye';
    case 'REFUND':
      return 'İade';
    case 'PAYOUT':
      return 'Ödeme';
    default:
      return t || 'Hareket';
  }
}

function seviyeTr(s: string): string {
  if (s === 'danger') return 'Kritik';
  if (s === 'warning') return 'Uyarı';
  return 'Bilgi';
}

export default function FinanceOverviewEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setData(await AdminFinanceOverviewGetir());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
      setData(null);
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

  useEffect(() => {
    if (!admin) return;
    const ch = supabase
      .channel('finance-cc-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'finance_live_events' },
        () => void yukle(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [admin, yukle]);

  if (!admin) return null;
  const k = data?.kpis;
  const tah = data?.month_end_estimate;
  const canli = (data?.live_activity ?? []).slice(0, 8);
  const uyarilar = (data?.alerts ?? []).slice(0, 5);

  return (
    <Screen>
      <EkranBasligi title="Finans Merkezi" subtitle="Coin · gelir · borç · kâr · rapor" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />

        <View style={AdminStil.hero}>
          <Text style={AdminStil.heroEyebrow}>TAMUSO</Text>
          <Text style={AdminStil.heroTitle}>Finans özeti</Text>
          <Text style={AdminStil.heroAlt}>
            Rakamlar sunucudan gelir. Saat dilimi: İstanbul.
          </Text>
          {data?.generated_at ? (
            <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
              Güncelleme: {new Date(data.generated_at).toLocaleString('tr-TR')}
            </Text>
          ) : null}
        </View>

        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}

        {yukleniyor && !data ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <>
            <Text style={AdminStil.sectionLabel}>Ana göstergeler</Text>
            <View style={AdminStil.kpiGrid}>
              <FinanceKpiKart
                label="Toplam coin satışı"
                value={FinanceTry(k?.total_coin_sales_try)}
                delta={FinanceDelta(k?.month_delta_pct)}
                hint={`Bugün ${FinanceTry(k?.today_sales_try)}`}
                onPress={() => router.push('/admin/finance/sales')}
              />
              <FinanceKpiKart
                label="Bugün"
                value={FinanceTry(k?.today_sales_try)}
                delta={FinanceDelta(k?.today_delta_pct)}
                hint={`${FinanceCoin(k?.today_coins)} coin`}
                onPress={() => router.push('/admin/finance/sales')}
              />
              <FinanceKpiKart
                label="Bu ay"
                value={FinanceTry(k?.month_sales_try)}
                delta={FinanceDelta(k?.month_delta_pct)}
                hint={`${FinanceCoin(k?.month_coins)} coin`}
              />
              <FinanceKpiKart
                label="Platform geliri"
                value={FinanceTry(k?.platform_revenue_try)}
                tone="positive"
                onPress={() => router.push('/admin/finance/revenue')}
              />
              <FinanceKpiKart
                label="Platform gideri"
                value={FinanceTry(k?.platform_expense_try)}
                tone="negative"
                onPress={() => router.push('/admin/finance/expenses')}
              />
              <FinanceKpiKart
                label="Net sonuç"
                value={FinanceTry(k?.platform_net_try)}
                delta={FinanceDelta(k?.net_delta_pct)}
                tone={(k?.platform_net_try ?? 0) >= 0 ? 'positive' : 'negative'}
                onPress={() => router.push('/admin/finance/pnl')}
              />
              <FinanceKpiKart
                label="Toplam yükümlülük"
                value={FinanceTry(k?.total_liability_try)}
                tone="warning"
                hint={`Creator ${FinanceTry(k?.creator_payable_try)} · Ajans ${FinanceTry(k?.agency_payable_try)}`}
                onPress={() => router.push('/admin/finance/liabilities')}
              />
              <FinanceKpiKart
                label="Ay sonu net"
                value={FinanceTry(tah?.expected_net_try)}
                estimate
                hint={`Gelir ${FinanceTry(tah?.expected_revenue_try)}`}
                onPress={() => router.push('/admin/finance/forecast')}
              />
              <FinanceKpiKart
                label="Kullanıcı coin bakiyesi"
                value={FinanceCoin(k?.user_coin_supply)}
                hint="Cüzdanlardaki toplam coin"
                onPress={() => router.push('/admin/finance/coin-economy')}
              />
            </View>

            <Text style={AdminStil.sectionLabel}>Canlı hareketler</Text>
            {canli.length === 0 ? (
              <Text style={{ color: RenkTokenlari.textMuted }}>Henüz hareket yok</Text>
            ) : (
              canli.map((ev) => (
                <Pressable
                  key={ev.id}
                  style={AdminStil.kart}
                  onPress={() => router.push('/admin/finance/transactions')}
                >
                  <Text style={AdminStil.kartBaslik}>
                    {ev.title ?? '—'} · {olayTuruTr(ev.event_type)}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    {[
                      ev.subtitle,
                      ev.amount_coin != null ? `${FinanceCoin(ev.amount_coin)} coin` : null,
                      ev.amount_try != null ? FinanceTry(ev.amount_try) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
                    {new Date(ev.created_at).toLocaleString('tr-TR')}
                  </Text>
                </Pressable>
              ))
            )}

            <Text style={AdminStil.sectionLabel}>Uyarılar</Text>
            {uyarilar.length === 0 ? (
              <Text style={{ color: RenkTokenlari.textMuted }}>Açık uyarı yok</Text>
            ) : (
              uyarilar.map((a) => (
                <Pressable
                  key={a.id}
                  style={AdminStil.kart}
                  onPress={() => router.push('/admin/finance/alerts')}
                >
                  <Text style={AdminStil.kartBaslik}>
                    {seviyeTr(a.severity)} · {a.title}
                  </Text>
                  {a.body ? <Text style={AdminStil.kartAlt}>{a.body}</Text> : null}
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
