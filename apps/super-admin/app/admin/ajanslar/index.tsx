import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminAjansBasvuruListesi,
  AdminAjansBasvuruOnayla,
  AdminAjansBasvuruReddet,
  AdminAjansListesi,
  type AdminAjansBasvuru,
  type AdminAjansOzet,
} from '../../../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import { AdminStil, SayiKisa } from '../../../../../src/moduller/admin/bilesenler/AdminStil';
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
  size = 44,
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
          borderWidth: 1,
          borderColor: RenkTokenlari.borderAccent,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: RenkTokenlari.bgElevated,
        borderWidth: 1,
        borderColor: RenkTokenlari.border,
      }}
    >
      <Text style={{ color: RenkTokenlari.text, fontWeight: '800', fontSize: size * 0.36 }}>
        {harf}
      </Text>
    </View>
  );
}

function BasvuruKart({
  b,
  onOnayla,
  onReddet,
}: {
  b: AdminAjansBasvuru;
  onOnayla: () => void;
  onReddet: (note: string) => void;
}) {
  const [not, setNot] = useState('');
  const basvuran = b.applicant_name ?? b.applicant_id.slice(0, 8);

  return (
    <View style={AdminStil.kart}>
      <View style={styles.kartBas}>
        <Avatar url={b.logo_url || b.applicant_avatar_url} ad={b.agency_name} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={AdminStil.kartBaslik}>{b.agency_name}</Text>
          <View style={styles.satirKucuk}>
            <Avatar url={b.applicant_avatar_url} ad={basvuran} size={22} />
            <Text style={AdminStil.kartAlt}>
              {basvuran}
              {b.applicant_username ? ` · @${b.applicant_username}` : ''}
            </Text>
          </View>
        </View>
      </View>
      <Text style={AdminStil.kartAlt}>
        Ülke: {b.country ?? '—'}
        {b.expected_hosts != null ? ` · Host hedefi: ${b.expected_hosts}` : ''}
      </Text>
      {b.email ? <Text style={AdminStil.kartAlt}>E-posta: {b.email}</Text> : null}
      {b.phone ? <Text style={AdminStil.kartAlt}>Telefon: {b.phone}</Text> : null}
      {b.experience ? (
        <Text style={AdminStil.kartAlt}>Deneyim: {b.experience}</Text>
      ) : null}
      {b.description ? (
        <Text style={[AdminStil.kartAlt, { marginTop: 4 }]}>
          Açıklama: {b.description}
        </Text>
      ) : null}

      <TextInput
        value={not}
        onChangeText={setNot}
        placeholder="Red notu (isteğe bağlı)"
        placeholderTextColor={RenkTokenlari.textDim}
        style={styles.notInput}
      />

      <View style={AdminStil.aksiyonSatir}>
        <Pressable style={AdminStil.aksiyon} onPress={onOnayla}>
          <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.mint }]}>
            Onayla
          </Text>
        </Pressable>
        <Pressable style={AdminStil.aksiyon} onPress={() => onReddet(not.trim())}>
          <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}>
            Reddet
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminAjanslarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [liste, setListe] = useState<AdminAjansOzet[]>([]);
  const [basvurular, setBasvurular] = useState<AdminAjansBasvuru[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [a, b] = await Promise.all([
        AdminAjansListesi(60),
        AdminAjansBasvuruListesi(40),
      ]);
      setListe(a);
      setBasvurular(b);
    } catch (e) {
      Alert.alert(
        'Ajanslar',
        e instanceof Error ? e.message : 'Yüklenemedi (migration 092?)',
      );
      setListe([]);
      setBasvurular([]);
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

  const onayla = (id: string) => {
    Alert.alert('Onayla', 'Ajans oluşturulsun mu? Başvuran sahip olur.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: () => {
          void (async () => {
            const r = await AdminAjansBasvuruOnayla(id);
            if (!r.ok) {
              Alert.alert('Onay', r.hata ?? 'Başarısız');
              return;
            }
            Alert.alert('Tamam', 'Ajans aktif · başvuran bilgilendirildi.');
            await yukle();
            if (r.agency_id) {
              router.push(`/admin/ajanslar/${r.agency_id}` as any);
            }
          })();
        },
      },
    ]);
  };

  const reddet = (id: string, note: string) => {
    Alert.alert('Reddet', 'Başvuru reddedilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await AdminAjansBasvuruReddet(id, note || undefined);
            if (!r.ok) Alert.alert('Red', r.hata);
            else {
              Alert.alert('Reddedildi', 'Başvuran bilgilendirildi.');
              await yukle();
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Ajanslar"
        subtitle="Başvuru · profil · coin · limit"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <Text style={AdminStil.sectionLabel}>
          Bekleyen başvurular ({basvurular.length})
        </Text>
        {basvurular.length === 0 ? (
          <Text style={AdminStil.bos}>Bekleyen ajans başvurusu yok</Text>
        ) : (
          basvurular.map((b) => (
            <BasvuruKart
              key={b.id}
              b={b}
              onOnayla={() => onayla(b.id)}
              onReddet={(note) => reddet(b.id, note)}
            />
          ))
        )}

        <Text style={AdminStil.sectionLabel}>Aktif ajanslar</Text>
        {yukleniyor && !liste.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !liste.length ? (
          <Text style={AdminStil.bos}>Ajans yok</Text>
        ) : (
          liste.map((a) => {
            const sahip =
              a.owner?.display_name || a.owner?.username || a.owner_id.slice(0, 8);
            return (
              <Pressable
                key={a.id}
                style={AdminStil.kart}
                onPress={() => router.push(`/admin/ajanslar/${a.id}` as any)}
              >
                <View style={styles.kartBas}>
                  <Avatar url={a.logo_url} ad={a.name} size={52} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={AdminStil.satir}>
                      <Text style={[AdminStil.kartBaslik, { flex: 1 }]}>{a.name}</Text>
                      <View style={AdminStil.chip}>
                        <Text style={AdminStil.chipYazi}>
                          {a.is_coin_distributor ? 'Coin yetkisi' : 'Yetkisiz'}
                        </Text>
                      </View>
                    </View>
                    {a.slogan ? (
                      <Text style={styles.slogan} numberOfLines={1}>
                        {a.slogan}
                      </Text>
                    ) : null}
                    <View style={styles.satirKucuk}>
                      <Avatar url={a.owner?.avatar_url} ad={sahip} size={20} />
                      <Text style={AdminStil.kartAlt}>
                        {sahip}
                        {a.owner?.username ? ` · @${a.owner.username}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={AdminStil.kartAlt}>
                  {a.agency_public_id} · {a.country ?? '—'} · {a.host_count} üye
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Bakiye {SayiKisa(a.distribution_balance)} coin ·{' '}
                  {a.limits?.unlimited
                    ? 'sınırsız limit'
                    : `günlük ${SayiKisa(a.limits?.daily_limit)}`}
                </Text>
                <Text
                  style={[
                    AdminStil.aksiyonYazi,
                    { color: RenkTokenlari.primarySoft },
                  ]}
                >
                  Profil / coin / limit →
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kartBas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    marginBottom: 8,
  },
  satirKucuk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slogan: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  notInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.bgElevated,
  },
});
