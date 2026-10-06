import React, { useCallback, useMemo, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { GradientButton } from '../../../src/components/GradientButton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { useAdminPermissions } from '../../../src/moduller/admin/yetki/useAdminPermissions';
import {
  PermissionAccordion,
  permissionEfektifAcik,
} from '../../../src/moduller/admin/yonetim/PermissionAccordion';
import {
  AdminDemoteAdmin,
  AdminGetAdminDetail,
  AdminPermissionCatalogList,
  AdminPreviewMenu,
  AdminRolesList,
  AdminSavePermissionOverrides,
  AdminSetAdminRole,
  AdminUpdateAdminStatus,
  type AdminDetailResult,
  type AdminPermissionCatalogItem,
  type AdminRoleItem,
} from '../../../src/moduller/admin/yonetim/AdminYonetimIslemleri';
import {
  AdminBasHarf,
  AdminDurumAciklama,
  AdminDurumEtiket,
  AdminDurumRenk,
  AdminGoreliZaman,
  AdminKategoriEtiket,
} from '../../../src/moduller/admin/yonetim/AdminYonetimUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

function Bolum({
  icon,
  title,
  alt,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  alt?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.bolum}>
      <View style={styles.bolumBaslik}>
        <View style={styles.bolumIcon}>
          <Ionicons name={icon} size={16} color={RenkTokenlari.primarySoft} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bolumTitle}>{title}</Text>
          {alt ? <Text style={styles.bolumAlt}>{alt}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export default function AdminYonetimDetayEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = String(id || '');
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { has, isSuper, loading: izinLoading } = useAdminPermissions();
  const izinVar = isSuper || has('admin.management.view');

  const [detail, setDetail] = useState<AdminDetailResult | null>(null);
  const [catalog, setCatalog] = useState<AdminPermissionCatalogItem[]>([]);
  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [allows, setAllows] = useState<string[]>([]);
  const [denies, setDenies] = useState<string[]>([]);
  const [roleCode, setRoleCode] = useState('');
  const [reason, setReason] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewAcik, setPreviewAcik] = useState(false);
  const [previewItems, setPreviewItems] = useState<{ label: string; href?: string | null }[]>([]);

  const yukle = useCallback(async () => {
    if (!userId) return;
    setYukleniyor(true);
    try {
      const [d, c, r] = await Promise.all([
        AdminGetAdminDetail(userId),
        AdminPermissionCatalogList().catch(() => [] as AdminPermissionCatalogItem[]),
        AdminRolesList().catch(() => [] as AdminRoleItem[]),
      ]);
      setDetail(d);
      setCatalog(c);
      setRoles(r);
      setRoleCode(d.admin.role_code);
      setAllows(
        d.overrides.filter((o) => o.effect === 'ALLOW').map((o) => o.permission_key),
      );
      setDenies(
        d.overrides.filter((o) => o.effect === 'DENY').map((o) => o.permission_key),
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Detay yüklenemedi');
      setDetail(null);
    } finally {
      setYukleniyor(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      if (izinLoading) return;
      if (!izinVar) {
        router.replace('/admin');
        return;
      }
      void yukle();
    }, [admin, izinLoading, izinVar, yukle]),
  );

  const efektif = useMemo(() => {
    if (!detail) return [];
    if (detail.admin.is_super) return catalog.map((c) => c.permission_key);
    return catalog
      .map((c) => c.permission_key)
      .filter((k) =>
        permissionEfektifAcik(k, detail.role_permissions, allows, denies),
      );
  }, [detail, allows, denies, catalog]);

  const diff = useMemo(() => {
    const oldSet = new Set(detail?.permissions ?? []);
    const newSet = new Set(efektif);
    const added = [...newSet].filter((k) => !oldSet.has(k));
    const removed = [...oldSet].filter((k) => !newSet.has(k));
    return { added, removed };
  }, [detail, efektif]);

  const kategoriOzet = useMemo(() => {
    const map: Record<string, number> = {};
    for (const key of efektif) {
      const cat = catalog.find((c) => c.permission_key === key)?.category ?? 'OTHER';
      map[cat] = (map[cat] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([cat, n]) => ({ cat, n, label: AdminKategoriEtiket(cat) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
  }, [efektif, catalog]);

  const highRisk = useMemo(() => {
    return efektif
      .map((k) => catalog.find((c) => c.permission_key === k))
      .filter((c): c is AdminPermissionCatalogItem => !!c)
      .filter((c) => c.risk === 'HIGH' || c.risk === 'CRITICAL')
      .slice(0, 12);
  }, [efektif, catalog]);

  const kaydetOverrides = () => {
    if (!detail) return;
    Alert.alert(
      'İzinleri kaydet',
      `${diff.added.length} izin eklenecek, ${diff.removed.length} izin kaldırılacak.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await AdminSavePermissionOverrides({
                  userId,
                  allows,
                  denies,
                  reason: reason.trim() || 'Permission overrides',
                });
                Alert.alert('Tamam', 'İzinler güncellendi');
                await yukle();
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const rolDegistir = async () => {
    if (!roleCode) return;
    setBusy(true);
    try {
      await AdminSetAdminRole(userId, roleCode, reason.trim() || 'Rol değişimi');
      Alert.alert('Tamam', 'Rol güncellendi');
      await yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Rol güncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  const statusAyarla = (s: string) => {
    Alert.alert('Durumu değiştir', `${AdminDurumEtiket(s)} yapılsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await AdminUpdateAdminStatus(userId, s, reason.trim() || `Status ${s}`);
              await yukle();
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'Durum güncellenemedi');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const demote = () => {
    Alert.alert(
      'Admin yetkisini kaldır',
      'Bu kişi artık admin paneline giremez. Emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await AdminDemoteAdmin(userId, reason.trim() || 'Admin demote');
                Alert.alert('Tamam', 'Admin yetkisi kaldırıldı', [
                  { text: 'Listeye dön', onPress: () => router.replace('/admin/yonetim' as never) },
                ]);
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız');
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const onizle = async (keys: string[]) => {
    try {
      const items = await AdminPreviewMenu(keys);
      setPreviewItems(items.map((i) => ({ label: i.label, href: i.module_href })));
      setPreviewAcik(true);
    } catch (e) {
      Alert.alert('Önizleme', e instanceof Error ? e.message : 'Başarısız');
    }
  };

  if (!admin || (!izinLoading && !izinVar)) return null;

  const a = detail?.admin;
  const durumRenk = a ? AdminDurumRenk(a.status) : RenkTokenlari.textDim;

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Admin detayı" subtitle="Yetki ve erişim profili" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {yukleniyor || !detail || !a ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 40 }} />
        ) : (
          <>
            <LinearGradient
              colors={['rgba(232,64,145,0.16)', 'rgba(20,12,28,0.35)']}
              style={styles.profilKart}
            >
              <LinearGradient
                colors={[...RenkTokenlari.gradientPrimary]}
                style={styles.profilAvatar}
              >
                <Text style={styles.profilHarf}>{AdminBasHarf(a.display_name)}</Text>
              </LinearGradient>
              <View style={styles.profilGovde}>
                <Text style={styles.profilAd}>{a.display_name}</Text>
                <Text style={styles.profilEmail}>
                  {a.email || a.username || 'E-posta yok'}
                </Text>
                <View style={styles.profilMeta}>
                  <View
                    style={[
                      styles.durumPill,
                      { backgroundColor: `${durumRenk}22` },
                    ]}
                  >
                    <View style={[styles.durumDot, { backgroundColor: durumRenk }]} />
                    <Text style={[styles.durumText, { color: durumRenk }]}>
                      {AdminDurumEtiket(a.status)}
                    </Text>
                  </View>
                  <View style={styles.rolPill}>
                    <Ionicons
                      name={a.is_super ? 'diamond' : 'shield'}
                      size={12}
                      color={a.is_super ? RenkTokenlari.violet : RenkTokenlari.primarySoft}
                    />
                    <Text style={styles.rolPillText}>
                      {a.role_name || a.role_code}
                    </Text>
                  </View>
                </View>
                <Text style={styles.profilAlt}>
                  {AdminDurumAciklama(a.status)} · Son giriş{' '}
                  {AdminGoreliZaman(a.last_login_at)}
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.kpiRow}>
              <View style={styles.kpi}>
                <Text style={styles.kpiN}>{a.is_super ? '∞' : efektif.length}</Text>
                <Text style={styles.kpiL}>Yetki</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={[styles.kpiN, { color: RenkTokenlari.danger }]}>
                  {highRisk.length}
                </Text>
                <Text style={styles.kpiL}>Riskli</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiN}>{kategoriOzet.length}</Text>
                <Text style={styles.kpiL}>Alan</Text>
              </View>
            </View>

            <Bolum
              icon="pie-chart-outline"
              title="Ne yapabilir?"
              alt="Yetkilerin alanlara göre dağılımı"
            >
              <View style={styles.alanGrid}>
                {kategoriOzet.map((x) => (
                  <View key={x.cat} style={styles.alanChip}>
                    <Text style={styles.alanN}>{x.n}</Text>
                    <Text style={styles.alanL} numberOfLines={2}>
                      {x.label}
                    </Text>
                  </View>
                ))}
                {!kategoriOzet.length ? (
                  <Text style={styles.bosNot}>Henüz yetki yok</Text>
                ) : null}
              </View>
            </Bolum>

            {highRisk.length ? (
              <Bolum
                icon="warning-outline"
                title="Dikkat: riskli yetkiler"
                alt="Bu işlemler para veya kritik ayar değiştirir"
              >
                <View style={styles.riskList}>
                  {highRisk.map((c) => (
                    <View key={c.permission_key} style={styles.riskSatir}>
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={
                          c.risk === 'CRITICAL'
                            ? RenkTokenlari.danger
                            : RenkTokenlari.warning
                        }
                      />
                      <Text style={styles.riskLabel}>{c.label}</Text>
                    </View>
                  ))}
                </View>
              </Bolum>
            ) : null}

            <Bolum
              icon="shield-outline"
              title="Rol"
              alt="Hazır yetki paketi — değişince izinler de değişir"
            >
              <View style={styles.chipRow}>
                {roles.map((r) => {
                  const aktif = roleCode === r.role_code;
                  return (
                    <Pressable
                      key={r.role_code}
                      style={[styles.chip, aktif && styles.chipAktif]}
                      onPress={() => setRoleCode(r.role_code)}
                    >
                      <Text style={[styles.chipText, aktif && styles.chipTextAktif]}>
                        {r.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {(isSuper || has('admin.admins.edit')) && roleCode !== a.role_code ? (
                <GradientButton
                  title="Rolü kaydet"
                  loading={busy}
                  onPress={() => void rolDegistir()}
                />
              ) : null}
            </Bolum>

            <Bolum
              icon="key-outline"
              title="Yetkileri aç / kapat"
              alt={
                a.is_super
                  ? 'Önce rolünü Süper Admin dışına al'
                  : 'Anahtara dokun · sonra Kaydet'
              }
            >
              {a.is_super ? (
                <View style={styles.superUyari}>
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color={RenkTokenlari.warning}
                  />
                  <Text style={styles.superUyariText}>
                    Bu kişi Süper Admin — tüm yetkiler her zaman açık. Tek tek
                    kapatmak için yukarıdan başka bir rol seçip “Rolü kaydet”e
                    bas (ör. Finance Admin veya Support Admin).
                  </Text>
                </View>
              ) : null}
              <PermissionAccordion
                catalog={catalog}
                mode="override"
                roleKeys={detail.role_permissions}
                allows={allows}
                denies={denies}
                disabled={
                  !(isSuper || has('admin.permissions.edit')) || !!a.is_super
                }
                disabledReason={
                  a.is_super
                    ? 'Süper Admin’de tek tek yetki kapatılamaz. Önce rol değiştir.'
                    : !(isSuper || has('admin.permissions.edit'))
                      ? 'Bu işlem için admin.permissions.edit yetkin yok.'
                      : null
                }
                onChangeOverrides={({ allows: al, denies: de }) => {
                  setAllows(al);
                  setDenies(de);
                }}
              />

              <TextInput
                style={styles.field}
                value={reason}
                onChangeText={setReason}
                placeholder="Değişiklik sebebi (audit için)"
                placeholderTextColor={RenkTokenlari.textDim}
              />

              {(isSuper || has('admin.permissions.edit')) && !a.is_super ? (
                <GradientButton
                  title={
                    diff.added.length || diff.removed.length
                      ? `Kaydet (+${diff.added.length} / −${diff.removed.length})`
                      : 'Değişiklik yok'
                  }
                  loading={busy}
                  disabled={!diff.added.length && !diff.removed.length}
                  onPress={kaydetOverrides}
                />
              ) : null}

              <Pressable style={styles.onizleBtn} onPress={() => void onizle(efektif)}>
                <Ionicons name="eye-outline" size={18} color={RenkTokenlari.primarySoft} />
                <Text style={styles.onizleText}>Menüyü bu yetkilerle önizle</Text>
              </Pressable>
            </Bolum>

            <Bolum
              icon="power-outline"
              title="Hesap durumu"
              alt="Acil erişim kesme buradan"
            >
              <View style={styles.aksiyonGrid}>
                {(isSuper || has('admin.admins.disable')) && (
                  <>
                    {a.status !== 'ACTIVE' ? (
                      <Pressable
                        style={[styles.aksiyon, { borderColor: `${RenkTokenlari.mint}55` }]}
                        onPress={() => statusAyarla('ACTIVE')}
                      >
                        <Ionicons name="play-circle" size={20} color={RenkTokenlari.mint} />
                        <Text style={[styles.aksiyonText, { color: RenkTokenlari.mint }]}>
                          Aktifleştir
                        </Text>
                      </Pressable>
                    ) : null}
                    {a.status !== 'SUSPENDED' ? (
                      <Pressable
                        style={[styles.aksiyon, { borderColor: `${RenkTokenlari.warning}55` }]}
                        onPress={() => statusAyarla('SUSPENDED')}
                      >
                        <Ionicons name="pause-circle" size={20} color={RenkTokenlari.warning} />
                        <Text style={[styles.aksiyonText, { color: RenkTokenlari.warning }]}>
                          Askıya al
                        </Text>
                      </Pressable>
                    ) : null}
                    {a.status !== 'DISABLED' ? (
                      <Pressable
                        style={[styles.aksiyon, { borderColor: `${RenkTokenlari.danger}55` }]}
                        onPress={() => statusAyarla('DISABLED')}
                      >
                        <Ionicons name="ban" size={20} color={RenkTokenlari.danger} />
                        <Text style={[styles.aksiyonText, { color: RenkTokenlari.danger }]}>
                          Pasifleştir
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
                {(isSuper || has('admin.admins.delete')) && (
                  <Pressable
                    style={[styles.aksiyon, { borderColor: `${RenkTokenlari.danger}55` }]}
                    onPress={demote}
                  >
                    <Ionicons name="trash-outline" size={20} color={RenkTokenlari.danger} />
                    <Text style={[styles.aksiyonText, { color: RenkTokenlari.danger }]}>
                      Adminliği kaldır
                    </Text>
                  </Pressable>
                )}
              </View>
            </Bolum>
          </>
        )}
      </ScrollView>

      <Modal visible={previewAcik} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setPreviewAcik(false)}>
          <Pressable style={styles.modalKart} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Menü önizlemesi</Text>
            <Text style={styles.bolumAlt}>
              Bu admin paneli açınca hangi ekranları görür? (Sadece önizleme)
            </Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {previewItems.length === 0 ? (
                <Text style={styles.bosNot}>Görünür menü yok</Text>
              ) : (
                previewItems.map((p, i) => (
                  <View key={`${p.href}-${i}`} style={styles.previewSatir}>
                    <Ionicons
                      name="grid-outline"
                      size={14}
                      color={RenkTokenlari.primarySoft}
                    />
                    <Text style={styles.previewLabel}>{p.label}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <GradientButton title="Kapat" onPress={() => setPreviewAcik(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: 14,
  },
  profilKart: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.28)',
  },
  profilAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilHarf: { color: '#12040C', fontWeight: '900', fontSize: 22 },
  profilGovde: { flex: 1, gap: 4 },
  profilAd: {
    ...TipografiTokenlari.title,
    fontSize: 20,
    color: RenkTokenlari.text,
  },
  profilEmail: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  profilMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  profilAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 4,
  },
  durumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  durumDot: { width: 6, height: 6, borderRadius: 3 },
  durumText: { ...TipografiTokenlari.micro, fontWeight: '800' },
  rolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
  },
  rolPillText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: {
    flex: 1,
    padding: 14,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 2,
  },
  kpiN: {
    ...TipografiTokenlari.title,
    fontSize: 22,
    color: RenkTokenlari.text,
  },
  kpiL: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  bolum: {
    gap: 12,
    padding: 14,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  bolumBaslik: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bolumIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,64,145,0.12)',
  },
  bolumTitle: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  bolumAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 1,
  },
  alanGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alanChip: {
    width: '47%',
    flexGrow: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.surface,
    gap: 2,
  },
  alanN: {
    ...TipografiTokenlari.title,
    fontSize: 18,
    color: RenkTokenlari.primarySoft,
  },
  alanL: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  riskList: { gap: 8 },
  riskSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskLabel: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
    flex: 1,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
  },
  chipAktif: {
    borderColor: 'rgba(232,64,145,0.45)',
    backgroundColor: 'rgba(232,64,145,0.14)',
  },
  chipText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  chipTextAktif: { color: RenkTokenlari.primarySoft },
  field: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
  },
  onizleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  onizleText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  aksiyonGrid: { gap: 8 },
  aksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: RenkTokenlari.surface,
  },
  aksiyonText: {
    ...TipografiTokenlari.caption,
    fontWeight: '800',
  },
  bosNot: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  superUyari: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${RenkTokenlari.warning}66`,
    backgroundColor: `${RenkTokenlari.warning}18`,
  },
  superUyariText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
  modalTitle: {
    ...TipografiTokenlari.title,
    fontSize: 20,
    color: RenkTokenlari.text,
  },
  previewSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  previewLabel: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
});
