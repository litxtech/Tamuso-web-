import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminRehberListesiGetir,
  RehberAraAc,
  RehberBasHarf,
  RehberGorunenAd,
  RehberMailAc,
  RehberSmsAc,
  RehberWhatsAppAc,
} from '../../../../src/moduller/admin/rehber/AdminRehberIslemleri';
import type { AdminRehberKisi } from '../../../../src/moduller/admin/rehber/tipler';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { MedyaUriGuvenli } from '../../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Bolum = { title: string; data: AdminRehberKisi[] };

function Avatar({ kisi, buyuk }: { kisi: AdminRehberKisi; buyuk?: boolean }) {
  const ad = RehberGorunenAd(kisi);
  const harf = ad.charAt(0).toLocaleUpperCase('tr-TR');
  const size = buyuk ? 96 : 44;
  if (kisi.avatar_url) {
    return (
      <Image
        source={{ uri: MedyaUriGuvenli(kisi.avatar_url)! }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: RenkTokenlari.surface,
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
        backgroundColor: '#3A2A4A',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: RenkTokenlari.primarySoft,
          fontSize: buyuk ? 36 : 18,
          fontWeight: '700',
        }}
      >
        {harf}
      </Text>
    </View>
  );
}

function AksiyonDugme({
  icon,
  label,
  tint,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.aksiyon,
        disabled && { opacity: 0.35 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.aksiyonDaire, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={styles.aksiyonYazi}>{label}</Text>
    </Pressable>
  );
}

export default function AdminRehberEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [q, setQ] = useState('');
  const [liste, setListe] = useState<AdminRehberKisi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secili, setSecili] = useState<AdminRehberKisi | null>(null);

  const yukle = useCallback(async (arama?: string) => {
    setYukleniyor(true);
    try {
      setListe(await AdminRehberListesiGetir(arama, 300));
    } catch (e) {
      Alert.alert(
        'Rehber',
        e instanceof Error
          ? e.message
          : 'Liste alınamadı (migration 024 gerekli)',
      );
      setListe([]);
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

  const bolumler = useMemo(() => {
    const map = new Map<string, AdminRehberKisi[]>();
    for (const kisi of liste) {
      const harf = RehberBasHarf(kisi);
      const arr = map.get(harf) ?? [];
      arr.push(kisi);
      map.set(harf, arr);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b, 'tr');
    });
    return keys.map((title) => ({ title, data: map.get(title)! })) as Bolum[];
  }, [liste]);

  if (!admin) return null;

  const iletisim = async (
    tur: 'whatsapp' | 'mail' | 'ara' | 'sms',
    kisi: AdminRehberKisi,
  ) => {
    const ad = RehberGorunenAd(kisi);
    let sonuc: { ok: boolean; hata?: string };
    if (tur === 'whatsapp') {
      sonuc = await RehberWhatsAppAc(
        kisi.phone_e164,
        `Merhaba ${ad}, Tamuso yönetiminden yazıyoruz.`,
      );
    } else if (tur === 'mail') {
      sonuc = await RehberMailAc(kisi.email, 'Tamuso — Yönetim');
    } else if (tur === 'ara') {
      sonuc = await RehberAraAc(kisi.phone_e164);
    } else {
      sonuc = await RehberSmsAc(kisi.phone_e164);
    }
    if (!sonuc.ok) Alert.alert('İletişim', sonuc.hata ?? 'Açılamadı');
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Rehber"
        subtitle={`${liste.length} kişi · telefon & e-posta`}
        fallbackHref="/admin"
      />

      <View style={styles.aramaKutu}>
        <Ionicons name="search" size={16} color={RenkTokenlari.textDim} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="İsim, telefon, e-posta ara"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.aramaInput}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          onSubmitEditing={() => void yukle(q)}
        />
        <Pressable onPress={() => void yukle(q)} hitSlop={8}>
          <Text style={styles.araBtn}>Ara</Text>
        </Pressable>
      </View>

      {yukleniyor && !liste.length ? (
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginTop: 32 }}
        />
      ) : (
        <SectionList
          sections={bolumler}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.liste}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={() => void yukle(q)}
              tintColor={RenkTokenlari.primarySoft}
            />
          }
          ListEmptyComponent={
            <Text style={styles.bos}>Kişi bulunamadı</Text>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.harfBaslik}>
              <Text style={styles.harfYazi}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => {
            const son = index === section.data.length - 1;
            const ad = RehberGorunenAd(item);
            const alt =
              item.phone_e164 ||
              item.email ||
              (item.username ? `@${item.username}` : '—');
            return (
              <Pressable
                style={[styles.satir, !son && styles.satirCizgi]}
                onPress={() => setSecili(item)}
              >
                <Avatar kisi={item} />
                <View style={styles.satirMetin}>
                  <Text style={styles.ad} numberOfLines={1}>
                    {ad}
                    {item.banned_at ? ' · ban' : ''}
                  </Text>
                  <Text style={styles.alt} numberOfLines={1}>
                    {alt}
                  </Text>
                </View>
                <View style={styles.hizli}>
                  {item.phone_e164 ? (
                    <Pressable
                      hitSlop={6}
                      onPress={() => void iletisim('whatsapp', item)}
                      style={styles.hizliBtn}
                    >
                      <Ionicons
                        name="logo-whatsapp"
                        size={18}
                        color="#25D366"
                      />
                    </Pressable>
                  ) : null}
                  {item.email ? (
                    <Pressable
                      hitSlop={6}
                      onPress={() => void iletisim('mail', item)}
                      style={styles.hizliBtn}
                    >
                      <Ionicons
                        name="mail"
                        size={18}
                        color={RenkTokenlari.primarySoft}
                      />
                    </Pressable>
                  ) : null}
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={RenkTokenlari.textDim}
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal
        visible={!!secili}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSecili(null)}
      >
        {secili ? (
          <View style={styles.modal}>
            <View style={styles.modalUst}>
              <Pressable onPress={() => setSecili(null)} hitSlop={10}>
                <Text style={styles.modalKapat}>Kapat</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const id = secili.id;
                  setSecili(null);
                  router.push(`/admin/kullanicilar/${id}` as any);
                }}
              >
                <Text style={styles.modalDosya}>Dosya</Text>
              </Pressable>
            </View>

            <View style={styles.modalHero}>
              <Avatar kisi={secili} buyuk />
              <Text style={styles.modalAd}>{RehberGorunenAd(secili)}</Text>
              {secili.username ? (
                <Text style={styles.modalUser}>@{secili.username}</Text>
              ) : null}
              {secili.public_user_id ? (
                <Text style={styles.modalId}>{secili.public_user_id}</Text>
              ) : null}
            </View>

            <View style={styles.aksiyonSatir}>
              <AksiyonDugme
                icon="logo-whatsapp"
                label="WhatsApp"
                tint="#25D366"
                disabled={!secili.phone_e164}
                onPress={() => void iletisim('whatsapp', secili)}
              />
              <AksiyonDugme
                icon="mail"
                label="Mail"
                tint={RenkTokenlari.primarySoft}
                disabled={!secili.email}
                onPress={() => void iletisim('mail', secili)}
              />
              <AksiyonDugme
                icon="call"
                label="Ara"
                tint={RenkTokenlari.mint}
                disabled={!secili.phone_e164}
                onPress={() => void iletisim('ara', secili)}
              />
              <AksiyonDugme
                icon="chatbubble"
                label="SMS"
                tint={RenkTokenlari.accent}
                disabled={!secili.phone_e164}
                onPress={() => void iletisim('sms', secili)}
              />
            </View>

            <View style={styles.bilgiKart}>
              <Text style={styles.bilgiEtiket}>telefon</Text>
              <Text style={styles.bilgiDeger}>
                {secili.phone_e164 ?? 'Kayıtlı değil'}
              </Text>
              {secili.phone_e164 ? (
                <View style={styles.bilgiAksiyonlar}>
                  <Pressable
                    onPress={() => void iletisim('whatsapp', secili)}
                    style={styles.bilgiLink}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                    <Text style={[styles.bilgiLinkYazi, { color: '#25D366' }]}>
                      WhatsApp
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void iletisim('ara', secili)}
                    style={styles.bilgiLink}
                  >
                    <Text
                      style={[
                        styles.bilgiLinkYazi,
                        { color: RenkTokenlari.mint },
                      ]}
                    >
                      Ara
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.bilgiKart}>
              <Text style={styles.bilgiEtiket}>e-posta</Text>
              <Text style={styles.bilgiDeger}>
                {secili.email ?? 'Kayıtlı değil'}
              </Text>
              {secili.email ? (
                <Pressable
                  onPress={() => void iletisim('mail', secili)}
                  style={styles.bilgiLink}
                >
                  <Ionicons
                    name="mail"
                    size={16}
                    color={RenkTokenlari.primarySoft}
                  />
                  <Text
                    style={[
                      styles.bilgiLinkYazi,
                      { color: RenkTokenlari.primarySoft },
                    ]}
                  >
                    Mail gönder
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  aramaKutu: {
    marginHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  aramaInput: {
    flex: 1,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    paddingVertical: 0,
  },
  araBtn: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  liste: {
    paddingBottom: BoslukTokenlari.xxxl,
  },
  harfBaslik: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: 6,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  harfYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: 10,
    backgroundColor: RenkTokenlari.bgCard,
  },
  satirCizgi: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  satirMetin: { flex: 1, gap: 2 },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  hizli: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hizliBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    marginTop: 40,
  },
  modal: {
    flex: 1,
    backgroundColor: RenkTokenlari.bg,
    paddingTop: BoslukTokenlari.lg,
  },
  modalUst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.md,
  },
  modalKapat: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  modalDosya: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.accent,
    fontWeight: '600',
  },
  modalHero: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: BoslukTokenlari.xl,
  },
  modalAd: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    fontSize: 26,
    marginTop: BoslukTokenlari.md,
  },
  modalUser: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
  },
  modalId: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  aksiyonSatir: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: BoslukTokenlari.md,
    marginBottom: BoslukTokenlari.xl,
  },
  aksiyon: { alignItems: 'center', gap: 6, width: 72 },
  aksiyonDaire: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aksiyonYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  bilgiKart: {
    marginHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 6,
  },
  bilgiEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  bilgiDeger: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  bilgiAksiyonlar: {
    flexDirection: 'row',
    gap: BoslukTokenlari.lg,
    marginTop: 4,
  },
  bilgiLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bilgiLinkYazi: {
    ...TipografiTokenlari.caption,
    fontWeight: '700',
  },
});
