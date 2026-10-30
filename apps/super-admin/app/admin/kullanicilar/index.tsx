import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
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
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { GradientButton } from '../../../../../src/components/GradientButton';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminKullaniciAra } from '../../../../../src/moduller/admin/kullanici/okuma/AdminKullaniciOkuma';
import { AdminKullaniciOlustur } from '../../../../../src/moduller/admin/kullanici/islemler/AdminKullaniciIslemleri';
import {
  AdminOrnekKullaniciEkle,
  AdminOrnekKullaniciSil,
  AdminOrnekOzetiGetir,
} from '../../../../../src/moduller/admin/kullanici/islemler/AdminOrnekKullanicilar';
import { supabase } from '../../../../../src/lib/supabase';
import type { AdminKullaniciOzet } from '../../../../../src/moduller/admin/kullanici/tipler';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../../../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';

function Avatar({
  url,
  ad,
  size = 52,
}: {
  url?: string | null;
  ad: string;
  size?: number;
}) {
  const harf = (ad.trim() || '?').charAt(0).toLocaleUpperCase('tr-TR');
  const safe = MedyaUriGuvenli(url);
  if (safe) {
    return (
      <Image
        source={{ uri: safe }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: 'rgba(232,64,145,0.35)',
        }}
      />
    );
  }
  return (
    <LinearGradient
      colors={[...RenkTokenlari.gradientPrimary]}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.12)',
      }}
    >
      <Text style={{ color: '#12040C', fontWeight: '900', fontSize: size * 0.36 }}>
        {harf}
      </Text>
    </LinearGradient>
  );
}

function Rozet({
  label,
  renk,
}: {
  label: string;
  renk: string;
}) {
  return (
    <View style={[styles.rozet, { borderColor: `${renk}55` }]}>
      <Text style={[styles.rozetYazi, { color: renk }]}>{label}</Text>
    </View>
  );
}

export default function AdminKullanicilarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [q, setQ] = useState('');
  const [liste, setListe] = useState<AdminKullaniciOzet[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [ekleAcik, setEkleAcik] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    display_name: '',
    username: '',
    phone_e164: '',
  });
  const [busy, setBusy] = useState(false);
  const [ornekOzet, setOrnekOzet] = useState({ toplam: 0, kiz: 0, erkek: 0 });

  const yukle = useCallback(async (arama?: string) => {
    setYukleniyor(true);
    try {
      const [rows, ozet] = await Promise.all([
        AdminKullaniciAra(arama, 80),
        AdminOrnekOzetiGetir(),
      ]);
      setListe(rows);
      setOrnekOzet(ozet);
    } catch (e) {
      setListe([]);
      Alert.alert(
        'Kullanıcılar',
        e instanceof Error ? e.message : 'Liste yüklenemedi',
      );
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
      void yukle();
    }, [admin, yukle]),
  );

  if (!admin) return null;

  const olustur = async () => {
    setBusy(true);
    const r = await AdminKullaniciOlustur(form);
    setBusy(false);
    if (!r.ok) {
      Alert.alert('Kullanıcı', r.hata);
      return;
    }
    setEkleAcik(false);
    setForm({
      email: '',
      password: '',
      display_name: '',
      username: '',
      phone_e164: '',
    });
    Alert.alert('Tamam', 'Kullanıcı oluşturuldu.');
    await yukle(q);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Kullanıcılar"
        subtitle="Avatar · ad soyad · dosya"
        fallbackHref="/admin"
      />
      <View style={styles.ust}>
        <View style={styles.arama}>
          <Ionicons name="search" size={16} color={RenkTokenlari.textDim} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Ad soyad, @kullanıcı, telefon, ID"
            placeholderTextColor={RenkTokenlari.textDim}
            style={styles.input}
            onSubmitEditing={() => void yukle(q)}
            returnKeyType="search"
          />
          <Pressable onPress={() => void yukle(q)} hitSlop={8}>
            <Text style={styles.araYazi}>Ara</Text>
          </Pressable>
        </View>
        <Text style={styles.adet}>
          {liste.length} kişi
          {ornekOzet.toplam > 0
            ? ` · ${ornekOzet.toplam} örnek (${ornekOzet.kiz}♀ ${ornekOzet.erkek}♂)`
            : ''}
        </Text>
        <View style={styles.aksiyonSatir}>
          <Pressable
            onPress={() => {
              void (async () => {
                setBusy(true);
                const r = await AdminOrnekKullaniciEkle();
                setBusy(false);
                if (!r.ok) {
                  Alert.alert('Örnek', r.hata);
                  return;
                }
                const v = r.veri as {
                  eklenen?: number;
                  atlanan?: number;
                };
                Alert.alert(
                  'Örnek profiller',
                  `${v.eklenen ?? 0} eklendi · ${v.atlanan ?? 0} zaten vardı`,
                );
                await yukle(q);
              })();
            }}
            style={styles.ornekBtn}
            disabled={busy}
          >
            <Text style={styles.ornekYazi}>Örnek doldur</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                'Örnekleri sil',
                'Tüm örnek kız/erkek profilleri kalıcı silinsin mi?',
                [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: () => {
                      void (async () => {
                        setBusy(true);
                        const r = await AdminOrnekKullaniciSil();
                        setBusy(false);
                        if (!r.ok) {
                          Alert.alert('Örnek', r.hata);
                          return;
                        }
                        const v = r.veri as { silinen?: number; hatalar?: string[] };
                        const ek = v.hatalar?.length
                          ? `\n${v.hatalar.slice(0, 3).join('\n')}`
                          : '';
                        Alert.alert('Silindi', `${v.silinen ?? 0} örnek kaldırıldı${ek}`);
                        await yukle(q);
                      })();
                    },
                  },
                ],
              );
            }}
            style={[styles.ornekSilBtn, (busy || ornekOzet.toplam === 0) && styles.btnKapali]}
            disabled={busy || ornekOzet.toplam === 0}
          >
            <Text style={styles.ornekSilYazi}>Örnekleri sil</Text>
          </Pressable>
        </View>
        <View style={styles.aksiyonSatir}>
          <Pressable
            onPress={() => {
              void (async () => {
                const { data, error } = await supabase.rpc(
                  'admin_gunluk_kayit_ozeti_manuel',
                );
                if (error) Alert.alert('Özet', error.message);
                else {
                  const d = data as {
                    total?: number;
                    members?: number;
                    guests?: number;
                  };
                  Alert.alert(
                    'Günlük özet gönderildi',
                    `Toplam ${d?.total ?? 0} · üye ${d?.members ?? 0} · misafir ${d?.guests ?? 0}`,
                  );
                }
              })();
            }}
            style={styles.ozetBtn}
          >
            <Text style={styles.ozetYazi}>Günlük özet</Text>
          </Pressable>
          <Pressable
            onPress={() => setEkleAcik(true)}
            style={styles.ekleBtn}
          >
            <Text style={styles.ekleYazi}>Kullanıcı ekle</Text>
          </Pressable>
        </View>
      </View>

      {yukleniyor && !liste.length ? (
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginTop: 24 }}
        />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.liste}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={() => void yukle(q)}
              tintColor={RenkTokenlari.primarySoft}
            />
          }
          ListEmptyComponent={
            <Text style={styles.bos}>Kullanıcı bulunamadı.</Text>
          }
          renderItem={({ item }) => {
            const adSoyad =
              item.display_name?.trim() ||
              (item.username ? item.username : 'İsimsiz kullanıcı');
            const durum = item.deleted_at
              ? 'Silinmiş'
              : item.banned_at
                ? 'Banlı'
                : 'Aktif';
            const durumRenk =
              item.deleted_at || item.banned_at
                ? RenkTokenlari.danger
                : RenkTokenlari.mint;

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.kart,
                  pressed && { opacity: 0.92 },
                ]}
                onPress={() =>
                  router.push(`/admin/kullanicilar/${item.id}` as any)
                }
              >
                <Avatar url={item.avatar_url} ad={adSoyad} />
                <View style={styles.orta}>
                  <View style={styles.adSatir}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {adSoyad}
                    </Text>
                    <Text style={[styles.durum, { color: durumRenk }]}>
                      {durum}
                    </Text>
                  </View>
                  {item.username ? (
                    <Text style={styles.kullaniciAdi} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  ) : null}
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.public_user_id ?? item.id.slice(0, 8)}
                    {item.phone_e164 ? ` · ${item.phone_e164}` : ''}
                    {item.platform ? ` · ${item.platform}` : ''}
                  </Text>
                  <View style={styles.rozetSatir}>
                    {item.is_admin ? (
                      <Rozet label="Admin" renk={RenkTokenlari.accent} />
                    ) : null}
                    {item.is_host ? (
                      <Rozet label="Host" renk={RenkTokenlari.mint} />
                    ) : null}
                    {item.is_guest ? (
                      <Rozet label="Misafir" renk={RenkTokenlari.textMuted} />
                    ) : null}
                    {item.warning_count > 0 ? (
                      <Rozet
                        label={`${item.warning_count} ihtar`}
                        renk={RenkTokenlari.danger}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.cuzdan}>
                    {item.coins.toLocaleString('tr-TR')} coin ·{' '}
                    {item.diamonds.toLocaleString('tr-TR')} elmas
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
      )}

      <Modal visible={ekleAcik} transparent animationType="fade">
        <View style={styles.modalKok}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEkleAcik(false)}
          />
          <View style={styles.modalKart}>
            <Text style={styles.modalBaslik}>Yeni kullanıcı</Text>
            {(
              [
                ['email', 'E-posta', 'email'],
                ['password', 'Şifre (min 6)', 'password'],
                ['display_name', 'Ad soyad', 'default'],
                ['username', 'Kullanıcı adı', 'default'],
                ['phone_e164', 'Telefon (+90...)', 'phone'],
              ] as const
            ).map(([key, label, type]) => (
              <View key={key} style={styles.alan}>
                <Text style={styles.etiket}>{label}</Text>
                <TextInput
                  value={form[key]}
                  onChangeText={(t) => setForm((f) => ({ ...f, [key]: t }))}
                  style={styles.formInput}
                  placeholderTextColor={RenkTokenlari.textDim}
                  autoCapitalize="none"
                  secureTextEntry={type === 'password'}
                  keyboardType={
                    type === 'email'
                      ? 'email-address'
                      : type === 'phone'
                        ? 'phone-pad'
                        : 'default'
                  }
                />
              </View>
            ))}
            <View style={styles.modalAksiyon}>
              <Pressable onPress={() => setEkleAcik(false)}>
                <Text style={styles.iptal}>Vazgeç</Text>
              </Pressable>
              <GradientButton
                title={busy ? '...' : 'Oluştur'}
                onPress={() => void olustur()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ust: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
    marginBottom: BoslukTokenlari.sm,
  },
  aksiyonSatir: {
    flexDirection: 'row',
    gap: 8,
  },
  adet: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
  },
  ozetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
  },
  ozetYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  ornekBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: `${RenkTokenlari.violet}66`,
    backgroundColor: 'rgba(139,92,246,0.14)',
  },
  ornekYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.violet,
    fontWeight: '800',
  },
  ornekSilBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: `${RenkTokenlari.danger}55`,
    backgroundColor: 'rgba(232,64,100,0.12)',
  },
  btnKapali: { opacity: 0.45 },
  ekleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.primary,
  },
  ekleYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
  },
  ornekSilYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.danger,
    fontWeight: '800',
  },
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
  araYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  liste: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: 10,
  },
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  orta: { flex: 1, minWidth: 0, gap: 2 },
  adSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    flex: 1,
  },
  kullaniciAdi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  cuzdan: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 2,
    fontWeight: '600',
  },
  durum: {
    ...TipografiTokenlari.micro,
    fontWeight: '800',
  },
  rozetSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  rozet: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rozetYazi: {
    ...TipografiTokenlari.micro,
    fontWeight: '700',
    fontSize: 10,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    marginTop: 40,
  },
  modalKok: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalKart: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    padding: BoslukTokenlari.xl,
    gap: 8,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  modalBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: 8,
  },
  alan: { marginBottom: 6 },
  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginBottom: 4,
  },
  formInput: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalAksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  iptal: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    padding: 12,
  },
});
