import React, { useCallback, useRef, useState } from 'react';
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
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { ProfilAvatarKucuk } from '../../../../../src/moduller/canli-sohbet/bilesenler/ProfilAvatarKucuk';
import { FikirDurumRozeti } from '../../../../../src/moduller/fikir-geri-bildirim/bilesenler/FikirDurumRozeti';
import { FikirZamanCizelgesi } from '../../../../../src/moduller/fikir-geri-bildirim/bilesenler/FikirZamanCizelgesi';
import {
  AdminFikirCevapYaz,
  AdminFikirDetayGetir,
  AdminFikirDurumGuncelle,
  AdminFikirOdulVer,
} from '../../../../../src/moduller/fikir-geri-bildirim/islemler/AdminFikirIslemleri';
import {
  FIKIR_DURUM_ETIKET,
  type FikirDetay,
  type FikirDurum,
} from '../../../../../src/moduller/fikir-geri-bildirim/tipler';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const DURUMLAR = Object.keys(FIKIR_DURUM_ETIKET) as FikirDurum[];

export default function AdminFikirDetayEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [fikir, setFikir] = useState<FikirDetay | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [cevap, setCevap] = useState('');
  const [adminNot, setAdminNot] = useState('');
  const [odulAcik, setOdulAcik] = useState(false);
  const [odulTur, setOdulTur] = useState<'coin' | 'badge'>('coin');
  const [odulMiktar, setOdulMiktar] = useState('2500');
  const [odulMesaj, setOdulMesaj] = useState('');
  const [odulNot, setOdulNot] = useState('');
  const [islem, setIslem] = useState(false);
  const odulKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await AdminFikirDetayGetir(id);
      setFikir(d);
      setAdminNot(d.admin_internal_note ?? '');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!AdminYetkisiVarMi(profile)) {
        router.replace('/(tabs)/profile' as any);
        return;
      }
      setYukleniyor(true);
      void load();
    }, [profile, load]),
  );

  const durumDegistir = (status: FikirDurum) => {
    if (!id || !fikir) return;
    const tamamlandi = status === 'COMPLETED';
    Alert.alert(
      tamamlandi ? 'Bu fikir Tamuso\'da hayata geçirildi.' : 'Durum değiştir',
      `${FIKIR_DURUM_ETIKET[status]} olarak işaretlensin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: () => {
            void (async () => {
              setIslem(true);
              try {
                await AdminFikirDurumGuncelle({
                  id,
                  status,
                  adminNote: adminNot || undefined,
                });
                await load();
                if (tamamlandi) {
                  Alert.alert(
                    'Hayata geçirildi 🎉',
                    'İstersen kullanıcıyı ödüllendirebilirsin.',
                    [
                      { text: 'Sonra', style: 'cancel' },
                      {
                        text: 'Kullanıcıyı Ödüllendir',
                        onPress: () => {
                          odulKeyRef.current = `reward-${id}-${Date.now()}`;
                          setOdulAcik(true);
                        },
                      },
                    ],
                  );
                }
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'Başarısız');
              } finally {
                setIslem(false);
              }
            })();
          },
        },
      ],
    );
  };

  const bayrak = async (
    alan: 'isPublic' | 'isFeatured' | 'isHidden' | 'isArchived',
    deger: boolean,
  ) => {
    if (!id || !fikir) return;
    setIslem(true);
    try {
      await AdminFikirDurumGuncelle({
        id,
        status: fikir.status,
        [alan]: deger,
      });
      await load();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Başarısız');
    } finally {
      setIslem(false);
    }
  };

  const cevapGonder = async () => {
    if (!id || !cevap.trim()) return;
    setIslem(true);
    try {
      await AdminFikirCevapYaz(id, cevap.trim());
      setCevap('');
      await load();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Başarısız');
    } finally {
      setIslem(false);
    }
  };

  const odulVer = async () => {
    if (!id) return;
    const key = odulKeyRef.current ?? `reward-${id}-${Date.now()}`;
    odulKeyRef.current = key;
    const miktar = Number(odulMiktar.replace(/\D/g, ''));
    if (odulTur === 'coin' && (!miktar || miktar <= 0)) {
      Alert.alert('Miktar', 'Geçerli coin miktarı gir.');
      return;
    }
    if (odulTur === 'coin') {
      Alert.alert(
        'Ödül onayı',
        `Bu kullanıcıya ${miktar.toLocaleString('tr-TR')} Coin fikir katkı ödülü olarak gönderilecek. Onaylıyor musunuz?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Onayla',
            onPress: () => void odulUygula(key, miktar),
          },
        ],
      );
      return;
    }
    void odulUygula(key, 0);
  };

  const odulUygula = async (key: string, miktar: number) => {
    setIslem(true);
    try {
      await AdminFikirOdulVer({
        feedbackId: id!,
        rewardType: odulTur,
        rewardAmount: odulTur === 'coin' ? miktar : undefined,
        badgeCode: odulTur === 'badge' ? 'tamuso_katkilari' : undefined,
        userMessage: odulMesaj || undefined,
        adminNote: odulNot || undefined,
        idempotencyKey: key,
      });
      setOdulAcik(false);
      odulKeyRef.current = null;
      await load();
      Alert.alert('Ödül gönderildi', 'Kullanıcıya bildirim iletildi.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Başarısız');
    } finally {
      setIslem(false);
    }
  };

  const snap = fikir?.author_snapshot;
  const current = fikir?.current_author;

  return (
    <Screen>
      <ModulHataSiniri modulAdi="admin-fikir-detay">
        <EkranBasligi
          title="Fikir yönetimi"
          subtitle="Durum · cevap · ödül"
          onBack={() => router.back()}
        />
        {yukleniyor && !fikir ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 40 }} />
        ) : fikir ? (
          <ScrollView
            contentContainerStyle={styles.govde}
            refreshControl={
              <RefreshControl
                refreshing={yukleniyor}
                onRefresh={() => void load()}
                tintColor={RenkTokenlari.primarySoft}
              />
            }
          >
            <View style={styles.sahipKart}>
              <Text style={styles.bolum}>Fikir Sahibi</Text>
              <View style={styles.sahipSatir}>
                <ProfilAvatarKucuk
                  avatarUrl={current?.avatar_url ?? snap?.profile_photo_url}
                  displayName={current?.display_name ?? snap?.display_name}
                  username={current?.username ?? snap?.username}
                  size={48}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.ad}>
                    {current?.display_name || snap?.display_name || 'Kullanıcı'}
                  </Text>
                  <Text style={styles.meta}>
                    @{current?.username || snap?.username || '—'} ·{' '}
                    {current?.public_user_id || snap?.public_user_id || '—'}
                  </Text>
                  <Text style={styles.meta}>ID: {fikir.user_id}</Text>
                  {snap?.username &&
                  current?.username &&
                  snap.username !== current.username ? (
                    <Text style={styles.snap}>
                      Gönderildiğinde: @{snap.username}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                style={styles.profilBtn}
                onPress={() =>
                  router.push(`/admin/kullanicilar/${fikir.user_id}` as any)
                }
              >
                <Text style={styles.profilBtnYazi}>Profili Gör</Text>
              </Pressable>
            </View>

            <View style={styles.ustSatir}>
              <Text style={styles.kat}>{fikir.category.name}</Text>
              <FikirDurumRozeti status={fikir.status} label={fikir.status_label} />
            </View>
            <Text style={styles.baslik}>{fikir.title}</Text>
            <Text style={styles.aciklama}>{fikir.description}</Text>

            {fikir.attachments?.map((a) => (
              <Image key={a.id} source={{ uri: a.public_url }} style={styles.img} />
            ))}

            {(fikir.platform || fikir.app_version) && (
              <Text style={styles.meta}>
                {fikir.platform} · v{fikir.app_version}
                {fikir.build_number ? ` (${fikir.build_number})` : ''} ·{' '}
                {fikir.os_version}
              </Text>
            )}

            <Text style={styles.bolum}>Durum</Text>
            <View style={styles.durumSerit}>
              {DURUMLAR.map((d) => (
                <Pressable
                  key={d}
                  style={[
                    styles.durumChip,
                    fikir.status === d && styles.durumChipAktif,
                  ]}
                  disabled={islem}
                  onPress={() => durumDegistir(d)}
                >
                  <Text style={styles.durumYazi}>{FIKIR_DURUM_ETIKET[d]}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleSerit}>
              <Pressable
                style={styles.toggle}
                onPress={() => void bayrak('isPublic', !fikir.is_public)}
              >
                <Text style={styles.toggleYazi}>
                  {fikir.is_public ? 'Public ✓' : 'Topluluğa Aç'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.toggle}
                onPress={() => void bayrak('isFeatured', !fikir.is_featured)}
              >
                <Text style={styles.toggleYazi}>
                  {fikir.is_featured ? 'Öne çıkan ✓' : 'Öne Çıkar'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.toggle}
                onPress={() => void bayrak('isHidden', !fikir.is_hidden)}
              >
                <Text style={styles.toggleYazi}>
                  {fikir.is_hidden ? 'Gizli' : 'Gizle'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.toggle}
                onPress={() => void bayrak('isArchived', !fikir.is_archived)}
              >
                <Text style={styles.toggleYazi}>
                  {fikir.is_archived ? 'Arşivde' : 'Arşivle'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.bolum}>Admin notu (iç)</Text>
            <TextInput
              style={styles.input}
              value={adminNot}
              onChangeText={setAdminNot}
              placeholder="İç not..."
              placeholderTextColor={RenkTokenlari.textMuted}
            />

            <FikirZamanCizelgesi items={fikir.timeline} />

            <Text style={styles.bolum}>Kullanıcıya cevap</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              value={cevap}
              onChangeText={setCevap}
              multiline
              placeholder="Örn: Öneriniz için teşekkürler..."
              placeholderTextColor={RenkTokenlari.textMuted}
            />
            <Pressable style={styles.btn} onPress={() => void cevapGonder()} disabled={islem}>
              <Text style={styles.btnYazi}>Cevabı Gönder</Text>
            </Pressable>

            {fikir.admin_replies?.map((r) => (
              <View key={r.id} style={styles.cevapKart}>
                <Text style={styles.meta}>Tamuso Ekibi</Text>
                <Text style={styles.aciklama}>{r.body}</Text>
              </View>
            ))}

            <Text style={styles.bolum}>Ödül geçmişi</Text>
            {fikir.rewards?.length ? (
              fikir.rewards.map((rw) => (
                <View key={rw.id} style={styles.odulKart}>
                  <Text style={styles.odulYazi}>
                    {rw.reward_type === 'coin'
                      ? `${Number(rw.reward_amount ?? 0).toLocaleString('tr-TR')} Coin`
                      : 'Tamuso Katkıcısı Rozeti'}
                  </Text>
                  {rw.admin_note ? (
                    <Text style={styles.meta}>{rw.admin_note}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.meta}>Henüz ödül yok</Text>
            )}

            {fikir.status === 'COMPLETED' ? (
              <Pressable
                style={styles.btn}
                onPress={() => {
                  odulKeyRef.current = `reward-${id}-${Date.now()}`;
                  setOdulAcik(true);
                }}
              >
                <Text style={styles.btnYazi}>Ödül Ver</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}

        <Modal visible={odulAcik} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalKart}>
              <Text style={styles.baslik}>Kullanıcıyı Ödüllendir</Text>
              <View style={styles.toggleSerit}>
                <Pressable
                  style={[styles.toggle, odulTur === 'coin' && styles.durumChipAktif]}
                  onPress={() => setOdulTur('coin')}
                >
                  <Text style={styles.toggleYazi}>Coin</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggle, odulTur === 'badge' && styles.durumChipAktif]}
                  onPress={() => setOdulTur('badge')}
                >
                  <Text style={styles.toggleYazi}>Rozet</Text>
                </Pressable>
              </View>
              {odulTur === 'coin' ? (
                <TextInput
                  style={styles.input}
                  value={odulMiktar}
                  onChangeText={setOdulMiktar}
                  keyboardType="number-pad"
                  placeholder="Miktar"
                  placeholderTextColor={RenkTokenlari.textMuted}
                />
              ) : (
                <Text style={styles.meta}>💡 Tamuso Katkıcısı rozeti verilecek</Text>
              )}
              <TextInput
                style={styles.input}
                value={odulMesaj}
                onChangeText={setOdulMesaj}
                placeholder="Kullanıcıya mesaj (opsiyonel)"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <TextInput
                style={styles.input}
                value={odulNot}
                onChangeText={setOdulNot}
                placeholder="Ödül notu — audit (opsiyonel)"
                placeholderTextColor={RenkTokenlari.textMuted}
              />
              <Pressable style={styles.btn} disabled={islem} onPress={() => void odulVer()}>
                {islem ? (
                  <ActivityIndicator color={RenkTokenlari.textOnPrimary} />
                ) : (
                  <Text style={styles.btnYazi}>Ödülü Gönder</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setOdulAcik(false)}>
                <Text style={[styles.meta, { textAlign: 'center', marginTop: 8 }]}>
                  Kapat
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  govde: { padding: BoslukTokenlari.md, gap: 10, paddingBottom: 56 },
  sahipKart: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.lg,
    padding: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  sahipSatir: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  ad: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  meta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  snap: { ...TipografiTokenlari.caption, color: RenkTokenlari.accent },
  profilBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.primarySoft + '22',
  },
  profilBtnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  bolum: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    marginTop: 6,
  },
  ustSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kat: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  baslik: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  aciklama: { ...TipografiTokenlari.body, color: RenkTokenlari.text, lineHeight: 22 },
  img: {
    width: '100%',
    height: 180,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
  },
  durumSerit: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  durumChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  durumChipAktif: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: RenkTokenlari.primarySoft + '22',
  },
  durumYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.text },
  toggleSerit: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
  },
  toggleYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  input: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
  },
  btn: {
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },
  cevapKart: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.md,
    padding: 10,
    gap: 4,
  },
  odulKart: {
    backgroundColor: RenkTokenlari.accent + '14',
    borderRadius: YaricapTokenlari.md,
    padding: 10,
    gap: 2,
  },
  odulYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalKart: {
    backgroundColor: RenkTokenlari.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
  },
});
