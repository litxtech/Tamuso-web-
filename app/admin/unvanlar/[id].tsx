import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { GradientButton } from '../../../src/components/GradientButton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminUnvanArsivle,
  AdminUnvanDetay,
  AdminUnvanKaydet,
  AdminUnvanKopyala,
} from '../../../src/moduller/unvanlar/islemler/UnvanAdminIslemleri';
import { UserIdentityRow } from '../../../src/moduller/unvanlar/bilesenler/UserIdentityRow';
import { UserTitleBadge } from '../../../src/moduller/unvanlar/bilesenler/UserTitleBadge';
import { UnvanDusukKontrastMi } from '../../../src/moduller/unvanlar/kontrast/UnvanKontrastUyari';
import { UNVAN_TASARIM_VARSAYILAN } from '../../../src/moduller/unvanlar/dogrulama/UnvanTasarimZod';
import { UNVAN_PRESETLERI } from '../../../src/moduller/unvanlar/sabitlemeler/UnvanPresetleri';
import { UNVAN_IKON_LISTESI } from '../../../src/moduller/unvanlar/sabitlemeler/UnvanIkonKutuphanesi';
import {
  UNVAN_ANIMATIONS,
  UNVAN_BG_TYPES,
  UNVAN_GRADIENT_DIRS,
  UNVAN_GLOW,
  UNVAN_ICON_POSITIONS,
  UNVAN_SHAPES,
  UNVAN_SIZES,
  type TitlePresentationModel,
  type UnvanDesign,
} from '../../../src/moduller/unvanlar/tipler';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Form = {
  name: string;
  slug: string;
  description: string;
  nameTr: string;
  nameEn: string;
  is_active: boolean;
  selection_locked: boolean;
  priority: string;
  design: UnvanDesign;
};

function emptyForm(): Form {
  return {
    name: '',
    slug: '',
    description: '',
    nameTr: '',
    nameEn: '',
    is_active: true,
    selection_locked: false,
    priority: '100',
    design: { ...UNVAN_TASARIM_VARSAYILAN },
  };
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
      style={[styles.chip, active && styles.chipAktif]}
      onPress={onPress}
    >
      <Text style={[styles.chipYazi, active && styles.chipYaziAktif]}>{label}</Text>
    </Pressable>
  );
}

export default function AdminUnvanEditorEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const params = useLocalSearchParams<{ id?: string }>();
  const isNew = !params.id || params.id === 'yeni';
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [previewDark, setPreviewDark] = useState(true);
  const [titleId, setTitleId] = useState<string | null>(isNew ? null : params.id ?? null);

  useEffect(() => {
    if (!admin) {
      router.replace('/(tabs)/profile');
      return;
    }
    if (isNew) return;
    setLoading(true);
    void AdminUnvanDetay(params.id!)
      .then((res) => {
        if (!res.ok || !res.title) {
          Alert.alert('Bulunamadı', res.hata ?? 'Ünvan yok');
          router.back();
          return;
        }
        const t = res.title;
        setTitleId(t.id);
        setForm({
          name: t.name,
          slug: t.slug,
          description: t.description ?? '',
          nameTr: t.name_i18n?.tr ?? '',
          nameEn: t.name_i18n?.en ?? '',
          is_active: t.is_active,
          selection_locked: t.selection_locked,
          priority: String(t.priority ?? 100),
          design: { ...UNVAN_TASARIM_VARSAYILAN, ...(t.design as UnvanDesign) },
        });
      })
      .catch((e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [admin, isNew, params.id]);

  const patch = useCallback((p: Partial<Form>) => {
    setForm((f) => ({ ...f, ...p }));
  }, []);

  const patchDesign = useCallback((p: Partial<UnvanDesign>) => {
    setForm((f) => ({ ...f, design: { ...f.design, ...p } }));
  }, []);

  const preview: TitlePresentationModel = useMemo(
    () => ({
      id: titleId ?? 'preview',
      slug: form.slug || 'preview',
      label: form.name.trim() || 'Ünvan',
      design: form.design,
      version: 1,
      priority: Number(form.priority) || 100,
    }),
    [form.design, form.name, form.priority, form.slug, titleId],
  );

  const dusukKontrast = UnvanDusukKontrastMi(
    form.design.textColor,
    form.design.backgroundColor,
  );

  const kaydet = async () => {
    if (!form.name.trim()) {
      Alert.alert('Eksik', 'Ünvan adı gerekli.');
      return;
    }
    setSaving(true);
    try {
      const name_i18n: Record<string, string> = {};
      if (form.nameTr.trim()) name_i18n.tr = form.nameTr.trim();
      if (form.nameEn.trim()) name_i18n.en = form.nameEn.trim();
      const res = await AdminUnvanKaydet({
        id: titleId,
        slug: form.slug.trim() || null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        name_i18n: Object.keys(name_i18n).length ? name_i18n : null,
        design: form.design,
        is_active: form.is_active,
        selection_locked: form.selection_locked,
        priority: Number(form.priority) || 100,
      });
      if (!res.ok) {
        Alert.alert('Hata', res.hata ?? 'Kaydedilemedi');
        return;
      }
      if (res.title?.id) {
        setTitleId(res.title.id);
        if (isNew) {
          router.replace(`/admin/unvanlar/${res.title.id}` as never);
        }
      }
      Alert.alert('Tamam', 'Ünvan kaydedildi.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const kopyala = () => {
    if (!titleId) return;
    Alert.alert('Kopyala', 'Bu ünvanın kopyası oluşturulsun mu?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kopyala',
        onPress: () => {
          void (async () => {
            const res = await AdminUnvanKopyala(titleId, `${form.name} (kopya)`);
            if (!res.ok || !res.title) {
              Alert.alert('Hata', res.hata ?? 'Kopyalanamadı');
              return;
            }
            router.replace(`/admin/unvanlar/${res.title.id}` as never);
          })();
        },
      },
    ]);
  };

  const arsivle = () => {
    if (!titleId) return;
    Alert.alert('Arşivle', 'Ünvan arşivlensin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Arşivle',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const res = await AdminUnvanArsivle(titleId);
            if (!res.ok) {
              Alert.alert('Hata', res.hata ?? 'Arşivlenemedi');
              return;
            }
            Alert.alert('Tamam', 'Arşivlendi.');
            router.back();
          })();
        },
      },
    ]);
  };

  if (!admin) return null;

  if (loading) {
    return (
      <Screen edges={['top']}>
        <EkranBasligi
          title={isNew ? 'Yeni Ünvan' : 'Ünvan'}
          onBack={() => router.back()}
        />
        <ActivityIndicator color={RenkTokenlari.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={isNew ? 'Yeni Ünvan' : 'Ünvan Düzenle'}
        subtitle={form.slug || 'Tasarım · önizleme · ata'}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.previewCard,
            { backgroundColor: previewDark ? '#0B0A12' : '#F4F4F8' },
          ]}
        >
          <View style={styles.previewHeader}>
            <Text
              style={[
                styles.previewLabel,
                { color: previewDark ? RenkTokenlari.textMuted : '#64748B' },
              ]}
            >
              Canlı önizleme
            </Text>
            <Pressable
              style={styles.previewToggle}
              onPress={() => setPreviewDark((v) => !v)}
            >
              <Ionicons
                name={previewDark ? 'sunny-outline' : 'moon-outline'}
                size={16}
                color={previewDark ? RenkTokenlari.text : '#334155'}
              />
              <Text
                style={{
                  color: previewDark ? RenkTokenlari.text : '#334155',
                  ...TipografiTokenlari.micro,
                  fontWeight: '700',
                }}
              >
                {previewDark ? 'Koyu' : 'Açık'}
              </Text>
            </Pressable>
          </View>
          <UserIdentityRow
            displayName="Muhammet Toprak"
            verified
            title={preview}
            nameStyle={{ color: previewDark ? '#F8FAFC' : '#0F172A' }}
          />
          <View style={{ marginTop: 8 }}>
            <UserTitleBadge design={form.design} label={form.name.trim() || 'Ünvan'} />
          </View>
          {dusukKontrast ? (
            <Text style={styles.warn}>
              Düşük kontrast: metin rengi arka planda zor okunabilir olabilir.
            </Text>
          ) : null}
        </View>

        <Text style={styles.label}>Ad</Text>
        <TextInput
          value={form.name}
          onChangeText={(name) => patch({ name })}
          placeholder="Ünvan adı"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
        />

        <Text style={styles.label}>Slug</Text>
        <TextInput
          value={form.slug}
          onChangeText={(slug) => patch({ slug })}
          placeholder="otomatik veya özel"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Açıklama</Text>
        <TextInput
          value={form.description}
          onChangeText={(description) => patch({ description })}
          placeholder="İç not"
          placeholderTextColor={RenkTokenlari.textDim}
          style={[styles.input, { minHeight: 64 }]}
          multiline
        />

        <Text style={styles.label}>i18n TR</Text>
        <TextInput
          value={form.nameTr}
          onChangeText={(nameTr) => patch({ nameTr })}
          placeholder="Türkçe etiket (opsiyonel)"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
        />
        <Text style={styles.label}>i18n EN</Text>
        <TextInput
          value={form.nameEn}
          onChangeText={(nameEn) => patch({ nameEn })}
          placeholder="English label (optional)"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
        />

        <Text style={styles.label}>Öncelik</Text>
        <TextInput
          value={form.priority}
          onChangeText={(priority) => patch({ priority })}
          keyboardType="number-pad"
          style={styles.input}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Aktif</Text>
          <Switch
            value={form.is_active}
            onValueChange={(is_active) => patch({ is_active })}
            trackColor={{ true: RenkTokenlari.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Seçim kilitli</Text>
          <Switch
            value={form.selection_locked}
            onValueChange={(selection_locked) => patch({ selection_locked })}
            trackColor={{ true: RenkTokenlari.primary }}
          />
        </View>

        <Text style={AdminStil.sectionLabel}>Preset</Text>
        <View style={styles.rowWrap}>
          {UNVAN_PRESETLERI.map((p) => (
            <Pressable
              key={p.id}
              style={[styles.chip, styles.presetChip]}
              onPress={() => patchDesign({ ...p.design })}
            >
              <UserTitleBadge design={p.design} label={p.label} size="COMPACT" />
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Şekil</Text>
        <View style={styles.rowWrap}>
          {UNVAN_SHAPES.map((s) => (
            <Chip
              key={s}
              label={s}
              active={form.design.shape === s}
              onPress={() => patchDesign({ shape: s })}
            />
          ))}
        </View>

        <Text style={styles.label}>Arka plan tipi</Text>
        <View style={styles.rowWrap}>
          {UNVAN_BG_TYPES.map((s) => (
            <Chip
              key={s}
              label={s}
              active={form.design.backgroundType === s}
              onPress={() => patchDesign({ backgroundType: s })}
            />
          ))}
        </View>

        <Text style={styles.label}>Renkler (hex)</Text>
        <TextInput
          value={form.design.backgroundColor}
          onChangeText={(backgroundColor) => patchDesign({ backgroundColor })}
          placeholder="#bg"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          value={form.design.backgroundColor2 ?? ''}
          onChangeText={(v) => patchDesign({ backgroundColor2: v || null })}
          placeholder="#bg2 (gradient)"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          value={form.design.textColor}
          onChangeText={(textColor) => patchDesign({ textColor })}
          placeholder="#text"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Gradient yönü</Text>
        <View style={styles.rowWrap}>
          {UNVAN_GRADIENT_DIRS.map((s) => (
            <Chip
              key={s}
              label={s}
              active={form.design.gradientDirection === s}
              onPress={() => patchDesign({ gradientDirection: s })}
            />
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Kenarlık</Text>
          <Switch
            value={form.design.borderEnabled}
            onValueChange={(borderEnabled) => patchDesign({ borderEnabled })}
            trackColor={{ true: RenkTokenlari.primary }}
          />
        </View>
        {form.design.borderEnabled ? (
          <TextInput
            value={form.design.borderColor}
            onChangeText={(borderColor) => patchDesign({ borderColor })}
            placeholder="#border"
            placeholderTextColor={RenkTokenlari.textDim}
            style={styles.input}
            autoCapitalize="none"
          />
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Glow</Text>
          <Switch
            value={form.design.glowEnabled}
            onValueChange={(glowEnabled) => patchDesign({ glowEnabled })}
            trackColor={{ true: RenkTokenlari.primary }}
          />
        </View>
        {form.design.glowEnabled ? (
          <>
            <TextInput
              value={form.design.glowColor}
              onChangeText={(glowColor) => patchDesign({ glowColor })}
              placeholder="#glow"
              placeholderTextColor={RenkTokenlari.textDim}
              style={styles.input}
              autoCapitalize="none"
            />
            <View style={styles.rowWrap}>
              {UNVAN_GLOW.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  active={form.design.glowIntensity === g}
                  onPress={() => patchDesign({ glowIntensity: g })}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>Animasyon</Text>
        <View style={styles.rowWrap}>
          {UNVAN_ANIMATIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              active={form.design.animationType === s}
              onPress={() => patchDesign({ animationType: s })}
            />
          ))}
        </View>

        <Text style={styles.label}>İkon</Text>
        <View style={styles.rowWrap}>
          {UNVAN_IKON_LISTESI.map((ik) => (
            <Pressable
              key={ik.key}
              style={[
                styles.iconChip,
                form.design.iconValue === ik.key && styles.chipAktif,
              ]}
              onPress={() =>
                patchDesign({ iconType: 'library', iconValue: ik.key })
              }
            >
              <Ionicons
                name={ik.ion}
                size={16}
                color={RenkTokenlari.text}
              />
              <Text style={styles.chipYazi}>{ik.label}</Text>
            </Pressable>
          ))}
          <Chip
            label="Yok"
            active={form.design.iconType === 'none'}
            onPress={() => patchDesign({ iconType: 'none', iconValue: '' })}
          />
        </View>

        <Text style={styles.label}>İkon konumu</Text>
        <View style={styles.rowWrap}>
          {UNVAN_ICON_POSITIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              active={form.design.iconPosition === s}
              onPress={() => patchDesign({ iconPosition: s })}
            />
          ))}
        </View>

        <Text style={styles.label}>Boyut</Text>
        <View style={styles.rowWrap}>
          {UNVAN_SIZES.map((s) => (
            <Chip
              key={s}
              label={s}
              active={form.design.size === s}
              onPress={() => patchDesign({ size: s })}
            />
          ))}
        </View>

        <GradientButton
          title={saving ? 'Kaydediliyor…' : 'Kaydet'}
          onPress={() => void kaydet()}
          disabled={saving}
        />

        {titleId ? (
          <View style={styles.aksiyonlar}>
            <Pressable
              style={AdminStil.aksiyon}
              onPress={() =>
                router.push(`/admin/unvanlar/ata?titleId=${titleId}` as never)
              }
            >
              <Text style={AdminStil.aksiyonYazi}>Kullanıcıya ata</Text>
            </Pressable>
            <Pressable
              style={AdminStil.aksiyon}
              onPress={() =>
                router.push(
                  `/admin/unvanlar/kullanicilar?titleId=${titleId}` as never,
                )
              }
            >
              <Text style={AdminStil.aksiyonYazi}>Atananlar</Text>
            </Pressable>
            <Pressable style={AdminStil.aksiyon} onPress={kopyala}>
              <Text style={AdminStil.aksiyonYazi}>Kopyala</Text>
            </Pressable>
            <Pressable style={AdminStil.aksiyon} onPress={arsivle}>
              <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}>
                Arşivle
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    borderRadius: YaricapTokenlari.md,
    padding: BoslukTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    ...TipografiTokenlari.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  warn: {
    ...TipografiTokenlari.caption,
    color: '#F0B429',
    marginTop: 4,
  },
  label: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
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
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  presetChip: {
    paddingVertical: 8,
  },
  chipAktif: {
    borderColor: RenkTokenlari.primary,
    backgroundColor: 'rgba(232,64,145,0.18)',
  },
  chipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  chipYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  iconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
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
  aksiyonlar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
});
