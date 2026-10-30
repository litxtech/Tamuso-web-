import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { GradientButton } from '../../../../../src/components/GradientButton';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminKullaniciDosyasiGetir, AdminTakipIstatistikGetir, AdminKullaniciPolitikaKabulleriGetir, type AdminKullaniciPolitikaKabulleri } from '../../../../../src/moduller/admin/kullanici/okuma/AdminKullaniciOkuma';
import type { AdminTakipIstatistikleri } from '../../../../../src/moduller/takip/TakipTipleri';
import {
  AdminIhtarKaldir,
  AdminIhtarVer,
  AdminKullaniciAdminYetkiAyarla,
  AdminKullaniciBanKaldir,
  AdminKullaniciBanla,
  AdminKullaniciSifreDegistir,
  AdminKullaniciSil,
} from '../../../../../src/moduller/admin/kullanici/islemler/AdminKullaniciIslemleri';
import {
  AdminYaptirimKaldir,
  AdminYaptirimUygula,
  YAPTIRIM_SURE_SECENEKLERI,
} from '../../../../../src/moduller/medya-yukleme/AdminSesOdasiIslemleri';
import { AdminKullaniciDosyaBelgesiOlustur } from '../../../../../src/moduller/admin/kullanici/AdminKullaniciDosyaBelgesi';
import type { AdminKullaniciDosyasi } from '../../../../../src/moduller/admin/kullanici/tipler';
import {
  BelgePaylasDugmesi,
  BelgePaylasimPaneli,
} from '../../../../../src/moduller/belge-paylasim/bilesenler/BelgePaylasimPaneli';
import { AdminKullaniciCoinPaneli } from '../../../../../src/moduller/admin/bilesenler/AdminKullaniciCoinPaneli';
import { AdminKullaniciHesapDegeriPaneli } from '../../../../../src/moduller/admin/bilesenler/AdminKullaniciHesapDegeriPaneli';
import {
  AdminKullaniciUnvanlari,
  AdminUnvanGeriAl,
} from '../../../../../src/moduller/unvanlar/islemler/UnvanAdminIslemleri';
import { UserTitleBadge } from '../../../../../src/moduller/unvanlar/bilesenler/UserTitleBadge';
import { UnvanKayittanSunum } from '../../../../../src/moduller/unvanlar/okuma/UnvanSunumunuCoz';
import { UnvanTasariminiDogrula } from '../../../../../src/moduller/unvanlar/dogrulama/UnvanTasarimZod';
import {
  ProfilIstatistikleriniGetir,
  type KullaniciProfilIstatistikleri,
} from '../../../../../src/moduller/kullanici-profili/istatistik/ProfilIstatistikleriniGetir';
import { LedgerSebepEtiketi } from '../../../../../src/moduller/cuzdan/okuma/CuzdanLedgeriniGetir';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

function tr(iso?: string | null) {
  if (!iso) return 'â€”';
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

function Satir({ e, d }: { e: string; d: string }) {
  return (
    <View style={styles.satir}>
      <Text style={styles.satirE}>{e}</Text>
      <Text style={styles.satirD}>{d}</Text>
    </View>
  );
}

function Bolum({
  baslik,
  children,
}: {
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.bolum}>
      <Text style={styles.bolumBaslik}>{baslik}</Text>
      {children}
    </View>
  );
}

export default function AdminKullaniciDosyaEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [dosya, setDosya] = useState<AdminKullaniciDosyasi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [paylasAcik, setPaylasAcik] = useState(false);
  const [ihtar, setIhtar] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [sifreTekrar, setSifreTekrar] = useState('');
  const [sifreBusy, setSifreBusy] = useState(false);
  const [takipIstat, setTakipIstat] = useState<AdminTakipIstatistikleri | null>(null);
  const [stats, setStats] = useState<KullaniciProfilIstatistikleri | null>(null);
  const [politikalar, setPolitikalar] = useState<AdminKullaniciPolitikaKabulleri | null>(null);
  const [unvanlar, setUnvanlar] = useState<Record<string, unknown>[]>([]);
  const [displayTitleId, setDisplayTitleId] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const d = await AdminKullaniciDosyasiGetir(id);
      setDosya(d?.ok === false ? null : d);
      const [s, st, pol, unv] = await Promise.all([
        AdminTakipIstatistikGetir(id).catch(() => null),
        ProfilIstatistikleriniGetir(id).catch(() => null),
        AdminKullaniciPolitikaKabulleriGetir(id).catch(() => null),
        AdminKullaniciUnvanlari(id).catch(() => null),
      ]);
      setTakipIstat(s);
      setStats(st);
      setPolitikalar(pol);
      const assignments = Array.isArray(unv?.assignments)
        ? (unv.assignments as Record<string, unknown>[])
        : [];
      setUnvanlar(assignments);
      setDisplayTitleId(
        (unv?.display_title_id as string | null) ??
          (unv?.selected_title_id as string | null) ??
          null,
      );
    } catch {
      setDosya(null);
      setStats(null);
      setPolitikalar(null);
      setUnvanlar([]);
      setDisplayTitleId(null);
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

  const belge = useMemo(
    () => (dosya ? AdminKullaniciDosyaBelgesiOlustur(dosya) : null),
    [dosya],
  );

  if (!admin) return null;

  const p = dosya?.profil;
  const ad = p
    ? p.display_name ?? (p.username ? `@${p.username}` : p.id.slice(0, 8))
    : 'â€¦';

  const ban = () => {
    Alert.alert('Ban', 'KullanÄ±cÄ± banlansÄ±n mÄ±?', [
      { text: 'VazgeÃ§', style: 'cancel' },
      {
        text: 'Banla',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await AdminKullaniciBanla(id!, 'policy_violation');
            if (!r.ok) Alert.alert('Ban', r.hata);
            else {
              Alert.alert('Tamam', 'KullanÄ±cÄ± banlandÄ±.');
              await yukle();
            }
          })();
        },
      },
    ]);
  };

  const unban = () => {
    void (async () => {
      const r = await AdminKullaniciBanKaldir(id!);
      if (!r.ok) Alert.alert('Ban', r.hata);
      else await yukle();
    })();
  };

  const sil = () => {
    Alert.alert('Sil', 'Hesap soft-delete edilecek. Emin misin?', [
      { text: 'VazgeÃ§', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await AdminKullaniciSil(id!, 'admin_delete');
            if (!r.ok) Alert.alert('Sil', r.hata);
            else {
              Alert.alert('Tamam', 'Hesap silindi.');
              router.back();
            }
          })();
        },
      },
    ]);
  };

  const ihtarVer = () => {
    if (!ihtar.trim()) {
      Alert.alert('Ä°htar', 'Sebep yaz.');
      return;
    }
    void (async () => {
      const r = await AdminIhtarVer({
        userId: id!,
        reason: ihtar.trim(),
        severity: 'medium',
      });
      if (!r.ok) Alert.alert('Ä°htar', r.hata);
      else {
        setIhtar('');
        await yukle();
      }
    })();
  };

  const sifreDegistir = () => {
    if (yeniSifre.length < 6) {
      Alert.alert('Åifre', 'En az 6 karakter olmalÄ±.');
      return;
    }
    if (yeniSifre !== sifreTekrar) {
      Alert.alert('Åifre', 'Åifreler eÅŸleÅŸmiyor.');
      return;
    }
    void (async () => {
      setSifreBusy(true);
      const r = await AdminKullaniciSifreDegistir({
        userId: id!,
        password: yeniSifre,
      });
      setSifreBusy(false);
      if (!r.ok) {
        Alert.alert('Åifre', r.hata);
        return;
      }
      setYeniSifre('');
      setSifreTekrar('');
      Alert.alert('Tamam', 'Åifre gÃ¼ncellendi.');
    })();
  };

  const yaptirimKoy = (kind: 'upload_ban' | 'room_create_ban') => {
    const baslik =
      kind === 'upload_ban' ? 'YÃ¼kleme cezasÄ±' : 'Ses odasÄ± aÃ§ma yasaÄŸÄ±';
    Alert.alert(baslik, 'SÃ¼re seÃ§', [
      { text: 'VazgeÃ§', style: 'cancel' },
      ...YAPTIRIM_SURE_SECENEKLERI.map((s) => ({
        text: s.label,
        onPress: () => {
          void (async () => {
            try {
              await AdminYaptirimUygula({
                userId: id!,
                kind,
                hours: s.hours,
                reason: ihtar.trim() || baslik,
              });
              Alert.alert('Tamam', `${baslik} uygulandÄ± (${s.label}).`);
              await yukle();
            } catch (e) {
              Alert.alert(
                baslik,
                e instanceof Error ? e.message : 'UygulanamadÄ±',
              );
            }
          })();
        },
      })),
    ]);
  };

  const yaptirimKaldir = (kind: 'upload_ban' | 'room_create_ban') => {
    void (async () => {
      try {
        await AdminYaptirimKaldir({ userId: id!, kind });
        await yukle();
      } catch (e) {
        Alert.alert(
          'YaptÄ±rÄ±m',
          e instanceof Error ? e.message : 'KaldÄ±rÄ±lamadÄ±',
        );
      }
    })();
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi title={ad} subtitle="KullanÄ±cÄ± dosyasÄ±" />
      {yukleniyor || !dosya || !p ? (
        <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[...RenkTokenlari.gradientCard]} style={styles.hero}>
            <View style={styles.heroUst}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroAd}>{ad}</Text>
                <Text style={styles.heroMeta}>
                  {p.public_user_id ?? p.id.slice(0, 8)}
                  {p.phone_e164 ? ` Â· ${p.phone_e164}` : ''}
                </Text>
              </View>
              <BelgePaylasDugmesi
                label="PDF / WA"
                onPress={() => setPaylasAcik(true)}
              />
            </View>
            <View style={styles.riskSatir}>
              <Text
                style={[
                  styles.riskBadge,
                  {
                    color: dosya.risk.iade_riski_var
                      ? RenkTokenlari.danger
                      : RenkTokenlari.mint,
                  },
                ]}
              >
                Ä°ade riski: {dosya.risk.iade_riski_var ? 'VAR' : 'YOK'} Â·{' '}
                {dosya.risk.seviye} ({dosya.risk.skor})
              </Text>
            </View>
            <Text style={styles.heroAlt}>
              AÃ§Ä±lÄ±ÅŸ {tr(p.created_at)} Â· {dosya.oturum.platformlar}
            </Text>
          </LinearGradient>

          <View style={styles.politikaBolum}>
            <Text style={styles.politikaBolumBaslik}>Onaylanan politikalar</Text>
            <Satir
              e="Ã‡ocuk Koruma kartÄ±"
              d={
                !politikalar
                  ? 'YÃ¼kleniyorâ€¦'
                  : politikalar.cocuk_koruma.status === 'approved'
                    ? `OnayladÄ± Â· ${tr(politikalar.cocuk_koruma.decided_at)}`
                    : politikalar.cocuk_koruma.status === 'declined'
                      ? `Vermedi Â· ${tr(politikalar.cocuk_koruma.decided_at)}`
                      : 'HenÃ¼z yanÄ±t yok'
              }
            />
            {!politikalar ? (
              <Text style={styles.hint}>Politikalar yÃ¼kleniyorâ€¦</Text>
            ) : !politikalar.kabuller.length ? (
              <Text style={styles.hint}>
                KayÄ±tlÄ± politika onayÄ± yok (ToS / gizlilik / Ã§ocuk koruma vb.)
              </Text>
            ) : (
              politikalar.kabuller.map((k) => (
                <View
                  key={`${k.policy_version_id}-${k.accepted_at}`}
                  style={styles.politikaSatir}
                >
                  <Text style={styles.politikaBaslik}>
                    {k.title || k.policy_code}
                    {k.is_required ? ' Â· zorunlu' : ''}
                  </Text>
                  <Text style={styles.politikaAlt}>
                    {k.policy_code} Â· v{k.policy_version} Â· {tr(k.accepted_at)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.aksiyonlar}>
            {p.banned_at ? (
              <Pressable style={styles.aksiyon} onPress={unban}>
                <Text style={styles.aksiyonYazi}>Ban kaldÄ±r</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.aksiyon, styles.tehlike]} onPress={ban}>
                <Text style={[styles.aksiyonYazi, { color: RenkTokenlari.danger }]}>
                  Banla
                </Text>
              </Pressable>
            )}
            <Pressable
              style={styles.aksiyon}
              onPress={() => {
                const next = !p.is_admin;
                Alert.alert(
                  next ? 'Admin yetkisi ver' : 'Admin yetkisini kaldÄ±r',
                  next
                    ? `${ad} tam platform admin olsun mu? Yetki yalnÄ±zca bu panelden verilir.`
                    : `${ad} admin yetkisi kaldÄ±rÄ±lsÄ±n mÄ±?`,
                  [
                    { text: 'VazgeÃ§', style: 'cancel' },
                    {
                      text: next ? 'Yetki ver' : 'KaldÄ±r',
                      style: next ? 'default' : 'destructive',
                      onPress: () => {
                        void (async () => {
                          const r = await AdminKullaniciAdminYetkiAyarla(
                            id!,
                            next,
                          );
                          if (!r.ok) Alert.alert('Yetki', r.hata);
                          else {
                            Alert.alert(
                              'Tamam',
                              next
                                ? 'Admin yetkisi verildi.'
                                : 'Admin yetkisi kaldÄ±rÄ±ldÄ±.',
                            );
                            await yukle();
                          }
                        })();
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={styles.aksiyonYazi}>
                {p.is_admin ? 'Admin kaldÄ±r' : 'Admin yap'}
              </Text>
            </Pressable>
            <Pressable style={[styles.aksiyon, styles.tehlike]} onPress={sil}>
              <Text style={[styles.aksiyonYazi, { color: RenkTokenlari.danger }]}>
                Sil
              </Text>
            </Pressable>
          </View>

          {takipIstat ? (
            <Bolum baslik="Sosyal graph">
              <Satir e="TakipÃ§i" d={String(takipIstat.followers_count)} />
              <Satir e="Takip" d={String(takipIstat.following_count)} />
              <Satir e="Bekleyen istek" d={String(takipIstat.pending_requests)} />
              <Satir e="Gizli hesap" d={takipIstat.is_private ? 'Evet' : 'HayÄ±r'} />
              <Satir e="Son 1s follow" d={String(takipIstat.follow_last_hour)} />
              <Satir e="Son 1s unfollow" d={String(takipIstat.unfollow_last_hour)} />
              <Satir e="Son 1s request" d={String(takipIstat.request_last_hour)} />
              <Satir e="ÅÃ¼pheli" d={takipIstat.suspicious ? 'EVET' : 'HayÄ±r'} />
            </Bolum>
          ) : null}

          <Bolum baslik="Kimlik & durum">
            <Satir e="Durum" d={p.deleted_at ? 'SilinmiÅŸ' : p.banned_at ? `BanlÄ± Â· ${p.ban_reason ?? ''}` : 'Aktif'} />
            <Satir e="Hesap aÃ§Ä±lÄ±ÅŸÄ±" d={tr(p.created_at)} />
            <Satir e="Telefon" d={p.phone_e164 ?? 'â€”'} />
            <Satir e="Seviye / XP" d={`${p.level} Â· ${p.xp}`} />
            <Satir
              e="Rol"
              d={[
                p.is_admin ? 'Admin' : null,
                p.is_host ? 'Ev sahibi' : null,
                p.is_guest ? 'Misafir' : null,
              ]
                .filter(Boolean)
                .join(', ') || 'KullanÄ±cÄ±'}
            />
          </Bolum>

          <Bolum baslik="Ãœnvanlar">
            <Satir
              e="Vitrin"
              d={displayTitleId ? displayTitleId.slice(0, 8) + 'â€¦' : 'Yok'}
            />
            <Pressable
              onPress={() => router.push('/admin/unvanlar' as never)}
              style={{ marginBottom: 8 }}
            >
              <Text style={{ color: RenkTokenlari.primarySoft }}>
                Ãœnvan YÃ¶netimi â†’
              </Text>
            </Pressable>
            {unvanlar.length === 0 ? (
              <Text style={styles.hint}>AtanmÄ±ÅŸ Ã¼nvan yok</Text>
            ) : (
              unvanlar.slice(0, 12).map((a, idx) => {
                const titleId = String(a.title_id ?? '');
                const assignmentId = String(a.assignment_id ?? a.id ?? '');
                const design = UnvanTasariminiDogrula(a.design ?? a.title_design);
                const name = String(a.title_name ?? a.name ?? 'Ãœnvan');
                const sunum = UnvanKayittanSunum({
                  id: titleId || `tmp-${idx}`,
                  slug: String(a.title_slug ?? a.slug ?? ''),
                  name,
                  name_i18n: {},
                  design,
                  version: Number(a.version) || 1,
                  priority: Number(a.priority) || 1,
                });
                const aktif = a.currently_valid !== false && !a.revoked_at;
                return (
                  <View
                    key={assignmentId || `${titleId}-${idx}`}
                    style={{ gap: 4, marginBottom: 10 }}
                  >
                    <UserTitleBadge presentation={sunum} size="COMPACT" />
                    <Text style={styles.hint}>
                      {aktif ? 'Aktif' : 'Pasif'} Â· {tr(a.assigned_at as string)}
                      {a.expires_at
                        ? ` â†’ ${tr(a.expires_at as string)}`
                        : ' Â· kalÄ±cÄ±'}
                      {displayTitleId === titleId ? ' Â· seÃ§ili' : ''}
                    </Text>
                    {aktif ? (
                      <Pressable
                        onPress={() => {
                          Alert.alert('Geri al?', undefined, [
                            { text: 'VazgeÃ§', style: 'cancel' },
                            {
                              text: 'Geri Al',
                              style: 'destructive',
                              onPress: () => {
                                void AdminUnvanGeriAl({
                                  assignmentId: assignmentId || null,
                                  userId: id,
                                  titleId: titleId || null,
                                }).then((r) => {
                                  if (r.ok) void yukle();
                                  else Alert.alert('Hata', r.hata ?? '');
                                });
                              },
                            },
                          ]);
                        }}
                      >
                        <Text style={{ color: RenkTokenlari.danger }}>
                          Geri al
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })
            )}
          </Bolum>

          <Bolum baslik="Åifre deÄŸiÅŸtir">
            <Text style={styles.hint}>
              Yeni ÅŸifre en az 6 karakter olmalÄ±. KullanÄ±cÄ± bir sonraki giriÅŸte
              bunu kullanÄ±r.
            </Text>
            <View style={styles.ihtarForm}>
              <TextInput
                value={yeniSifre}
                onChangeText={setYeniSifre}
                placeholder="Yeni ÅŸifre"
                placeholderTextColor={RenkTokenlari.textDim}
                style={styles.ihtarInput}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                value={sifreTekrar}
                onChangeText={setSifreTekrar}
                placeholder="Åifre tekrar"
                placeholderTextColor={RenkTokenlari.textDim}
                style={styles.ihtarInput}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <GradientButton
                title={sifreBusy ? 'Kaydediliyorâ€¦' : 'Åifreyi kaydet'}
                onPress={sifreDegistir}
                disabled={sifreBusy}
              />
            </View>
          </Bolum>

          <Bolum baslik="YÃ¼kleme & cÃ¼zdan">
            <Satir e="Coin / Elmas" d={`${dosya.cuzdan.coins} / ${dosya.cuzdan.diamonds}`} />
            <Satir
              e="Toplam yÃ¼kleme"
              d={`${dosya.yukleme.toplam_coin} coin Â· ${dosya.yukleme.adet} iÅŸlem`}
            />
            <Satir
              e="Ä°lk yÃ¼kleme"
              d={
                dosya.yukleme.ilk
                  ? `${tr(dosya.yukleme.ilk.tarih)} Â· ${dosya.yukleme.ilk.kaynak} Â· ${dosya.yukleme.ilk.coin} coin`
                  : 'Yok'
              }
            />
            {(dosya.yuklemeler ?? []).slice(0, 6).map((y) => (
              <Satir
                key={y.id}
                e={tr(y.tarih)}
                d={`${y.coin} Â· ${y.store ?? y.provider ?? '?'} Â· ${y.status ?? ''}`}
              />
            ))}
          </Bolum>

          <Bolum baslik="DoÄŸrulama">
            <Satir e="KullanÄ±cÄ± ID" d={id ?? 'â€”'} />
            <Satir e="Public ID" d={dosya.profil.public_user_id ?? 'â€”'} />
            <Satir e="Ad / Soyad" d={`${dosya.profil.display_name ?? 'â€”'}`} />
            <Satir e="Ãœlke" d={dosya.profil.country ?? 'â€”'} />
            <Satir e="Hesap oluÅŸturma" d={tr(dosya.profil.created_at)} />
            <Satir e="Rozet (is_verified)" d={dosya.profil.is_verified ? 'Evet' : 'HayÄ±r'} />
            <Text style={styles.hint}>
              Rozet â‰  admin yetkisi. DoÄŸrulama iÅŸlemleri audit ile kaydedilir.
            </Text>
            <View style={styles.aksiyonlar}>
              {(
                [
                  ['REQUEST_VERIFICATION', 'DoÄŸrulama iste'],
                  ['VERIFY', 'DoÄŸrula'],
                  ['REJECT', 'Reddet'],
                  ['REQUEST_NEW_DOCUMENT', 'Yeni belge iste'],
                  ['SUSPEND_VERIFICATION', 'AskÄ±ya al'],
                  ['REVOKE_VERIFICATION', 'Geri al'],
                ] as const
              ).map(([action, label]) => (
                <Pressable
                  key={action}
                  style={styles.aksiyon}
                  onPress={() => {
                    Alert.alert(label, 'OnaylÄ±yor musun?', [
                      { text: 'VazgeÃ§', style: 'cancel' },
                      {
                        text: 'Tamam',
                        onPress: () => {
                          void (async () => {
                            try {
                              const { AdminKullaniciDogrulamaAksiyon } = await import(
                                '../../../../../src/moduller/admin/dogrulama/AdminDogrulamaIslemleri'
                              );
                              await AdminKullaniciDogrulamaAksiyon({
                                userId: id!,
                                action,
                                note: ihtar.trim() || label,
                                reason: ihtar.trim() || action,
                              });
                              Alert.alert('Tamam', `${label} uygulandÄ±`);
                              await yukle();
                            } catch (e) {
                              Alert.alert(
                                'DoÄŸrulama',
                                e instanceof Error ? e.message : 'BaÅŸarÄ±sÄ±z',
                              );
                            }
                          })();
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.aksiyonYazi}>{label}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.aksiyon}
                onPress={() => router.push('/admin/dogrulama' as any)}
              >
                <Text style={styles.aksiyonYazi}>DoÄŸrulama Merkezi</Text>
              </Pressable>
              <Pressable
                style={styles.aksiyon}
                onPress={() => router.push('/admin/kyc' as any)}
              >
                <Text style={styles.aksiyonYazi}>CÃ¼zdan KYC</Text>
              </Pressable>
            </View>
          </Bolum>

          <AdminKullaniciCoinPaneli
            userRef={id!}
            baslik="Coin yÃ¼kle / eksilt / ceza"
            alt={`Mevcut: ${dosya.cuzdan.coins.toLocaleString('tr-TR')} coin Â· Ceza ihtar da yazar`}
            onBasarili={() => void yukle()}
          />

          <AdminKullaniciHesapDegeriPaneli
            userRef={id!}
            mevcut={stats?.account_value ?? 0}
            etiket={stats?.account_value_label}
            override={stats?.account_value_override === true}
            onBasarili={() => void yukle()}
          />

          <Bolum baslik="Ã–zellik yaptÄ±rÄ±mlarÄ±">
            <Text style={styles.hint}>
              YÃ¼kleme cezasÄ± medya yÃ¼klemeyi; oda yasaÄŸÄ± ses odasÄ± aÃ§mayÄ±
              engeller.
            </Text>
            <View style={styles.aksiyonlar}>
              <Pressable
                style={styles.aksiyon}
                onPress={() => yaptirimKoy('upload_ban')}
              >
                <Text style={styles.aksiyonYazi}>YÃ¼kleme cezasÄ±</Text>
              </Pressable>
              <Pressable
                style={styles.aksiyon}
                onPress={() => yaptirimKaldir('upload_ban')}
              >
                <Text style={styles.aksiyonYazi}>YÃ¼kleme kaldÄ±r</Text>
              </Pressable>
              <Pressable
                style={styles.aksiyon}
                onPress={() => yaptirimKoy('room_create_ban')}
              >
                <Text style={styles.aksiyonYazi}>Oda aÃ§ma yasaÄŸÄ±</Text>
              </Pressable>
              <Pressable
                style={styles.aksiyon}
                onPress={() => yaptirimKaldir('room_create_ban')}
              >
                <Text style={styles.aksiyonYazi}>Oda yasaÄŸÄ± kaldÄ±r</Text>
              </Pressable>
            </View>
          </Bolum>

          <Bolum baslik="Hediye â€” kime ne kadar">
            <Satir
              e="GÃ¶nderilen"
              d={`${dosya.hediye.gonderilen_adet} Â· ${dosya.hediye.gonderilen_coin} coin`}
            />
            <Satir
              e="AlÄ±nan"
              d={`${dosya.hediye.alinan_adet} Â· ${dosya.hediye.alinan_elmas} elmas`}
            />
            {(dosya.hediye_akis ?? []).slice(0, 12).map((h) => (
              <Satir
                key={h.id}
                e={`${h.yon === 'gonderilen' ? 'â†’' : 'â†'} ${h.karsi_ad}`}
                d={
                  h.yon === 'gonderilen'
                    ? `âˆ’${h.coins_spent} Â· ${tr(h.created_at)}`
                    : `+${h.diamonds_earned} Â· ${tr(h.created_at)}`
                }
              />
            ))}
          </Bolum>

          <Bolum baslik="Cihaz & uygulamada sÃ¼re">
            <Satir e="Tahmini sÃ¼re" d={dosya.oturum.tahmini_aktif_metin} />
            <Satir e="Platformlar" d={dosya.oturum.platformlar} />
            {(dosya.oturum.cihazlar ?? []).map((c) => (
              <Satir
                key={c.device_id}
                e={`${(c.platform ?? '?').toUpperCase()} Â· ${c.model ?? 'cihaz'}`}
                d={`${c.sure_metin} Â· son ${tr(c.son_gorulme)}${c.iptal ? ' Â· iptal' : ''}`}
              />
            ))}
          </Bolum>

          <Bolum baslik="Ä°htar">
            <Satir e="Aktif ihtar" d={String(dosya.ihtar.aktif_adet)} />
            <View style={styles.ihtarForm}>
              <TextInput
                value={ihtar}
                onChangeText={setIhtar}
                placeholder="Ä°htar sebebi"
                placeholderTextColor={RenkTokenlari.textDim}
                style={styles.ihtarInput}
              />
              <GradientButton title="Ä°htar ver" onPress={ihtarVer} />
            </View>
            {(dosya.ihtar.liste ?? []).map((i) => (
              <View key={i.id} style={styles.ihtarSatir}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.satirD}>
                    {i.is_active ? '' : '[kaldÄ±rÄ±ldÄ±] '}
                    {i.reason}
                  </Text>
                  <Text style={styles.satirE}>
                    {tr(i.created_at)} Â· {i.severity}
                  </Text>
                </View>
                {i.is_active ? (
                  <Pressable
                    onPress={() => {
                      void (async () => {
                        const r = await AdminIhtarKaldir(i.id);
                        if (!r.ok) Alert.alert('Ä°htar', r.hata);
                        else await yukle();
                      })();
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={RenkTokenlari.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Bolum>

          <Bolum baslik="Risk">
            {(dosya.risk.notlar ?? []).map((n) => (
              <Satir key={n} e="Not" d={n} />
            ))}
            <Satir e="AÃ§Ä±k rapor" d={String(dosya.risk.acik_rapor)} />
            <Satir e="Ä°ade adedi" d={String(dosya.risk.iade_adet)} />
            <Satir
              e="Bekleyen Ã§ekim"
              d={`${dosya.risk.bekleyen_cekim_elmas} elmas`}
            />
          </Bolum>

          <Bolum baslik="CÃ¼zdan hareketleri">
            {(dosya.hareketler ?? []).slice(0, 30).map((h) => (
              <Satir
                key={h.id}
                e={`${tr(h.created_at)} Â· ${LedgerSebepEtiketi(h.reason)}`}
                d={`${h.delta >= 0 ? '+' : ''}${h.delta} ${h.currency}`}
              />
            ))}
          </Bolum>

          <Bolum baslik="AnlaÅŸÄ±lÄ±r loglar">
            {(dosya.admin_loglari ?? []).map((l) => (
              <Satir key={l.id} e={`YÃ¶netim Â· ${tr(l.created_at)}`} d={l.summary} />
            ))}
            {(dosya.guvenlik_olaylari ?? []).slice(0, 20).map((l) => (
              <Satir
                key={l.id}
                e={`GÃ¼venlik Â· ${tr(l.created_at)}`}
                d={`${l.event_type} Â· ${l.severity}`}
              />
            ))}
          </Bolum>
        </ScrollView>
      )}

      <BelgePaylasimPaneli
        visible={paylasAcik}
        onKapat={() => setPaylasAcik(false)}
        icerik={belge}
        telefon={profile?.phone_e164}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
  },
  hero: {
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: 8,
  },
  heroUst: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroAd: { ...TipografiTokenlari.h1, color: RenkTokenlari.text },
  heroMeta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, marginTop: 2 },
  heroAlt: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  riskSatir: { marginTop: 4 },
  riskBadge: { ...TipografiTokenlari.caption, fontWeight: '800' },
  aksiyonlar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aksiyon: {
    minWidth: '46%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  tehlike: { borderColor: `${RenkTokenlari.danger}55` },
  aksiyonYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  hint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: 8,
    lineHeight: 18,
  },
  politikaBolum: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1.5,
    borderColor: RenkTokenlari.mint,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 0,
  },
  politikaBolumBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.mint,
    marginBottom: 8,
    fontWeight: '800',
  },
  politikaSatir: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
    gap: 2,
  },
  politikaBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  politikaAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  bolum: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 0,
  },
  bolumBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.primarySoft,
    marginBottom: 8,
  },
  satir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  satirE: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    flex: 1,
  },
  satirD: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
    flex: 1.2,
    textAlign: 'right',
  },
  ihtarForm: { gap: 8, marginVertical: 8 },
  ihtarInput: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ihtarSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
});

