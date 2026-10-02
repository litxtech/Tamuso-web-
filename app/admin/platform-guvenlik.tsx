import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  AdminCihazEngelle,
  AdminPlatformGuvenlikDetay,
  AdminPlatformGuvenlikDurum,
  AdminPlatformGuvenlikListesi,
} from '../../src/moduller/admin/platform-guvenlik/islemler/PlatformGuvenlikIslemleri';
import type {
  PlatformGuvenlikDetay,
  PlatformGuvenlikUyari,
} from '../../src/moduller/admin/platform-guvenlik/tipler';
import {
  AdminIhtarVer,
  AdminKullaniciBanla,
  AdminKullaniciSil,
} from '../../src/moduller/admin/kullanici/islemler/AdminKullaniciIslemleri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const TIP_ETIKET: Record<string, string> = {
  device_reregister_after_delete: 'Silinen hesap · aynı cihaz',
  device_reregister_after_ban: 'Banlı cihaz · yeni kayıt',
  similar_email_reregister: 'Benzer e-posta ile dönüş',
  guest_flood_same_device: 'Misafir cihaz istismarı',
};

const DURUM_FILTRE = [
  { kod: null as string | null, etiket: 'Tümü' },
  { kod: 'open', etiket: 'Açık' },
  { kod: 'reviewing', etiket: 'İncelemede' },
  { kod: 'resolved', etiket: 'Çözüldü' },
  { kod: 'ignored', etiket: 'Yok sayıldı' },
];

function nedenMetin(reasons: unknown): string {
  if (!Array.isArray(reasons)) return '—';
  return reasons.map(String).join(', ');
}

export default function AdminPlatformGuvenlikEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [filtre, setFiltre] = useState<string | null>('open');
  const [liste, setListe] = useState<PlatformGuvenlikUyari[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secili, setSecili] = useState<PlatformGuvenlikUyari | null>(null);
  const [detay, setDetay] = useState<PlatformGuvenlikDetay | null>(null);
  const [not, setNot] = useState('');
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      setListe(await AdminPlatformGuvenlikListesi(80, filtre));
    } catch (e) {
      Alert.alert(
        'Platform güvenliği',
        e instanceof Error ? e.message : 'Liste alınamadı',
      );
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, [filtre]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) return;
      void yukle();
    }, [admin, yukle]),
  );

  const detayAc = async (u: PlatformGuvenlikUyari) => {
    setSecili(u);
    setNot(u.admin_note ?? '');
    setDetay(null);
    try {
      const d = await AdminPlatformGuvenlikDetay(u.id);
      setDetay(d);
    } catch (e) {
      Alert.alert(
        'Detay',
        e instanceof Error ? e.message : 'Detay alınamadı',
      );
    }
  };

  const durumAyarla = async (
    status: 'open' | 'reviewing' | 'resolved' | 'ignored',
  ) => {
    if (!secili) return;
    setBusy(true);
    const r = await AdminPlatformGuvenlikDurum(secili.id, status, not.trim() || undefined);
    setBusy(false);
    if (!r.ok) {
      Alert.alert('Durum', r.hata ?? 'Güncellenemedi');
      return;
    }
    setSecili(null);
    void yukle();
  };

  const hedefUserId = secili?.new_user_id ?? null;

  const mudahale = async (
    tip: 'ihtar' | 'ban' | 'sil' | 'cihaz',
  ) => {
    if (!secili) return;
    setBusy(true);
    try {
      if (tip === 'cihaz') {
        if (!secili.device_id) {
          Alert.alert('Cihaz', 'Cihaz kimliği yok');
          return;
        }
        const r = await AdminCihazEngelle(
          secili.device_id,
          'platform_guvenlik_mudahale',
        );
        if (!r.ok) throw new Error(r.hata);
        Alert.alert('Cihaz', 'Cihaz engellendi — yeni misafir açılamaz');
      } else if (!hedefUserId) {
        Alert.alert('Müdahale', 'Hedef kullanıcı yok');
        return;
      } else if (tip === 'ihtar') {
        const r = await AdminIhtarVer({
          userId: hedefUserId,
          reason: `Platform güvenliği: ${secili.alert_type}`,
          severity: secili.severity === 'critical' ? 'high' : 'medium',
          notes: not.trim() || undefined,
        });
        if (!r.ok) throw new Error(r.hata);
        Alert.alert('İhtar', 'Uyarı gönderildi');
      } else if (tip === 'ban') {
        const r = await AdminKullaniciBanla(
          hedefUserId,
          `platform_guvenlik:${secili.alert_type}`,
        );
        if (!r.ok) throw new Error(r.hata);
        Alert.alert('Ban', 'Kullanıcı banlandı');
      } else if (tip === 'sil') {
        const r = await AdminKullaniciSil(
          hedefUserId,
          `platform_guvenlik:${secili.alert_type}`,
        );
        if (!r.ok) throw new Error(r.hata);
        Alert.alert('Silme', 'Hesap soft-delete edildi');
      }
      await AdminPlatformGuvenlikDurum(
        secili.id,
        'reviewing',
        not.trim() || `Müdahale: ${tip}`,
      );
      void yukle();
    } catch (e) {
      Alert.alert(
        'Müdahale',
        e instanceof Error ? e.message : 'İşlem başarısız',
      );
    } finally {
      setBusy(false);
    }
  };

  if (!admin) {
    return (
      <Screen>
        <EkranBasligi title="Platform güvenliği" fallbackHref={'/admin' as any} />
        <Text style={AdminStil.bos}>Admin yetkisi gerekli</Text>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Platform güvenliği"
        subtitle="Silinen / banlı hesap dönüşleri · cihaz"
        fallbackHref={'/admin' as any}
      />

      <View style={styles.filtreSatir}>
        {DURUM_FILTRE.map((f) => (
          <Pressable
            key={f.kod}
            style={[styles.chip, filtre === f.kod && styles.chipAktif]}
            onPress={() => setFiltre(f.kod)}
          >
            <Text
              style={[
                styles.chipYazi,
                filtre === f.kod && styles.chipYaziAktif,
              ]}
            >
              {f.etiket}
            </Text>
          </Pressable>
        ))}
      </View>

      {yukleniyor && liste.length === 0 ? (
        <ActivityIndicator color={RenkTokenlari.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          contentContainerStyle={AdminStil.content}
          refreshControl={
            <RefreshControl refreshing={yukleniyor} onRefresh={() => void yukle()} />
          }
        >
          {liste.length === 0 ? (
            <Text style={AdminStil.bos}>Açık uyarı yok</Text>
          ) : (
            liste.map((u) => (
              <Pressable
                key={u.id}
                style={[
                  AdminStil.kart,
                  u.status === 'open' && styles.yeni,
                  u.severity === 'critical' && styles.kritik,
                ]}
                onPress={() => void detayAc(u)}
              >
                <Text style={AdminStil.kartBaslik}>
                  {TIP_ETIKET[u.alert_type] ?? u.alert_type}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  {u.new_display_name || u.new_username || u.new_user_id || '—'}
                  {u.email_new ? ` · ${u.email_new}` : ''}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Skor {u.match_score ?? 0} · {u.severity} · {u.status}
                </Text>
                <Text style={AdminStil.kartAlt} numberOfLines={1}>
                  {nedenMetin(u.match_reasons)}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!secili}
        transparent
        animationType="slide"
        onRequestClose={() => setSecili(null)}
      >
        <View style={styles.modalPerde}>
          <View style={styles.modalKart}>
            {secili ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalBaslik}>
                  {TIP_ETIKET[secili.alert_type] ?? secili.alert_type}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Yeni: {secili.new_display_name || secili.new_username || secili.new_user_id}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Eşleşen: {secili.matched_display_name || secili.matched_username || secili.matched_user_id || '—'}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Mail yeni: {secili.email_new || '—'}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Mail eski: {secili.email_matched || '—'}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Cihaz: {secili.device_id || '—'}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Nedenler: {nedenMetin(secili.match_reasons)}
                </Text>

                {detay?.binding ? (
                  <Text style={styles.bolum}>
                    Binding: {JSON.stringify(detay.binding.status)} ·{' '}
                    {String(detay.binding.block_reason ?? '')}
                  </Text>
                ) : null}

                {detay?.logs && detay.logs.length > 0 ? (
                  <View style={styles.logKutu}>
                    <Text style={styles.uyariEtiket}>Güvenlik logları</Text>
                    {detay.logs.slice(0, 12).map((l) => (
                      <Text key={l.id} style={AdminStil.kartAlt}>
                        {l.created_at?.slice(0, 19)} · {l.event_type} · {l.severity}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {detay?.tombstones && detay.tombstones.length > 0 ? (
                  <View style={styles.logKutu}>
                    <Text style={styles.uyariEtiket}>Tombstone</Text>
                    {detay.tombstones.slice(0, 5).map((t, i) => (
                      <Text key={i} style={AdminStil.kartAlt}>
                        {String(t.delete_source)} · {String(t.email_canon ?? t.email_normalized ?? '—')}
                        {t.was_banned ? ' · banlıydı' : ''}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.uyariEtiket}>Admin notu</Text>
                <TextInput
                  style={AdminStil.input}
                  value={not}
                  onChangeText={setNot}
                  multiline
                  placeholder="Müdahale notu…"
                  placeholderTextColor={RenkTokenlari.textDim}
                />

                <Text style={styles.uyariEtiket}>Müdahale</Text>
                <View style={styles.mudahaleGrid}>
                  <Pressable
                    style={AdminStil.aksiyon}
                    disabled={busy}
                    onPress={() => void mudahale('ihtar')}
                  >
                    <Text style={AdminStil.aksiyonYazi}>İhtar</Text>
                  </Pressable>
                  <Pressable
                    style={[AdminStil.aksiyon, { borderColor: RenkTokenlari.danger }]}
                    disabled={busy}
                    onPress={() => void mudahale('ban')}
                  >
                    <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}>
                      Ban
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[AdminStil.aksiyon, { borderColor: RenkTokenlari.danger }]}
                    disabled={busy}
                    onPress={() =>
                      Alert.alert('Hesabı sil', 'Soft-delete uygulansın mı?', [
                        { text: 'Vazgeç', style: 'cancel' },
                        {
                          text: 'Sil',
                          style: 'destructive',
                          onPress: () => void mudahale('sil'),
                        },
                      ])
                    }
                  >
                    <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}>
                      Sil
                    </Text>
                  </Pressable>
                  <Pressable
                    style={AdminStil.aksiyon}
                    disabled={busy || !secili.device_id}
                    onPress={() => void mudahale('cihaz')}
                  >
                    <Text style={AdminStil.aksiyonYazi}>Cihaz engelle</Text>
                  </Pressable>
                </View>

                {hedefUserId ? (
                  <Pressable
                    style={{ marginTop: 8 }}
                    onPress={() => {
                      setSecili(null);
                      router.push(`/admin/kullanicilar/${hedefUserId}` as any);
                    }}
                  >
                    <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.primarySoft }]}>
                      Kullanıcı dosyasına git
                    </Text>
                  </Pressable>
                ) : null}

                <View style={[AdminStil.aksiyonSatir, { marginTop: 12 }]}>
                  <Pressable
                    style={AdminStil.aksiyon}
                    onPress={() => setSecili(null)}
                  >
                    <Text style={AdminStil.aksiyonYazi}>Kapat</Text>
                  </Pressable>
                  <Pressable
                    style={AdminStil.aksiyon}
                    disabled={busy}
                    onPress={() => void durumAyarla('ignored')}
                  >
                    <Text style={AdminStil.aksiyonYazi}>Yok say</Text>
                  </Pressable>
                  <Pressable
                    style={[AdminStil.aksiyon, { borderColor: RenkTokenlari.mint }]}
                    disabled={busy}
                    onPress={() => void durumAyarla('resolved')}
                  >
                    <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.mint }]}>
                      Çözüldü
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filtreSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.xl,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipAktif: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: RenkTokenlari.surface,
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  chipYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  yeni: { borderColor: RenkTokenlari.borderAccent },
  kritik: { borderColor: RenkTokenlari.danger },
  modalPerde: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalKart: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
    maxHeight: '88%',
  },
  modalBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: 4,
  },
  uyariEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    marginTop: 8,
  },
  bolum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 6,
  },
  logKutu: {
    marginTop: 8,
    gap: 2,
  },
  mudahaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
});
