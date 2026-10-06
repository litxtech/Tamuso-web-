import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminYetkisiVarMi } from '../yetki/AdminYetkisiVarMi';
import { useAdminPermissions } from '../yetki/useAdminPermissions';
import {
  ADMIN_BOLUM_SIRASI,
  ADMIN_MODULLER,
} from '../arama/AdminModulKatalogu';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';

const MASAUSTU_MIN = 1100;

export function AdminWebKabuk() {
  const { width } = useWindowDimensions();
  const masaustu = Platform.OS === 'web' && width >= MASAUSTU_MIN;
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { has, isSuper, loading } = useAdminPermissions();
  const path = usePathname();

  const gruplar = useMemo(() => {
    const liste =
      isSuper || loading
        ? ADMIN_MODULLER
        : ADMIN_MODULLER.filter((m) => has(m.permissionKey));
    return ADMIN_BOLUM_SIRASI.map((bolum) => ({
      bolum,
      moduller: liste.filter((m) => m.bolum === bolum),
    })).filter((g) => g.moduller.length > 0);
  }, [has, isSuper, loading]);

  if (!masaustu || !admin) {
    return <Slot />;
  }

  return (
    <View style={styles.kabuk}>
      <View style={styles.yan}>
        <Pressable onPress={() => router.push('/admin')} style={styles.marka}>
          <Text style={styles.markaAd}>Tamuso</Text>
          <Text style={styles.markaAlt}>Kontrol merkezi</Text>
        </Pressable>
        <ScrollView showsVerticalScrollIndicator={false}>
          {gruplar.map((g) => (
            <View key={g.bolum} style={styles.grup}>
              <Text style={styles.grupAd}>{g.bolum}</Text>
              {g.moduller.map((m) => {
                const aktif =
                  path === m.href || path.startsWith(`${m.href}/`);
                return (
                  <Pressable
                    key={m.href}
                    onPress={() => router.push(m.href as never)}
                    style={[styles.oge, aktif && styles.ogeAktif]}
                  >
                    <Ionicons
                      name={m.icon}
                      size={16}
                      color={aktif ? RenkTokenlari.text : RenkTokenlari.textMuted}
                    />
                    <Text style={[styles.ogeYazi, aktif && styles.ogeYaziAktif]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={styles.icerik}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kabuk: { flex: 1, flexDirection: 'row', backgroundColor: RenkTokenlari.bg },
  yan: {
    width: 248,
    borderRightWidth: 1,
    borderRightColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  marka: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  markaAd: { color: RenkTokenlari.text, fontSize: 18, fontWeight: '700' },
  markaAlt: { color: RenkTokenlari.textMuted, fontSize: 12, marginTop: 2 },
  grup: { paddingBottom: 8 },
  grupAd: {
    color: RenkTokenlari.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  oge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ogeAktif: { backgroundColor: RenkTokenlari.surface },
  ogeYazi: { color: RenkTokenlari.textMuted, fontSize: 13, flex: 1 },
  ogeYaziAktif: { color: RenkTokenlari.text, fontWeight: '600' },
  icerik: { flex: 1 },
});
