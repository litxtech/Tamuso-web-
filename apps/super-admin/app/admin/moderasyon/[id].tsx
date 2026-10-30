import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminRaporDetayGetir,
  AdminRaporDurumGuncelle,
  AdminRaporIcerikKaldir,
} from '../../../../../src/moduller/admin/platform/AdminPlatformIslemleri';
import { AdminSesOdasiKapat } from '../../../../../src/moduller/medya-yukleme/AdminSesOdasiIslemleri';
import { AdminCanliYayinKapat } from '../../../../../src/moduller/admin/canli-yayin/AdminCanliYayinIslemleri';
import {
  AdminIhtarVer,
  AdminKullaniciAskiyaAl,
  AdminKullaniciBanKaldir,
  AdminKullaniciBanla,
  AdminKullaniciSil,
} from '../../../../../src/moduller/admin/kullanici/islemler/AdminKullaniciIslemleri';
import type { AdminRaporDetay } from '../../../../../src/moduller/admin/tipler/PlatformTipleri';
import {
  AdminStil,
  RaporDurumEtiketi,
} from '../../../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../../../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';

function kisiAd(k?: {
  display_name?: string | null;
  username?: string | null;
  id?: string;
} | null) {
  if (!k) return 'â€”';
  return (
    k.display_name?.trim() ||
    (k.username ? `@${k.username}` : null) ||
    (k.id ? k.id.slice(0, 8) : 'â€”')
  );
}

function icerikTurEtiket(tur?: string | null) {
  switch (tur) {
    case 'dm_message':
      return 'Ã–zel mesaj';
    case 'room_chat':
      return 'Oda sohbeti';
    case 'live_chat':
      return 'CanlÄ± yorum';
    case 'profile':
      return 'Profil';
    case 'room':
      return 'Ses odasÄ±';
    case 'live':
    case 'live_session':
      return 'CanlÄ± yayÄ±n';
    case 'user':
      return 'KullanÄ±cÄ±';
    case 'status_post':
      return 'Durum gÃ¶nderisi';
    case 'status_comment':
      return 'Durum yorumu';
    default:
      return tur || 'Genel';
  }
}

export default function AdminRaporDetayEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { width, height } = useWindowDimensions();
  const [detay, setDetay] = useState<AdminRaporDetay | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uyari, setUyari] = useState('');
  const [not, setNot] = useState('');
  const [bildirenNot, setBildirenNot] = useState('');
  const [tamEkran, setTamEkran] = useState(false);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const d = await AdminRaporDetayGetir(id);
      setDetay(d);
      setNot(d.rapor.admin_note ?? '');
      setBildirenNot(d.rapor.reporter_note ?? '');
      setUyari(
        d.rapor.reason
          ? `Rapor nedeniyle uyarÄ±: ${d.rapor.reason}`
          : 'Topluluk kurallarÄ±nÄ± ihlal ettin. TekrarÄ±nda hesabÄ±n kÄ±sÄ±tlanabilir.',
      );
    } catch (e) {
      Alert.alert(
        'Rapor',
        e instanceof Error ? e.message : 'Detay yÃ¼klenemedi (migration 033?)',
      );
      setDetay(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

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

  const hedefId = detay?.target?.id ?? detay?.rapor.target_user_id ?? null;
  const mediaUrl = MedyaUriGuvenli(detay?.icerik.media_url);
  const metin =
    detay?.icerik.metin ||
    detay?.rapor.details ||
    (detay?.rapor.context as { body?: string } | null)?.body ||
    null;

  const calistir = async (fn: () => Promise<void>, basari?: string) => {
    setBusy(true);
    try {
      await fn();
      if (basari) Alert.alert('Tamam', basari);
      await yukle();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Ä°ÅŸlem baÅŸarÄ±sÄ±z');
    } finally {
      setBusy(false);
    }
  };

  const durumGuncelle = (st: string, adminNot?: string) =>
    AdminRaporDurumGuncelle(
      id!,
      st,
      adminNot ?? (not.trim() || undefined),
      bildirenNot.trim() || undefined,
    );

  const durum = (st: string) =>
    void calistir(
      () => durumGuncelle(st),
      st === 'resolved'
        ? 'Rapor Ã§Ã¶zÃ¼ldÃ¼'
        : st === 'dismissed'
          ? 'Rapor reddedildi'
          : 'Durum gÃ¼ncellendi',
    );

  const uyariVer = () => {
    if (!hedefId) {
      Alert.alert('UyarÄ±', 'Hedef kullanÄ±cÄ± yok.');
      return;
    }
    if (!uyari.trim()) {
      Alert.alert('UyarÄ±', 'Mesaj yaz.');
      return;
    }
    void calistir(async () => {
      const r = await AdminIhtarVer({
        userId: hedefId,
        reason: uyari.trim(),
        severity: 'medium',
        notes: `report:${id}`,
      });
      if (!r.ok) throw new Error(r.hata);
      await durumGuncelle('reviewing');
    }, 'UyarÄ± gÃ¶nderildi');
  };

  const banla = () => {
    if (!hedefId) return;
    Alert.alert('Ban', 'KullanÄ±cÄ± banlansÄ±n mÄ±?', [
      { text: 'VazgeÃ§', style: 'cancel' },
      {
        text: 'Banla',
        style: 'destructive',
        onPress: () =>
          void calistir(async () => {
            const r = await AdminKullaniciBanla(
              hedefId,
              detay?.rapor.reason || 'report_ban',
            );
            if (!r.ok) throw new Error(r.hata);
            await durumGuncelle('resolved', not.trim() || 'Ban');
          }, 'KullanÄ±cÄ± banlandÄ±'),
      },
    ]);
  };

  const askiyaAl = () => {
    if (!hedefId) return;
    Alert.alert('GeÃ§ici askÄ±', '24 saat askÄ±ya alÄ±nsÄ±n mÄ±?', [
      { text: 'VazgeÃ§', style: 'cancel' },
      {
        text: '24 saat',
        onPress: () =>
          void calistir(async () => {
            const r = await AdminKullaniciAskiyaAl(
              hedefId,
              24,
              detay?.rapor.reason || 'report_suspend',
            );
            if (!r.ok) throw new Error(r.hata);
            await durumGuncelle('resolved', not.trim() || 'AskÄ±ya alma 24s');
          }, '24 saat askÄ±ya alÄ±ndÄ±'),
      },
    ]);
  };

  const banKaldir = () => {
    if (!hedefId) return;
    void calistir(async () => {
      const r = await AdminKullaniciBanKaldir(hedefId);
      if (!r.ok) throw new Error(r.hata);
    }, 'Ban kaldÄ±rÄ±ldÄ±');
  };

  const hesapSil = () => {
    if (!hedefId) return;
    Alert.alert('Hesap sil', 'Hesap soft-delete edilecek. Emin misin?', [
      { text: 'VazgeÃ§', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () =>
          void calistir(async () => {
            const r = await AdminKullaniciSil(hedefId, 'report_delete');
            if (!r.ok) throw new Error(r.hata);
            await durumGuncelle('resolved', not.trim() || 'Hesap silindi');
          }, 'Hesap silindi'),
      },
    ]);
  };

  const icerikKaldir = () => {
    Alert.alert('Ä°Ã§erik kaldÄ±r', 'Ä°lgili iÃ§erik platformdan kaldÄ±rÄ±lsÄ±n mÄ±?', [
      { text: 'VazgeÃ§', style: 'cancel' },
      {
        text: 'KaldÄ±r',
        style: 'destructive',
        onPress: () =>
          void calistir(async () => {
            await AdminRaporIcerikKaldir(id!);
            await durumGuncelle(
              'reviewing',
              not.trim() || 'Ä°Ã§erik kaldÄ±rÄ±ldÄ±',
            );
          }, 'Ä°Ã§erik kaldÄ±rÄ±ldÄ±'),
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Rapor detayÄ±"
        subtitle="Neden bildirildi Â· ne yaptÄ±"
        fallbackHref={"/admin" as any}
      />
      {yukleniyor || !detay ? (
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={AdminStil.content}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor || busy}
              onRefresh={() => void yukle()}
              tintColor={RenkTokenlari.primarySoft}
            />
          }
        >
          <View style={AdminStil.kart}>
            <View style={AdminStil.satir}>
              <Text style={AdminStil.kartBaslik}>{detay.rapor.reason}</Text>
              <View style={AdminStil.chip}>
                <Text style={AdminStil.chipYazi}>
                  {RaporDurumEtiketi(detay.rapor.status)}
                </Text>
              </View>
            </View>
            <Text style={AdminStil.kartAlt}>
              {icerikTurEtiket(detay.icerik.tur)} Â·{' '}
              {new Date(detay.rapor.created_at).toLocaleString('tr-TR')}
            </Text>
            {detay.rapor.details ? (
              <Text style={styles.detayMetin}>{detay.rapor.details}</Text>
            ) : null}
          </View>

          <Text style={AdminStil.sectionLabel}>Kimler</Text>
          <View style={AdminStil.kart}>
            <Text style={styles.kisiEtiket}>Bildiren</Text>
            <Text style={AdminStil.kartBaslik}>{kisiAd(detay.reporter)}</Text>
            {detay.reporter?.public_user_id ? (
              <Text style={AdminStil.kartAlt}>
                {detay.reporter.public_user_id}
              </Text>
            ) : null}
          </View>
          <View style={AdminStil.kart}>
            <Text style={styles.kisiEtiket}>Bildirilen</Text>
            <Text style={AdminStil.kartBaslik}>{kisiAd(detay.target)}</Text>
            <Text style={AdminStil.kartAlt}>
              {detay.target?.banned_at
                ? `BanlÄ± Â· ${detay.target.ban_reason ?? ''}`
                : detay.target?.deleted_at
                  ? 'SilinmiÅŸ hesap'
                  : 'Aktif'}
            </Text>
            {hedefId ? (
              <Pressable
                style={AdminStil.aksiyon}
                onPress={() =>
                  router.push(`/admin/kullanicilar/${hedefId}` as any)
                }
              >
                <Text
                  style={[
                    AdminStil.aksiyonYazi,
                    { color: RenkTokenlari.primarySoft },
                  ]}
                >
                  Tam kullanÄ±cÄ± dosyasÄ±
                </Text>
              </Pressable>
            ) : null}
          </View>

          {detay.room || detay.live_session ? (
            <View style={AdminStil.kart}>
              <Text style={styles.kisiEtiket}>
                {detay.live_session ? 'CanlÄ± yayÄ±n' : 'Ses odasÄ±'}
              </Text>
              <Text style={AdminStil.kartBaslik}>
                {detay.live_session?.title ||
                  detay.room?.title ||
                  detay.room?.id ||
                  detay.live_session?.id}
              </Text>
              <Text style={AdminStil.kartAlt}>
                {detay.live_session
                  ? `${detay.live_session.mode ?? ''} Â· ${
                      detay.live_session.is_live ? 'canlÄ±' : 'bitti'
                    } Â· izleyici ${detay.live_session.viewer_count ?? 0}`
                  : `${detay.room?.mode ?? ''}${
                      detay.room?.is_live ? ' Â· canlÄ±' : ''
                    } Â· dinleyici ${detay.room?.listener_count ?? 0}`}
              </Text>
              <View style={AdminStil.aksiyonSatir}>
                {detay.href ? (
                  <Pressable
                    style={[AdminStil.aksiyon, styles.aksiyonOnemli]}
                    onPress={() => router.push(detay.href as any)}
                  >
                    <Text
                      style={[
                        AdminStil.aksiyonYazi,
                        { color: RenkTokenlari.primarySoft },
                      ]}
                    >
                      {detay.live_session ? 'YayÄ±na git' : 'Odaya git'}
                    </Text>
                  </Pressable>
                ) : null}
                {detay.room?.id && detay.room.is_live ? (
                  <Pressable
                    style={[AdminStil.aksiyon, styles.aksiyonTehlike]}
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(
                        'OdayÄ± kapat',
                        'Bu ses odasÄ± anÄ±nda kapatÄ±lsÄ±n mÄ±? (Admin â€” izin gerekmez)',
                        [
                          { text: 'VazgeÃ§', style: 'cancel' },
                          {
                            text: 'Kapat',
                            style: 'destructive',
                            onPress: () =>
                              void calistir(async () => {
                                await AdminSesOdasiKapat(detay.room!.id);
                                await durumGuncelle(
                                  'reviewing',
                                  not.trim() || 'Oda kapatÄ±ldÄ±',
                                );
                              }, 'Oda kapatÄ±ldÄ±'),
                          },
                        ],
                      )
                    }
                  >
                    <Text
                      style={[
                        AdminStil.aksiyonYazi,
                        { color: RenkTokenlari.danger },
                      ]}
                    >
                      OdayÄ± kapat
                    </Text>
                  </Pressable>
                ) : null}
                {detay.live_session?.id && detay.live_session.is_live ? (
                  <Pressable
                    style={[AdminStil.aksiyon, styles.aksiyonTehlike]}
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(
                        'YayÄ±nÄ± bitir',
                        'Bu canlÄ± yayÄ±n anÄ±nda sonlandÄ±rÄ±lsÄ±n mÄ±? (Admin â€” izin gerekmez)',
                        [
                          { text: 'VazgeÃ§', style: 'cancel' },
                          {
                            text: 'Bitir',
                            style: 'destructive',
                            onPress: () =>
                              void calistir(async () => {
                                await AdminCanliYayinKapat(detay.live_session!.id);
                                await durumGuncelle(
                                  'reviewing',
                                  not.trim() || 'YayÄ±n kapatÄ±ldÄ±',
                                );
                              }, 'YayÄ±n kapatÄ±ldÄ±'),
                          },
                        ],
                      )
                    }
                  >
                    <Text
                      style={[
                        AdminStil.aksiyonYazi,
                        { color: RenkTokenlari.danger },
                      ]}
                    >
                      YayÄ±nÄ± bitir
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {(detay.konusmacilar?.length ?? 0) > 0 ? (
            <>
              <Text style={AdminStil.sectionLabel}>
                KonuÅŸanlar / koltuklar ({detay.konusmacilar!.length})
              </Text>
              {detay.konusmacilar!.map((k) => (
                <Pressable
                  key={`${k.user_id}-${k.seat_index}`}
                  style={AdminStil.kart}
                  onPress={() =>
                    router.push(`/admin/kullanicilar/${k.user_id}` as any)
                  }
                >
                  <Text style={AdminStil.kartBaslik}>
                    {k.display_name ||
                      (k.username ? `@${k.username}` : k.user_id.slice(0, 8))}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    Koltuk {k.seat_index}
                    {k.role ? ` Â· ${k.role}` : ''}
                    {k.is_muted ? ' Â· sessiz' : ''}
                    {k.is_mic_locked ? ' Â· mic kilit' : ''}
                  </Text>
                </Pressable>
              ))}
            </>
          ) : null}

          {(detay.uyeler?.length ?? 0) > 0 ? (
            <>
              <Text style={AdminStil.sectionLabel}>
                Odadaki Ã¼yeler ({detay.uyeler!.length})
              </Text>
              {detay.uyeler!.slice(0, 24).map((u) => (
                <Pressable
                  key={u.user_id}
                  style={AdminStil.kart}
                  onPress={() =>
                    router.push(`/admin/kullanicilar/${u.user_id}` as any)
                  }
                >
                  <Text style={AdminStil.kartBaslik}>
                    {u.display_name ||
                      (u.username ? `@${u.username}` : u.user_id.slice(0, 8))}
                  </Text>
                  <Text style={AdminStil.kartAlt}>{u.role}</Text>
                </Pressable>
              ))}
            </>
          ) : null}

          {(detay.son_sohbet?.length ?? 0) > 0 ? (
            <>
              <Text style={AdminStil.sectionLabel}>Son sohbet / yorumlar</Text>
              {detay.son_sohbet!.map((m) => (
                <View key={m.id} style={AdminStil.kart}>
                  <Text style={AdminStil.kartBaslik} numberOfLines={3}>
                    {m.body || 'â€”'}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    {m.display_name || m.user_id.slice(0, 8)} Â·{' '}
                    {new Date(m.created_at).toLocaleString('tr-TR')}
                    {m.removed_at ? ' Â· kaldÄ±rÄ±ldÄ±' : ''}
                  </Text>
                </View>
              ))}
            </>
          ) : null}

          <Text style={AdminStil.sectionLabel}>Ä°lgili iÃ§erik</Text>
          <Pressable
            style={AdminStil.kart}
            onPress={() => {
              if (mediaUrl || metin) setTamEkran(true);
            }}
          >
            <View style={AdminStil.satir}>
              <Text style={AdminStil.kartBaslik}>
                {icerikTurEtiket(detay.icerik.tur)}
              </Text>
              {detay.icerik.kaldirildi ? (
                <View style={[AdminStil.chip, styles.chipTehlike]}>
                  <Text style={[AdminStil.chipYazi, { color: RenkTokenlari.danger }]}>
                    KaldÄ±rÄ±ldÄ±
                  </Text>
                </View>
              ) : (
                <Text style={styles.tamEkranHint}>Tam ekran â†’</Text>
              )}
            </View>
            {mediaUrl ? (
              <Image
                source={{ uri: mediaUrl }}
                style={styles.onizleme}
                resizeMode="cover"
              />
            ) : null}
            {metin ? (
              <Text style={styles.detayMetin} numberOfLines={8}>
                {metin}
              </Text>
            ) : (
              <Text style={AdminStil.kartAlt}>
                Metin/medya snapshot yok â€” kullanÄ±cÄ± raporu
              </Text>
            )}
          </Pressable>

          {(detay.hedef_ihtarlar ?? []).length > 0 ? (
            <>
              <Text style={AdminStil.sectionLabel}>Ã–nceki uyarÄ±lar</Text>
              {detay.hedef_ihtarlar.map((w) => (
                <View key={w.id} style={AdminStil.kart}>
                  <Text style={AdminStil.kartBaslik}>{w.reason}</Text>
                  <Text style={AdminStil.kartAlt}>
                    {w.severity} Â·{' '}
                    {new Date(w.created_at).toLocaleString('tr-TR')}
                    {w.cleared_at ? ' Â· kaldÄ±rÄ±ldÄ±' : ''}
                  </Text>
                </View>
              ))}
            </>
          ) : null}

          <Text style={AdminStil.sectionLabel}>Admin notu (iÃ§)</Text>
          <TextInput
            value={not}
            onChangeText={setNot}
            placeholder="Sadece admin gÃ¶rÃ¼r"
            placeholderTextColor={RenkTokenlari.textDim}
            style={[AdminStil.input, { minHeight: 64 }]}
            multiline
          />

          <Text style={AdminStil.sectionLabel}>Bildirene not / durum</Text>
          <Text style={AdminStil.kartAlt}>
            Raporlayan kullanÄ±cÄ± RaporlarÄ±mâ€™da gÃ¶rÃ¼r; durum gÃ¼ncellemesinde
            bildirilir.
          </Text>
          <TextInput
            value={bildirenNot}
            onChangeText={setBildirenNot}
            placeholder="Ã–rn: Ä°nceledik, gerekli iÅŸlem yapÄ±ldÄ±."
            placeholderTextColor={RenkTokenlari.textDim}
            style={[AdminStil.input, { minHeight: 72, marginTop: 8 }]}
            multiline
          />

          <Text style={AdminStil.sectionLabel}>UyarÄ± mesajÄ±</Text>
          <TextInput
            value={uyari}
            onChangeText={setUyari}
            placeholder="KullanÄ±cÄ±ya gidecek uyarÄ±"
            placeholderTextColor={RenkTokenlari.textDim}
            style={[AdminStil.input, { minHeight: 72 }]}
            multiline
          />

          <Text style={AdminStil.sectionLabel}>Ä°ÅŸlemler</Text>
          <View style={AdminStil.aksiyonSatir}>
            <Pressable
              style={[AdminStil.aksiyon, styles.aksiyonOnemli]}
              onPress={uyariVer}
              disabled={busy}
            >
              <Text style={AdminStil.aksiyonYazi}>UyarÄ± ver</Text>
            </Pressable>
            <Pressable
              style={AdminStil.aksiyon}
              onPress={icerikKaldir}
              disabled={busy}
            >
              <Text style={AdminStil.aksiyonYazi}>Ä°Ã§eriÄŸi kaldÄ±r</Text>
            </Pressable>
            {detay.target?.banned_at ? (
              <Pressable
                style={AdminStil.aksiyon}
                onPress={banKaldir}
                disabled={busy}
              >
                <Text style={AdminStil.aksiyonYazi}>Ban kaldÄ±r</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={askiyaAl}
                  disabled={busy}
                >
                  <Text style={AdminStil.aksiyonYazi}>24s askÄ±</Text>
                </Pressable>
                <Pressable
                  style={[AdminStil.aksiyon, styles.aksiyonTehlike]}
                  onPress={banla}
                  disabled={busy}
                >
                  <Text
                    style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}
                  >
                    Banla
                  </Text>
                </Pressable>
              </>
            )}
            <Pressable
              style={[AdminStil.aksiyon, styles.aksiyonTehlike]}
              onPress={hesapSil}
              disabled={busy}
            >
              <Text
                style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.danger }]}
              >
                HesabÄ± sil
              </Text>
            </Pressable>
          </View>

          <Text style={AdminStil.sectionLabel}>Rapor durumu</Text>
          <View style={AdminStil.aksiyonSatir}>
            {(
              [
                ['reviewing', 'Ä°ncelemede'],
                ['resolved', 'Ã‡Ã¶zÃ¼ldÃ¼'],
                ['dismissed', 'Reddet'],
                ['open', 'AÃ§Ä±k bÄ±rak'],
              ] as const
            ).map(([st, label]) => (
              <Pressable
                key={st}
                style={AdminStil.aksiyon}
                onPress={() => durum(st)}
                disabled={busy}
              >
                <Text style={AdminStil.aksiyonYazi}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={tamEkran}
        animationType="fade"
        onRequestClose={() => setTamEkran(false)}
      >
        <View style={[styles.tamEkran, { width, height }]}>
          <Pressable
            style={styles.tamEkranKapat}
            onPress={() => setTamEkran(false)}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <ScrollView
            contentContainerStyle={styles.tamEkranIcerik}
            maximumZoomScale={3}
          >
            {mediaUrl ? (
              <Image
                source={{ uri: mediaUrl }}
                style={{ width: width - 24, height: height * 0.55 }}
                resizeMode="contain"
              />
            ) : null}
            {metin ? <Text style={styles.tamEkranMetin}>{metin}</Text> : null}
            <Text style={styles.tamEkranAlt}>
              {detay?.rapor.reason}
              {'\n'}
              {icerikTurEtiket(detay?.icerik.tur)}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kisiEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  detayMetin: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 22,
  },
  onizleme: {
    width: '100%',
    height: 180,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
  },
  tamEkranHint: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
  chipTehlike: {
    backgroundColor: 'rgba(232,64,64,0.12)',
  },
  aksiyonOnemli: {
    borderColor: RenkTokenlari.primarySoft,
  },
  aksiyonTehlike: {
    borderColor: 'rgba(232,64,64,0.35)',
  },
  tamEkran: {
    flex: 1,
    backgroundColor: '#000',
  },
  tamEkranKapat: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tamEkranIcerik: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: BoslukTokenlari.lg,
    paddingTop: 100,
    gap: BoslukTokenlari.lg,
  },
  tamEkranMetin: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontSize: 18,
    lineHeight: 26,
  },
  tamEkranAlt: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.55)',
    marginTop: BoslukTokenlari.md,
  },
});

