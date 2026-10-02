import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AiMuzikAdminBakiyeAyarla,
  AiMuzikAdminConfigGuncelle,
  AiMuzikAdminCreatorsGetir,
  AiMuzikAdminDashboardGetir,
  AiMuzikAdminKullaniciBakiyesi,
  AiMuzikAdminKullaniciParcalari,
  AiMuzikAdminModerasyonAyarla,
  AiMuzikAdminParcaGeriAl,
  AiMuzikAdminParcaKaldir,
  AiMuzikAdminUrunKaydet,
  AiMuzikConfigGetir,
  AiMuzikUrunleriListele,
} from '../../src/moduller/ai-muzik/islemler/AiMuzikApi';
import type {
  AiMuzikAdminCreator,
  AiMuzikAdminDashboard,
  AiMuzikAdminTrackSatir,
  AiMuzikConfig,
  AiMuzikModeration,
  AiMuzikProduct,
} from '../../src/moduller/ai-muzik/tipler';
import { AiMuzikAdminDakikaPaneli } from '../../src/moduller/ai-muzik/bilesenler/AiMuzikAdminDakikaPaneli';
import { SureFormat, MsSureFormat } from '../../src/moduller/ai-muzik/utils/SureFormat';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Sekme = 'ozet' | 'muzikler' | 'dakika' | 'config';

export default function AdminAiMuzikEkrani() {
  const { profile, loading } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [sekme, setSekme] = useState<Sekme>('dakika');
  const [ozet, setOzet] = useState<AiMuzikAdminDashboard | null>(null);
  const [cfg, setCfg] = useState<AiMuzikConfig | null>(null);
  const [urunler, setUrunler] = useState<AiMuzikProduct[]>([]);
  const [creators, setCreators] = useState<AiMuzikAdminCreator[]>([]);
  const [arama, setArama] = useState('');
  const [seciliUserId, setSeciliUserId] = useState<string | null>(null);
  const [userAd, setUserAd] = useState('');
  const [mod, setMod] = useState<AiMuzikModeration | null>(null);
  const [tracks, setTracks] = useState<AiMuzikAdminTrackSatir[]>([]);
  const [acikPromptId, setAcikPromptId] = useState<string | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [userBakiyeSn, setUserBakiyeSn] = useState<number | null>(null);
  const [dakikaYenile, setDakikaYenile] = useState(0);

  const yukleOzet = useCallback(async () => {
    const [d, c, p] = await Promise.all([
      AiMuzikAdminDashboardGetir(),
      AiMuzikConfigGetir(),
      AiMuzikUrunleriListele(),
    ]);
    setOzet(d);
    setCfg(c);
    setUrunler(p);
  }, []);

  const yukleCreators = useCallback(async (q?: string) => {
    const list = await AiMuzikAdminCreatorsGetir({ query: q, limit: 50 });
    setCreators(list);
  }, []);

  const yukleUser = useCallback(async (userId: string) => {
    const [r, bal] = await Promise.all([
      AiMuzikAdminKullaniciParcalari(userId),
      AiMuzikAdminKullaniciBakiyesi(userId).catch(() => null),
    ]);
    if (!r.ok) {
      Alert.alert('Hata', r.hata ?? 'Yüklenemedi');
      return;
    }
    setSeciliUserId(userId);
    setUserAd(
      r.user?.display_name ||
        (r.user?.username ? `@${r.user.username}` : userId.slice(0, 8)),
    );
    setMod(r.moderation ?? null);
    setTracks(r.tracks ?? []);
    setAcikPromptId(null);
    setUserBakiyeSn(bal?.ok ? Number(bal.available_seconds ?? 0) : null);
  }, []);

  const yukle = useCallback(async () => {
    setYenileniyor(true);
    try {
      if (sekme === 'ozet' || sekme === 'config') await yukleOzet();
      if (sekme === 'muzikler') {
        if (seciliUserId) await yukleUser(seciliUserId);
        else await yukleCreators(arama.trim() || undefined);
      }
      if (sekme === 'dakika') setDakikaYenile((n) => n + 1);
    } catch (e) {
      Alert.alert('Admin', e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setYenileniyor(false);
    }
  }, [sekme, seciliUserId, arama, yukleOzet, yukleCreators, yukleUser]);

  useEffect(() => {
    if (admin) void yukle();
  }, [admin, sekme]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={RenkTokenlari.accent} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!admin) {
    router.replace('/admin');
    return null;
  }

  const configKaydet = async (patch: Record<string, unknown>) => {
    try {
      const next = await AiMuzikAdminConfigGuncelle(patch);
      setCfg(next);
    } catch (e) {
      Alert.alert('Config', e instanceof Error ? e.message : 'Kaydedilemedi');
    }
  };

  const moderasyon = async (patch: {
    create_blocked?: boolean;
    library_blocked?: boolean;
    warn_message?: string;
  }) => {
    if (!seciliUserId) return;
    const r = await AiMuzikAdminModerasyonAyarla(seciliUserId, patch);
    if (!r.ok) {
      Alert.alert('Moderasyon', r.hata ?? 'Başarısız');
      return;
    }
    setMod({
      create_blocked: !!r.create_blocked,
      library_blocked: !!r.library_blocked,
      warn_count: Number(r.warn_count ?? 0),
      last_warn_message: r.last_warn_message ?? null,
    });
    void yukleCreators(arama.trim() || undefined);
  };

  return (
    <Screen>
      <EkranBasligi title="AI Müzik" fallbackHref="/admin" />
      <View style={styles.sekmeRow}>
        {(
          [
            ['dakika', 'Dakika tanımla'],
            ['muzikler', 'Oluşturulan müzikler'],
            ['ozet', 'Özet'],
            ['config', 'Ayarlar'],
          ] as const
        ).map(([k, label]) => (
          <Pressable
            key={k}
            style={[styles.sekme, sekme === k && styles.sekmeAktif]}
            onPress={() => {
              setSekme(k);
              if (k === 'muzikler') setSeciliUserId(null);
            }}
          >
            <Text style={[styles.sekmeYazi, sekme === k && styles.sekmeYaziAktif]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={() => void yukle()} />
        }
      >
        {sekme === 'ozet' && ozet ? (
          <View style={styles.kart}>
            <Text style={styles.kartBaslik}>Bugün</Text>
            <Text style={styles.stat}>
              Üretim: {ozet.today_generations} · Başarı: {ozet.today_success} · Hata:{' '}
              {ozet.today_failed}
            </Text>
            <Text style={styles.stat}>
              Satın alma: {ozet.purchases_today} · 7g hata oranı: %{ozet.failure_rate}
            </Text>
            <Text style={styles.stat}>
              Tüketilen (toplam): {SureFormat(Number(ozet.consumed_seconds))} · Rezerve:{' '}
              {SureFormat(Number(ozet.reserved_seconds))}
            </Text>
          </View>
        ) : null}

        {sekme === 'dakika' ? (
          <AiMuzikAdminDakikaPaneli
            yenileToken={dakikaYenile}
            onKullaniciDetay={(userId) => {
              setSekme('muzikler');
              void yukleUser(userId);
            }}
          />
        ) : null}

        {sekme === 'muzikler' && !seciliUserId ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Kullanıcı ara (isim / @ / id)"
              placeholderTextColor={RenkTokenlari.textDim}
              value={arama}
              onChangeText={setArama}
              onSubmitEditing={() => void yukleCreators(arama.trim() || undefined)}
              returnKeyType="search"
            />
            <Pressable
              style={styles.araBtn}
              onPress={() => void yukleCreators(arama.trim() || undefined)}
            >
              <Text style={styles.araBtnYazi}>Ara</Text>
            </Pressable>
            {creators.map((c) => (
              <Pressable
                key={c.user_id}
                style={styles.kart}
                onPress={() => void yukleUser(c.user_id)}
              >
                <Text style={styles.kartBaslik}>
                  {c.display_name || c.username || 'Kullanıcı'}
                  {c.username ? ` · @${c.username}` : ''}
                </Text>
                <Text style={styles.stat}>
                  {c.track_count} müzik · {MsSureFormat(c.total_duration_ms)}
                  {c.public_user_id ? ` · ID ${c.public_user_id}` : ''}
                </Text>
                <Text style={styles.stat}>
                  {c.create_blocked ? 'Üretim kapalı · ' : ''}
                  {c.library_blocked ? 'Kütüphane kapalı · ' : ''}
                  Uyarı: {c.warn_count}
                </Text>
              </Pressable>
            ))}
            {creators.length === 0 ? (
              <Text style={styles.stat}>Henüz AI müzik oluşturan yok.</Text>
            ) : null}
          </>
        ) : null}

        {sekme === 'muzikler' && seciliUserId ? (
          <>
            <Pressable onPress={() => setSeciliUserId(null)} style={styles.geri}>
              <Text style={styles.link}>← Kullanıcı listesi</Text>
            </Pressable>
            <View style={styles.kart}>
              <Text style={styles.kartBaslik}>{userAd}</Text>
              {userBakiyeSn != null ? (
                <Text style={styles.stat}>
                  AI müzik bakiyesi: {SureFormat(userBakiyeSn)} (
                  {(userBakiyeSn / 60).toFixed(1)} dk)
                </Text>
              ) : null}
              <View style={styles.aksiyonRow}>
                <Pressable
                  style={[styles.araBtn, styles.ekleBtn]}
                  onPress={() => {
                    Alert.prompt(
                      'Dakika ekle',
                      'Kaç dakika eklensin?',
                      async (text) => {
                        const dk = Number(text);
                        if (!Number.isFinite(dk) || dk <= 0) return;
                        const r = await AiMuzikAdminBakiyeAyarla(
                          seciliUserId,
                          Math.round(dk * 60),
                          'Admin kullanıcı detayından eklendi',
                        );
                        if (r.ok) {
                          setUserBakiyeSn(Number(r.available_seconds ?? 0));
                          Alert.alert('Eklendi', SureFormat(r.available_seconds ?? 0));
                        } else Alert.alert('Hata', r.hata ?? 'Başarısız');
                      },
                      'plain-text',
                      '7',
                      'number-pad',
                    );
                  }}
                >
                  <Text style={styles.araBtnYazi}>+ Dakika</Text>
                </Pressable>
                <Pressable
                  style={[styles.araBtn, styles.eksiltBtn]}
                  onPress={() => {
                    Alert.prompt(
                      'Dakika eksilt',
                      'Kaç dakika eksilsin?',
                      async (text) => {
                        const dk = Number(text);
                        if (!Number.isFinite(dk) || dk <= 0) return;
                        const r = await AiMuzikAdminBakiyeAyarla(
                          seciliUserId,
                          -Math.round(dk * 60),
                          'Admin kullanıcı detayından eksiltildi',
                        );
                        if (r.ok) {
                          setUserBakiyeSn(Number(r.available_seconds ?? 0));
                          Alert.alert('Eksiltildi', SureFormat(r.available_seconds ?? 0));
                        } else Alert.alert('Hata', r.hata ?? 'Başarısız');
                      },
                      'plain-text',
                      '1',
                      'number-pad',
                    );
                  }}
                >
                  <Text style={styles.araBtnYazi}>− Dakika</Text>
                </Pressable>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.etiket}>Müzik oluşturmayı kapat</Text>
                <Switch
                  value={!!mod?.create_blocked}
                  onValueChange={(v) => void moderasyon({ create_blocked: v })}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.etiket}>Kütüphaneyi kapat</Text>
                <Switch
                  value={!!mod?.library_blocked}
                  onValueChange={(v) => void moderasyon({ library_blocked: v })}
                />
              </View>
              <Pressable
                style={styles.warnBtn}
                onPress={() => {
                  Alert.prompt('Uyarı', 'Kullanıcıya gösterilecek mesaj', (text) => {
                    if (text?.trim()) void moderasyon({ warn_message: text.trim() });
                  });
                }}
              >
                <Text style={styles.warnBtnYazi}>
                  Uyarı ver ({mod?.warn_count ?? 0})
                </Text>
              </Pressable>
              {mod?.last_warn_message ? (
                <Text style={styles.stat}>Son uyarı: {mod.last_warn_message}</Text>
              ) : null}
            </View>

            {tracks.map((t) => {
              const sn = Math.round((t.duration_ms ?? 0) / 1000);
              const prompt =
                t.job_prompt || t.last_user_prompt || t.prepared_prompt || '—';
              const acik = acikPromptId === t.id;
              const silindi = !!t.soft_deleted_at || t.moderation_status === 'REMOVED';
              return (
                <View key={t.id} style={[styles.kart, silindi && styles.kartSilik]}>
                  <Text style={styles.kartBaslik}>{t.title}</Text>
                  <Text style={styles.stat}>
                    {sn} sn · {t.requested_duration_seconds ?? sn} dk isteği ·{' '}
                    {t.public_track_code ?? t.id.slice(0, 8)}
                  </Text>
                  <Text style={styles.stat}>
                    {[t.genre_code, t.mood, t.tempo, t.language_code]
                      .filter(Boolean)
                      .join(' · ') || 'Ayar yok'}
                    {t.lyrics_mode ? ` · söz: ${t.lyrics_mode}` : ''}
                  </Text>
                  <Pressable onPress={() => setAcikPromptId(acik ? null : t.id)}>
                    <Text style={styles.link}>
                      {acik ? 'Promptu gizle' : 'Prompt / kanıt göster'}
                    </Text>
                  </Pressable>
                  {acik ? (
                    <View style={styles.promptKutu}>
                      <Text style={styles.prompt}>{prompt}</Text>
                      {t.prepared_prompt && t.prepared_prompt !== prompt ? (
                        <Text style={[styles.prompt, { marginTop: 8 }]}>
                          Hazırlanan: {t.prepared_prompt}
                        </Text>
                      ) : null}
                      {t.job_settings ? (
                        <Text style={[styles.stat, { marginTop: 8 }]}>
                          Ayarlar: {JSON.stringify(t.job_settings).slice(0, 800)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  <View style={styles.aksiyonRow}>
                    {silindi ? (
                      <Pressable
                        onPress={async () => {
                          const r = await AiMuzikAdminParcaGeriAl(t.id);
                          if (r.ok) void yukleUser(seciliUserId);
                          else Alert.alert('Geri al', r.hata ?? 'Başarısız');
                        }}
                      >
                        <Text style={styles.link}>Geri al</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          Alert.alert('Kaldır', `"${t.title}" kaldırılsın mı?`, [
                            { text: 'İptal', style: 'cancel' },
                            {
                              text: 'Kaldır',
                              style: 'destructive',
                              onPress: async () => {
                                const r = await AiMuzikAdminParcaKaldir(
                                  t.id,
                                  'Admin kaldırdı',
                                );
                                if (r.ok) void yukleUser(seciliUserId);
                                else Alert.alert('Kaldır', r.hata ?? 'Başarısız');
                              },
                            },
                          ]);
                        }}
                      >
                        <Text style={styles.tehlike}>Müziği kaldır</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        {sekme === 'config' && cfg ? (
          <>
            <View style={styles.kart}>
              <Text style={styles.kartBaslik}>Yapılandırma</Text>
              <View style={styles.switchRow}>
                <Text style={styles.etiket}>Modül açık (feature flag)</Text>
                <Switch
                  value={cfg.enabled}
                  onValueChange={(v) =>
                    void configKaydet({ ai_music_enabled: v, enabled: v })
                  }
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.etiket}>Durum paylaşımı</Text>
                <Switch
                  value={cfg.status_sharing_enabled}
                  onValueChange={(v) =>
                    void configKaydet({ status_sharing_enabled: v })
                  }
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.etiket}>Ses odası kullanımı</Text>
                <Switch
                  value={cfg.voice_room_usage_enabled}
                  onValueChange={(v) =>
                    void configKaydet({ voice_room_usage_enabled: v })
                  }
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.etiket}>Cihaza dışa aktarma</Text>
                <Switch
                  value={cfg.device_export_enabled}
                  onValueChange={(v) =>
                    void configKaydet({ device_export_enabled: v })
                  }
                />
              </View>
              <Text style={styles.etiket}>Hoş geldin süresi (sn)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                defaultValue={String(cfg.welcome_seconds)}
                onEndEditing={(e) =>
                  void configKaydet({
                    welcome_seconds: Number(e.nativeEvent.text) || 0,
                  })
                }
              />
              <Text style={styles.etiket}>Günlük üretim limiti</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                defaultValue={String(cfg.daily_generation_limit)}
                onEndEditing={(e) =>
                  void configKaydet({
                    daily_generation_limit: Number(e.nativeEvent.text) || 1,
                  })
                }
              />
            </View>
            <View style={styles.kart}>
              <Text style={styles.kartBaslik}>Paketler</Text>
              {urunler.map((p) => (
                <View key={p.id} style={styles.urun}>
                  <Text style={styles.urunAd}>{p.display_name}</Text>
                  <Text style={styles.urunMeta}>
                    {p.product_id} ·{' '}
                    {SureFormat(p.seconds_granted + p.bonus_seconds)}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Alert.prompt(
                        'Bonus saniye',
                        p.display_name,
                        (text) => {
                          void AiMuzikAdminUrunKaydet({
                            product_id: p.product_id,
                            bonus_seconds: Number(text) || 0,
                          }).then(() => void yukleOzet());
                        },
                        'plain-text',
                        String(p.bonus_seconds),
                        'number-pad',
                      );
                    }}
                  >
                    <Text style={styles.link}>Bonus düzenle</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sekmeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: 8,
  },
  sekme: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
  },
  sekmeAktif: {
    backgroundColor: RenkTokenlari.primarySoft + '33',
  },
  sekmeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  sekmeYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  scroll: {
    padding: BoslukTokenlari.lg,
    paddingBottom: 48,
    gap: BoslukTokenlari.md,
  },
  kart: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  kartSilik: { opacity: 0.55 },
  kartBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: BoslukTokenlari.sm,
  },
  ekleBtn: {
    backgroundColor: RenkTokenlari.primarySoft,
  },
  eksiltBtn: {
    backgroundColor: '#c45',
  },
  stat: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  etiket: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    flex: 1,
    marginRight: 12,
  },
  input: {
    backgroundColor: RenkTokenlari.bg,
    borderRadius: YaricapTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  araBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  araBtnYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '700',
  },
  geri: { marginBottom: 4 },
  link: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    marginTop: 6,
  },
  tehlike: {
    ...TipografiTokenlari.caption,
    color: '#e55',
    marginTop: 8,
  },
  warnBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.accent + '22',
    alignItems: 'center',
  },
  warnBtnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
  promptKutu: {
    marginTop: 8,
    padding: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bg,
  },
  prompt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
  },
  aksiyonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  urun: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  urunAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  urunMeta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
