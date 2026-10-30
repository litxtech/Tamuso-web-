import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminYetkisiVarMi } from '../yetki/AdminYetkisiVarMi';
import { useAdminPermissions } from '../yetki/useAdminPermissions';
import { ADMIN_BOLUM_SIRASI, ADMIN_MODULLER } from '../arama/AdminModulKatalogu';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useAdminOturumDurumu } from './AdminOturumKapisi';
import { AdminOturumuKapat } from './AdminOturumuKapat';

const MASAUSTU_MIN = 1100;
/** Bu sürenin altında oturum uyarısı gösterilir. */
const UYARI_ESIGI = 3 * 60;

function sureBicim(saniye: number): string {
  const s = Math.max(0, saniye);
  const saat = Math.floor(s / 3600);
  const dk = Math.floor((s % 3600) / 60);
  const sn = s % 60;
  if (saat > 0) return `${saat}:${String(dk).padStart(2, '0')}`;
  return `${dk}:${String(sn).padStart(2, '0')}`;
}

/** Panelden çıkış — geri alınamaz, iki adımlı onay ister. */
function CikisDugmesi({ dar }: { dar?: boolean }) {
  const [onay, setOnay] = useState(false);
  const [kapaniyor, setKapaniyor] = useState(false);

  if (onay) {
    return (
      <View style={styles.cikisOnay}>
        <Text style={styles.cikisOnayYazi}>Oturum kapatılsın mı?</Text>
        <View style={styles.cikisOnaySatir}>
          <Pressable
            style={[styles.cikisOnayDugme, styles.cikisHayir]}
            onPress={() => setOnay(false)}
            disabled={kapaniyor}
          >
            <Text style={styles.cikisOnayDugmeYazi}>Vazgeç</Text>
          </Pressable>
          <Pressable
            style={[styles.cikisOnayDugme, styles.cikisEvet]}
            onPress={() => {
              setKapaniyor(true);
              void AdminOturumuKapat('manual').finally(() => {
                router.replace('/giris?neden=cikis' as never);
              });
            }}
            disabled={kapaniyor}
          >
            <Text style={styles.cikisEvetYazi}>
              {kapaniyor ? 'Kapatılıyor…' : 'Çıkış yap'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cikisDugme,
        dar && styles.cikisDugmeDar,
        pressed && { opacity: 0.8 },
      ]}
      onPress={() => setOnay(true)}
      accessibilityRole="button"
      accessibilityLabel="Oturumu kapat"
    >
      <Ionicons name="log-out-outline" size={16} color={RenkTokenlari.danger} />
      {!dar ? <Text style={styles.cikisYazi}>Çıkış</Text> : null}
    </Pressable>
  );
}

function OturumRozeti({ dar }: { dar?: boolean }) {
  const { kalanSaniye, uzat } = useAdminOturumDurumu();
  const azKaldi = kalanSaniye <= UYARI_ESIGI;
  return (
    <Pressable
      style={styles.oturumRozet}
      onPress={uzat}
      accessibilityRole="button"
      accessibilityLabel="Oturum süresini uzat"
    >
      <Ionicons
        name={azKaldi ? 'alert-circle-outline' : 'time-outline'}
        size={13}
        color={azKaldi ? RenkTokenlari.warning : RenkTokenlari.textDim}
      />
      {!dar ? (
        <Text
          style={[styles.oturumYazi, azKaldi && styles.oturumYaziUyari]}
          numberOfLines={1}
        >
          {sureBicim(kalanSaniye)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function NavOge({
  href,
  label,
  ikon,
  aktif,
}: {
  href: string;
  label: string;
  ikon: React.ComponentProps<typeof Ionicons>['name'];
  aktif: boolean;
}) {
  const [uzerinde, setUzerinde] = useState(false);
  return (
    <Pressable
      onPress={() => router.push(href as never)}
      onHoverIn={() => setUzerinde(true)}
      onHoverOut={() => setUzerinde(false)}
      style={[styles.oge, (aktif || uzerinde) && styles.ogeVurgu]}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      {aktif ? <View style={styles.ogeSerit} /> : null}
      <Ionicons
        name={ikon}
        size={16}
        color={aktif ? RenkTokenlari.text : RenkTokenlari.textMuted}
      />
      <Text style={[styles.ogeYazi, aktif && styles.ogeYaziAktif]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AdminWebKabuk() {
  const { width } = useWindowDimensions();
  const masaustu = Platform.OS === 'web' && width >= MASAUSTU_MIN;
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { has, isSuper, loading } = useAdminPermissions();
  const path = usePathname();
  const [sorgu, setSorgu] = useState('');

  const gruplar = useMemo(() => {
    const taban =
      isSuper || loading
        ? ADMIN_MODULLER
        : ADMIN_MODULLER.filter((m) => has(m.permissionKey));

    const q = sorgu.trim().toLocaleLowerCase('tr');
    const liste = q
      ? taban.filter(
          (m) =>
            m.label.toLocaleLowerCase('tr').includes(q) ||
            m.alt.toLocaleLowerCase('tr').includes(q),
        )
      : taban;

    return ADMIN_BOLUM_SIRASI.map((bolum) => ({
      bolum,
      moduller: liste.filter((m) => m.bolum === bolum),
    })).filter((g) => g.moduller.length > 0);
  }, [has, isSuper, loading, sorgu]);

  if (!admin) return <Slot />;

  if (!masaustu) {
    return (
      <View style={styles.kabukDar}>
        <View style={styles.ustBar}>
          <Pressable style={styles.ustMarka} onPress={() => router.push('/admin')}>
            <View style={styles.ustMarkaIsaret}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={RenkTokenlari.textOnPrimary}
              />
            </View>
            <Text style={styles.ustMarkaAd}>Tamuso</Text>
          </Pressable>
          <View style={styles.ustSag}>
            <OturumRozeti dar />
            <CikisDugmesi dar />
          </View>
        </View>
        <View style={styles.icerik}>
          <Slot />
        </View>
      </View>
    );
  }

  const ad =
    profile?.display_name?.trim() ||
    (profile?.username ? `@${profile.username}` : 'Personel');

  return (
    <View style={styles.kabuk}>
      <View style={styles.yan}>
        <Pressable onPress={() => router.push('/admin')} style={styles.marka}>
          <View style={styles.markaIsaret}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={RenkTokenlari.textOnPrimary}
            />
          </View>
          <View>
            <Text style={styles.markaAd}>Tamuso</Text>
            <Text style={styles.markaAlt}>Kontrol merkezi</Text>
          </View>
        </Pressable>

        <View style={styles.aramaKap}>
          <Ionicons name="search" size={14} color={RenkTokenlari.textDim} />
          <TextInput
            style={styles.arama}
            value={sorgu}
            onChangeText={setSorgu}
            placeholder="Menüde ara"
            placeholderTextColor={RenkTokenlari.textDim}
            autoCorrect={false}
            spellCheck={false}
            accessibilityLabel="Menüde ara"
          />
          {sorgu ? (
            <Pressable onPress={() => setSorgu('')} hitSlop={8}>
              <Ionicons name="close-circle" size={14} color={RenkTokenlari.textDim} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuIcerik}
        >
          {gruplar.map((g) => (
            <View key={g.bolum} style={styles.grup}>
              <Text style={styles.grupAd}>{g.bolum}</Text>
              {g.moduller.map((m) => (
                <NavOge
                  key={m.href}
                  href={m.href}
                  label={m.label}
                  ikon={m.icon}
                  aktif={path === m.href || path.startsWith(`${m.href}/`)}
                />
              ))}
            </View>
          ))}
          {gruplar.length === 0 ? (
            <Text style={styles.bosMenu}>Eşleşen menü yok</Text>
          ) : null}
        </ScrollView>

        <View style={styles.altPanel}>
          <View style={styles.kullaniciSatir}>
            <View style={styles.avatar}>
              <Text style={styles.avatarYazi}>
                {ad.replace('@', '').slice(0, 1).toLocaleUpperCase('tr')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kullaniciAd} numberOfLines={1}>
                {ad}
              </Text>
              <Text style={styles.kullaniciRol} numberOfLines={1}>
                {isSuper ? 'Süper yönetici' : 'Personel'}
              </Text>
            </View>
          </View>
          <View style={styles.altSatir}>
            <OturumRozeti />
            <CikisDugmesi />
          </View>
        </View>
      </View>

      <View style={styles.icerik}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kabuk: { flex: 1, flexDirection: 'row', backgroundColor: RenkTokenlari.bg },
  kabukDar: { flex: 1, backgroundColor: RenkTokenlari.bg },

  yan: {
    width: 256,
    borderRightWidth: 1,
    borderRightColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },

  marka: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.md,
  },
  markaIsaret: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primary,
  },
  markaAd: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  markaAlt: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, marginTop: 1 },

  aramaKap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: BoslukTokenlari.md,
    marginBottom: BoslukTokenlari.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  arama: {
    flex: 1,
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    padding: 0,
  },

  menuIcerik: { paddingBottom: BoslukTokenlari.lg },
  grup: { paddingBottom: 6 },
  grupAd: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 12,
    paddingBottom: 5,
  },
  oge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
  },
  ogeVurgu: { backgroundColor: RenkTokenlari.surface },
  ogeSerit: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 2,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  ogeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    flex: 1,
  },
  ogeYaziAktif: { color: RenkTokenlari.text, fontWeight: '600' },
  bosMenu: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 12,
  },

  altPanel: {
    borderTopWidth: 1,
    borderTopColor: RenkTokenlari.border,
    padding: BoslukTokenlari.md,
    gap: 10,
  },
  kullaniciSatir: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  avatarYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kullaniciAd: { ...TipografiTokenlari.caption, color: RenkTokenlari.text },
  kullaniciRol: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  altSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  oturumRozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  oturumYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  oturumYaziUyari: { color: RenkTokenlari.warning },

  cikisDugme: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  cikisDugmeDar: { flex: 0, paddingHorizontal: 8, flexGrow: 0 },
  cikisYazi: { ...TipografiTokenlari.micro, color: RenkTokenlari.danger },

  cikisOnay: { flex: 1, gap: 6 },
  cikisOnayYazi: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  cikisOnaySatir: { flexDirection: 'row', gap: 6 },
  cikisOnayDugme: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  cikisHayir: { borderColor: RenkTokenlari.border },
  cikisEvet: {
    borderColor: RenkTokenlari.danger,
    backgroundColor: RenkTokenlari.danger,
  },
  cikisOnayDugmeYazi: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  cikisEvetYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },

  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  ustMarka: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ustMarkaIsaret: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primary,
  },
  ustMarkaAd: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, fontWeight: '700' },
  ustSag: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  icerik: { flex: 1 },
});
