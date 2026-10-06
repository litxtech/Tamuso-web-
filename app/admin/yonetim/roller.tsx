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
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { GradientButton } from '../../../src/components/GradientButton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { useAdminPermissions } from '../../../src/moduller/admin/yetki/useAdminPermissions';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import { PermissionAccordion } from '../../../src/moduller/admin/yonetim/PermissionAccordion';
import {
  AdminPermissionCatalogList,
  AdminRoleCopy,
  AdminRoleCreate,
  AdminRoleDelete,
  AdminRoleGetPermissions,
  AdminRoleUpdatePermissions,
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

export default function AdminYonetimRollerEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { has, isSuper, loading: izinLoading } = useAdminPermissions();
  const izinVar =
    isSuper ||
    has('admin.management.view') ||
    has('admin.roles.create') ||
    has('admin.roles.edit');

  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [catalog, setCatalog] = useState<AdminPermissionCatalogItem[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);

  const [duzenle, setDuzenle] = useState<AdminRoleItem | null>(null);
  const [seciliIzinler, setSeciliIzinler] = useState<string[]>([]);
  const [olusturAcik, setOlusturAcik] = useState(false);
  const [yeniKod, setYeniKod] = useState('');
  const [yeniAd, setYeniAd] = useState('');
  const [yeniAciklama, setYeniAciklama] = useState('');
  const [kopyaKaynak, setKopyaKaynak] = useState<AdminRoleItem | null>(null);
  const [kopyaKod, setKopyaKod] = useState('');
  const [kopyaAd, setKopyaAd] = useState('');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [r, c] = await Promise.all([
        AdminRolesList(),
        AdminPermissionCatalogList().catch(() => [] as AdminPermissionCatalogItem[]),
      ]);
      setRoles(r);
      setCatalog(c);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Roller yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      if (izinLoading) return;
      if (!izinVar) {
        router.replace('/admin/yonetim');
        return;
      }
      void yukle();
    }, [admin, izinLoading, izinVar, yukle]),
  );

  const acDuzenle = async (rol: AdminRoleItem) => {
    if (rol.is_super) {
      Alert.alert('Sistem', 'SUPER_ADMIN izinleri değiştirilemez.');
      return;
    }
    setBusy(true);
    try {
      const perms = await AdminRoleGetPermissions(rol.role_code);
      setSeciliIzinler(perms);
      setDuzenle(rol);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İzinler alınamadı');
    } finally {
      setBusy(false);
    }
  };

  const kaydetIzinler = async () => {
    if (!duzenle) return;
    setBusy(true);
    try {
      await AdminRoleUpdatePermissions(
        duzenle.role_code,
        seciliIzinler,
        'Rol izin güncelleme',
      );
      setDuzenle(null);
      await yukle();
      Alert.alert('Tamam', 'Rol izinleri kaydedildi');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  };

  const olustur = async () => {
    if (!yeniKod.trim() || !yeniAd.trim()) {
      Alert.alert('Eksik', 'Kod ve ad gerekli');
      return;
    }
    setBusy(true);
    try {
      await AdminRoleCreate({
        roleCode: yeniKod.trim(),
        name: yeniAd.trim(),
        description: yeniAciklama.trim(),
        permissions: [],
      });
      setOlusturAcik(false);
      setYeniKod('');
      setYeniAd('');
      setYeniAciklama('');
      await yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Oluşturulamadı');
    } finally {
      setBusy(false);
    }
  };

  const kopyala = async () => {
    if (!kopyaKaynak || !kopyaKod.trim() || !kopyaAd.trim()) {
      Alert.alert('Eksik', 'Kod ve ad gerekli');
      return;
    }
    setBusy(true);
    try {
      await AdminRoleCopy({
        sourceRole: kopyaKaynak.role_code,
        newRoleCode: kopyaKod.trim(),
        newName: kopyaAd.trim(),
      });
      setKopyaKaynak(null);
      setKopyaKod('');
      setKopyaAd('');
      await yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kopyalanamadı');
    } finally {
      setBusy(false);
    }
  };

  const sil = (rol: AdminRoleItem) => {
    if (rol.is_system || rol.is_super) {
      Alert.alert('Sistem', 'Sistem rolleri silinemez.');
      return;
    }
    Alert.alert('Rol sil', `${rol.name} silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await AdminRoleDelete(rol.role_code);
              await yukle();
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  if (!admin || (!izinLoading && !izinVar)) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Roller" subtitle="Rol şablonları ve izinler" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {(isSuper || has('admin.roles.create')) && (
          <Pressable style={styles.aksiyonBtn} onPress={() => setOlusturAcik(true)}>
            <Ionicons name="add-circle-outline" size={18} color={RenkTokenlari.primarySoft} />
            <Text style={styles.aksiyonText}>Yeni rol</Text>
          </Pressable>
        )}

        {yukleniyor && !roles.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        {roles.map((rol) => (
          <View key={rol.role_code} style={styles.kart}>
            <View style={styles.kartUst}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.ad}>{rol.name}</Text>
                <Text style={styles.alt}>
                  {rol.role_code}
                  {rol.is_system ? ' · sistem' : ''}
                  {rol.is_super ? ' · SUPER' : ''}
                </Text>
                <Text style={styles.alt}>{rol.permission_count} izin</Text>
                {rol.description ? (
                  <Text style={styles.aciklama}>{rol.description}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.btnRow}>
              {!rol.is_super && (isSuper || has('admin.roles.edit')) ? (
                <Pressable style={styles.miniBtn} onPress={() => void acDuzenle(rol)}>
                  <Text style={styles.miniBtnText}>İzinleri düzenle</Text>
                </Pressable>
              ) : null}
              {(isSuper || has('admin.roles.create')) && (
                <Pressable
                  style={styles.miniBtn}
                  onPress={() => {
                    setKopyaKaynak(rol);
                    setKopyaKod(`${rol.role_code}_COPY`);
                    setKopyaAd(`${rol.name} kopya`);
                  }}
                >
                  <Text style={styles.miniBtnText}>Kopyala</Text>
                </Pressable>
              )}
              {!rol.is_system &&
              !rol.is_super &&
              (isSuper || has('admin.roles.delete')) ? (
                <Pressable style={styles.miniBtn} onPress={() => sil(rol)}>
                  <Text style={[styles.miniBtnText, { color: RenkTokenlari.danger }]}>
                    Sil
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Düzenle modal */}
      <Modal visible={!!duzenle} animationType="slide">
        <Screen edges={['top']}>
          <EkranBasligi
            title={duzenle?.name || 'Rol'}
            subtitle="İzinleri düzenle"
          />
          <ScrollView
            contentContainerStyle={AdminStil.content}
            keyboardShouldPersistTaps="handled"
          >
            <PermissionAccordion
              catalog={catalog}
              mode="select"
              selected={seciliIzinler}
              onChangeSelected={setSeciliIzinler}
            />
            <GradientButton
              title="Kaydet"
              loading={busy}
              onPress={() => void kaydetIzinler()}
            />
            <GradientButton
              title="İptal"
              variant="ghost"
              onPress={() => setDuzenle(null)}
            />
          </ScrollView>
        </Screen>
      </Modal>

      {/* Oluştur modal */}
      <Modal visible={olusturAcik} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setOlusturAcik(false)}>
          <Pressable style={styles.modalKart} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.ad}>Yeni rol</Text>
            <TextInput
              style={styles.field}
              value={yeniKod}
              onChangeText={setYeniKod}
              placeholder="ROLE_CODE"
              placeholderTextColor={RenkTokenlari.textDim}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.field}
              value={yeniAd}
              onChangeText={setYeniAd}
              placeholder="Görünen ad"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <TextInput
              style={styles.field}
              value={yeniAciklama}
              onChangeText={setYeniAciklama}
              placeholder="Açıklama"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <GradientButton title="Oluştur" loading={busy} onPress={() => void olustur()} />
            <GradientButton
              title="İptal"
              variant="ghost"
              onPress={() => setOlusturAcik(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Kopya modal */}
      <Modal visible={!!kopyaKaynak} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setKopyaKaynak(null)}>
          <Pressable style={styles.modalKart} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.ad}>Rol kopyala</Text>
            <Text style={styles.alt}>Kaynak: {kopyaKaynak?.role_code}</Text>
            <TextInput
              style={styles.field}
              value={kopyaKod}
              onChangeText={setKopyaKod}
              placeholder="Yeni kod"
              placeholderTextColor={RenkTokenlari.textDim}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.field}
              value={kopyaAd}
              onChangeText={setKopyaAd}
              placeholder="Yeni ad"
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <GradientButton title="Kopyala" loading={busy} onPress={() => void kopyala()} />
            <GradientButton
              title="İptal"
              variant="ghost"
              onPress={() => setKopyaKaynak(null)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  aksiyonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  aksiyonText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kart: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 10,
  },
  kartUst: { flexDirection: 'row' },
  ad: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '800' },
  alt: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  aciklama: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 4,
  },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: RenkTokenlari.surface,
  },
  miniBtnText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
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
  field: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
  },
});
