import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import {
  AdminFinanceReportAttachStorage,
  AdminFinanceReportGet,
  AdminFinanceReportSignedUrlAl,
} from '../../../../src/moduller/admin/finance/AdminFinanceApi';
import { FinanceBelgesiOlustur } from '../../../../src/moduller/admin/finance/FinanceBelgesiOlustur';
import {
  FinanceCoin,
  FinanceNav,
  FinanceTry,
} from '../../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import {
  BelgePaylasDugmesi,
  BelgePaylasimPaneli,
} from '../../../../src/moduller/belge-paylasim/bilesenler/BelgePaylasimPaneli';
import { PdfDosyasiOlustur } from '../../../../src/moduller/belge-paylasim/BelgePaylasimIslemleri';
import type { BelgeIcerik } from '../../../../src/moduller/belge-paylasim/BelgeSablonlari';
import { supabase } from '../../../../src/lib/supabase';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

export default function FinanceReportJobEkrani() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [job, setJob] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [belge, setBelge] = useState<BelgeIcerik | null>(null);
  const [paylasAcik, setPaylasAcik] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!jobId) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await AdminFinanceReportGet(String(jobId));
      setJob(res?.job ?? null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
      setJob(null);
    } finally {
      setYukleniyor(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  const payload = job?.payload;
  const ov = payload?.overview?.kpis;
  const coin = payload?.coin_economy;
  const pnl = payload?.pnl?.current;

  const belgeIcerik = useMemo(() => {
    if (!job) return null;
    return FinanceBelgesiOlustur(job.report_type, job.payload, {
      reportId: job.report_id,
      generatedAt: job.ready_at || job.created_at,
    });
  }, [job]);

  const belgeAc = () => {
    if (!belgeIcerik) return;
    setBelge(belgeIcerik);
    setPaylasAcik(true);
  };

  const pdfYukle = async () => {
    if (!belgeIcerik || !jobId) return;
    setUploadBusy(true);
    try {
      const pdf = await PdfDosyasiOlustur(belgeIcerik);
      if (!pdf.ok || !pdf.uri) {
        Alert.alert('PDF', pdf.ok === false ? pdf.hata : 'PDF oluşmadı');
        return;
      }
      const path = `${jobId}/${job?.report_id || 'report'}.pdf`;
      const resp = await fetch(pdf.uri);
      const blob = await resp.blob();
      const { error } = await supabase.storage
        .from('finance-reports')
        .upload(path, blob, { contentType: 'application/pdf', upsert: true });
      if (error) throw new Error(error.message);
      await AdminFinanceReportAttachStorage(String(jobId), path);
      const url = await AdminFinanceReportSignedUrlAl(String(jobId), path);
      setSignedUrl(url);
      await yukle();
      Alert.alert('PDF', 'Depoya yüklendi');
    } catch (e) {
      Alert.alert('PDF', e instanceof Error ? e.message : 'Yükleme başarısız');
    } finally {
      setUploadBusy(false);
    }
  };

  const signedKopyala = async () => {
    try {
      let url = signedUrl;
      const path = job?.storage_path;
      if (!url && path && jobId) {
        url = await AdminFinanceReportSignedUrlAl(String(jobId), path);
        setSignedUrl(url);
      }
      if (!url) {
        Alert.alert('URL', 'Önce PDF yükleyin');
        return;
      }
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(url);
      Alert.alert('URL', 'İmzalı URL kopyalandı (TTL ~10dk)');
    } catch (e) {
      Alert.alert('URL', e instanceof Error ? e.message : 'Kopyalanamadı');
    }
  };

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi
        title={job?.report_id ?? 'Rapor'}
        subtitle={job?.report_type ?? 'Finans raporu'}
        right={<BelgePaylasDugmesi onPress={belgeAc} label="PDF / WA" />}
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && !job ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !job ? (
          <Text style={AdminStil.bos}>Rapor bulunamadı</Text>
        ) : (
          <>
            <View style={AdminStil.kart}>
              <Text style={AdminStil.kartBaslik}>
                {job.report_id} · {job.status}
              </Text>
              <Text style={AdminStil.kartAlt}>
                {job.created_at
                  ? new Date(job.created_at).toLocaleString('tr-TR')
                  : ''}
              </Text>
              {job.storage_path ? (
                <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
                  Depo: {job.storage_path}
                </Text>
              ) : null}
            </View>

            <Text style={AdminStil.sectionLabel}>Rapor özeti</Text>
            <View style={AdminStil.kart}>
              <Text style={AdminStil.kartAlt}>
                Satış {FinanceTry(ov?.total_coin_sales_try)} · Arz{' '}
                {FinanceCoin(coin?.user_coin_supply ?? ov?.user_coin_supply)}
              </Text>
              <Text style={AdminStil.kartAlt}>
                Gelir {FinanceTry(ov?.platform_revenue_try)} · Net{' '}
                {FinanceTry(ov?.platform_net_try ?? pnl?.net_operational_result_try)}
              </Text>
              <Text style={AdminStil.kartAlt}>
                Yükümlülük {FinanceTry(ov?.total_liability_try)} · Creator alacağı{' '}
                {FinanceTry(ov?.creator_payable_try)}
              </Text>
            </View>

            <View style={AdminStil.aksiyonSatir}>
              <Pressable style={AdminStil.aksiyon} onPress={belgeAc}>
                <Text style={AdminStil.aksiyonYazi}>Belge paylaş</Text>
              </Pressable>
              <Pressable
                style={AdminStil.aksiyon}
                onPress={() => void pdfYukle()}
                disabled={uploadBusy}
              >
                <Text style={AdminStil.aksiyonYazi}>
                  {uploadBusy ? 'Yükleniyor…' : 'PDF depola'}
                </Text>
              </Pressable>
              <Pressable style={AdminStil.aksiyon} onPress={() => void signedKopyala()}>
                <Text style={AdminStil.aksiyonYazi}>İmzalı URL kopyala</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <BelgePaylasimPaneli
        visible={paylasAcik}
        onKapat={() => setPaylasAcik(false)}
        icerik={belge}
      />
    </Screen>
  );
}
