import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminSatinAlmaItirazKarar,
  AdminSatinAlmaItirazListele,
} from '../../src/moduller/cuzdan/itiraz/SatinAlmaItirazIslemleri';
import {
  ItirazDurumEtiket,
  ItirazNedenEtiket,
  type AdminSatinAlmaItiraz,
} from '../../src/moduller/cuzdan/itiraz/SatinAlmaItirazTipleri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Filtre = 'all' | 'pending' | 'approved' | 'rejected';

function tarihYazi(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function kisiAd(p?: AdminSatinAlmaItiraz['profile']) {
  if (!p) return '—';
  return p.display_name?.trim() || (p.username ? `@${p.username}` : '—');
}

function snapStr(snap: Record<string, unknown>, key: string): string {
  const v = snap?.[key];
  if (v == null) return '—';
  return String(v);
}

function tutarSnap(snap: Record<string, unknown>): string {
  const tryN = Number(snap?.amount_try);
  if (Number.isFinite(tryN) && tryN > 0) {
    return `${tryN.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₺`;
  }
  const usd = Number(snap?.amount_usd);
  if (Number.isFinite(usd) && usd > 0) return `$${usd.toFixed(2)}`;
  return '—';
}

export default function AdminSatinAlmaItirazlarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [liste, setListe] = useState<AdminSatinAlmaItiraz[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>('pending');
  const [acikId, setAcikId] = useState<string | null>(null);
  const [cozumNotu, setCozumNotu] = useState('');
  const [adminNot, setAdminNot] = useState('');
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const status = filtre === 'all' ? null : filtre;
      setListe(await AdminSatinAlmaItirazListele(status, 100));
    } catch (e) {
      Alert.alert(
        'İtirazlar',
        e instanceof Error ? e.message : 'Liste alınamadı',
      );
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, [filtre]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  const pendingSayisi = useMemo(
    () => liste.filter((x) => x.status === 'pending').length,
    [liste],
  );

  const kararVer = (row: AdminSatinAlmaItiraz, status: 'approved' | 'rejected') => {
    const baslik = status === 'approved' ? 'Onayla — geri dönüş' : 'Reddet';
    Alert.alert(
      baslik,
      status === 'approved'
        ? 'Kullanıcıya bildirim gider; geçmişte «Geri dönüş onaylandı» görünür.'
        : 'Kullanıcıya bildirim gider; geçmişte «İtiraz reddedildi» görünür.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: status === 'approved' ? 'Onayla' : 'Reddet',
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await AdminSatinAlmaItirazKarar({
                  id: row.id,
                  status,
                  adminNote: adminNot,
                  resolutionNote: cozumNotu,
                });
                setAcikId(null);
                setCozumNotu('');
                setAdminNot('');
                await yukle();
                Alert.alert('Kaydedildi', 'Kullanıcıya bildirim gönderildi.');
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'Karar kaydedilemedi',
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (!admin) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Satın alma itirazları"
        subtitle={`${liste.length} kayıt · ${pendingSayisi} bekleyen`}
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <View style={st.filtreRow}>
          {(
            [
              ['pending', 'Bekleyen'],
              ['approved', 'Onaylı'],
              ['rejected', 'Red'],
              ['all', 'Tümü'],
            ] as const
          ).map(([k, label]) => (
            <Pressable
              key={k}
              style={[st.filtreChip, filtre === k && st.filtreAktif]}
              onPress={() => setFiltre(k)}
            >
              <Text
                style={[st.filtreYazi, filtre === k && st.filtreYaziAktif]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {yukleniyor && liste.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        {!yukleniyor && liste.length === 0 ? (
          <Text style={AdminStil.bos}>Bu filtrede itiraz yok.</Text>
        ) : null}

        {liste.map((row) => {
          const acik = acikId === row.id;
          const snap = row.purchase_snapshot ?? {};
          return (
            <View key={row.id} style={[AdminStil.kart, acik && st.kartAcik]}>
              <Pressable
                style={AdminStil.satir}
                onPress={() => {
                  setAcikId(acik ? null : row.id);
                  setCozumNotu(row.resolution_note ?? '');
                  setAdminNot(row.admin_note ?? '');
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={st.profilSatir}>
                    {row.profile?.avatar_url ? (
                      <Image
                        source={{ uri: row.profile.avatar_url }}
                        style={st.avatar}
                      />
                    ) : (
                      <View style={[st.avatar, st.avatarBos]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={AdminStil.kartBaslik}>{kisiAd(row.profile)}</Text>
                      <Text style={AdminStil.kartAlt}>
                        @{row.profile?.username ?? '—'}
                        {row.profile?.public_user_id
                          ? ` · #${row.profile.public_user_id}`
                          : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={st.paket}>
                    {snapStr(snap, 'title')} · {tutarSnap(snap)}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    {row.purchase_kind === 'coin' ? 'Coin' : 'AI Müzik'} ·{' '}
                    {ItirazNedenEtiket(row.reason_code)} ·{' '}
                    {tarihYazi(row.created_at)}
                  </Text>
                </View>
                <View
                  style={[
                    st.durumRozet,
                    row.status === 'pending' && {
                      backgroundColor: RenkTokenlari.accent + '22',
                    },
                    row.status === 'approved' && {
                      backgroundColor: RenkTokenlari.mint + '22',
                    },
                    row.status === 'rejected' && {
                      backgroundColor: RenkTokenlari.danger + '18',
                    },
                  ]}
                >
                  <Text
                    style={[
                      st.durumYazi,
                      row.status === 'approved' && { color: RenkTokenlari.mint },
                      row.status === 'rejected' && {
                        color: RenkTokenlari.danger,
                      },
                      row.status === 'pending' && {
                        color: RenkTokenlari.accent,
                      },
                    ]}
                  >
                    {ItirazDurumEtiket(row.status)}
                  </Text>
                </View>
              </Pressable>

              {acik ? (
                <View style={{ gap: 10, marginTop: 8 }}>
                  <Text style={st.bolum}>İtiraz eden profil</Text>
                  <Text style={AdminStil.kartAlt}>
                    ID: {row.user_id}
                  </Text>
                  <Pressable
                    style={AdminStil.aksiyon}
                    onPress={() =>
                      router.push(`/admin/kullanicilar/${row.user_id}` as never)
                    }
                  >
                    <Text style={AdminStil.aksiyonYazi}>Kullanıcı dosyası →</Text>
                  </Pressable>

                  <Text style={st.bolum}>Paket detayı</Text>
                  <Text style={AdminStil.kartAlt}>
                    Tür: {row.purchase_kind} · Satın alma ID: {row.purchase_id}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    İçerik: {snapStr(snap, 'detail')}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    Kanal: {snapStr(snap, 'channel')} / {snapStr(snap, 'store')}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    Ödeme durumu: {snapStr(snap, 'status')}
                  </Text>
                  {snap.provider_tx_id || snap.transaction_id ? (
                    <Text style={AdminStil.kartAlt}>
                      Tx:{' '}
                      {String(
                        snap.provider_tx_id ?? snap.transaction_id ?? '',
                      )}
                    </Text>
                  ) : null}

                  <Text style={st.bolum}>Kullanıcı itirazı</Text>
                  <Text style={AdminStil.kartAlt}>
                    Neden: {ItirazNedenEtiket(row.reason_code)}
                  </Text>
                  {row.user_note ? (
                    <Text style={AdminStil.kartAlt}>Not: {row.user_note}</Text>
                  ) : (
                    <Text style={AdminStil.kartAlt}>Not yok</Text>
                  )}

                  {row.status === 'pending' ? (
                    <>
                      <Text style={st.bolum}>Kullanıcıya görünen yanıt</Text>
                      <TextInput
                        style={AdminStil.input}
                        value={cozumNotu}
                        onChangeText={setCozumNotu}
                        placeholder="Geri dönüş / karar metni (bildirimde de gider)"
                        placeholderTextColor={RenkTokenlari.textDim}
                        multiline
                      />
                      <Text style={st.bolum}>Dahili admin notu</Text>
                      <TextInput
                        style={AdminStil.input}
                        value={adminNot}
                        onChangeText={setAdminNot}
                        placeholder="Sadece admin paneli"
                        placeholderTextColor={RenkTokenlari.textDim}
                        multiline
                      />
                      <View style={AdminStil.aksiyonSatir}>
                        <Pressable
                          style={[
                            AdminStil.aksiyon,
                            {
                              backgroundColor: RenkTokenlari.mint,
                              borderColor: RenkTokenlari.mint,
                            },
                          ]}
                          disabled={busy}
                          onPress={() => kararVer(row, 'approved')}
                        >
                          <Text
                            style={[
                              AdminStil.aksiyonYazi,
                              { color: RenkTokenlari.bg, fontWeight: '800' },
                            ]}
                          >
                            Onayla (geri dönüş)
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            AdminStil.aksiyon,
                            {
                              backgroundColor: RenkTokenlari.danger + '22',
                              borderColor: RenkTokenlari.danger,
                            },
                          ]}
                          disabled={busy}
                          onPress={() => kararVer(row, 'rejected')}
                        >
                          <Text
                            style={[
                              AdminStil.aksiyonYazi,
                              { color: RenkTokenlari.danger, fontWeight: '800' },
                            ]}
                          >
                            Reddet
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      {row.resolution_note ? (
                        <Text style={AdminStil.kartAlt}>
                          Yanıt: {row.resolution_note}
                        </Text>
                      ) : null}
                      {row.admin_note ? (
                        <Text style={AdminStil.kartAlt}>
                          Admin notu: {row.admin_note}
                        </Text>
                      ) : null}
                      <Text style={AdminStil.kartAlt}>
                        Karar: {tarihYazi(row.reviewed_at)}
                        {row.reviewer
                          ? ` · ${kisiAd(row.reviewer as AdminSatinAlmaItiraz['profile'])}`
                          : ''}
                      </Text>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  filtreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filtreChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  filtreAktif: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: RenkTokenlari.primarySoft + '22',
  },
  filtreYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  filtreYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  kartAcik: {
    borderColor: RenkTokenlari.borderAccent,
  },
  profilSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarBos: {
    backgroundColor: RenkTokenlari.surface,
  },
  paket: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  durumRozet: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  durumYazi: {
    ...TipografiTokenlari.micro,
    fontWeight: '800',
    color: RenkTokenlari.textMuted,
  },
  bolum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
    marginTop: BoslukTokenlari.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
