import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { useAdminPermissions } from '../../../src/moduller/admin/yetki/useAdminPermissions';
import {
  AdminListAdmins,
  AdminRolesList,
  type AdminListItem,
  type AdminRoleItem,
} from '../../../src/moduller/admin/yonetim/AdminYonetimIslemleri';
import {
  AdminBasHarf,
  AdminDurumAciklama,
  AdminDurumEtiket,
  AdminDurumRenk,
  AdminGoreliZaman,
} from '../../../src/moduller/admin/yonetim/AdminYonetimUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const STATUS_OPTIONS = [
  { id: '', label: 'Hepsi', icon: 'apps-outline' as const },
  { id: 'ACTIVE', label: 'Aktif', icon: 'checkmark-circle-outline' as const },
  { id: 'SUSPENDED', label: 'Askıda', icon: 'pause-circle-outline' as const },
  { id: 'DISABLED', label: 'Pasif', icon: 'ban-outline' as const },
];

function Avatar({ ad }: { ad: string }) {
  return (
    <LinearGradient
      colors={[...RenkTokenlari.gradientPrimary]}
      style={styles.avatar}
    >
      <Text style={styles.avatarHarf}>{AdminBasHarf(ad)}</Text>
    </LinearGradient>
  );
}

export default function AdminYonetimListeEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { has, isSuper, loading: izinLoading } = useAdminPermissions();
  const izinVar = isSuper || has('admin.management.view');

  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [liste, setListe] = useState<AdminListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const [res, rolList] = await Promise.all([
        AdminListAdmins({
          search: q.trim() || null,
          role: role || null,
          status: status || null,
          limit: 80,
        }),
        AdminRolesList().catch(() => [] as AdminRoleItem[]),
      ]);
      setListe(res.items);
      setTotal(res.total);
      setRoles(rolList);
    } catch (e) {
      setListe([]);
      setTotal(0);
      setHata(e instanceof Error ? e.message : 'Liste yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, [q, role, status]);

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

  useEffect(() => {
    if (!admin || izinLoading || !izinVar) return;
    void yukle();
  }, [role, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const ozet = useMemo(() => {
    const aktif = liste.filter((x) => x.status === 'ACTIVE').length;
    const superN = liste.filter((x) => x.is_super).length;
    return { aktif, superN };
  }, [liste]);

  const anaRoller = useMemo(() => {
    const onemli = [
      'SUPER_ADMIN',
      'FINANCE_ADMIN',
      'SUPPORT_ADMIN',
      'MODERATION_ADMIN',
      'READ_ONLY_ADMIN',
    ];
    const sirali = [...roles].sort((a, b) => {
      const ia = onemli.indexOf(a.role_code);
      const ib = onemli.indexOf(b.role_code);
      if (ia === -1 && ib === -1) return a.sort_order - b.sort_order;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return [{ role_code: '', name: 'Tüm roller' }, ...sirali.slice(0, 8)];
  }, [roles]);

  if (!admin || (!izinLoading && !izinVar)) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Admin yönetimi" subtitle="Kim ne yapabilir?" />
      <FlatList
        data={liste}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <LinearGradient
              colors={['rgba(232,64,145,0.18)', 'rgba(20,12,28,0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroEyebrow}>Kontrol merkezi</Text>
              <Text style={styles.heroTitle}>Admin ekibini yönet</Text>
              <Text style={styles.heroAlt}>
                Her adminin rolünü, durumunu ve erişebildiği özellikleri buradan
                net şekilde görürsün.
              </Text>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatN}>{total}</Text>
                  <Text style={styles.heroStatL}>Toplam</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatN, { color: RenkTokenlari.mint }]}>
                    {ozet.aktif}
                  </Text>
                  <Text style={styles.heroStatL}>Aktif</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatN, { color: RenkTokenlari.violet }]}>
                    {ozet.superN}
                  </Text>
                  <Text style={styles.heroStatL}>Süper</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.ctaRow}>
              {(isSuper || has('admin.admins.create')) && (
                <Pressable
                  style={styles.ctaPrimary}
                  onPress={() => router.push('/admin/yonetim/yeni' as never)}
                >
                  <LinearGradient
                    colors={[...RenkTokenlari.gradientPrimary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaPrimaryInner}
                  >
                    <Ionicons name="person-add" size={18} color="#12040C" />
                    <Text style={styles.ctaPrimaryText}>Yeni admin ekle</Text>
                  </LinearGradient>
                </Pressable>
              )}
              {(isSuper ||
                has('admin.roles.create') ||
                has('admin.management.view')) && (
                <Pressable
                  style={styles.ctaGhost}
                  onPress={() => router.push('/admin/yonetim/roller' as never)}
                >
                  <Ionicons
                    name="shield-half"
                    size={18}
                    color={RenkTokenlari.primarySoft}
                  />
                  <Text style={styles.ctaGhostText}>Roller</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.arama}>
              <Ionicons name="search" size={18} color={RenkTokenlari.textDim} />
              <TextInput
                style={styles.aramaInput}
                value={q}
                onChangeText={setQ}
                placeholder="İsim veya e-posta ara…"
                placeholderTextColor={RenkTokenlari.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => void yukle()}
              />
              {q.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setQ('');
                    setTimeout(() => void yukle(), 0);
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={RenkTokenlari.textDim}
                  />
                </Pressable>
              ) : (
                <Pressable onPress={() => void yukle()} hitSlop={8}>
                  <Text style={styles.araBtn}>Ara</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.filtreBaslik}>Durum</Text>
            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map((s) => {
                const aktif = status === s.id;
                return (
                  <Pressable
                    key={s.id || 'all'}
                    style={[styles.chip, aktif && styles.chipAktif]}
                    onPress={() => setStatus(s.id)}
                  >
                    <Ionicons
                      name={s.icon}
                      size={14}
                      color={aktif ? RenkTokenlari.primarySoft : RenkTokenlari.textDim}
                    />
                    <Text style={[styles.chipText, aktif && styles.chipTextAktif]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filtreBaslik}>Rol</Text>
            <View style={styles.chipRow}>
              {anaRoller.map((r) => {
                const aktif = role === r.role_code;
                return (
                  <Pressable
                    key={r.role_code || 'all-role'}
                    style={[styles.chip, aktif && styles.chipAktif]}
                    onPress={() => setRole(r.role_code)}
                  >
                    <Text style={[styles.chipText, aktif && styles.chipTextAktif]}>
                      {r.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.listeBaslik}>
              <Text style={styles.listeBaslikText}>Adminler</Text>
              <Text style={styles.listeBaslikMeta}>
                {yukleniyor ? 'Yükleniyor…' : `${total} kişi`}
              </Text>
            </View>
            {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          yukleniyor ? (
            <ActivityIndicator
              color={RenkTokenlari.primarySoft}
              style={{ marginTop: 24 }}
            />
          ) : (
            <View style={styles.bos}>
              <Ionicons
                name="people-outline"
                size={36}
                color={RenkTokenlari.textDim}
              />
              <Text style={styles.bosBaslik}>Admin bulunamadı</Text>
              <Text style={styles.bosAlt}>
                Filtreleri temizleyip tekrar dene veya yeni admin ekle.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const durumRenk = AdminDurumRenk(item.status);
          return (
            <Pressable
              style={styles.kart}
              onPress={() =>
                router.push(`/admin/yonetim/${item.user_id}` as never)
              }
            >
              <Avatar ad={item.display_name} />
              <View style={styles.kartGovde}>
                <View style={styles.kartUst}>
                  <Text style={styles.ad} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  <View
                    style={[
                      styles.durumPill,
                      { backgroundColor: `${durumRenk}22` },
                    ]}
                  >
                    <View
                      style={[styles.durumDot, { backgroundColor: durumRenk }]}
                    />
                    <Text style={[styles.durumText, { color: durumRenk }]}>
                      {AdminDurumEtiket(item.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.email} numberOfLines={1}>
                  {item.email || item.username || 'E-posta yok'}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons
                      name={item.is_super ? 'diamond' : 'shield'}
                      size={12}
                      color={
                        item.is_super
                          ? RenkTokenlari.violet
                          : RenkTokenlari.primarySoft
                      }
                    />
                    <Text style={styles.metaChipText} numberOfLines={1}>
                      {item.role_name || item.role_code}
                    </Text>
                  </View>
                  <Text style={styles.izinOzet}>
                    {item.is_super
                      ? 'Tüm yetkiler'
                      : `${item.permission_count} yetki`}
                  </Text>
                </View>
                <Text style={styles.giris}>
                  Son giriş · {AdminGoreliZaman(item.last_login_at)}
                </Text>
                <Text style={styles.durumAciklama}>
                  {AdminDurumAciklama(item.status)}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={RenkTokenlari.textDim}
              />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: 10,
  },
  header: { gap: 14, marginBottom: 6 },
  hero: {
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.xl,
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.28)',
    gap: 8,
  },
  heroEyebrow: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  heroTitle: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    fontSize: 24,
  },
  heroAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 20,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  heroStat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.28)',
    gap: 2,
  },
  heroStatN: {
    ...TipografiTokenlari.title,
    fontSize: 20,
    color: RenkTokenlari.text,
  },
  heroStatL: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
  },
  ctaRow: { flexDirection: 'row', gap: 10 },
  ctaPrimary: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  ctaPrimaryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  ctaPrimaryText: {
    ...TipografiTokenlari.caption,
    color: '#12040C',
    fontWeight: '900',
  },
  ctaGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  ctaGhostText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  arama: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  aramaInput: {
    flex: 1,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    padding: 0,
  },
  araBtn: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  filtreBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  listeBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  listeBaslikText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  listeBaslikMeta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  hata: { ...TipografiTokenlari.caption, color: RenkTokenlari.danger },
  bos: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  bosBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  bosAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHarf: {
    color: '#12040C',
    fontWeight: '900',
    fontSize: 18,
  },
  kartGovde: { flex: 1, gap: 3 },
  kartUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    flex: 1,
  },
  email: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  durumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  durumDot: { width: 6, height: 6, borderRadius: 3 },
  durumText: {
    ...TipografiTokenlari.micro,
    fontWeight: '800',
    fontSize: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '62%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: RenkTokenlari.surface,
  },
  metaChipText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  izinOzet: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
  },
  giris: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  durumAciklama: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
});
