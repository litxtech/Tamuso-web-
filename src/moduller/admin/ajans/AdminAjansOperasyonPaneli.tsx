import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  AJANS_OZELLIK_KILITLERI,
  AdminAjansCoinCezasi,
  AdminAjansCuzdanDondur,
  AdminAjansDavetIptal,
  AdminAjansDurumAyarla,
  AdminAjansKazancCezasi,
  AdminAjansOperasyonOzetiGetir,
  AdminAjansOzellikKilidi,
  AdminAjansSatisLinkiAktiflik,
  AdminAjansYaptirimKaldir,
  type AdminAjansOperasyonOzeti,
} from './AdminAjansOperasyonIslemleri';
import { AdminStil, SayiKisa } from '../bilesenler/AdminStil';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';

type Sekme = 'kontrol' | 'satis' | 'linkler' | 'davetler' | 'yaptirim';

function sayi(n: number) {
  return new Intl.NumberFormat('tr-TR').format(n);
}

export function AdminAjansOperasyonPaneli({
  agencyId,
}: {
  agencyId: string;
}) {
  const [sekme, setSekme] = useState<Sekme>('kontrol');
  const [ozet, setOzet] = useState<AdminAjansOperasyonOzeti | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sebep, setSebep] = useState('');
  const [penaltyPct, setPenaltyPct] = useState('0');
  const [coinCeza, setCoinCeza] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const d = await AdminAjansOperasyonOzetiGetir(agencyId);
      setOzet(d);
      setPenaltyPct(String(Number(d.locks?.earnings_penalty_pct ?? 0)));
      setAdminNote(String(d.locks?.admin_note ?? d.agency?.admin_note ?? ''));
    } catch (e) {
      Alert.alert(
        'Operasyon',
        e instanceof Error ? e.message : 'Özet alınamadı',
      );
    } finally {
      setYukleniyor(false);
    }
  }, [agencyId]);

  React.useEffect(() => {
    void yukle();
  }, [yukle]);

  const lockMap = useMemo(() => {
    const m = new Map<string, boolean>();
    const locks = ozet?.locks?.locks ?? {};
    for (const [k, v] of Object.entries(locks)) m.set(k, !!v);
    return m;
  }, [ozet]);

  const calistir = async (fn: () => Promise<void>, okMsg?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await yukle();
      if (okMsg) Alert.alert('Tamam', okMsg);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setBusy(false);
    }
  };

  if (yukleniyor && !ozet) {
    return (
      <ActivityIndicator
        color={RenkTokenlari.primarySoft}
        style={{ marginVertical: 24 }}
      />
    );
  }

  if (!ozet) return null;

  const frozen = !!ozet.locks?.wallet_frozen;
  const status = String(ozet.agency?.status ?? ozet.locks?.status ?? 'active');
  const trust = String(ozet.agency?.trust_tier ?? ozet.locks?.trust_tier ?? 'C');

  return (
    <View style={styles.wrap}>
      <Text style={AdminStil.sectionLabel}>Operasyon merkezi</Text>
      <Text style={styles.hint}>
        Anında uygulanır · build gerekmez · tüm yaptırımlar kayıtlı
      </Text>

      <View style={styles.sekmeSatir}>
        {(
          [
            ['kontrol', 'Kontrol'],
            ['satis', 'Satış'],
            ['linkler', 'Linkler'],
            ['davetler', 'Davet'],
            ['yaptirim', 'Ceza'],
          ] as const
        ).map(([k, l]) => (
          <Pressable
            key={k}
            style={[styles.sekme, sekme === k && styles.sekmeAktif]}
            onPress={() => setSekme(k)}
          >
            <Text style={[styles.sekmeYazi, sekme === k && styles.sekmeYaziAktif]}>
              {l}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={AdminStil.kart}>
        <Text style={AdminStil.kartBaslik}>Durum özeti</Text>
        <Text style={AdminStil.kartAlt}>
          {status.toUpperCase()} · Trust {trust}
          {frozen ? ' · CÜZDAN DONUK' : ''}
          {Number(ozet.locks?.earnings_penalty_pct ?? 0) > 0
            ? ` · Ceza %${ozet.locks?.earnings_penalty_pct}`
            : ''}
        </Text>
        <Text style={AdminStil.kartAlt}>
          Ciro {sayi(Number(ozet.ciro?.toplam_try ?? 0))} ₺ ·{' '}
          {sayi(Number(ozet.ciro?.toplam_coin ?? 0))} coin ·{' '}
          {Number(ozet.ciro?.islem_adet ?? 0)} işlem
        </Text>
      </View>

      <Text style={styles.label}>Yaptırım sebebi (işlemler için)</Text>
      <TextInput
        style={AdminStil.input}
        value={sebep}
        onChangeText={setSebep}
        placeholder="Örn: sahte dekont / kural ihlali"
        placeholderTextColor={RenkTokenlari.textDim}
      />

      {sekme === 'kontrol' ? (
        <>
          <Text style={AdminStil.sectionLabel}>Ajans durumu</Text>
          <View style={AdminStil.aksiyonSatir}>
            {(
              [
                ['active', 'Aktif'],
                ['suspended', 'Askıya al'],
                ['closed', 'Kapat'],
              ] as const
            ).map(([s, l]) => (
              <Pressable
                key={s}
                style={[
                  AdminStil.aksiyon,
                  status === s && styles.aksiyonAktif,
                  s === 'suspended' && styles.aksiyonUyari,
                ]}
                disabled={busy}
                onPress={() =>
                  void calistir(
                    () =>
                      AdminAjansDurumAyarla({
                        agencyId,
                        status: s,
                        reason: sebep || undefined,
                      }),
                    `Durum: ${l}`,
                  )
                }
              >
                <Text style={AdminStil.aksiyonYazi}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={AdminStil.sectionLabel}>Trust seviyesi</Text>
          <View style={AdminStil.aksiyonSatir}>
            {(['A', 'B', 'C', 'Restricted', 'Suspended'] as const).map((t) => (
              <Pressable
                key={t}
                style={[AdminStil.aksiyon, trust === t && styles.aksiyonAktif]}
                disabled={busy}
                onPress={() =>
                  void calistir(
                    () =>
                      AdminAjansDurumAyarla({
                        agencyId,
                        trustTier: t,
                        reason: sebep || undefined,
                      }),
                    `Trust: ${t}`,
                  )
                }
              >
                <Text style={AdminStil.aksiyonYazi}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={AdminStil.sectionLabel}>Özellik kilitleri</Text>
          {AJANS_OZELLIK_KILITLERI.map((f) => {
            const locked = lockMap.get(f.key) === true;
            return (
              <View key={f.key} style={styles.lockSatir}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockBaslik}>{f.label}</Text>
                  <Text style={styles.lockAlt}>{f.key}</Text>
                </View>
                <Switch
                  value={!locked}
                  disabled={busy}
                  onValueChange={(acik) =>
                    void calistir(() =>
                      AdminAjansOzellikKilidi({
                        agencyId,
                        featureKey: f.key,
                        locked: !acik,
                        reason: sebep || undefined,
                      }),
                    )
                  }
                  trackColor={{
                    false: RenkTokenlari.danger,
                    true: RenkTokenlari.mint,
                  }}
                />
              </View>
            );
          })}

          <Text style={AdminStil.sectionLabel}>Cüzdan</Text>
          <Pressable
            style={[AdminStil.kart, frozen && styles.kartUyari]}
            disabled={busy}
            onPress={() =>
              void calistir(
                () =>
                  AdminAjansCuzdanDondur({
                    agencyId,
                    frozen: !frozen,
                    reason: sebep || undefined,
                  }),
                frozen ? 'Cüzdan açıldı' : 'Cüzdan donduruldu',
              )
            }
          >
            <Text style={AdminStil.kartBaslik}>
              {frozen ? 'Cüzdan donuk — dokunarak aç' : 'Cüzdanı dondur'}
            </Text>
            <Text style={AdminStil.kartAlt}>
              {frozen
                ? ozet.locks?.wallet_frozen_reason || 'Transfer / satış ops kilitli'
                : 'Coin transfer, satış hediyesi ve finansal ops durur'}
            </Text>
          </Pressable>

          <Text style={AdminStil.sectionLabel}>Kazanç cezası</Text>
          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartBaslik}>Ceza oranı %</Text>
            <TextInput
              style={AdminStil.input}
              value={penaltyPct}
              onChangeText={setPenaltyPct}
              keyboardType="decimal-pad"
              placeholder="0-100"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <View style={AdminStil.aksiyonSatir}>
              <Pressable
                style={AdminStil.aksiyon}
                disabled={busy}
                onPress={() =>
                  void calistir(
                    () =>
                      AdminAjansKazancCezasi({
                        agencyId,
                        penaltyPct: Number(penaltyPct) || 0,
                        reason: sebep || undefined,
                      }),
                    'Kazanç cezası kaydedildi',
                  )
                }
              >
                <Text style={AdminStil.aksiyonYazi}>Cezayı uygula</Text>
              </Pressable>
              <Pressable
                style={AdminStil.aksiyon}
                disabled={busy}
                onPress={() =>
                  void calistir(
                    () =>
                      AdminAjansKazancCezasi({
                        agencyId,
                        giftEarnDisabled: !ozet.locks?.gift_earn_disabled,
                        reason: sebep || undefined,
                      }),
                    ozet.locks?.gift_earn_disabled
                      ? 'Hediye açıldı'
                      : 'Hediye kapatıldı',
                  )
                }
              >
                <Text style={AdminStil.aksiyonYazi}>
                  {ozet.locks?.gift_earn_disabled
                    ? 'Hediyeyi aç'
                    : 'Hediyeyi kapat'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={AdminStil.sectionLabel}>Coin cezası</Text>
          <View style={AdminStil.kart}>
            <TextInput
              style={AdminStil.input}
              value={coinCeza}
              onChangeText={setCoinCeza}
              keyboardType="number-pad"
              placeholder="Düşülecek coin"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Pressable
              style={[AdminStil.aksiyon, styles.aksiyonUyari]}
              disabled={busy}
              onPress={() => {
                const n = Math.floor(Number(coinCeza));
                if (!n || n <= 0) {
                  Alert.alert('Coin', 'Geçerli miktar gir');
                  return;
                }
                Alert.alert(
                  'Coin cezası',
                  `${SayiKisa(n)} coin ajans bakiyesinden düşülecek. Onaylıyor musun?`,
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Uygula',
                      style: 'destructive',
                      onPress: () =>
                        void calistir(
                          async () => {
                            await AdminAjansCoinCezasi({
                              agencyId,
                              coins: n,
                              reason: sebep || undefined,
                            });
                            setCoinCeza('');
                          },
                          'Coin cezası uygulandı',
                        ),
                    },
                  ],
                );
              }}
            >
              <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}>
                Coin düş
              </Text>
            </Pressable>
          </View>

          <Text style={AdminStil.sectionLabel}>Admin notu</Text>
          <View style={AdminStil.kart}>
            <TextInput
              style={[AdminStil.input, { minHeight: 72, textAlignVertical: 'top' }]}
              value={adminNote}
              onChangeText={setAdminNote}
              multiline
              placeholder="İç not"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <Pressable
              style={AdminStil.aksiyon}
              disabled={busy}
              onPress={() =>
                void calistir(
                  () =>
                    AdminAjansDurumAyarla({
                      agencyId,
                      adminNote,
                      reason: sebep || undefined,
                    }),
                  'Not kaydedildi',
                )
              }
            >
              <Text style={AdminStil.aksiyonYazi}>Notu kaydet</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {sekme === 'satis' ? (
        <>
          <Text style={AdminStil.sectionLabel}>
            Satışlar ({ozet.sales?.length ?? 0})
          </Text>
          {(ozet.top_buyers ?? []).length > 0 ? (
            <View style={AdminStil.kart}>
              <Text style={AdminStil.kartBaslik}>En çok alanlar</Text>
              {(ozet.top_buyers ?? []).slice(0, 8).map((b, i) => (
                <Text key={`${b.buyer_id ?? b.buyer_name}-${i}`} style={styles.meta}>
                  {i + 1}. {b.buyer_name} · {sayi(Number(b.toplam_coin ?? 0))} coin ·{' '}
                  {sayi(Number(b.toplam_try ?? 0))} ₺
                </Text>
              ))}
            </View>
          ) : null}
          {(ozet.sales ?? []).length === 0 ? (
            <View style={AdminStil.kart}>
              <Text style={AdminStil.kartAlt}>Satış yok</Text>
            </View>
          ) : (
            (ozet.sales ?? []).map((s) => (
              <View key={String(s.id)} style={AdminStil.kart}>
                <Text style={AdminStil.kartBaslik} numberOfLines={1}>
                  {String(s.package_title ?? 'Paket')} ·{' '}
                  {String(s.payment_status ?? '')}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  {String(
                    s.buyer_display_name || s.buyer_label || s.buyer_email || 'Alıcı',
                  )}{' '}
                  · {sayi(Number(s.amount_try ?? 0))} ₺ ·{' '}
                  {sayi(Number(s.coins ?? 0))} coin
                </Text>
                <Text style={styles.meta}>
                  {s.created_at
                    ? new Date(String(s.created_at)).toLocaleString('tr-TR')
                    : ''}
                  {s.receipt_url || s.receipt_payload ? ' · Dekont var' : ''}
                </Text>
              </View>
            ))
          )}
        </>
      ) : null}

      {sekme === 'linkler' ? (
        <>
          <Text style={AdminStil.sectionLabel}>
            Satış linkleri ({ozet.links?.length ?? 0})
          </Text>
          {(ozet.links ?? []).length === 0 ? (
            <View style={AdminStil.kart}>
              <Text style={AdminStil.kartAlt}>Link yok</Text>
            </View>
          ) : (
            (ozet.links ?? []).map((l) => (
              <View key={String(l.id)} style={AdminStil.kart}>
                <Text style={AdminStil.kartBaslik}>{String(l.title ?? l.code)}</Text>
                <Text style={AdminStil.kartAlt}>
                  {String(l.code)} · {String(l.selling_platform)} ·{' '}
                  {Number(l.click_count ?? 0)} tık ·{' '}
                  {l.is_active ? 'Aktif' : 'Kapalı'}
                </Text>
                <Pressable
                  style={AdminStil.aksiyon}
                  disabled={busy}
                  onPress={() =>
                    void calistir(() =>
                      AdminAjansSatisLinkiAktiflik({
                        agencyId,
                        linkId: String(l.id),
                        isActive: !l.is_active,
                      }),
                    )
                  }
                >
                  <Text style={AdminStil.aksiyonYazi}>
                    {l.is_active ? 'Linki kapat' : 'Linki aç'}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </>
      ) : null}

      {sekme === 'davetler' ? (
        <>
          <Text style={AdminStil.sectionLabel}>
            Davetler ({ozet.invites?.length ?? 0})
          </Text>
          {(ozet.invites ?? []).length === 0 ? (
            <View style={AdminStil.kart}>
              <Text style={AdminStil.kartAlt}>Davet yok</Text>
            </View>
          ) : (
            (ozet.invites ?? []).map((d) => (
              <View key={String(d.id)} style={AdminStil.kart}>
                <Text style={AdminStil.kartBaslik}>
                  {String(d.invite_code)} · {String(d.status)}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  {Number(d.used_count ?? 0)}/{Number(d.max_uses ?? 0)} kullanım
                  {d.label ? ` · ${String(d.label)}` : ''}
                </Text>
                {d.status !== 'revoked' ? (
                  <Pressable
                    style={[AdminStil.aksiyon, styles.aksiyonUyari]}
                    disabled={busy}
                    onPress={() =>
                      void calistir(() => AdminAjansDavetIptal(String(d.id)))
                    }
                  >
                    <Text
                      style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}
                    >
                      İptal et
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </>
      ) : null}

      {sekme === 'yaptirim' ? (
        <>
          <Text style={AdminStil.sectionLabel}>
            Yaptırım geçmişi ({ozet.sanctions?.length ?? 0})
          </Text>
          {(ozet.sanctions ?? []).length === 0 ? (
            <View style={AdminStil.kart}>
              <Text style={AdminStil.kartAlt}>Kayıt yok</Text>
            </View>
          ) : (
            (ozet.sanctions ?? []).map((y) => (
              <View
                key={String(y.id)}
                style={[AdminStil.kart, y.is_active ? styles.kartUyari : null]}
              >
                <Text style={AdminStil.kartBaslik}>
                  {String(y.title)} {y.is_active ? '(aktif)' : '(kaldırıldı)'}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  {String(y.kind)} · {String(y.severity)} · {String(y.reason)}
                </Text>
                <Text style={styles.meta}>
                  {y.created_at
                    ? new Date(String(y.created_at)).toLocaleString('tr-TR')
                    : ''}
                </Text>
                {y.is_active ? (
                  <Pressable
                    style={AdminStil.aksiyon}
                    disabled={busy}
                    onPress={() =>
                      void calistir(() =>
                        AdminAjansYaptirimKaldir(String(y.id), sebep || undefined),
                      )
                    }
                  >
                    <Text style={AdminStil.aksiyonYazi}>Kaldır</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </>
      ) : null}

      <Pressable
        style={[AdminStil.aksiyon, { marginTop: 8 }]}
        onPress={() => router.push(`/ajans/${agencyId}` as never)}
      >
        <Text style={AdminStil.aksiyonYazi}>Ajans panelini aç</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 16 },
  hint: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: -6,
    marginBottom: 4,
  },
  sekmeSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sekme: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  sekmeAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  sekmeYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  sekmeYaziAktif: { color: RenkTokenlari.primarySoft },
  label: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
  },
  lockSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  lockBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  lockAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 4,
  },
  aksiyonAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  aksiyonUyari: {
    borderColor: RenkTokenlari.danger,
  },
  kartUyari: {
    borderColor: RenkTokenlari.danger,
  },
});
