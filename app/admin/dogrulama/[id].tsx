import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import {
  AdminBasvuruBelgeleriGetir,
  AdminBasvuruDetayGetir,
  AdminBasvuruGecis,
  AdminBasvuruProfilGetir,
  AdminBelgeGoruntulePath,
  AdminBelgeIncele,
  AdminBilesenOnayla,
  AdminManuelOverride,
  RED_NEDENLERI,
} from '../../../src/moduller/admin/dogrulama/AdminDogrulamaIslemleri';
import {
  BasvuruDurumEtiket,
  BelgeDurumEtiket,
} from '../../../src/moduller/admin/dogrulama/DogrulamaDurumEtiketleri';
import * as Linking from 'expo-linking';

type Profil = {
  id: string;
  overall_status: string;
  progress_pct: number;
  identity_verified: boolean;
  address_verified: boolean;
  company_verified: boolean;
  authorized_person_verified: boolean;
  extra_docs_reviewed: boolean;
  payment_account_verified: boolean;
  contract_accepted: boolean;
  row_version: number;
};

export default function AdminDogrulamaDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [basvuru, setBasvuru] = useState<Record<string, unknown> | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [belgeler, setBelgeler] = useState<Record<string, unknown>[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [userMsg, setUserMsg] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [checks, setChecks] = useState({
    identity: false,
    address: false,
    company: false,
    authorizedPerson: false,
    extraDocs: false,
    paymentAccount: false,
    contract: false,
  });

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [b, p, d] = await Promise.all([
        AdminBasvuruDetayGetir(id),
        AdminBasvuruProfilGetir(id),
        AdminBasvuruBelgeleriGetir(id),
      ]);
      setBasvuru(b);
      setProfil(p as Profil | null);
      setBelgeler(d as Record<string, unknown>[]);
      if (p) {
        setChecks({
          identity: !!(p as Profil).identity_verified,
          address: !!(p as Profil).address_verified,
          company: !!(p as Profil).company_verified,
          authorizedPerson: !!(p as Profil).authorized_person_verified,
          extraDocs: !!(p as Profil).extra_docs_reviewed,
          paymentAccount: !!(p as Profil).payment_account_verified,
          contract: !!(p as Profil).contract_accepted,
        });
      }
    } catch (e) {
      Alert.alert('Doğrulama', e instanceof Error ? e.message : 'Yüklenemedi');
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

  const gecis = async (newStatus: string) => {
    if (!basvuru?.id) return;
    try {
      await AdminBasvuruGecis({
        applicationId: String(basvuru.id),
        newStatus,
        rowVersion: Number(basvuru.row_version ?? 1),
        userMessage: userMsg || undefined,
        note: internalNote || undefined,
        assignSelf: true,
      });
      Alert.alert('Tamam', `Durum: ${BasvuruDurumEtiket(newStatus)}`);
      void yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız');
    }
  };

  const bilesenKaydet = async () => {
    if (!profil?.id) {
      Alert.alert('Profil yok', 'Önce doğrulama profili oluşmalı');
      return;
    }
    try {
      await AdminBilesenOnayla({
        profileId: profil.id,
        ...checks,
        rowVersion: profil.row_version,
      });
      Alert.alert('Kaydedildi', 'Bileşen doğrulamaları güncellendi');
      void yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    }
  };

  const override = async () => {
    if (!overrideReason.trim() || !internalNote.trim()) {
      Alert.alert('Zorunlu', 'Override için reason ve internal note gerekli');
      return;
    }
    try {
      await AdminManuelOverride({
        subjectType: 'APPLICATION',
        subjectId: String(id),
        newStatus: 'VERIFIED',
        reason: overrideReason.trim(),
        internalNote: internalNote.trim(),
      });
      Alert.alert('Override', 'Manuel override kaydedildi (audit)');
      void yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Override başarısız');
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={String(basvuru?.agency_name ?? 'Başvuru')}
        subtitle={BasvuruDurumEtiket(String(basvuru?.status ?? ''))}
        fallbackHref="/admin/dogrulama"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        {yukleniyor && !basvuru ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <>
            <View style={[AdminStil.kart, { marginBottom: 12 }]}>
              <Text style={{ color: RenkTokenlari.textDim, fontSize: 12 }}>Tür / ülke</Text>
              <Text style={{ color: RenkTokenlari.text, fontWeight: '600' }}>
                {String(basvuru?.agency_type ?? '—')} · {String(basvuru?.country ?? '—')}{' '}
                {basvuru?.city ? `/ ${String(basvuru.city)}` : ''}
              </Text>
              <Text style={{ color: RenkTokenlari.textDim, fontSize: 12, marginTop: 8 }}>
                Yetkili
              </Text>
              <Text style={{ color: RenkTokenlari.text }}>
                {String(basvuru?.contact_first_name ?? '')}{' '}
                {String(basvuru?.contact_last_name ?? '')}
              </Text>
              <Text style={{ color: RenkTokenlari.textDim, marginTop: 4 }}>
                {String(basvuru?.email ?? '')} · {String(basvuru?.phone ?? '')}
              </Text>
              {basvuru?.why_tamuso ? (
                <Text style={{ color: RenkTokenlari.text, marginTop: 8 }}>
                  {String(basvuru.why_tamuso)}
                </Text>
              ) : null}
              {basvuru?.description ? (
                <Text style={{ color: RenkTokenlari.textDim, marginTop: 8 }}>
                  {String(basvuru.description)}
                </Text>
              ) : null}
            </View>

            <Text style={{ color: RenkTokenlari.text, fontWeight: '700', marginBottom: 8 }}>
              Durum geçişleri
            </Text>
            <TextInput
              style={[AdminStil.kart, { marginBottom: 8, color: RenkTokenlari.text }]}
              placeholder="Kullanıcıya mesaj (internal değil)"
              placeholderTextColor={RenkTokenlari.textMuted}
              value={userMsg}
              onChangeText={setUserMsg}
            />
            <TextInput
              style={[AdminStil.kart, { marginBottom: 8, color: RenkTokenlari.text }]}
              placeholder="Internal admin notu"
              placeholderTextColor={RenkTokenlari.textMuted}
              value={internalNote}
              onChangeText={setInternalNote}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {[
                ['UNDER_REVIEW', 'İncelemeye al'],
                ['MORE_INFORMATION_REQUIRED', 'Ek bilgi iste'],
                ['PRE_APPROVED', 'Ön onay → doğrulama'],
                ['VERIFIED', 'Doğrulandı'],
                ['APPROVED', 'Onayla / aktifleştir'],
                ['REJECTED', 'Reddet'],
              ].map(([st, label]) => (
                <Pressable
                  key={st}
                  style={[AdminStil.kart, { paddingVertical: 10, paddingHorizontal: 12 }]}
                  onPress={() => void gecis(st)}
                >
                  <Text style={{ color: RenkTokenlari.primarySoft, fontSize: 12 }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: RenkTokenlari.text, fontWeight: '700', marginBottom: 8 }}>
              Bileşen doğrulama (tek verified=true yok)
            </Text>
            {(
              [
                ['identity', 'Kimlik doğrulandı'],
                ['address', 'Adres doğrulandı'],
                ['company', 'Şirket doğrulandı'],
                ['authorizedPerson', 'Yetkili doğrulandı'],
                ['extraDocs', 'Ek belgeler incelendi'],
                ['paymentAccount', 'Ödeme hesabı doğrulandı'],
                ['contract', 'Ajans sözleşmesi kabul edildi'],
              ] as const
            ).map(([key, label]) => (
              <View
                key={key}
                style={[
                  AdminStil.kart,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    paddingVertical: 8,
                  },
                ]}
              >
                <Text style={{ color: RenkTokenlari.text, flex: 1 }}>{label}</Text>
                <Switch
                  value={checks[key]}
                  onValueChange={(v) => setChecks((c) => ({ ...c, [key]: v }))}
                />
              </View>
            ))}
            <Pressable style={[AdminStil.kart, { marginBottom: 16 }]} onPress={() => void bilesenKaydet()}>
              <Text style={{ color: RenkTokenlari.mint, fontWeight: '700', textAlign: 'center' }}>
                Bileşenleri kaydet
                {profil ? ` · %${profil.progress_pct}` : ''}
              </Text>
            </Pressable>

            <Text style={{ color: RenkTokenlari.text, fontWeight: '700', marginBottom: 8 }}>
              Belgeler
            </Text>
            {belgeler.length === 0 ? (
              <Text style={{ color: RenkTokenlari.textDim, marginBottom: 16 }}>
                Henüz belge yok (Aşama 1 belge istemez)
              </Text>
            ) : (
              belgeler.map((d) => (
                <View key={String(d.id)} style={[AdminStil.kart, { marginBottom: 8 }]}>
                  <Text style={{ color: RenkTokenlari.text, fontWeight: '600' }}>
                    {String(d.verification_type)} / {String(d.document_type)}
                  </Text>
                  <Text style={{ color: RenkTokenlari.textDim, fontSize: 12 }}>
                    {BelgeDurumEtiket(String(d.status))}
                    {d.document_number_masked ? ` · ${String(d.document_number_masked)}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <Pressable
                      onPress={async () => {
                        try {
                          const r = await AdminBelgeGoruntulePath(String(d.id));
                          if (r?.path) await Linking.openURL(r.path);
                        } catch (e) {
                          Alert.alert('Belge', e instanceof Error ? e.message : 'Açılamadı');
                        }
                      }}
                    >
                      <Text style={{ color: RenkTokenlari.primarySoft }}>Görüntüle</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void AdminBelgeIncele({
                          documentId: String(d.id),
                          decision: 'APPROVED',
                        }).then(yukle)
                      }
                    >
                      <Text style={{ color: RenkTokenlari.mint }}>Onayla</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'Red nedeni',
                          'Seçin',
                          RED_NEDENLERI.map((r) => ({
                            text: r.label,
                            onPress: () =>
                              void AdminBelgeIncele({
                                documentId: String(d.id),
                                decision: 'RESUBMISSION_REQUIRED',
                                rejectionReasonCode: r.code,
                                userMessage:
                                  userMsg ||
                                  'Gönderdiğiniz belge doğrulanamadı. Lütfen geçerli ve okunabilir bir belge yükleyin.',
                                internalNote: internalNote || undefined,
                              }).then(yukle),
                          })),
                        );
                      }}
                    >
                      <Text style={{ color: RenkTokenlari.danger }}>Yeniden iste</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            <Text style={{ color: RenkTokenlari.text, fontWeight: '700', marginVertical: 8 }}>
              Manuel override (SUPER_ADMIN)
            </Text>
            <TextInput
              style={[AdminStil.kart, { marginBottom: 8, color: RenkTokenlari.text }]}
              placeholder="Override reason (zorunlu)"
              placeholderTextColor={RenkTokenlari.textMuted}
              value={overrideReason}
              onChangeText={setOverrideReason}
            />
            <Pressable style={AdminStil.kart} onPress={() => void override()}>
              <Text style={{ color: RenkTokenlari.danger, fontWeight: '700', textAlign: 'center' }}>
                Manuel VERIFIED override (audit)
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
