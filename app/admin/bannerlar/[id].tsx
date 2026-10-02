import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GaleriAc } from '../../../src/ortak/medya/ImagePickerHazirMi';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { GradientButton } from '../../../src/components/GradientButton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { BannerAdminService } from '../../../src/banner/admin/BannerAdminService';
import {
  ACTION_TYPE_LABELS,
  BANNER_STATUS_LABELS,
  type BannerAdminSavePayload,
} from '../../../src/banner/admin/BannerAdminTypes';
import {
  BANNER_CUSTOM_ASPECT_OPTIONS,
  BANNER_SIZE_PRESETS,
  BANNER_TAG_PRESETS,
  MANUAL_BANNER_PLACEMENT_KEYS,
  MANUAL_BANNER_SCREEN_KEYS,
  PLACEMENT_LABELS,
  SCREEN_LABELS,
} from '../../../src/banner/core/BannerConstants';
import type {
  BannerAction,
  BannerAnalyticsSummary,
  BannerCampaign,
  BannerMediaType,
  BannerStatus,
  BannerTarget,
} from '../../../src/banner/core/BannerTypes';
import type { BannerSizeType } from '../../../src/banner/core/BannerConstants';
import { BannerCard } from '../../../src/banner/components/BannerCard';
import { BannerRoomCard } from '../../../src/banner/components/BannerRoomCard';
import { bannerOdaKartMi } from '../../../src/banner/core/BannerPlacementEngine';
import { BANNER_ROOM_CARD_TAG } from '../../../src/banner/core/BannerConstants';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { UlkeKodunaNormalizeEt } from '../../../src/ortak/ulke/UlkeKodunaNormalizeEt';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import { MedyaUriGuvenli } from '../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { FEED_KART_ORANI } from '../../../src/moduller/ana-sayfa/sabitler/FeedKartOrani';

const MEDIA_TYPES: BannerMediaType[] = [
  'IMAGE',
  'VIDEO',
  'GRADIENT',
  'IMAGE_TEXT',
  'VIDEO_TEXT',
];
const SIZE_TYPES: BannerSizeType[] = [
  'SMALL',
  'MEDIUM',
  'LARGE',
  'HERO',
  'CUSTOM',
];
const STATUSES: BannerStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'ARCHIVED',
];
const ACTION_TYPES = Object.keys(ACTION_TYPE_LABELS);

function emptyForm(): BannerAdminSavePayload {
  return {
    name: '',
    internal_name: '',
    title: '',
    subtitle: '',
    description: '',
    badge: '',
    media_type: 'IMAGE_TEXT',
    media_url: '',
    thumbnail_url: '',
    size_type: 'SMALL',
    aspect_ratio: '4:1',
    priority: 50,
    status: 'DRAFT',
    start_at: null,
    end_at: null,
    daily_start_time: null,
    daily_end_time: null,
    dismissible: true,
    frequency_type: 'unlimited',
    shimmer_enabled: false,
    autoplay_video: true,
    loop_video: true,
    tags: [],
    placements: [
      {
        screen_key: 'FEED',
        placement_key: 'FEED_AFTER_POST_6',
        sort_order: 0,
      },
    ],
    targets: [
      {
        target_mode: 'ALL',
        platform: 'ALL',
        user_segment: 'ALL_USERS',
      },
    ],
    actions: [
      {
        slot: 0,
        action_type: 'NONE',
        button_text: '',
        url: '',
        target: '',
        payload_json: {},
      },
    ],
  };
}

function fromCampaign(c: BannerCampaign): BannerAdminSavePayload {
  return {
    id: c.id,
    name: c.name,
    internal_name: c.internal_name,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    badge: c.badge,
    label: c.label,
    media_type: c.media_type,
    media_url: c.media_url,
    thumbnail_url: c.thumbnail_url,
    media_alt: c.media_alt,
    gradient_json: c.gradient_json as Record<string, unknown> | null,
    size_type: c.size_type,
    aspect_ratio: c.aspect_ratio,
    priority: c.priority,
    status: c.status,
    start_at: c.start_at,
    end_at: c.end_at,
    daily_start_time: c.daily_start_time,
    daily_end_time: c.daily_end_time,
    dismissible: c.dismissible,
    frequency_type: c.frequency_type,
    max_daily_impressions: c.max_daily_impressions,
    max_weekly_impressions: c.max_weekly_impressions,
    max_session_impressions: c.max_session_impressions,
    shimmer_enabled: c.shimmer_enabled,
    autoplay_video: c.autoplay_video,
    loop_video: c.loop_video,
    carousel_auto_slide_ms: c.carousel_auto_slide_ms,
    tags: c.tags ?? [],
    placements: c.placements ?? [],
    targets: c.targets ?? [],
    actions: c.actions ?? [],
  };
}

export default function AdminBannerDuzenleEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const params = useLocalSearchParams<{ id?: string; tab?: string }>();
  const isNew = !params.id || params.id === 'yeni';
  const [form, setForm] = useState<BannerAdminSavePayload>(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analytics, setAnalytics] = useState<BannerAnalyticsSummary | null>(
    null,
  );
  const [tab, setTab] = useState<'edit' | 'analytics' | 'preview'>(
    params.tab === 'analytics' ? 'analytics' : 'edit',
  );
  const [previewDevice, setPreviewDevice] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    if (!admin) {
      router.replace('/(tabs)/profile');
      return;
    }
    if (isNew) return;
    setLoading(true);
    BannerAdminService.list()
      .then((list) => {
        const found = list.find((b) => b.id === params.id);
        if (!found) {
          Alert.alert('Bulunamadı', 'Banner yok');
          router.back();
          return;
        }
        setForm(fromCampaign(found));
      })
      .catch((e) => Alert.alert('Hata', e.message))
      .finally(() => setLoading(false));
  }, [admin, isNew, params.id]);

  useEffect(() => {
    if (isNew || tab !== 'analytics' || !params.id) return;
    BannerAdminService.analytics(params.id)
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [isNew, tab, params.id]);

  const patch = useCallback((p: Partial<BannerAdminSavePayload>) => {
    setForm((f) => ({ ...f, ...p }));
  }, []);

  const pickMedia = async (tur: 'image' | 'video') => {
    const secim = await GaleriAc({
      mediaTypes: tur === 'video' ? ['videos'] : ['images'],
    });
    if (!secim.ok) {
      if (!secim.iptal) Alert.alert('Medya', secim.hata);
      return;
    }
    const asset = secim.asset;
    setUploading(true);
    try {
      const uploaded = await BannerAdminService.uploadMedia({
        uri: asset.uri,
        mime: asset.mimeType,
        tur,
        bannerId: form.id,
      });
      if (tur === 'image') {
        patch({ media_url: uploaded.url });
      } else {
        patch({
          media_url: uploaded.url,
          thumbnail_url: form.thumbnail_url || uploaded.url,
        });
      }
    } catch (e) {
      Alert.alert('Yükleme', e instanceof Error ? e.message : 'Başarısız');
    } finally {
      setUploading(false);
    }
  };

  const save = async (status?: BannerStatus) => {
    if (!form.name.trim()) {
      Alert.alert('Eksik', 'Banner adı zorunlu');
      return;
    }
    // Manuel bannerlar yalnızca feed — ses odası vb. temizle
    let placements = (form.placements ?? []).filter(
      (p) =>
        p.screen_key === 'FEED' ||
        MANUAL_BANNER_PLACEMENT_KEYS.includes(
          p.placement_key as (typeof MANUAL_BANNER_PLACEMENT_KEYS)[number],
        ),
    );
    if (placements.length === 0) {
      placements = [
        {
          screen_key: 'FEED',
          placement_key: 'FEED_AFTER_POST_6',
          sort_order: 0,
        },
      ];
    }
    const webAksiyonlar = (form.actions ?? []).filter(
      (a) =>
        a.action_type === 'WEB_URL' || a.action_type === 'IN_APP_WEBVIEW',
    );
    for (const a of webAksiyonlar) {
      const url = (a.url ?? a.target ?? '').trim();
      if (!url || url === 'https://' || url === 'http://') {
        Alert.alert(
          'Eksik URL',
          'Web aksiyonu için tam HTTPS adresi gir (ör. https://ornek.com).',
        );
        return;
      }
      try {
        const u = new URL(url);
        if (u.protocol !== 'https:' || !u.hostname) {
          Alert.alert('Geçersiz URL', 'Sadece https:// ile başlayan geçerli adresler.');
          return;
        }
      } catch {
        Alert.alert('Geçersiz URL', 'Web adresi hatalı.');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        placements,
        status: status ?? form.status,
      };
      if (payload.size_type !== 'CUSTOM') {
        payload.aspect_ratio =
          BANNER_SIZE_PRESETS[
            payload.size_type as Exclude<BannerSizeType, 'CUSTOM'>
          ]?.aspectRatio ?? payload.aspect_ratio;
      }
      const id = await BannerAdminService.save(payload);
      Alert.alert('Kaydedildi', status === 'ACTIVE' ? 'Banner yayında' : 'Taslak kaydedildi');
      if (isNew) {
        router.replace(`/admin/bannerlar/${id}` as never);
      } else {
        patch({ id, status: payload.status, placements });
      }
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  };

  const placement = form.placements?.[0]?.placement_key ?? 'FEED_AFTER_POST_6';

  const onizlemeKampanya = useMemo(
    () => formdanOnizlemeKampanya(form),
    [form],
  );

  const toggleTag = (tag: string) => {
    const tags = form.tags ?? [];
    patch({
      tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    });
  };

  const setPlacement = (screen_key: string, placement_key: string) => {
    const rest = (form.placements ?? []).filter(
      (p) => !(p.screen_key === screen_key && p.placement_key === placement_key),
    );
    const exists = (form.placements ?? []).some(
      (p) => p.screen_key === screen_key && p.placement_key === placement_key,
    );
    patch({
      placements: exists
        ? rest
        : [...rest, { screen_key, placement_key, sort_order: rest.length }],
    });
  };

  const updateAction = (slot: 0 | 1, patchAction: Partial<BannerAction>) => {
    const actions = [...(form.actions ?? [])];
    const idx = actions.findIndex((a) => a.slot === slot);
    if (idx >= 0) {
      actions[idx] = { ...actions[idx], ...patchAction };
    } else {
      actions.push({
        slot,
        action_type: 'NONE',
        button_text: '',
        ...patchAction,
      } as BannerAction);
    }
    patch({ actions });
  };

  const updateTarget = (patchTarget: Partial<BannerTarget>) => {
    const t = form.targets?.[0] ?? {
      target_mode: 'ALL' as const,
      platform: 'ALL' as const,
      user_segment: 'ALL_USERS' as const,
    };
    patch({ targets: [{ ...t, ...patchTarget }] });
  };

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={RenkTokenlari.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={isNew ? 'Yeni banner' : 'Banner düzenle'}
        subtitle={form.name || 'Kampanya formu'}
        onBack={() => router.back()}
      />

      <View style={styles.tabs}>
        {(['edit', 'preview', 'analytics'] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'edit' ? 'Form' : t === 'preview' ? 'Önizleme' : 'Analitik'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={AdminStil.content}>
        {tab === 'analytics' && (
          <View style={styles.block}>
            {!analytics ? (
              <Text style={styles.hint}>Veri yok veya yükleniyor…</Text>
            ) : (
              <>
                <Kpi label="Impressions" value={analytics.impressions} />
                <Kpi label="Clicks" value={analytics.clicks} />
                <Kpi label="CTR %" value={analytics.ctr} />
                <Kpi label="Unique viewers" value={analytics.unique_viewers} />
                <Kpi label="Unique clicks" value={analytics.unique_clicks} />
                <Kpi label="Dismiss" value={analytics.dismiss_count} />
                <Kpi label="Video views" value={analytics.video_views} />
                <Kpi label="Video complete" value={analytics.video_completion} />
                <Kpi label="WebView open" value={analytics.webview_open} />
              </>
            )}
          </View>
        )}

        {tab === 'preview' && (
          <View style={styles.block}>
            <View style={styles.rowWrap}>
              <Chip
                label="iPhone"
                active={previewDevice === 'ios'}
                onPress={() => setPreviewDevice('ios')}
              />
              <Chip
                label="Android"
                active={previewDevice === 'android'}
                onPress={() => setPreviewDevice('android')}
              />
            </View>
            <Text style={styles.hint}>
              Feed simülasyonu · {previewDevice === 'ios' ? 'iPhone' : 'Android'} ·{' '}
              {placement} · {form.size_type} · {form.aspect_ratio || '—'}
            </Text>
            <View
              style={[
                styles.previewFrame,
                previewDevice === 'android' && styles.previewAndroid,
              ]}
            >
              <FeedSimulasyonOnizleme
                kampanya={onizlemeKampanya}
                placement={placement}
              />
            </View>
          </View>
        )}

        {tab === 'edit' && (
          <>
            <Label>Banner adı *</Label>
            <Input
              value={form.name}
              onChangeText={(name) => patch({ name })}
              placeholder="Admin görünür ad"
            />
            <Label>Internal name</Label>
            <Input
              value={form.internal_name ?? ''}
              onChangeText={(internal_name) => patch({ internal_name })}
            />
            <Label>Başlık</Label>
            <Input value={form.title ?? ''} onChangeText={(title) => patch({ title })} />
            <Label>Alt başlık</Label>
            <Input
              value={form.subtitle ?? ''}
              onChangeText={(subtitle) => patch({ subtitle })}
            />
            <Label>Açıklama</Label>
            <Input
              value={form.description ?? ''}
              onChangeText={(description) => patch({ description })}
              multiline
            />
            <Label>Badge</Label>
            <Input value={form.badge ?? ''} onChangeText={(badge) => patch({ badge })} />

            <Label>Medya tipi</Label>
            <View style={styles.rowWrap}>
              {MEDIA_TYPES.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  active={form.media_type === m}
                  onPress={() => patch({ media_type: m })}
                />
              ))}
            </View>

            <Label>Ölçü</Label>
            <View style={styles.rowWrap}>
              {SIZE_TYPES.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  active={form.size_type === s}
                  onPress={() => {
                    const ratio =
                      s === 'CUSTOM'
                        ? form.aspect_ratio
                        : BANNER_SIZE_PRESETS[s].aspectRatio;
                    patch({ size_type: s, aspect_ratio: ratio });
                  }}
                />
              ))}
            </View>
            {form.size_type === 'CUSTOM' && (
              <View style={styles.rowWrap}>
                {BANNER_CUSTOM_ASPECT_OPTIONS.map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    active={form.aspect_ratio === r}
                    onPress={() => patch({ aspect_ratio: r })}
                  />
                ))}
              </View>
            )}

            <Label>Görsel / video</Label>
            <View style={styles.rowWrap}>
              <Chip
                label={uploading ? 'Yükleniyor…' : 'Resim seç'}
                active={false}
                onPress={() => void pickMedia('image')}
              />
              <Chip
                label="Video seç"
                active={false}
                onPress={() => void pickMedia('video')}
              />
            </View>
            {MedyaUriGuvenli(form.thumbnail_url || form.media_url) ? (
              <Image
                source={{ uri: MedyaUriGuvenli(form.thumbnail_url || form.media_url)! }}
                style={styles.previewImg}
              />
            ) : null}
            <Input
              value={form.media_url ?? ''}
              onChangeText={(media_url) => patch({ media_url })}
              placeholder="media_url"
            />

            <Label>Etiketler</Label>
            <View style={styles.rowWrap}>
              {BANNER_TAG_PRESETS.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  active={(form.tags ?? []).includes(t)}
                  onPress={() => toggleTag(t)}
                />
              ))}
            </View>

            <Label>Feed yerleşimi (manuel banner yalnızca feed’de)</Label>
            <Text style={styles.hint}>
              Ses odası ve diğer ekranlara gitmez. Slot seç — feed’de o noktada
              görünür.
            </Text>
            {MANUAL_BANNER_SCREEN_KEYS.map((screen) => (
              <View key={screen} style={{ gap: 6 }}>
                <Text style={styles.subLabel}>
                  {SCREEN_LABELS[screen] ?? screen}
                </Text>
                <View style={styles.rowWrap}>
                  {MANUAL_BANNER_PLACEMENT_KEYS.map((pk) => {
                    const active = (form.placements ?? []).some(
                      (p) => p.placement_key === pk,
                    );
                    return (
                      <Chip
                        key={pk}
                        label={PLACEMENT_LABELS[pk] ?? pk}
                        active={active}
                        onPress={() => setPlacement(screen, pk)}
                      />
                    );
                  })}
                </View>
              </View>
            ))}

            <Label>Canlı feed simülasyonu</Label>
            <Text style={styles.hint}>
              Renk, ölçü ve yerleşim — ana sayfa feed’inde böyle görünür.
            </Text>
            <View style={styles.liveSimBox}>
              <FeedSimulasyonOnizleme
                kampanya={onizlemeKampanya}
                placement={placement}
              />
            </View>

            <Label>Platform</Label>
            <View style={styles.rowWrap}>
              {(['ALL', 'IOS', 'ANDROID'] as const).map((p) => (
                <Chip
                  key={p}
                  label={p}
                  active={(form.targets?.[0]?.platform ?? 'ALL') === p}
                  onPress={() => updateTarget({ platform: p })}
                />
              ))}
            </View>

            <Label>Kullanıcı segmenti</Label>
            <View style={styles.rowWrap}>
              {(
                [
                  'ALL_USERS',
                  'GUEST',
                  'REGISTERED',
                  'NEW_USER',
                  'ACTIVE_USER',
                  'VIP',
                  'CREATOR',
                  'ROOM_HOST',
                ] as const
              ).map((s) => (
                <Chip
                  key={s}
                  label={s}
                  active={(form.targets?.[0]?.user_segment ?? 'ALL_USERS') === s}
                  onPress={() => updateTarget({ user_segment: s })}
                />
              ))}
            </View>

            <Label>Hedef ülke / şehir</Label>
            <Input
              value={form.targets?.[0]?.country_code ?? form.targets?.[0]?.country ?? ''}
              onChangeText={(raw) => {
                const code = UlkeKodunaNormalizeEt(raw);
                updateTarget({
                  country: raw,
                  country_code: code,
                  target_mode: raw.trim() ? 'COUNTRY' : 'ALL',
                });
              }}
              placeholder="TR (veya Türkiye)"
            />
            <Input
              value={form.targets?.[0]?.city ?? ''}
              onChangeText={(city) =>
                updateTarget({
                  city,
                  target_mode: city ? 'CITY' : form.targets?.[0]?.country ? 'COUNTRY' : 'ALL',
                })
              }
              placeholder="Trabzon / İstanbul"
            />
            <Label>Min / Max level</Label>
            <View style={styles.row}>
              <Input
                style={{ flex: 1 }}
                value={String(form.targets?.[0]?.min_level ?? '')}
                onChangeText={(v) =>
                  updateTarget({ min_level: v ? Number(v) : null })
                }
                keyboardType="number-pad"
                placeholder="min"
              />
              <Input
                style={{ flex: 1 }}
                value={String(form.targets?.[0]?.max_level ?? '')}
                onChangeText={(v) =>
                  updateTarget({ max_level: v ? Number(v) : null })
                }
                keyboardType="number-pad"
                placeholder="max"
              />
            </View>

            <Label>CTA 1</Label>
            <Input
              value={form.actions?.find((a) => a.slot === 0)?.button_text ?? ''}
              onChangeText={(button_text) => updateAction(0, { button_text })}
              placeholder="Buton metni"
            />
            <View style={styles.rowWrap}>
              {ACTION_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={ACTION_TYPE_LABELS[t] ?? t}
                  active={
                    (form.actions?.find((a) => a.slot === 0)?.action_type ??
                      'NONE') === t
                  }
                  onPress={() =>
                    updateAction(0, {
                      action_type: t as BannerAction['action_type'],
                    })
                  }
                />
              ))}
            </View>
            <Input
              value={form.actions?.find((a) => a.slot === 0)?.url ?? ''}
              onChangeText={(url) => updateAction(0, { url })}
              placeholder="URL / deep link"
            />
            <Input
              value={form.actions?.find((a) => a.slot === 0)?.target ?? ''}
              onChangeText={(target) => updateAction(0, { target })}
              placeholder="Internal target id / username / phone"
            />
            <Input
              value={String(
                (form.actions?.find((a) => a.slot === 0)?.payload_json
                  ?.message as string) ?? '',
              )}
              onChangeText={(message) =>
                updateAction(0, {
                  payload_json: {
                    ...(form.actions?.find((a) => a.slot === 0)?.payload_json ??
                      {}),
                    message,
                    phoneNumber:
                      form.actions?.find((a) => a.slot === 0)?.target ?? '',
                  },
                })
              }
              placeholder="WhatsApp mesajı (opsiyonel)"
            />

            <Label>CTA 2 (opsiyonel)</Label>
            <Input
              value={form.actions?.find((a) => a.slot === 1)?.button_text ?? ''}
              onChangeText={(button_text) => updateAction(1, { button_text })}
              placeholder="İkinci buton"
            />
            <Input
              value={form.actions?.find((a) => a.slot === 1)?.url ?? ''}
              onChangeText={(url) =>
                updateAction(1, {
                  url,
                  action_type:
                    form.actions?.find((a) => a.slot === 1)?.action_type ??
                    'IN_APP_WEBVIEW',
                })
              }
              placeholder="CTA 2 URL"
            />

            <Label>Başlangıç / Bitiş (ISO)</Label>
            <Input
              value={form.start_at ?? ''}
              onChangeText={(start_at) => patch({ start_at: start_at || null })}
              placeholder="2026-09-15T08:00:00Z"
            />
            <Input
              value={form.end_at ?? ''}
              onChangeText={(end_at) => patch({ end_at: end_at || null })}
              placeholder="2026-09-20T23:59:00Z"
            />
            <Label>Günlük saat (HH:MM)</Label>
            <View style={styles.row}>
              <Input
                style={{ flex: 1 }}
                value={(form.daily_start_time ?? '').slice(0, 5)}
                onChangeText={(daily_start_time) =>
                  patch({
                    daily_start_time: daily_start_time
                      ? `${daily_start_time}:00`
                      : null,
                  })
                }
                placeholder="18:00"
              />
              <Input
                style={{ flex: 1 }}
                value={(form.daily_end_time ?? '').slice(0, 5)}
                onChangeText={(daily_end_time) =>
                  patch({
                    daily_end_time: daily_end_time
                      ? `${daily_end_time}:00`
                      : null,
                  })
                }
                placeholder="23:00"
              />
            </View>

            <Label>Priority</Label>
            <Input
              value={String(form.priority)}
              onChangeText={(v) => patch({ priority: Number(v) || 0 })}
              keyboardType="number-pad"
            />

            <Label>Frequency</Label>
            <View style={styles.rowWrap}>
              {(
                [
                  'unlimited',
                  '1_per_session',
                  '1_per_day',
                  '3_per_day',
                  '5_per_week',
                  'custom',
                ] as const
              ).map((f) => (
                <Chip
                  key={f}
                  label={f}
                  active={form.frequency_type === f}
                  onPress={() => patch({ frequency_type: f })}
                />
              ))}
            </View>
            {form.frequency_type === 'custom' && (
              <Input
                value={String(form.max_daily_impressions ?? '')}
                onChangeText={(v) =>
                  patch({ max_daily_impressions: v ? Number(v) : null })
                }
                placeholder="max günlük gösterim"
                keyboardType="number-pad"
              />
            )}

            <RowSwitch
              label="Kapatılabilir (X)"
              value={!!form.dismissible}
              onChange={(dismissible) => patch({ dismissible })}
            />
            <RowSwitch
              label="Shimmer"
              value={!!form.shimmer_enabled}
              onChange={(shimmer_enabled) => patch({ shimmer_enabled })}
            />
            <RowSwitch
              label="Video autoplay"
              value={!!form.autoplay_video}
              onChange={(autoplay_video) => patch({ autoplay_video })}
            />
            <RowSwitch
              label="Video loop"
              value={!!form.loop_video}
              onChange={(loop_video) => patch({ loop_video })}
            />

            <Label>Durum</Label>
            <View style={styles.rowWrap}>
              {STATUSES.map((s) => (
                <Chip
                  key={s}
                  label={BANNER_STATUS_LABELS[s]}
                  active={form.status === s}
                  onPress={() => patch({ status: s })}
                />
              ))}
            </View>

            <GradientButton
              title={saving ? 'Kaydediliyor…' : 'Taslak kaydet'}
              onPress={() => void save('DRAFT')}
              disabled={saving}
            />
            <GradientButton
              title="Yayınla (ACTIVE)"
              onPress={() => void save('ACTIVE')}
              disabled={saving}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function formdanOnizlemeKampanya(
  form: BannerAdminSavePayload,
): BannerCampaign {
  const now = new Date().toISOString();
  const tags = [...(form.tags ?? [])];
  if (
    form.size_type === 'CUSTOM' &&
    (form.aspect_ratio === '19:25' || form.aspect_ratio === '0.76') &&
    !tags.includes(BANNER_ROOM_CARD_TAG)
  ) {
    tags.push(BANNER_ROOM_CARD_TAG);
  }
  return {
    id: form.id ?? 'preview-local',
    name: form.name || 'Önizleme',
    internal_name: form.internal_name ?? null,
    title: form.title ?? null,
    subtitle: form.subtitle ?? null,
    description: form.description ?? null,
    badge: form.badge ?? null,
    label: form.label ?? null,
    media_type: form.media_type,
    media_url: form.media_url ?? null,
    thumbnail_url: form.thumbnail_url ?? null,
    media_alt: form.media_alt ?? null,
    gradient_json: (form.gradient_json as BannerCampaign['gradient_json']) ?? {
      colors: [RenkTokenlari.deepPlum, RenkTokenlari.primary],
    },
    size_type: form.size_type,
    aspect_ratio: form.aspect_ratio ?? '4:1',
    priority: form.priority ?? 50,
    status: 'ACTIVE',
    start_at: null,
    end_at: null,
    daily_start_time: null,
    daily_end_time: null,
    dismissible: !!form.dismissible,
    frequency_type: form.frequency_type ?? 'unlimited',
    max_daily_impressions: form.max_daily_impressions ?? null,
    max_weekly_impressions: form.max_weekly_impressions ?? null,
    max_session_impressions: form.max_session_impressions ?? null,
    shimmer_enabled: !!form.shimmer_enabled,
    autoplay_video: !!form.autoplay_video,
    loop_video: !!form.loop_video,
    carousel_auto_slide_ms: form.carousel_auto_slide_ms ?? 3000,
    tags,
    created_by: null,
    created_at: now,
    updated_at: now,
    placements: form.placements ?? [],
    targets: form.targets ?? [],
    actions: form.actions ?? [],
  };
}

function FeedSimulasyonOnizleme({
  kampanya,
  placement,
}: {
  kampanya: BannerCampaign;
  placement: string;
}) {
  const odaKart = bannerOdaKartMi(kampanya);
  return (
    <View style={styles.feedSim}>
      <Text style={styles.feedSimBaslik}>Ana sayfa feed</Text>
      <View style={styles.feedSimSatir}>
        <View style={[styles.feedSimKart, { aspectRatio: FEED_KART_ORANI }]}>
          <Text style={styles.feedSimKartYazi}>Ses odası</Text>
        </View>
        <View style={[styles.feedSimKart, { aspectRatio: FEED_KART_ORANI }]}>
          <Text style={styles.feedSimKartYazi}>Canlı</Text>
        </View>
      </View>
      <Text style={styles.feedSimSlot}>Banner · {placement}</Text>
      {odaKart ? (
        <View style={styles.feedSimSatir}>
          <View style={{ flex: 1 }}>
            <BannerRoomCard
              banner={kampanya}
              placement={placement}
              screen="ADMIN_PREVIEW"
              sessionId="preview"
              interaktif={false}
            />
          </View>
          <View style={[styles.feedSimKart, { aspectRatio: FEED_KART_ORANI, flex: 1 }]}>
            <Text style={styles.feedSimKartYazi}>Oda</Text>
          </View>
        </View>
      ) : (
        <BannerCard
          banner={kampanya}
          placement={placement}
          screen="ADMIN_PREVIEW"
          sessionId="preview"
          compact
        />
      )}
      <View style={styles.feedSimSatir}>
        <View style={[styles.feedSimKart, { aspectRatio: FEED_KART_ORANI }]}>
          <Text style={styles.feedSimKartYazi}>Oda</Text>
        </View>
        <View style={[styles.feedSimKart, { aspectRatio: FEED_KART_ORANI }]}>
          <Text style={styles.feedSimKartYazi}>Oda</Text>
        </View>
      </View>
    </View>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={RenkTokenlari.textDim}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function RowSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: RenkTokenlari.primary }}
      />
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiN}>{value}</Text>
      <Text style={styles.kpiL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
  },
  tabActive: {
    backgroundColor: RenkTokenlari.primary,
  },
  tabText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  label: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
  },
  subLabel: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipActive: {
    borderColor: RenkTokenlari.primary,
    backgroundColor: 'rgba(232,64,145,0.18)',
  },
  chipText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  chipTextActive: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  previewImg: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.surface,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchLabel: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  block: {
    gap: 10,
  },
  hint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  previewFrame: {
    borderWidth: 2,
    borderColor: RenkTokenlari.border,
    borderRadius: 28,
    paddingVertical: 16,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bg,
  },
  previewAndroid: {
    borderRadius: 12,
  },
  liveSimBox: {
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    padding: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.bg,
  },
  feedSim: {
    gap: BoslukTokenlari.sm,
  },
  feedSimBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  feedSimSlot: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  feedSimSatir: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
  },
  feedSimKart: {
    flex: 1,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  feedSimKartYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  localPreview: {
    marginHorizontal: BoslukTokenlari.lg,
    padding: BoslukTokenlari.md,
    borderRadius: 22,
    backgroundColor: 'rgba(24,20,38,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  localPreviewImg: {
    width: '100%',
    height: 120,
    borderRadius: 14,
  },
  localTitle: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kpi: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  kpiN: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
  },
  kpiL: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
});
