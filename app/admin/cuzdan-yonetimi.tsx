import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminCuzdanUiAudit,
  AdminCuzdanUiGeriAl,
  AdminCuzdanUiSurumler,
  AdminCuzdanUiTaslakGetir,
  AdminCuzdanUiTaslakKaydet,
  AdminCuzdanUiYayinla,
} from '../../src/moduller/cuzdan/ui-config/CuzdanUiServis';
import { DEFAULT_CUZDAN_UI_CONFIG } from '../../src/moduller/cuzdan/ui-config/CuzdanUiVarsayilan';
import {
  CuzdanAksiyonlariSirali,
  CuzdanBolumAcikMi,
  CuzdanMetinAl,
  GuvenliRenk,
  RenkGecerliMi,
} from '../../src/moduller/cuzdan/ui-config/CuzdanUiNormalize';
import type { CuzdanUiPayload } from '../../src/moduller/cuzdan/ui-config/CuzdanUiTipleri';
import { CuzdanDinamikSimge } from '../../src/moduller/cuzdan/bilesenler/CuzdanDinamikSimge';
import { CuzdanDinamikAksiyonGrid } from '../../src/moduller/cuzdan/bilesenler/CuzdanDinamikAksiyonGrid';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Sekme =
  | 'genel'
  | 'bolumler'
  | 'butonlar'
  | 'metinler'
  | 'simgeler'
  | 'tema'
  | 'coin'
  | 'onizleme'
  | 'surumler'
  | 'gecmis';

const SEKMELER: { id: Sekme; label: string }[] = [
  { id: 'genel', label: 'Genel' },
  { id: 'bolumler', label: 'Bölümler' },
  { id: 'butonlar', label: 'Butonlar' },
  { id: 'metinler', label: 'Metinler' },
  { id: 'simgeler', label: 'Simgeler' },
  { id: 'tema', label: 'Tema' },
  { id: 'coin', label: 'Coin' },
  { id: 'onizleme', label: 'Önizleme' },
  { id: 'surumler', label: 'Sürümler' },
  { id: 'gecmis', label: 'Geçmiş' },
];

const RENK_PRESET = ['#FFFFFF', '#E84091', '#8B5CF6', '#F0B429', '#34D399', '#0B0614'];

export default function AdminCuzdanYonetimi() {
  const { profile } = useAuth();
  const yetki = AdminYetkisiVarMi(profile);
  const [sekme, setSekme] = useState<Sekme>('genel');
  const [payload, setPayload] = useState<CuzdanUiPayload>(DEFAULT_CUZDAN_UI_CONFIG);
  const [versionNo, setVersionNo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [surumler, setSurumler] = useState<Array<Record<string, unknown>>>([]);
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([]);

  const yukle = useCallback(async () => {
    setLoading(true);
    try {
      const t = await AdminCuzdanUiTaslakGetir();
      setPayload(t.payload);
      setVersionNo(t.version_no);
      const [s, a] = await Promise.all([
        AdminCuzdanUiSurumler(20).catch(() => []),
        AdminCuzdanUiAudit(40).catch(() => []),
      ]);
      setSurumler(s);
      setAudit(a);
    } catch (e) {
      Alert.alert('Cüzdan UI', e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (yetki) void yukle();
    }, [yetki, yukle]),
  );

  const kaydet = async () => {
    setBusy(true);
    try {
      await AdminCuzdanUiTaslakKaydet(payload);
      Alert.alert('Taslak', 'Kaydedildi. Yayınlanana kadar kullanıcıya yansımaz.');
      await yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  };

  const yayinla = () => {
    Alert.alert('Yayınla', 'Taslak canlı cüzdana uygulanacak. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Yayınla',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await AdminCuzdanUiTaslakKaydet(payload);
              const r = await AdminCuzdanUiYayinla();
              Alert.alert('Yayınlandı', `Sürüm ${r.published_version_no}`);
              await yukle();
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'Yayınlanamadı');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const geriAl = () => {
    Alert.alert('Geri al', 'Önceki yayınlı sürüme dönülsün mü?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Geri al',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              const r = await AdminCuzdanUiGeriAl();
              Alert.alert('Geri alındı', `Sürüm ${r.version_no}`);
              await yukle();
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'Geri alınamadı');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const patch = (fn: (p: CuzdanUiPayload) => CuzdanUiPayload) => {
    setPayload((prev) => fn(prev));
  };

  const onizlemeAksiyonlar = useMemo(
    () =>
      CuzdanAksiyonlariSirali(payload, {
        wallet_exchange_enabled: true,
      }),
    [payload],
  );

  if (!yetki) {
    return (
      <Screen>
        <EkranBasligi title="Cüzdan yönetimi" fallbackHref="/admin" />
        <Text style={AdminStil.bos}>Yetkin yok.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <EkranBasligi title="Cüzdan yönetimi" fallbackHref="/admin" />
      <View style={styles.toolbar}>
        <Text style={styles.meta}>Taslak v{versionNo}</Text>
        <View style={styles.toolbarBtns}>
          <Pressable style={styles.toolBtn} onPress={() => void kaydet()} disabled={busy}>
            <Text style={styles.toolBtnYazi}>Kaydet</Text>
          </Pressable>
          <Pressable style={[styles.toolBtn, styles.yayin]} onPress={yayinla} disabled={busy}>
            <Text style={styles.toolBtnYazi}>Yayınla</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={geriAl} disabled={busy}>
            <Text style={styles.toolBtnYazi}>Geri al</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sekmeSerit}
      >
        {SEKMELER.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSekme(s.id)}
            style={[styles.sekme, sekme === s.id && styles.sekmeAktif]}
          >
            <Text style={[styles.sekmeYazi, sekme === s.id && styles.sekmeYaziAktif]}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {sekme === 'genel' ? (
            <View style={styles.kart}>
              <Alan
                label="Ekran adı"
                value={payload.general.screen_name}
                onChange={(v) =>
                  patch((p) => ({ ...p, general: { ...p.general, screen_name: v } }))
                }
              />
              <Alan
                label="Üst etiket (eyebrow)"
                value={payload.general.eyebrow}
                onChange={(v) =>
                  patch((p) => ({ ...p, general: { ...p.general, eyebrow: v } }))
                }
              />
              <Alan
                label="Alt başlık"
                value={payload.general.subtitle ?? ''}
                onChange={(v) =>
                  patch((p) => ({ ...p, general: { ...p.general, subtitle: v } }))
                }
              />
              <Alan
                label="Açıklama"
                value={payload.general.description ?? ''}
                onChange={(v) =>
                  patch((p) => ({ ...p, general: { ...p.general, description: v } }))
                }
                multiline
              />

              <Text style={[styles.bolum, { marginTop: 12 }]}>Kart markası</Text>
              <Alan
                label="Marka adı (kart üstü — örn. MUTA PAY)"
                value={payload.brand?.name ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    brand: { ...p.brand, name: v },
                  }))
                }
              />
              <Alan
                label="Kart tipi (örn. Dijital cüzdan)"
                value={payload.brand?.card_type ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    brand: { ...p.brand, card_type: v },
                  }))
                }
              />
              <Alan
                label="Tagline (ses odası / gönderi / yayın gelirleri…)"
                value={payload.brand?.tagline ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    brand: { ...p.brand, tagline: v },
                  }))
                }
                multiline
              />
              <View style={styles.satir}>
                <Text style={styles.satirBaslik}>Tagline görünür</Text>
                <Switch
                  value={payload.brand?.tagline_visible !== false}
                  onValueChange={(v) =>
                    patch((p) => ({
                      ...p,
                      brand: { ...p.brand, tagline_visible: v },
                    }))
                  }
                />
              </View>

              <Text style={[styles.bolum, { marginTop: 12 }]}>
                Katalog / tahmini tutar paneli
              </Text>
              <View style={styles.satir}>
                <Text style={styles.satirBaslik}>Panel açık</Text>
                <Switch
                  value={payload.value_summary?.enabled !== false}
                  onValueChange={(v) =>
                    patch((p) => ({
                      ...p,
                      value_summary: { ...p.value_summary, enabled: v },
                    }))
                  }
                />
              </View>
              {(
                [
                  ['show_katalog', 'Katalog değeri satırı'],
                  ['show_platform_share', 'Platform hizmet payı'],
                  ['show_seller_net', 'Tahmini hesap özeti'],
                  ['show_payment_note', 'Ödeme / dönem notu'],
                  ['show_language_note', 'Dil / uyarı notu'],
                ] as const
              ).map(([key, label]) => (
                <View key={key} style={styles.satir}>
                  <Text style={styles.satirBaslik}>{label}</Text>
                  <Switch
                    value={!!payload.value_summary?.[key]}
                    onValueChange={(v) =>
                      patch((p) => ({
                        ...p,
                        value_summary: { ...p.value_summary, [key]: v },
                      }))
                    }
                  />
                </View>
              ))}
              <Alan
                label="Katalog etiketi"
                value={payload.value_summary?.katalog_label ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    value_summary: { ...p.value_summary, katalog_label: v },
                  }))
                }
              />
              <Alan
                label="Platform payı etiketi"
                value={payload.value_summary?.platform_label ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    value_summary: { ...p.value_summary, platform_label: v },
                  }))
                }
              />
              <Alan
                label="Tahmini tutar etiketi (eski: anlaşma sonrası…)"
                value={payload.value_summary?.seller_net_label ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    value_summary: { ...p.value_summary, seller_net_label: v },
                  }))
                }
              />
              <Alan
                label="Ödeme / dönem notu"
                value={payload.value_summary?.payment_note ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    value_summary: { ...p.value_summary, payment_note: v },
                  }))
                }
                multiline
              />
              <Alan
                label="Uyarı / dil notu (Apple-güvenli)"
                value={payload.value_summary?.language_note ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    value_summary: { ...p.value_summary, language_note: v },
                  }))
                }
                multiline
              />
            </View>
          ) : null}

          {sekme === 'bolumler' ? (
            <View style={styles.kart}>
              {[...payload.sections]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((s) => (
                  <View key={s.key} style={styles.satir}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.satirBaslik}>{s.key}</Text>
                      <Text style={styles.satirAlt}>sıra {s.sort_order}</Text>
                    </View>
                    <Switch
                      value={s.enabled}
                      onValueChange={(v) =>
                        patch((p) => ({
                          ...p,
                          sections: p.sections.map((x) =>
                            x.key === s.key ? { ...x, enabled: v } : x,
                          ),
                        }))
                      }
                    />
                    <Pressable
                      onPress={() =>
                        patch((p) => ({
                          ...p,
                          sections: p.sections.map((x) =>
                            x.key === s.key
                              ? { ...x, sort_order: Math.max(0, x.sort_order - 10) }
                              : x,
                          ),
                        }))
                      }
                      style={styles.ok}
                    >
                      <Ionicons name="chevron-up" size={18} color={RenkTokenlari.text} />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        patch((p) => ({
                          ...p,
                          sections: p.sections.map((x) =>
                            x.key === s.key
                              ? { ...x, sort_order: x.sort_order + 10 }
                              : x,
                          ),
                        }))
                      }
                      style={styles.ok}
                    >
                      <Ionicons name="chevron-down" size={18} color={RenkTokenlari.text} />
                    </Pressable>
                  </View>
                ))}
            </View>
          ) : null}

          {sekme === 'butonlar' ? (
            <View style={styles.kart}>
              {payload.actions.map((a) => (
                <View key={a.key} style={styles.butonKart}>
                  <View style={styles.satir}>
                    <Text style={styles.satirBaslik}>{a.key}</Text>
                    <Switch
                      value={a.enabled}
                      onValueChange={(v) =>
                        patch((p) => ({
                          ...p,
                          actions: p.actions.map((x) =>
                            x.key === a.key ? { ...x, enabled: v } : x,
                          ),
                        }))
                      }
                    />
                  </View>
                  <Alan
                    label="Başlık"
                    value={a.title}
                    onChange={(v) =>
                      patch((p) => ({
                        ...p,
                        actions: p.actions.map((x) =>
                          x.key === a.key ? { ...x, title: v } : x,
                        ),
                      }))
                    }
                  />
                  <Alan
                    label="İkon (Ionicons)"
                    value={a.icon}
                    onChange={(v) =>
                      patch((p) => ({
                        ...p,
                        actions: p.actions.map((x) =>
                          x.key === a.key ? { ...x, icon: v } : x,
                        ),
                      }))
                    }
                  />
                  <Alan
                    label="İkon rengi HEX"
                    value={a.icon_color}
                    onChange={(v) => {
                      if (v.length > 3 && !RenkGecerliMi(v)) return;
                      patch((p) => ({
                        ...p,
                        actions: p.actions.map((x) =>
                          x.key === a.key
                            ? { ...x, icon_color: GuvenliRenk(v, x.icon_color) }
                            : x,
                        ),
                      }));
                    }}
                  />
                  <Text style={styles.satirAlt}>
                    action: {a.action_type} → {a.action_target ?? '—'}
                    {a.requires_flag ? ` · flag: ${a.requires_flag}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {sekme === 'metinler' ? (
            <View style={styles.kart}>
              {payload.texts.map((t) => (
                <View key={t.key} style={styles.butonKart}>
                  <View style={styles.satir}>
                    <Text style={styles.satirBaslik}>
                      {t.key} · {t.type}
                    </Text>
                    <Switch
                      value={t.enabled}
                      onValueChange={(v) =>
                        patch((p) => ({
                          ...p,
                          texts: p.texts.map((x) =>
                            x.key === t.key ? { ...x, enabled: v } : x,
                          ),
                        }))
                      }
                    />
                  </View>
                  {(['tr', 'en', 'es', 'pt', 'ar'] as const).map((loc) => (
                    <Alan
                      key={loc}
                      label={loc.toUpperCase()}
                      value={t.locales[loc] ?? ''}
                      multiline
                      onChange={(v) =>
                        patch((p) => ({
                          ...p,
                          texts: p.texts.map((x) =>
                            x.key === t.key
                              ? { ...x, locales: { ...x.locales, [loc]: v } }
                              : x,
                          ),
                        }))
                      }
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {sekme === 'simgeler' ? (
            <View style={styles.kart}>
              <Text style={styles.bolum}>Cüzdan simgesi</Text>
              <View style={styles.simgeOniz}>
                <CuzdanDinamikSimge icon={payload.wallet_icon} />
              </View>
              <Alan
                label="Ionicons adı"
                value={payload.wallet_icon.ionicon ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    wallet_icon: { ...p.wallet_icon, source: 'ionicon', ionicon: v },
                  }))
                }
              />
              <Alan
                label="Görsel URL (png/webp)"
                value={payload.wallet_icon.url ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    wallet_icon: {
                      ...p.wallet_icon,
                      source: v.trim() ? 'url' : 'ionicon',
                      url: v.trim() || null,
                    },
                  }))
                }
              />
              <Alan
                label="Renk HEX"
                value={payload.wallet_icon.color}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    wallet_icon: {
                      ...p.wallet_icon,
                      color: GuvenliRenk(v, p.wallet_icon.color),
                    },
                  }))
                }
              />
              <View style={styles.presetRow}>
                {RENK_PRESET.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() =>
                      patch((p) => ({
                        ...p,
                        wallet_icon: { ...p.wallet_icon, color: c },
                      }))
                    }
                    style={[styles.swatch, { backgroundColor: c }]}
                  />
                ))}
              </View>
              <View style={styles.satir}>
                <Text style={styles.satirBaslik}>Görünür</Text>
                <Switch
                  value={payload.wallet_icon.visible !== false}
                  onValueChange={(v) =>
                    patch((p) => ({
                      ...p,
                      wallet_icon: { ...p.wallet_icon, visible: v },
                    }))
                  }
                />
              </View>
              <Pressable
                style={styles.toolBtn}
                onPress={() =>
                  patch((p) => ({
                    ...p,
                    wallet_icon: { ...DEFAULT_CUZDAN_UI_CONFIG.wallet_icon },
                  }))
                }
              >
                <Text style={styles.toolBtnYazi}>Varsayılan cüzdan simgesi</Text>
              </Pressable>
            </View>
          ) : null}

          {sekme === 'tema' ? (
            <View style={styles.kart}>
              {(
                [
                  ['primary', 'Primary'],
                  ['accent', 'Accent'],
                  ['background', 'Background'],
                  ['cardBackground', 'Kart'],
                  ['primaryText', 'Yazı'],
                  ['buttonBackground', 'Buton bg'],
                ] as const
              ).map(([key, label]) => (
                <Alan
                  key={key}
                  label={label}
                  value={String(payload.theme[key])}
                  onChange={(v) =>
                    patch((p) => ({
                      ...p,
                      theme: {
                        ...p.theme,
                        [key]: GuvenliRenk(v, p.theme[key]),
                        preset: 'custom',
                      },
                    }))
                  }
                />
              ))}
              <View style={styles.presetRow}>
                {(['dark', 'premium', 'custom'] as const).map((pr) => (
                  <Pressable
                    key={pr}
                    style={[
                      styles.sekme,
                      payload.theme.preset === pr && styles.sekmeAktif,
                    ]}
                    onPress={() =>
                      patch((p) => ({
                        ...p,
                        theme: {
                          ...(pr === 'premium'
                            ? DEFAULT_CUZDAN_UI_CONFIG.theme
                            : p.theme),
                          preset: pr,
                        },
                      }))
                    }
                  >
                    <Text style={styles.sekmeYazi}>{pr}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {sekme === 'coin' ? (
            <View style={styles.kart}>
              <View style={styles.simgeOniz}>
                <CuzdanDinamikSimge
                  icon={payload.coin}
                  fallbackIonicon="logo-bitcoin"
                />
                <Text style={{ color: payload.coin.color, fontWeight: '800' }}>
                  {payload.coin.placement === 'before' ? '12.450' : ''}
                </Text>
              </View>
              <Alan
                label="Coin adı"
                value={payload.coin.name}
                onChange={(v) =>
                  patch((p) => ({ ...p, coin: { ...p.coin, name: v } }))
                }
              />
              <Alan
                label="Kısa ad"
                value={payload.coin.short_name}
                onChange={(v) =>
                  patch((p) => ({ ...p, coin: { ...p.coin, short_name: v } }))
                }
              />
              <Alan
                label="İkon"
                value={payload.coin.ionicon ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    coin: { ...p.coin, source: 'ionicon', ionicon: v },
                  }))
                }
              />
              <Alan
                label="Görsel URL"
                value={payload.coin.url ?? ''}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    coin: {
                      ...p.coin,
                      source: v.trim() ? 'url' : 'ionicon',
                      url: v.trim() || null,
                    },
                  }))
                }
              />
              <Alan
                label="Renk"
                value={payload.coin.color}
                onChange={(v) =>
                  patch((p) => ({
                    ...p,
                    coin: { ...p.coin, color: GuvenliRenk(v, p.coin.color) },
                  }))
                }
              />
              <View style={styles.satir}>
                <Text style={styles.satirBaslik}>Sayı yanında göster</Text>
                <Switch
                  value={payload.coin.show_beside_amount}
                  onValueChange={(v) =>
                    patch((p) => ({
                      ...p,
                      coin: { ...p.coin, show_beside_amount: v },
                    }))
                  }
                />
              </View>
              <View style={styles.satir}>
                <Pressable
                  style={styles.sekme}
                  onPress={() =>
                    patch((p) => ({
                      ...p,
                      coin: { ...p.coin, placement: 'before' },
                    }))
                  }
                >
                  <Text style={styles.sekmeYazi}>İkon önce</Text>
                </Pressable>
                <Pressable
                  style={styles.sekme}
                  onPress={() =>
                    patch((p) => ({
                      ...p,
                      coin: { ...p.coin, placement: 'after' },
                    }))
                  }
                >
                  <Text style={styles.sekmeYazi}>İkon sonra</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {sekme === 'onizleme' ? (
            <View
              style={[
                styles.preview,
                { backgroundColor: payload.theme.background },
              ]}
            >
              <Text style={[styles.previewEye, { color: payload.theme.secondaryText }]}>
                {payload.general.eyebrow}
              </Text>
              <View style={styles.baslikSatir}>
                <CuzdanDinamikSimge icon={payload.wallet_icon} />
                <Text style={{ color: payload.theme.primaryText, fontSize: 22, fontWeight: '800' }}>
                  {payload.general.screen_name}
                </Text>
              </View>
              {CuzdanBolumAcikMi(payload, 'hero_card') ? (
                <View
                  style={[
                    styles.previewKart,
                    { backgroundColor: payload.theme.cardBackground },
                  ]}
                >
                  <Text
                    style={{
                      color: payload.theme.accent,
                      fontSize: 11,
                      fontWeight: '800',
                      letterSpacing: 2,
                    }}
                  >
                    {(payload.brand?.name || 'MUTA PAY').toUpperCase()}
                  </Text>
                  <Text style={{ color: payload.theme.secondaryText, fontSize: 12 }}>
                    {payload.brand?.card_type || 'Dijital cüzdan'}
                  </Text>
                  {payload.brand?.tagline_visible !== false &&
                  payload.brand?.tagline ? (
                    <Text
                      style={{
                        color: payload.theme.secondaryText,
                        fontSize: 10,
                        lineHeight: 14,
                        marginTop: 4,
                        opacity: 0.85,
                      }}
                    >
                      {payload.brand.tagline}
                    </Text>
                  ) : null}
                  <View style={[styles.baslikSatir, { marginTop: 12 }]}>
                    {payload.coin.show_beside_amount &&
                    payload.coin.placement === 'before' ? (
                      <CuzdanDinamikSimge
                        icon={payload.coin}
                        fallbackIonicon="logo-bitcoin"
                      />
                    ) : null}
                    <Text style={{ color: payload.theme.accent, fontSize: 28, fontWeight: '900' }}>
                      12.450
                    </Text>
                    {payload.coin.show_beside_amount &&
                    payload.coin.placement === 'after' ? (
                      <CuzdanDinamikSimge
                        icon={payload.coin}
                        fallbackIonicon="logo-bitcoin"
                      />
                    ) : null}
                  </View>
                  <Text style={{ color: payload.theme.secondaryText }}>
                    {payload.coin.name} bakiyesi (örnek)
                  </Text>
                  {payload.value_summary?.enabled !== false &&
                  payload.value_summary?.show_seller_net ? (
                    <Text
                      style={{
                        color: payload.theme.secondaryText,
                        fontSize: 11,
                        marginTop: 8,
                      }}
                    >
                      {payload.value_summary.seller_net_label}: örnek tutar
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {CuzdanBolumAcikMi(payload, 'quick_actions') ? (
                <CuzdanDinamikAksiyonGrid
                  actions={onizlemeAksiyonlar}
                  onPress={() => undefined}
                />
              ) : null}
              {CuzdanBolumAcikMi(payload, 'coin_info') ? (
                <Text style={{ color: payload.theme.secondaryText, fontSize: 12, marginTop: 8 }}>
                  {CuzdanMetinAl(payload, 'coin_info', 'tr')}
                </Text>
              ) : null}
            </View>
          ) : null}

          {sekme === 'surumler' ? (
            <View style={styles.kart}>
              {surumler.map((s) => (
                <View key={String(s.id)} style={styles.satir}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.satirBaslik}>
                      v{String(s.version_no)} · {String(s.status)}
                    </Text>
                    <Text style={styles.satirAlt}>
                      {String(s.label ?? '')} {s.published_at ? `· ${s.published_at}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {sekme === 'gecmis' ? (
            <View style={styles.kart}>
              {audit.map((a) => (
                <View key={String(a.id)} style={styles.satir}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.satirBaslik}>{String(a.action)}</Text>
                    <Text style={styles.satirAlt}>
                      {String(a.config_key ?? '')} · {String(a.created_at ?? '')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function Alan({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 4, marginBottom: 10 }}>
      <Text style={styles.alanLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
        placeholderTextColor={RenkTokenlari.textDim}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: 8,
    marginBottom: 8,
  },
  meta: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  toolbarBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  yayin: { backgroundColor: 'rgba(232,64,145,0.25)' },
  toolBtnYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  sekmeSerit: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: 6,
    paddingBottom: 8,
  },
  sekme: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  sekmeAktif: { backgroundColor: 'rgba(232,64,145,0.22)' },
  sekmeYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
  },
  sekmeYaziAktif: { color: RenkTokenlari.primarySoft },
  body: {
    padding: BoslukTokenlari.lg,
    paddingBottom: 80,
    gap: 12,
  },
  kart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 4,
  },
  bolum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
    marginBottom: 8,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  satirBaslik: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  satirAlt: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  ok: { padding: 4 },
  butonKart: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  alanLabel: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  input: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    color: RenkTokenlari.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  simgeOniz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  preview: {
    borderRadius: YaricapTokenlari.lg,
    padding: 16,
    gap: 12,
    minHeight: 320,
  },
  previewEye: { fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  baslikSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewKart: {
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
});
