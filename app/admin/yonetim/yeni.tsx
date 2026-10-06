import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { GradientButton } from '../../../src/components/GradientButton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { useAdminPermissions } from '../../../src/moduller/admin/yetki/useAdminPermissions';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import { AdminKullaniciAra } from '../../../src/moduller/admin/kullanici/okuma/AdminKullaniciOkuma';
import type { AdminKullaniciOzet } from '../../../src/moduller/admin/kullanici/tipler';
import { PermissionAccordion } from '../../../src/moduller/admin/yonetim/PermissionAccordion';
import {
  AdminPermissionCatalogList,
  AdminPreviewMenu,
  AdminPromoteUser,
  AdminRoleGetPermissions,
  AdminRolesList,
  type AdminPermissionCatalogItem,
  type AdminRoleItem,
} from '../../../src/moduller/admin/yonetim/AdminYonetimIslemleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { AdminDurumEtiket } from '../../../src/moduller/admin/yonetim/AdminYonetimUi';

const STATUSLAR = ['ACTIVE', 'SUSPENDED', 'DISABLED'] as const;

export default function AdminYonetimYeniEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { has, isSuper, loading: izinLoading } = useAdminPermissions();
  const izinVar = isSuper || has('admin.admins.create');

  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [catalog, setCatalog] = useState<AdminPermissionCatalogItem[]>([]);
  const [roleCode, setRoleCode] = useState('');
  const [status, setStatus] = useState<(typeof STATUSLAR)[number]>('ACTIVE');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [allows, setAllows] = useState<string[]>([]);
  const [denies, setDenies] = useState<string[]>([]);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [secili, setSecili] = useState<AdminKullaniciOzet | null>(null);
  const [arama, setArama] = useState('');
  const [adaylar, setAdaylar] = useState<AdminKullaniciOzet[]>([]);
  const [aramaBusy, setAramaBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewAcik, setPreviewAcik] = useState(false);
  const [previewItems, setPreviewItems] = useState<{ label: string; href?: string | null }[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      if (izinLoading) return;
      if (!izinVar) {
        router.replace('/admin/yonetim');
      }
    }, [admin, izinLoading, izinVar]),
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setYukleniyor(true);
      try {
        const [r, c] = await Promise.all([
          AdminRolesList(),
          AdminPermissionCatalogList().catch(() => [] as AdminPermissionCatalogItem[]),
        ]);
        if (!alive) return;
        setRoles(r.filter((x) => !x.is_super || isSuper));
        setCatalog(c);
        if (r[0] && !roleCode) setRoleCode(r.find((x) => x.role_code === 'SUPPORT')?.role_code || r[0].role_code);
      } catch (e) {
        Alert.alert('Hata', e instanceof Error ? e.message : 'Yüklenemedi');
      } finally {
        if (alive) setYukleniyor(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper]);

  useEffect(() => {
    if (!roleCode) {
      setRolePerms([]);
      return;
    }
    void AdminRoleGetPermissions(roleCode)
      .then(setRolePerms)
      .catch(() => setRolePerms([]));
  }, [roleCode]);

  const araKullanici = async () => {
    setAramaBusy(true);
    try {
      const rows = await AdminKullaniciAra(arama, 30);
      setAdaylar(rows.filter((u) => !u.is_admin));
    } catch (e) {
      Alert.alert('Arama', e instanceof Error ? e.message : 'Bulunamadı');
    } finally {
      setAramaBusy(false);
    }
  };

  const efektifOnizleme = useMemo(() => {
    const set = new Set(rolePerms);
    for (const a of allows) set.add(a);
    for (const d of denies) set.delete(d);
    return [...set];
  }, [rolePerms, allows, denies]);

  const onizle = async () => {
    try {
      const items = await AdminPreviewMenu(efektifOnizleme);
      setPreviewItems(
        items.map((i) => ({ label: i.label, href: i.module_href })),
      );
      setPreviewAcik(true);
    } catch (e) {
      Alert.alert('Önizleme', e instanceof Error ? e.message : 'Başarısız');
    }
  };

  const kaydet = async () => {
    if (!secili) {
      Alert.alert('Kullanıcı seç', 'Mevcut bir kullanıcı seçmelisin.');
      return;
    }
    if (!roleCode) {
      Alert.alert('Rol', 'Rol seçilmedi.');
      return;
    }
    setBusy(true);
    try {
      await AdminPromoteUser({
        userId: secili.id,
        roleCode,
        status,
        phone: phone.trim() || null,
        allowOverrides: allows.length ? allows : null,
        denyOverrides: denies.length ? denies : null,
        reason: reason.trim() || 'Admin promote',
      });
      Alert.alert('Tamam', 'Admin oluşturuldu', [
        {
          text: 'Detay',
          onPress: () => router.replace(`/admin/yonetim/${secili.id}` as never),
        },
      ]);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  };

  if (!admin || (!izinLoading && !izinVar)) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Yeni admin" subtitle="3 adımda yetki ver" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {yukleniyor ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <>
            <View style={styles.adimKart}>
              <Text style={styles.adimTitle}>Nasıl çalışır?</Text>
              <Text style={styles.not}>
                1) Kullanıcı seç · 2) Rol seç · 3) İstersen özel izin ekle ·
                Kaydet. Yeni hesap için önce Kullanıcılar’dan oluştur.
              </Text>
            </View>

            <Text style={styles.adimEtiket}>1 · Kullanıcı seç</Text>
            {secili ? (
              <View style={styles.seciliKart}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ad}>
                    {secili.display_name || secili.username || secili.id.slice(0, 8)}
                  </Text>
                  <Text style={styles.alt}>{secili.username || secili.id}</Text>
                </View>
                <Pressable onPress={() => setSecili(null)}>
                  <Text style={styles.link}>Değiştir</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.aramaBlok}>
                <View style={styles.arama}>
                  <TextInput
                    style={styles.input}
                    value={arama}
                    onChangeText={setArama}
                    placeholder="İsim / kullanıcı adı ara…"
                    placeholderTextColor={RenkTokenlari.textDim}
                    autoCapitalize="none"
                    onSubmitEditing={() => void araKullanici()}
                  />
                  <Pressable onPress={() => void araKullanici()} disabled={aramaBusy}>
                    <Ionicons name="search" size={18} color={RenkTokenlari.primarySoft} />
                  </Pressable>
                </View>
                {adaylar.map((u) => (
                  <Pressable
                    key={u.id}
                    style={styles.aday}
                    onPress={() => {
                      setSecili(u);
                      setAdaylar([]);
                    }}
                  >
                    <Text style={styles.ad}>{u.display_name || u.username}</Text>
                    <Text style={styles.alt}>{u.username}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.adimEtiket}>2 · Rol seç</Text>
            <Text style={styles.not}>
              Rol, hazır bir yetki paketidir. Sonra tek tek özelleştirebilirsin.
            </Text>
            <View style={styles.chipRow}>
              {roles.map((r) => (
                <Pressable
                  key={r.role_code}
                  style={[styles.chip, roleCode === r.role_code && styles.chipAktif]}
                  onPress={() => setRoleCode(r.role_code)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      roleCode === r.role_code && styles.chipTextAktif,
                    ]}
                  >
                    {r.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.adimEtiket}>Durum</Text>
            <View style={styles.chipRow}>
              {STATUSLAR.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.chip, status === s && styles.chipAktif]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.chipText, status === s && styles.chipTextAktif]}>
                    {AdminDurumEtiket(s)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.adimEtiket}>Telefon (opsiyonel)</Text>
            <TextInput
              style={styles.field}
              value={phone}
              onChangeText={setPhone}
              placeholder="+90…"
              placeholderTextColor={RenkTokenlari.textDim}
              keyboardType="phone-pad"
            />

            <Text style={styles.adimEtiket}>Sebep</Text>
            <TextInput
              style={styles.field}
              value={reason}
              onChangeText={setReason}
              placeholder="Neden admin yapıyorsun?"
              placeholderTextColor={RenkTokenlari.textDim}
            />

            <Text style={styles.adimEtiket}>3 · Özel izinler (opsiyonel)</Text>
            <Text style={styles.not}>
              Rolün verdiği yetkiler otomatik gelir. İstersen tek tek açıp
              kapatabilirsin.
            </Text>
            <PermissionAccordion
              catalog={catalog}
              mode="override"
              roleKeys={rolePerms}
              allows={allows}
              denies={denies}
              onChangeOverrides={({ allows: a, denies: d }) => {
                setAllows(a);
                setDenies(d);
              }}
            />

            <GradientButton
              title="Menü önizle"
              variant="ghost"
              onPress={() => void onizle()}
            />
            <GradientButton
              title="Admin yap"
              loading={busy}
              onPress={() => void kaydet()}
            />
          </>
        )}
      </ScrollView>

      <Modal visible={previewAcik} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setPreviewAcik(false)}>
          <View style={styles.modalKart}>
            <Text style={styles.ad}>Menü önizleme ({previewItems.length})</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {previewItems.map((p, i) => (
                <Text key={`${p.href}-${i}`} style={styles.alt}>
                  • {p.label}
                  {p.href ? ` — ${p.href}` : ''}
                </Text>
              ))}
            </ScrollView>
            <GradientButton title="Kapat" onPress={() => setPreviewAcik(false)} />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  adimKart: {
    padding: 14,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.28)',
    backgroundColor: 'rgba(232,64,145,0.08)',
    gap: 6,
  },
  adimTitle: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  adimEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
    marginTop: 4,
  },
  not: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    lineHeight: 18,
  },
  seciliKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.bgCard,
  },
  aramaBlok: { gap: 6 },
  arama: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  input: {
    flex: 1,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    padding: 0,
  },
  field: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  aday: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  ad: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '800' },
  alt: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  link: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
  },
  chipAktif: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: 'rgba(232,64,145,0.12)',
  },
  chipText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  chipTextAktif: { color: RenkTokenlari.primarySoft },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalKart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
});
