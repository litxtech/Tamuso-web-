import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../../../../src/lib/supabase';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  AdminBasvuruBelgeleriGetir,
  AdminBasvuruDetayGetir,
  AdminBasvuruGecis,
  AdminBasvuruProfilGetir,
  AdminBelgeGoruntulePath,
  AdminBelgeIncele,
  AdminBilesenOnayla,
  AdminManuelOverride,
  RED_NEDENLERI,
} from '../../../../../src/moduller/admin/dogrulama/AdminDogrulamaIslemleri';
import {
  BasvuruDurumEtiket,
  BelgeDurumEtiket,
} from '../../../../../src/moduller/admin/dogrulama/DogrulamaDurumEtiketleri';
import { AdminAjansOperasyonPaneli } from '../../../../../src/moduller/admin/ajans/AdminAjansOperasyonPaneli';
import { AdminAjansYetkiKarti } from '../../../../../src/moduller/admin/ajans/AdminAjansYetkiKarti';
import {
  KlavyeFocusKaydir,
  KlavyeScrollView,
  type KlavyeScrollHandle,
} from '../../../../../src/bilesenler/klavye/KlavyeScrollView';

function dogrulamaHataMetni(e: unknown): string {
  const ham = e instanceof Error ? e.message : String(e ?? '');
  const m = ham.toLowerCase();
  if (m.includes('override_forbidden') || m.includes('forbidden')) {
    return 'Bu hesapta elle doğrulama yetkisi yok.';
  }
  if (m.includes('reason_required') || m.includes('reason zorunlu')) {
    return 'Elle doğrulama sebebini yaz.';
  }
  if (m.includes('note_required') || m.includes('internal note')) {
    return 'İç not zorunlu. Alttaki nota ne yaptığını yaz.';
  }
  if (m.includes('application_not_found')) return 'Başvuru bulunamadı.';
  if (m.includes('agency_not_found')) return 'Ajans kaydı bulunamadı.';
  if (m.includes('profile_missing') || m.includes('profil bulunamadi')) {
    return 'Doğrulama kaydı açılamadı. Sayfayı yenileyip tekrar dene.';
  }
  if (m.includes('status_invalid')) return 'Bu durum elle işaretlenemez.';
  if (m.includes('row version') || m.includes('conflict')) {
    return 'Kayıt az önce güncellendi. Sayfayı yenileyip tekrar dene.';
  }
  return ham || 'İşlem başarısız';
}

type Profil = {
  id: string;
  overall_status: string;
  progress_pct: number;
  identity_verified: boolean;
  address_verified: boolean;
  company_verified: boolean;
  authorized_person_verified: boolean;
  extra_docs_reviewed: boolean;
  payment_account_verified: boolean;
  contract_accepted: boolean;
  row_version: number;
};

type Kontroller = {
  identity: boolean;
  address: boolean;
  company: boolean;
  authorizedPerson: boolean;
  extraDocs: boolean;
  paymentAccount: boolean;
  contract: boolean;
};

const KONTROLLER: {
  key: keyof Kontroller;
  baslik: string;
  alt: string;
}[] = [
  { key: 'identity', baslik: 'Kimlik', alt: 'Başvuranın kimliği okunabilir ve eşleşiyor.' },
  { key: 'address', baslik: 'Adres', alt: 'İkamet veya iş adresi belgede görünüyor.' },
  { key: 'company', baslik: 'Şirket', alt: 'Tüzel ajanssa ticaret bilgisi doğrulandı.' },
  { key: 'authorizedPerson', baslik: 'Yetkili kişi', alt: 'Ajansı yönetecek kişi başvurandaki kişi.' },
  { key: 'extraDocs', baslik: 'Ek belgeler', alt: 'İstenen ek evraklar incelendi.' },
  { key: 'paymentAccount', baslik: 'Ödeme hesabı', alt: 'Ödeme bilgisi ajansla eşleşiyor.' },
  { key: 'contract', baslik: 'Sözleşme', alt: 'Ajans sözleşmesi kabul edilmiş.' },
];

const BELGE_TUR: Record<string, string> = {
  IDENTITY: 'Kimlik',
  ADDRESS: 'Adres',
  COMPANY: 'Şirket',
  AUTHORIZED_PERSON: 'Yetkili',
  PAYMENT: 'Ödeme',
  CONTRACT: 'Sözleşme',
  EXTRA: 'Ek belge',
  PASSPORT: 'Pasaport',
  NATIONAL_ID: 'Kimlik kartı',
  DRIVERS_LICENSE: 'Ehliyet',
  UTILITY_BILL: 'Fatura',
  COMPANY_REGISTRATION: 'Sicil',
};

function turEtiket(kod: string): string {
  return BELGE_TUR[kod] ?? kod.replace(/_/g, ' ').toLowerCase();
}

type KararTanim = {
  status: string;
  baslik: string;
  alt: string;
  vurgu?: 'mint' | 'tehlike';
};

function sonrakiKararlar(status: string): KararTanim[] {
  const reddet: KararTanim = {
    status: 'REJECTED',
    baslik: 'Reddet',
    alt: 'Başvuru kapanır. Mümkünse başvurana bir mesaj yaz.',
    vurgu: 'tehlike',
  };
  const ek: KararTanim = {
    status: 'MORE_INFORMATION_REQUIRED',
    baslik: 'Ek bilgi iste',
    alt: 'Eksik belge veya açıklama beklenir.',
  };
  if (status === 'pending' || status === 'SUBMITTED') {
    return [
      {
        status: 'UNDER_REVIEW',
        baslik: 'İncelemeye al',
        alt: 'Kuyruktan çıkar, sana atanır.',
      },
      ek,
      reddet,
    ];
  }
  if (status === 'under_review' || status === 'UNDER_REVIEW') {
    return [
      {
        status: 'PRE_APPROVED',
        baslik: 'Doğrulama iste',
        alt: 'Başvuran belgelerini tamamlar. Sonra doğrulanmış işaretlenir.',
      },
      {
        status: 'approved',
        baslik: 'Ajansı hemen aç',
        alt: 'Belge adımlarını atlar ve ajans hesabını oluşturur.',
        vurgu: 'mint',
      },
      ek,
      reddet,
    ];
  }
  if (status === 'MORE_INFORMATION_REQUIRED') {
    return [
      {
        status: 'UNDER_REVIEW',
        baslik: 'Tekrar incelemeye al',
        alt: 'Gelen ek bilgiyle incelemeye dönersin.',
      },
      reddet,
    ];
  }
  if (status === 'PRE_APPROVED') {
    return [
      {
        status: 'VERIFICATION_REQUIRED',
        baslik: 'Doğrulama iste',
        alt: 'Başvurandan kimlik ve belge istenir.',
      },
      reddet,
    ];
  }
  if (status === 'VERIFICATION_REQUIRED') {
    return [
      {
        status: 'VERIFICATION_IN_REVIEW',
        baslik: 'Belgeleri incelemeye al',
        alt: 'Gelen evrakları bu sayfadaki listeden kontrol edersin.',
      },
      reddet,
    ];
  }
  if (status === 'VERIFICATION_IN_REVIEW') {
    return [
      {
        status: 'VERIFIED',
        baslik: 'Doğrulandı işaretle',
        alt: 'Kimlik ve belgeler tamam. Ajans hesabı bir sonraki adımda açılır.',
        vurgu: 'mint',
      },
      ek,
      reddet,
    ];
  }
  if (status === 'VERIFIED') {
    return [
      {
        status: 'APPROVED',
        baslik: 'Ajansı onayla ve aç',
        alt: 'Ajans hesabı oluşur. Coin, limit ve kilitler aşağıda belirir.',
        vurgu: 'mint',
      },
    ];
  }
  if (status === 'APPROVED' || status === 'approved' || status === 'ACTIVE') {
    return [
      {
        status: 'SUSPENDED',
        baslik: 'Başvuruyu askıya al',
        alt: 'Ajans kaydı durur. Aşağıdaki yetkiden de kapatabilirsin.',
      },
      {
        status: 'REVOKED',
        baslik: 'Doğrulamayı iptal et',
        alt: 'Onay geri alınır.',
        vurgu: 'tehlike',
      },
    ];
  }
  if (status === 'SUSPENDED' || status === 'suspended') {
    return [
      {
        status: 'ACTIVE',
        baslik: 'Tekrar aktif et',
        alt: 'Askıdaki başvuru yeniden açılır.',
        vurgu: 'mint',
      },
      {
        status: 'REVOKED',
        baslik: 'Doğrulamayı iptal et',
        alt: 'Onay kalıcı kapanır.',
        vurgu: 'tehlike',
      },
    ];
  }
  return [];
}

function ajansTuru(kod: unknown): string {
  const v = String(kod ?? '').toUpperCase();
  if (v === 'COMPANY') return 'Şirket';
  if (v === 'INDIVIDUAL') return 'Kişi';
  return v || '—';
}

function listeMetin(deger: unknown): string {
  if (Array.isArray(deger)) return deger.map((x) => String(x)).filter(Boolean).join(', ');
  if (deger && typeof deger === 'object') {
    return Object.values(deger as Record<string, unknown>)
      .map((x) => String(x))
      .filter((x) => x && x !== 'null')
      .join(', ');
  }
  return String(deger ?? '');
}

function satir(etiket: string, deger: unknown) {
  const metin = (typeof deger === 'string' ? deger : listeMetin(deger)).trim();
  if (!metin || metin === 'null' || metin === 'undefined' || metin === '[object Object]') return null;
  return { etiket, metin };
}

export default function AdminDogrulamaDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [basvuru, setBasvuru] = useState<Record<string, unknown> | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [belgeler, setBelgeler] = useState<Record<string, unknown>[]>([]);
  const [ajansId, setAjansId] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [userMsg, setUserMsg] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [elleHata, setElleHata] = useState<string | null>(null);
  const [elleBusy, setElleBusy] = useState(false);
  const scrollRef = useRef<KlavyeScrollHandle>(null);
  const [checks, setChecks] = useState<Kontroller>({
    identity: false,
    address: false,
    company: false,
    authorizedPerson: false,
    extraDocs: false,
    paymentAccount: false,
    contract: false,
  });

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [b, p, d] = await Promise.all([
        AdminBasvuruDetayGetir(id),
        AdminBasvuruProfilGetir(id),
        AdminBasvuruBelgeleriGetir(id),
      ]);
      setBasvuru(b);
      setProfil(p as Profil | null);
      setBelgeler(d as Record<string, unknown>[]);
      const bagli = b && typeof b.agency_id === 'string' ? b.agency_id : null;
      const acik = ['APPROVED', 'approved', 'ACTIVE', 'VERIFIED', 'SUSPENDED', 'suspended'].includes(
        String(b?.status ?? ''),
      );
      if (bagli) {
        setAjansId(bagli);
      } else if (acik && b?.applicant_id) {
        const { data: ajans } = await supabase
          .from('agencies')
          .select('id')
          .eq('owner_id', String(b.applicant_id))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setAjansId(ajans?.id ?? null);
      } else {
        setAjansId(null);
      }
      if (p) {
        const row = p as Profil;
        setChecks({
          identity: !!row.identity_verified,
          address: !!row.address_verified,
          company: !!row.company_verified,
          authorizedPerson: !!row.authorized_person_verified,
          extraDocs: !!row.extra_docs_reviewed,
          paymentAccount: !!row.payment_account_verified,
          contract: !!row.contract_accepted,
        });
      }
    } catch (e) {
      Alert.alert('Doğrulama', e instanceof Error ? e.message : 'Yüklenemedi');
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

  const gecis = async (newStatus: string, baslik: string) => {
    if (!basvuru?.id) return;
    try {
      await AdminBasvuruGecis({
        applicationId: String(basvuru.id),
        newStatus,
        rowVersion: Number(basvuru.row_version ?? 1),
        userMessage: userMsg || undefined,
        note: internalNote || undefined,
        assignSelf: true,
      });
      Alert.alert(baslik, BasvuruDurumEtiket(newStatus));
      void yukle();
    } catch (e) {
      Alert.alert('Hata', dogrulamaHataMetni(e));
    }
  };

  const bilesenKaydet = async () => {
    if (!profil?.id) {
      Alert.alert('Kontrol listesi yok', 'Bu başvuruda henüz doğrulama kaydı oluşmamış.');
      return;
    }
    try {
      await AdminBilesenOnayla({
        profileId: profil.id,
        ...checks,
        rowVersion: profil.row_version,
      });
      Alert.alert('Kaydedildi', 'Kontrol listesi güncellendi.');
      void yukle();
    } catch (e) {
      Alert.alert('Hata', dogrulamaHataMetni(e));
    }
  };

  const klavyeKaydir = useCallback(
    (e?: Parameters<typeof KlavyeFocusKaydir>[1]) => {
      KlavyeFocusKaydir(scrollRef.current, e, { ustBosluk: 72, delayMs: 80 });
    },
    [],
  );

  const elleKaydir = useCallback(
    (e?: Parameters<typeof KlavyeFocusKaydir>[1]) => {
      scrollRef.current?.scrollToEnd({ animated: true });
      KlavyeFocusKaydir(scrollRef.current, e, {
        ustBosluk: 128,
        delayMs: Platform.OS === 'ios' ? 90 : 160,
      });
    },
    [],
  );

  const override = async () => {
    const sebep = overrideReason.trim();
    const not = internalNote.trim();
    if (!sebep || !not) {
      setElleHata(
        !sebep && !not
          ? 'Sebep ve iç not yaz. İkisi de kayda geçer.'
          : !sebep
            ? 'Neden elle doğruladığını yaz.'
            : 'İç not zorunlu. Ne yaptığını kısaca yaz.',
      );
      return;
    }
    setElleHata(null);
    setElleBusy(true);
    try {
      await AdminManuelOverride({
        subjectType: 'APPLICATION',
        subjectId: String(id),
        newStatus: 'VERIFIED',
        reason: sebep,
        internalNote: not,
        idempotencyKey: `override-${String(id)}-${Date.now()}`,
      });
      setOverrideReason('');
      Alert.alert('Doğrulandı', 'Elle doğrulama kayda geçti. Ajansı açmak ayrı adım.');
      void yukle();
    } catch (e) {
      setElleHata(dogrulamaHataMetni(e));
    } finally {
      setElleBusy(false);
    }
  };

  const hakkinda = [
    satir('Tür', ajansTuru(basvuru?.agency_type)),
    satir('Ülke', basvuru?.country),
    satir('Şehir', basvuru?.city),
    satir('Adres', basvuru?.address),
    satir('Site', basvuru?.website),
    satir(
      'Yetkili',
      [basvuru?.contact_first_name, basvuru?.contact_last_name].filter(Boolean).join(' '),
    ),
    satir('E-posta', basvuru?.email),
    satir('Telefon', basvuru?.phone),
    satir('WhatsApp', basvuru?.whatsapp),
    satir('Deneyim', basvuru?.experience),
    satir('Beklenen yayıncı', basvuru?.expected_hosts),
    satir('Diller', listeMetin(basvuru?.languages)),
    satir('Hedef ülkeler', listeMetin(basvuru?.target_countries)),
    satir('Mevcut ağ', basvuru?.existing_network),
  ].filter(Boolean) as { etiket: string; metin: string }[];

  const durum = BasvuruDurumEtiket(String(basvuru?.status ?? ''));
  const ilerleme = profil?.progress_pct ?? 0;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={String(basvuru?.agency_name ?? 'Ajans doğrulama')}
        subtitle={durum}
        fallbackHref="/admin/dogrulama"
      />
      <KlavyeScrollView
        ref={scrollRef}
        contentContainerStyle={styles.icerik}
        ekstraPad={48}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        {yukleniyor && !basvuru ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <>
            <View style={styles.durumSerit}>
              <Text style={styles.durumEtiket}>Şu an</Text>
              <Text style={styles.durumDeger}>{durum}</Text>
              <Text style={styles.durumAlt}>
                Kontrolleri işaretle, belgeleri incele, sonra doğrula. Ajansı açmak ayrı adımdır.
              </Text>
              <View style={styles.cubukZemin}>
                <View style={[styles.cubukDolgu, { width: `${Math.min(100, ilerleme)}%` }]} />
              </View>
              <Text style={styles.cubukYazi}>Kontrol listesi %{ilerleme}</Text>
            </View>

            <Text style={styles.bolum}>Ajans hakkında</Text>
            <View style={styles.kart}>
              {hakkinda.map((s) => (
                <View key={s.etiket} style={styles.bilgiSatir}>
                  <Text style={styles.bilgiEtiket}>{s.etiket}</Text>
                  <Text style={styles.bilgiDeger}>{s.metin}</Text>
                </View>
              ))}
              {basvuru?.why_tamuso ? (
                <Text style={styles.paragraf}>{String(basvuru.why_tamuso)}</Text>
              ) : null}
              {basvuru?.description ? (
                <Text style={styles.paragrafSoluk}>{String(basvuru.description)}</Text>
              ) : null}
            </View>

            <Text style={styles.bolum}>Karar</Text>
            <Text style={styles.aciklama}>
              Kullanıcıya giden not başvurana görünür. İç not yalnızca admin kaydında kalır.
            </Text>
            <TextInput
              style={styles.girdi}
              placeholder="Başvurana mesaj"
              placeholderTextColor={RenkTokenlari.textMuted}
              value={userMsg}
              onChangeText={setUserMsg}
              onFocus={klavyeKaydir}
            />
            <TextInput
              style={styles.girdi}
              placeholder="İç not"
              placeholderTextColor={RenkTokenlari.textMuted}
              value={internalNote}
              onChangeText={setInternalNote}
              onFocus={klavyeKaydir}
            />
            <View style={styles.kararGrup}>
              {sonrakiKararlar(String(basvuru?.status ?? '')).map((k) => (
                <Karar
                  key={k.status + k.baslik}
                  baslik={k.baslik}
                  alt={k.alt}
                  vurgu={k.vurgu}
                  onPress={() => void gecis(k.status, k.baslik)}
                />
              ))}
            </View>

            <Text style={styles.bolum}>Kontrol listesi</Text>
            <Text style={styles.aciklama}>
              Her satır ayrı bir doğrulama. Hepsini açmak zorunda değilsin; kaydettiğinde ilerleme güncellenir.
            </Text>
            {KONTROLLER.map((k) => (
              <View key={k.key} style={styles.kontrol}>
                <View style={styles.kontrolMetin}>
                  <Text style={styles.kontrolBaslik}>{k.baslik}</Text>
                  <Text style={styles.kontrolAlt}>{k.alt}</Text>
                </View>
                <Switch
                  value={checks[k.key]}
                  onValueChange={(v) => setChecks((c) => ({ ...c, [k.key]: v }))}
                />
              </View>
            ))}
            <Pressable style={styles.kaydet} onPress={() => void bilesenKaydet()}>
              <Text style={styles.kaydetYazi}>Kontrol listesini kaydet</Text>
            </Pressable>

            <Text style={styles.bolum}>Belgeler</Text>
            {belgeler.length === 0 ? (
              <Text style={styles.aciklama}>
                Henüz belge yok. İlk başvuru belgesiz gelebilir; ek bilgi isteyerek belge talep edebilirsin.
              </Text>
            ) : (
              belgeler.map((d) => (
                <View key={String(d.id)} style={styles.kart}>
                  <Text style={styles.belgeBaslik}>
                    {turEtiket(String(d.verification_type))} · {turEtiket(String(d.document_type))}
                  </Text>
                  <Text style={styles.kontrolAlt}>
                    {BelgeDurumEtiket(String(d.status))}
                    {d.document_number_masked ? ` · ${String(d.document_number_masked)}` : ''}
                  </Text>
                  <View style={styles.belgeAksiyon}>
                    <Pressable
                      onPress={async () => {
                        try {
                          const r = await AdminBelgeGoruntulePath(String(d.id));
                          if (r?.path) await Linking.openURL(r.path);
                        } catch (e) {
                          Alert.alert('Belge', e instanceof Error ? e.message : 'Açılamadı');
                        }
                      }}
                    >
                      <Text style={styles.link}>Aç</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void AdminBelgeIncele({
                          documentId: String(d.id),
                          decision: 'APPROVED',
                        })
                          .then(() => yukle())
                          .catch((e) => Alert.alert('Belge', dogrulamaHataMetni(e)));
                      }}
                    >
                      <Text style={styles.linkMint}>Onayla</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'Neden yeniden istensin?',
                          undefined,
                          RED_NEDENLERI.map((r) => ({
                            text: r.label,
                            onPress: () => {
                              void AdminBelgeIncele({
                                documentId: String(d.id),
                                decision: 'RESUBMISSION_REQUIRED',
                                rejectionReasonCode: r.code,
                                userMessage:
                                  userMsg ||
                                  'Gönderdiğiniz belge doğrulanamadı. Lütfen geçerli ve okunabilir bir belge yükleyin.',
                                internalNote: internalNote || undefined,
                              })
                                .then(() => yukle())
                                .catch((e) => Alert.alert('Belge', dogrulamaHataMetni(e)));
                            },
                          })),
                        );
                      }}
                    >
                      <Text style={styles.linkTehlike}>Yeniden iste</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            <Text style={styles.bolum}>Elle doğrula</Text>
            <Text style={styles.aciklama}>
              Belge eksik olsa bile bu başvuruyu doğrulanmış işaretler. Sebep ve iç not birlikte kayda geçer. Ajansı açmak için üstteki onayı ayrıca ver.
            </Text>
            <TextInput
              style={[styles.girdi, styles.girdiCok]}
              placeholder="Neden elle doğrulanıyor?"
              placeholderTextColor={RenkTokenlari.textMuted}
              value={overrideReason}
              onChangeText={(v) => {
                setOverrideReason(v);
                if (elleHata) setElleHata(null);
              }}
              onFocus={elleKaydir}
              multiline
              textAlignVertical="top"
            />
            <TextInput
              style={[styles.girdi, styles.girdiCok]}
              placeholder="İç not — yalnızca admin kaydında kalır"
              placeholderTextColor={RenkTokenlari.textMuted}
              value={internalNote}
              onChangeText={(v) => {
                setInternalNote(v);
                if (elleHata) setElleHata(null);
              }}
              onFocus={elleKaydir}
              multiline
              textAlignVertical="top"
            />
            {elleHata ? <Text style={styles.elleHata}>{elleHata}</Text> : null}
            <Pressable
              style={[styles.elle, elleBusy && styles.ellePasif]}
              disabled={elleBusy}
              onPress={() => void override()}
            >
              {elleBusy ? (
                <ActivityIndicator color={RenkTokenlari.danger} />
              ) : (
                <Text style={styles.elleYazi}>Elle doğrulanmış işaretle</Text>
              )}
            </Pressable>

            <Text style={styles.bolum}>Ajans yetkisi</Text>
            {ajansId ? (
              <>
                <Text style={styles.aciklama}>
                  Coin, kullanıcıya gönderme, transfer limiti ve hediye payı. Altında durum, kilit ve yaptırım var.
                </Text>
                <AdminAjansYetkiKarti agencyId={ajansId} />
                <AdminAjansOperasyonPaneli agencyId={ajansId} />
              </>
            ) : (
              <Text style={styles.aciklama}>
                Ajans henüz açılmadı. Doğrulama bitince “Ajansı onayla ve aç” ile hesap oluşur; coin, limit ve kilitler o zaman burada görünür.
              </Text>
            )}
          </>
        )}
      </KlavyeScrollView>
    </Screen>
  );
}

function Karar({
  baslik,
  alt,
  onPress,
  vurgu,
}: {
  baslik: string;
  alt: string;
  onPress: () => void;
  vurgu?: 'mint' | 'tehlike';
}) {
  return (
    <Pressable style={styles.karar} onPress={onPress}>
      <Text
        style={[
          styles.kararBaslik,
          vurgu === 'mint' && { color: RenkTokenlari.mint },
          vurgu === 'tehlike' && { color: RenkTokenlari.danger },
        ]}
      >
        {baslik}
      </Text>
      <Text style={styles.kararAlt}>{alt}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icerik: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: 8,
  },
  durumSerit: {
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: 4,
    marginBottom: 8,
  },
  durumEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  durumDeger: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  durumAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  cubukZemin: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
    overflow: 'hidden',
  },
  cubukDolgu: {
    height: 6,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.mint,
  },
  cubukYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  bolum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 10,
  },
  aciklama: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  kart: {
    borderRadius: YaricapTokenlari.md,
    padding: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    gap: 8,
  },
  bilgiSatir: {
    gap: 2,
  },
  bilgiEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  bilgiDeger: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  paragraf: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 20,
  },
  paragrafSoluk: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  girdi: {
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    color: RenkTokenlari.text,
  },
  girdiCok: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  elleHata: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
  },
  ellePasif: {
    opacity: 0.6,
  },
  kararGrup: {
    gap: 8,
  },
  karar: {
    borderRadius: YaricapTokenlari.md,
    padding: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    gap: 2,
  },
  kararBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kararAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  kontrol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: YaricapTokenlari.md,
    padding: BoslukTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  kontrolMetin: {
    flex: 1,
    gap: 2,
  },
  kontrolBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kontrolAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  kaydet: {
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 207, 176, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(61, 207, 176, 0.45)',
    marginTop: 4,
  },
  kaydetYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.mint,
    fontWeight: '800',
  },
  belgeBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  belgeAksiyon: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  link: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  linkMint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
  linkTehlike: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    fontWeight: '700',
  },
  elle: {
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(248, 113, 113, 0.45)',
  },
  elleYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
    fontWeight: '800',
  },
});
