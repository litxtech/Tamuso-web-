import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminCuzdanTakasLimitAyarla,
  AdminCuzdanTakasLimitGetir,
  AdminTakasListesi,
  AdminTakasPlatformOnay,
  AdminTransferListesi,
  type AdminCuzdanTakasLimit,
  type AdminCuzdanTransfer,
  type AdminTakasTeklif,
} from '../../../../../src/moduller/admin/takas/AdminTakasIslemleri';
import { supabase } from '../../../../../src/lib/supabase';
import { TakasDekontUrl } from '../../../../../src/moduller/cuzdan/takas/CuzdanTakasIslemleri';
import { TAKAS_DURUM_ETIKET } from '../../../../../src/moduller/cuzdan/takas/CuzdanTakasTipleri';
import { ProfilMedyaBuyutucu } from '../../../../../src/moduller/kullanici-profili/bilesenler/ProfilMedyaBuyutucu';
import { AdminStil } from '../../../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { StyleSheet } from 'react-native';

type Sekme = 'takas' | 'transfer' | 'limit';

function ad(p?: { display_name?: string | null; username?: string | null } | null) {
  if (!p) return '—';
  return p.display_name?.trim() || (p.username ? `@${p.username}` : '—');
}

function sayi(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString('tr-TR');
}

function tarih(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR');
}

export default function AdminTakasEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [sekme, setSekme] = useState<Sekme>('takas');
  const [liste, setListe] = useState<AdminTakasTeklif[]>([]);
  const [transferler, setTransferler] = useState<AdminCuzdanTransfer[]>([]);
  const [limit, setLimit] = useState<AdminCuzdanTakasLimit | null>(null);
  const [transferLimitYazi, setTransferLimitYazi] = useState('3000000');
  const [takasLimitYazi, setTakasLimitYazi] = useState('3000000');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [buyutUri, setBuyutUri] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [t, tr, lim] = await Promise.all([
        AdminTakasListesi(100),
        AdminTransferListesi(100),
        AdminCuzdanTakasLimitGetir(),
      ]);
      setListe(t);
      setTransferler(tr);
      setLimit(lim);
      setTransferLimitYazi(String(lim.monthly_transfer_limit));
      setTakasLimitYazi(String(lim.monthly_trade_limit));
    } catch (e) {
      Alert.alert('Takas', e instanceof Error ? e.message : 'Yüklenemedi');
      setListe([]);
      setTransferler([]);
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

  const karar = (row: AdminTakasTeklif, accept: boolean) => {
    Alert.alert(
      accept ? 'Platform onayı' : 'Reddet',
      `${sayi(row.coins)} coin` +
        (row.satici_net_tl != null
          ? `\nSatıcı net: ${sayi(Number(row.satici_net_tl))} ₺\nPlatform: ${sayi(Number(row.platform_pay_tl ?? 0))} ₺`
          : ''),
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: accept ? 'Onayla' : 'Reddet',
          style: accept ? 'default' : 'destructive',
          onPress: () => {
            void (async () => {
              setBusyId(row.id);
              try {
                await AdminTakasPlatformOnay(row.id, accept);
                await yukle();
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'İşlem başarısız',
                );
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const dekontAc = async (path: string) => {
    const url = await TakasDekontUrl(path);
    if (!url) {
      Alert.alert('Dekont', 'Açılamadı');
      return;
    }
    setBuyutUri(url);
  };

  const limitKaydet = async () => {
    const tLim = Math.floor(Number(transferLimitYazi.replace(/\D/g, '')));
    const kLim = Math.floor(Number(takasLimitYazi.replace(/\D/g, '')));
    if (Number.isNaN(tLim) || Number.isNaN(kLim) || tLim < 0 || kLim < 0) {
      Alert.alert('Limit', 'Geçerli sayı gir (0 = limitsiz).');
      return;
    }
    setKaydediyor(true);
    try {
      const lim = await AdminCuzdanTakasLimitAyarla(tLim, kLim);
      setLimit(lim);
      setTransferLimitYazi(String(lim.monthly_transfer_limit));
      setTakasLimitYazi(String(lim.monthly_trade_limit));
      Alert.alert('Kaydedildi', 'Aylık limitler güncellendi.');
    } catch (e) {
      Alert.alert('Limit', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  };

  const bekleyen = liste.filter(
    (r) =>
      r.status === 'pending_platform' || r.status === 'receipt_overdue',
  ).length;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Coin takas & transfer"
        subtitle={`${bekleyen} onay · ${transferler.length} transfer kaydı`}
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <View style={styles.sekmeSatir}>
          {(
            [
              ['takas', 'Takaslar'],
              ['transfer', 'Transferler'],
              ['limit', 'Limitler'],
            ] as const
          ).map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => setSekme(k)}
              style={[styles.sekme, sekme === k && styles.sekmeAktif]}
            >
              <Text
                style={[
                  styles.sekmeYazi,
                  sekme === k && styles.sekmeYaziAktif,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {sekme === 'limit' ? (
          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartBaslik}>Aylık kullanıcı limitleri</Text>
            <Text style={AdminStil.kartAlt}>
              Varsayılan 3.000.000. 0 = limitsiz. Kullanıcı başına takvim ayı.
            </Text>
            <Text style={[AdminStil.kartAlt, { marginTop: 10 }]}>
              Aylık transfer limiti
            </Text>
            <TextInput
              value={transferLimitYazi}
              onChangeText={setTransferLimitYazi}
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Text style={AdminStil.kartAlt}>Aylık takas limiti</Text>
            <TextInput
              value={takasLimitYazi}
              onChangeText={setTakasLimitYazi}
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor={RenkTokenlari.textDim}
            />
            {limit?.updated_at ? (
              <Text style={AdminStil.kartAlt}>
                Son güncelleme: {tarih(limit.updated_at)}
              </Text>
            ) : null}
            <Pressable
              disabled={kaydediyor}
              onPress={() => void limitKaydet()}
              style={{ marginTop: 12 }}
            >
              <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.mint }]}>
                {kaydediyor ? 'Kaydediliyor…' : 'Limitleri kaydet'}
              </Text>
            </Pressable>
            <Pressable
              style={{ marginTop: 16 }}
              onPress={() => {
                Alert.alert(
                  'Yargıç ata',
                  'Bu admin hesabını platform yargıcı (mavi tik) yapmak ister misin? Mahkemelere bu hesap katılır.',
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'Beni yargıç yap',
                      onPress: () => {
                        void (async () => {
                          if (!profile?.id) return;
                          const { error } = await supabase.rpc(
                            'admin_platform_yargic_ata',
                            { p_user_id: profile.id },
                          );
                          if (error) {
                            Alert.alert('Yargıç', error.message);
                            return;
                          }
                          Alert.alert(
                            'Yargıç atandı',
                            'Hesabın mavi tikli platform yargıcı olarak işaretlendi.',
                          );
                        })();
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={[AdminStil.aksiyonYazi, { color: '#4DA3FF' }]}>
                Platform yargıcı ata (bu hesap)
              </Text>
            </Pressable>
          </View>
        ) : null}

        {sekme === 'transfer' ? (
          yukleniyor && !transferler.length ? (
            <ActivityIndicator color={RenkTokenlari.primarySoft} />
          ) : !transferler.length ? (
            <Text style={AdminStil.bos}>Transfer yok</Text>
          ) : (
            transferler.map((r) => (
              <View key={r.id} style={AdminStil.kart}>
                <View style={AdminStil.satir}>
                  <Text style={AdminStil.kartBaslik}>{sayi(r.coins)} coin</Text>
                  <View style={AdminStil.chip}>
                    <Text style={AdminStil.chipYazi}>{r.status}</Text>
                  </View>
                </View>
                <Text style={AdminStil.kartAlt}>
                  Gönderen: {ad(r.sender)}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Alıcı: {ad(r.receiver)} ({r.receiver_first_name}{' '}
                  {r.receiver_last_name})
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Cüzdan no: {r.receiver_wallet_number}
                </Text>
                {r.fail_reason ? (
                  <Text
                    style={[
                      AdminStil.kartAlt,
                      { color: RenkTokenlari.danger },
                    ]}
                  >
                    Hata: {r.fail_reason}
                  </Text>
                ) : null}
                <Text style={AdminStil.kartAlt}>{tarih(r.created_at)}</Text>
              </View>
            ))
          )
        ) : null}

        {sekme === 'takas' ? (
          yukleniyor && !liste.length ? (
            <ActivityIndicator color={RenkTokenlari.primarySoft} />
          ) : !liste.length ? (
            <Text style={AdminStil.bos}>Teklif yok</Text>
          ) : (
            liste.map((r) => {
              const alici =
                r.buyer_type === 'agency'
                  ? r.agency?.name || r.agency?.agency_public_id || 'Ajans'
                  : ad(r.buyer);
              const bekliyor =
                r.status === 'pending_platform' ||
                r.status === 'receipt_overdue';
              return (
                <View key={r.id} style={AdminStil.kart}>
                  <View style={AdminStil.satir}>
                    <Text style={AdminStil.kartBaslik}>
                      {sayi(r.coins)} coin
                    </Text>
                    <View style={AdminStil.chip}>
                      <Text style={AdminStil.chipYazi}>
                        {TAKAS_DURUM_ETIKET[r.status] ?? r.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={AdminStil.kartAlt}>
                    Satıcı: {ad(r.seller)}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    Alıcı ({r.buyer_type}): {alici}
                  </Text>
                  {r.katalog_tl != null || r.satici_net_tl != null ? (
                    <Text style={AdminStil.kartAlt}>
                      Katalog: {sayi(Number(r.katalog_tl ?? 0))} ₺ · Satıcı net:{' '}
                      {sayi(Number(r.satici_net_tl ?? 0))} ₺ · Platform:{' '}
                      {sayi(Number(r.platform_pay_tl ?? 0))} ₺
                      {r.odeme_pencere ? ` · ${r.odeme_pencere}` : ''}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        'Mahkeme kur',
                        'Platform olarak mahkeme açılıp yargıç gruba katılır.',
                        [
                          { text: 'Vazgeç', style: 'cancel' },
                          {
                            text: 'Kur',
                            onPress: () => {
                              void (async () => {
                                const { data, error } = await supabase.rpc(
                                  'takas_mahkeme_kur',
                                  {
                                    p_offer_id: r.id,
                                    p_reason:
                                      'Admin incelemesi: usulsüzlük / dolandırıcılık şüphesi',
                                  },
                                );
                                if (error) {
                                  Alert.alert('Mahkeme', error.message);
                                  return;
                                }
                                const threadId = (data as { thread_id?: string })
                                  ?.thread_id;
                                if (threadId) {
                                  router.push(`/mesaj/${threadId}` as any);
                                }
                              })();
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <Text
                      style={[AdminStil.aksiyonYazi, { color: '#4DA3FF' }]}
                    >
                      Mahkeme kur
                    </Text>
                  </Pressable>
                  <Text style={AdminStil.kartAlt}>
                    Oluşturma: {tarih(r.created_at)}
                  </Text>
                  {r.buyer_approved_at ? (
                    <Text style={AdminStil.kartAlt}>
                      Alıcı onay: {tarih(r.buyer_approved_at)}
                    </Text>
                  ) : null}
                  {r.payment_info_at ? (
                    <Text style={AdminStil.kartAlt}>
                      Ödeme formu: {tarih(r.payment_info_at)}
                    </Text>
                  ) : null}
                  {r.receipt_uploaded_at ? (
                    <Text style={AdminStil.kartAlt}>
                      Dekont: {tarih(r.receipt_uploaded_at)}
                    </Text>
                  ) : null}
                  {r.platform_approved_at ? (
                    <Text style={AdminStil.kartAlt}>
                      Platform: {tarih(r.platform_approved_at)}
                    </Text>
                  ) : null}
                  {r.completed_at ? (
                    <Text style={AdminStil.kartAlt}>
                      Tamamlandı: {tarih(r.completed_at)}
                    </Text>
                  ) : null}
                  {r.payment_coins_bought != null ? (
                    <Text style={AdminStil.kartAlt}>
                      Satın alınan: {r.payment_coins_bought} · Kaynak:{' '}
                      {r.payment_source ?? '—'}
                    </Text>
                  ) : null}
                  {r.receipt_deadline_at ? (
                    <Text style={AdminStil.kartAlt}>
                      Dekont son: {tarih(r.receipt_deadline_at)}
                    </Text>
                  ) : null}
                  {r.status === 'receipt_overdue' ? (
                    <Text
                      style={[
                        AdminStil.kartAlt,
                        { color: RenkTokenlari.danger, fontWeight: '700' },
                      ]}
                    >
                      Dekont süresi aşıldı — ajansa ciddi uyarı gönderildi
                    </Text>
                  ) : null}
                  {r.receipt_path ? (
                    <Pressable onPress={() => void dekontAc(r.receipt_path!)}>
                      <Text style={AdminStil.aksiyonYazi}>
                        Dekontu gör (uygulama içi)
                      </Text>
                    </Pressable>
                  ) : null}
                  {r.note ? (
                    <Text style={AdminStil.kartAlt} numberOfLines={2}>
                      {r.note}
                    </Text>
                  ) : null}
                  {bekliyor ? (
                    <View style={[AdminStil.satir, { marginTop: 10 }]}>
                      <Pressable
                        disabled={busyId === r.id}
                        onPress={() => karar(r, true)}
                      >
                        <Text
                          style={[
                            AdminStil.aksiyonYazi,
                            { color: RenkTokenlari.mint },
                          ]}
                        >
                          Platform onayla
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={busyId === r.id}
                        onPress={() => karar(r, false)}
                      >
                        <Text
                          style={[
                            AdminStil.aksiyonYazi,
                            { color: RenkTokenlari.danger },
                          ]}
                        >
                          Reddet / iade
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )
        ) : null}
      </ScrollView>
      <ProfilMedyaBuyutucu
        uri={buyutUri}
        onKapat={() => setBuyutUri(null)}
        tur="cover"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sekmeSatir: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
    marginBottom: BoslukTokenlari.xs,
  },
  sekme: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    alignItems: 'center',
  },
  sekmeAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  sekmeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  sekmeYaziAktif: {
    color: RenkTokenlari.text,
  },
  input: {
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.bgElevated,
    ...TipografiTokenlari.body,
  },
});
