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
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminCanliSesOdalari,
  AdminSesOdasiKapat,
  AdminSesOdasiKapatVeYaptirim,
  AdminOrnekSesOdalariDoldur,
  AdminOrnekSesOdalariKapat,
  AdminOdaUyeleri,
  COIN_CEZA_HIZLI,
  SureMetni,
  SureSaatEtiket,
  YAPTIRIM_SURE_SECENEKLERI,
  type AdminOdaUyesi,
} from '../../../../src/moduller/medya-yukleme/AdminSesOdasiIslemleri';
import {
  AdminCanliYayinKapat,
  AdminCanliYayinKapatVeYaptirim,
  AdminCanliYayinlari,
  AdminYayinKatilimcilari,
  type AdminCanliYayin,
  type AdminYayinKatilimci,
} from '../../../../src/moduller/admin/canli-yayin/AdminCanliYayinIslemleri';
import type { AdminCanliOda } from '../../../../src/moduller/admin/tipler/PlatformTipleri';
import {
  AdminAktifGorusmeleriGetir,
  AdminGorusmeKapatVeYaptirim,
  type AdminAktifGorusme,
} from '../../../../src/moduller/gorusme/islemler/GorusmeIslemleri';
import { AdminStil, SayiKisa } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Katilimci = AdminOdaUyesi | AdminYayinKatilimci;

type PanelTur = 'oda' | 'yayin' | 'gorusme';

type PanelDurum = {
  tur: PanelTur;
  baslik: string;
  alt: string;
  hostId: string;
  oda?: AdminCanliOda;
  yayin?: AdminCanliYayin;
  gorusme?: AdminAktifGorusme;
  sebep: string;
  coin: string;
  ihtar: boolean;
  uploadHours: number | null;
  roomHours: number | null;
  hesapBan: boolean;
  hesapBanHours: number;
  uyeler: Katilimci[];
  secilen: string[];
  uyelerYukleniyor: boolean;
};

function SureChip({
  secili,
  label,
  onPress,
}: {
  secili: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, secili && styles.chipSecili]}
    >
      <Text style={[styles.chipYazi, secili && styles.chipYaziSecili]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminOdalarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [odalar, setOdalar] = useState<AdminCanliOda[]>([]);
  const [yayinlar, setYayinlar] = useState<AdminCanliYayin[]>([]);
  const [gorusmeler, setGorusmeler] = useState<AdminAktifGorusme[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [panel, setPanel] = useState<PanelDurum | null>(null);
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async (sessiz = false) => {
    if (!sessiz) setYukleniyor(true);
    try {
      const [o, y, g] = await Promise.all([
        AdminCanliSesOdalari(50),
        AdminCanliYayinlari(50).catch(() => [] as AdminCanliYayin[]),
        AdminAktifGorusmeleriGetir(40).catch(() => [] as AdminAktifGorusme[]),
      ]);
      setOdalar(o);
      setYayinlar(y);
      setGorusmeler(g);
    } catch (e) {
      if (sessiz) return;
      Alert.alert('Odalar', e instanceof Error ? e.message : 'Liste alÄ±namadÄ±');
      setOdalar([]);
      setYayinlar([]);
      setGorusmeler([]);
    } finally {
      if (!sessiz) setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
      let bekliyor = false;
      const sessizYenile = () => {
        if (bekliyor) return;
        bekliyor = true;
        void yukle(true).finally(() => {
          bekliyor = false;
        });
      };
      const id = setInterval(sessizYenile, 8_000);
      const ch = supabase
        .channel('admin-canli-liste')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'live_sessions' },
          sessizYenile,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms' },
          sessizYenile,
        )
        .subscribe();
      return () => {
        clearInterval(id);
        void supabase.removeChannel(ch);
      };
    }, [admin, yukle]),
  );

  if (!admin) return null;

  const sadeceKapat = (oda: AdminCanliOda) => {
    Alert.alert(
      'OdayÄ± kapat',
      `"${oda.title}" feedâ€™den dÃ¼ÅŸer, Ã¼yeler daÄŸÄ±tÄ±lÄ±r. YaptÄ±rÄ±m yok.`,
      [
        { text: 'VazgeÃ§', style: 'cancel' },
        {
          text: 'Kapat',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await AdminSesOdasiKapat(oda.id);
                await yukle();
                Alert.alert('Tamam', 'Oda kapatÄ±ldÄ± Â· feedâ€™den kaldÄ±rÄ±ldÄ±.');
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'KapatÄ±lamadÄ±',
                );
              }
            })();
          },
        },
      ],
    );
  };

  const yayinSadeceKapat = (y: AdminCanliYayin) => {
    Alert.alert(
      'YayÄ±nÄ± kapat',
      `"${y.title}" feedâ€™den dÃ¼ÅŸer, izleyiciler Ã§Ä±kar.`,
      [
        { text: 'VazgeÃ§', style: 'cancel' },
        {
          text: 'Kapat',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await AdminCanliYayinKapat(y.id);
                await yukle();
                Alert.alert('Tamam', 'YayÄ±n kapatÄ±ldÄ± Â· feedâ€™den kaldÄ±rÄ±ldÄ±.');
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'KapatÄ±lamadÄ±',
                );
              }
            })();
          },
        },
      ],
    );
  };

  const gorusmeSadeceKapat = (g: AdminAktifGorusme) => {
    Alert.alert(
      'GÃ¶rÃ¼ÅŸmeyi bitir',
      `${g.caller_name} â†” ${g.callee_name} Â· yaptÄ±rÄ±m yok.`,
      [
        { text: 'VazgeÃ§', style: 'cancel' },
        {
          text: 'Bitir',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const r = await AdminGorusmeKapatVeYaptirim(g.id, {
                reason: 'Admin tarafÄ±ndan sonlandÄ±rÄ±ldÄ±',
              });
              if (!r.ok) {
                Alert.alert('Hata', r.hata ?? 'Bitirilemedi');
                return;
              }
              await yukle();
              Alert.alert('Tamam', 'GÃ¶rÃ¼ÅŸme sonlandÄ±rÄ±ldÄ±.');
            })();
          },
        },
      ],
    );
  };

  const panelAcOda = (oda: AdminCanliOda) => {
    setPanel({
      tur: 'oda',
      baslik: oda.title,
      alt: `${oda.host_name} Â· ${SureMetni(oda.created_at)}`,
      hostId: oda.host_id,
      oda,
      sebep: '',
      coin: '',
      ihtar: true,
      uploadHours: null,
      roomHours: null,
      hesapBan: false,
      hesapBanHours: -1,
      uyeler: [],
      secilen: [oda.host_id],
      uyelerYukleniyor: true,
    });
    void (async () => {
      try {
        const u = await AdminOdaUyeleri(oda.id);
        setPanel((p) =>
          p && p.tur === 'oda' && p.oda?.id === oda.id
            ? {
                ...p,
                uyeler: u,
                secilen: u.some((x) => x.user_id === oda.host_id)
                  ? [oda.host_id]
                  : u[0]
                    ? [u[0].user_id]
                    : [oda.host_id],
                uyelerYukleniyor: false,
              }
            : p,
        );
      } catch {
        setPanel((p) =>
          p && p.tur === 'oda' && p.oda?.id === oda.id
            ? {
                ...p,
                uyeler: [
                  {
                    user_id: oda.host_id,
                    role: 'host',
                    display_name: oda.host_name,
                    username: oda.host_username ?? null,
                    is_host: true,
                  },
                ],
                uyelerYukleniyor: false,
              }
            : p,
        );
      }
    })();
  };

  const panelAcYayin = (y: AdminCanliYayin) => {
    setPanel({
      tur: 'yayin',
      baslik: y.title,
      alt: `${y.host_name} Â· ${SureMetni(y.started_at)}`,
      hostId: y.host_id,
      yayin: y,
      sebep: '',
      coin: '',
      ihtar: true,
      uploadHours: null,
      roomHours: null,
      hesapBan: false,
      hesapBanHours: -1,
      uyeler: [],
      secilen: [y.host_id],
      uyelerYukleniyor: true,
    });
    void (async () => {
      try {
        const u = await AdminYayinKatilimcilari(y.id);
        setPanel((p) =>
          p && p.tur === 'yayin' && p.yayin?.id === y.id
            ? {
                ...p,
                uyeler: u,
                secilen: [y.host_id],
                uyelerYukleniyor: false,
              }
            : p,
        );
      } catch {
        setPanel((p) =>
          p && p.tur === 'yayin' && p.yayin?.id === y.id
            ? {
                ...p,
                uyeler: [
                  {
                    user_id: y.host_id,
                    role: 'host',
                    display_name: y.host_name,
                    username: y.host_username ?? null,
                    is_host: true,
                  },
                ],
                uyelerYukleniyor: false,
              }
            : p,
        );
      }
    })();
  };

  const panelAcGorusme = (g: AdminAktifGorusme) => {
    const sureBas = g.answered_at ?? g.started_at;
    setPanel({
      tur: 'gorusme',
      baslik: `${g.call_type === 'video' ? 'GÃ¶rÃ¼ntÃ¼lÃ¼' : 'Sesli'} gÃ¶rÃ¼ÅŸme`,
      alt: `${g.caller_name} â†” ${g.callee_name} Â· ${SureMetni(sureBas)}`,
      hostId: g.caller_id,
      gorusme: g,
      sebep: '',
      coin: '',
      ihtar: true,
      uploadHours: null,
      roomHours: null,
      hesapBan: false,
      hesapBanHours: -1,
      uyeler: [
        {
          user_id: g.caller_id,
          role: 'caller',
          display_name: g.caller_name,
          username: g.caller_username ?? null,
          is_host: true,
        },
        {
          user_id: g.callee_id,
          role: 'callee',
          display_name: g.callee_name,
          username: g.callee_username ?? null,
          is_host: false,
        },
      ],
      secilen: [g.caller_id, g.callee_id],
      uyelerYukleniyor: false,
    });
  };

  const secimToggle = (userId: string) => {
    setPanel((p) => {
      if (!p) return p;
      const varMi = p.secilen.includes(userId);
      if (varMi && p.secilen.length <= 1) return p;
      return {
        ...p,
        secilen: varMi
          ? p.secilen.filter((id) => id !== userId)
          : [...p.secilen, userId],
      };
    });
  };

  const yaptirimliKapat = () => {
    if (!panel) return;
    const coinN = Math.floor(Number(panel.coin) || 0);
    const yaptirimVar =
      coinN > 0 ||
      panel.ihtar ||
      panel.uploadHours != null ||
      panel.roomHours != null ||
      panel.hesapBan;

    if (yaptirimVar && !panel.sebep.trim()) {
      Alert.alert('Sebep', 'YaptÄ±rÄ±m iÃ§in kÄ±sa bir sebep yaz.');
      return;
    }
    if (yaptirimVar && panel.secilen.length === 0) {
      Alert.alert('Hedef', 'En az bir kullanÄ±cÄ± seÃ§.');
      return;
    }

    const ozet = [
      panel.tur === 'oda'
        ? 'Oda feedâ€™den kaldÄ±rÄ±lacak'
        : panel.tur === 'yayin'
          ? 'YayÄ±n kapatÄ±lacak'
          : 'GÃ¶rÃ¼ÅŸme sonlandÄ±rÄ±lacak',
      yaptirimVar
        ? `Hedef: ${panel.secilen.length} kullanÄ±cÄ±`
        : 'YaptÄ±rÄ±m yok (sadece kapat)',
      coinN > 0 ? `Coin cezasÄ±: âˆ’${coinN.toLocaleString('tr-TR')}` : null,
      panel.ihtar ? 'Ä°htar' : null,
      panel.uploadHours != null
        ? `YÃ¼kleme cezasÄ±: ${SureSaatEtiket(panel.uploadHours)}`
        : null,
      panel.roomHours != null
        ? `Oda aÃ§ma yasaÄŸÄ±: ${SureSaatEtiket(panel.roomHours)}`
        : null,
      panel.hesapBan
        ? `Hesap banÄ±: ${SureSaatEtiket(panel.hesapBanHours)}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    Alert.alert('Onayla', ozet, [
      { text: 'VazgeÃ§', style: 'cancel' },
      {
        text: 'Onayla',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              const girdi = {
                reason: panel.sebep.trim() || undefined,
                coin_penalty: coinN > 0 ? coinN : undefined,
                warning: panel.ihtar,
                upload_ban_hours: panel.uploadHours ?? undefined,
                room_create_ban_hours: panel.roomHours ?? undefined,
                account_ban: panel.hesapBan,
                account_ban_hours: panel.hesapBan
                  ? panel.hesapBanHours
                  : undefined,
                target_user_ids: yaptirimVar ? panel.secilen : undefined,
              };

              if (panel.tur === 'oda' && panel.oda) {
                await AdminSesOdasiKapatVeYaptirim(panel.oda.id, girdi);
              } else if (panel.tur === 'yayin' && panel.yayin) {
                await AdminCanliYayinKapatVeYaptirim(panel.yayin.id, girdi);
              } else if (panel.tur === 'gorusme' && panel.gorusme) {
                const r = await AdminGorusmeKapatVeYaptirim(
                  panel.gorusme.id,
                  girdi,
                );
                if (!r.ok) throw new Error(r.hata ?? 'Ä°ÅŸlem baÅŸarÄ±sÄ±z');
              }

              setPanel(null);
              await yukle();
              Alert.alert('Tamam', 'KapatÄ±ldÄ± Â· yaptÄ±rÄ±mlar uygulandÄ±.');
            } catch (e) {
              Alert.alert(
                'Hata',
                e instanceof Error ? e.message : 'Ä°ÅŸlem baÅŸarÄ±sÄ±z',
              );
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="CanlÄ± odalar"
        subtitle="Ses Â· yayÄ±n Â· gÃ¶rÃ¼ÅŸme Â· sÃ¼re Â· yaptÄ±rÄ±m"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <Text style={AdminStil.kartAlt}>
          KapatÄ±rken host + seÃ§ilen kullanÄ±cÄ±ya coin / ihtar / yÃ¼kleme-oda
          yasaÄŸÄ± / gÃ¼nÂ·haftaÂ·ayÂ·yÄ±l hesap banÄ± uygulayabilirsin. SÃ¼reler anlÄ±k.
        </Text>

        <View style={styles.ornekKutu}>
          <Text style={styles.ornekBaslik}>Ã–rnek ses odalarÄ±</Text>
          <Text style={styles.ornekNot}>
            Bunlar Ã¶rnektir â€” gerÃ§ek kullanÄ±cÄ± odasÄ± deÄŸildir.
          </Text>
          <View style={styles.ornekAksiyon}>
            <Pressable
              style={styles.ornekBtn}
              disabled={busy}
              onPress={() => {
                void (async () => {
                  setBusy(true);
                  const r = await AdminOrnekSesOdalariDoldur();
                  setBusy(false);
                  if (!r.ok) {
                    Alert.alert('Ã–rnek odalar', r.hata ?? 'Eklenemedi');
                    return;
                  }
                  await yukle();
                  Alert.alert(
                    'Ã–rnek odalar',
                    `${r.oda_sayisi ?? 0} Ã¶rnek oda eklendi.`,
                  );
                })();
              }}
            >
              <Text style={styles.ornekBtnYazi}>Ã–rnekleri doldur</Text>
            </Pressable>
            <Pressable
              style={styles.ornekKapatBtn}
              disabled={busy}
              onPress={() => {
                Alert.alert(
                  'Ã–rnek odalarÄ± kapat',
                  'TÃ¼m Ã¶rnek canlÄ± odalar feedâ€™den dÃ¼ÅŸsÃ¼n mÃ¼?',
                  [
                    { text: 'VazgeÃ§', style: 'cancel' },
                    {
                      text: 'Kapat',
                      style: 'destructive',
                      onPress: () => {
                        void (async () => {
                          setBusy(true);
                          const r = await AdminOrnekSesOdalariKapat();
                          setBusy(false);
                          if (!r.ok) {
                            Alert.alert(
                              'Ã–rnek odalar',
                              r.hata ?? 'KapatÄ±lamadÄ±',
                            );
                            return;
                          }
                          await yukle();
                          Alert.alert(
                            'KapatÄ±ldÄ±',
                            `${r.kapatilan ?? 0} Ã¶rnek oda kapatÄ±ldÄ±.`,
                          );
                        })();
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={styles.ornekKapatYazi}>Ã–rnekleri kapat</Text>
            </Pressable>
          </View>
        </View>

        <Text style={AdminStil.sectionLabel}>Ses odalarÄ±</Text>
        {yukleniyor && !odalar.length && !yayinlar.length && !gorusmeler.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !odalar.length ? (
          <Text style={AdminStil.bos}>Åu an canlÄ± ses odasÄ± yok</Text>
        ) : (
          odalar.map((o) => (
            <View key={o.id} style={AdminStil.kart}>
              <View style={AdminStil.satir}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={AdminStil.kartBaslik}>{o.title}</Text>
                  <Text style={AdminStil.kartAlt}>
                    {o.host_name}
                    {o.host_username ? ` Â· @${o.host_username}` : ''}
                    {` Â· ${o.mode} Â· ${o.listener_count} dinleyici`}
                  </Text>
                  <Text style={styles.sureYazi}>
                    AÃ§Ä±k: {SureMetni(o.created_at)}
                  </Text>
                </View>
                <View style={AdminStil.chip}>
                  <Text
                    style={[AdminStil.chipYazi, { color: RenkTokenlari.live }]}
                  >
                    SES
                  </Text>
                </View>
              </View>
              <View style={AdminStil.aksiyonSatir}>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={() => router.push(`/room/${o.id}` as any)}
                >
                  <Text style={AdminStil.aksiyonYazi}>Gir</Text>
                </Pressable>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={() => sadeceKapat(o)}
                >
                  <Text style={AdminStil.aksiyonYazi}>Kapat</Text>
                </Pressable>
                <Pressable
                  style={[
                    AdminStil.aksiyon,
                    { borderColor: RenkTokenlari.danger },
                  ]}
                  onPress={() => panelAcOda(o)}
                >
                  <Text
                    style={[
                      AdminStil.aksiyonYazi,
                      { color: RenkTokenlari.danger },
                    ]}
                  >
                    Kapat + yaptÄ±rÄ±m
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={AdminStil.sectionLabel}>CanlÄ± yayÄ±nlar</Text>
        {!yayinlar.length ? (
          <Text style={AdminStil.bos}>Åu an canlÄ± yayÄ±n yok</Text>
        ) : (
          yayinlar.map((y) => (
            <View key={y.id} style={AdminStil.kart}>
              <View style={AdminStil.satir}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={AdminStil.kartBaslik}>{y.title}</Text>
                  <Text style={AdminStil.kartAlt}>
                    {y.host_name}
                    {y.host_username ? ` Â· @${y.host_username}` : ''}
                    {` Â· ${y.mode} Â· ${y.viewer_count} izleyici`}
                  </Text>
                  <Text style={styles.sureYazi}>
                    AÃ§Ä±k: {SureMetni(y.started_at)}
                  </Text>
                </View>
                <View style={AdminStil.chip}>
                  <Text
                    style={[AdminStil.chipYazi, { color: RenkTokenlari.live }]}
                  >
                    CANLI
                  </Text>
                </View>
              </View>
              <View style={AdminStil.aksiyonSatir}>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={() => router.push(`/canli/${y.id}` as any)}
                >
                  <Text style={AdminStil.aksiyonYazi}>Gir</Text>
                </Pressable>
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={() => yayinSadeceKapat(y)}
                >
                  <Text style={AdminStil.aksiyonYazi}>Kapat</Text>
                </Pressable>
                <Pressable
                  style={[
                    AdminStil.aksiyon,
                    { borderColor: RenkTokenlari.danger },
                  ]}
                  onPress={() => panelAcYayin(y)}
                >
                  <Text
                    style={[
                      AdminStil.aksiyonYazi,
                      { color: RenkTokenlari.danger },
                    ]}
                  >
                    Kapat + yaptÄ±rÄ±m
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={AdminStil.sectionLabel}>Aktif gÃ¶rÃ¼ÅŸmeler</Text>
        {!gorusmeler.length ? (
          <Text style={AdminStil.bos}>Åu an aktif gÃ¶rÃ¼ÅŸme yok</Text>
        ) : (
          gorusmeler.map((g) => {
            const sureBas = g.answered_at ?? g.started_at;
            return (
              <View key={g.id} style={AdminStil.kart}>
                <View style={AdminStil.satir}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={AdminStil.kartBaslik}>
                      {g.caller_name} â†” {g.callee_name}
                    </Text>
                    <Text style={AdminStil.kartAlt}>
                      {g.call_type === 'video' ? 'GÃ¶rÃ¼ntÃ¼lÃ¼' : 'Sesli'}
                      {` Â· ${g.status}`}
                      {g.caller_username ? ` Â· @${g.caller_username}` : ''}
                    </Text>
                    <Text style={styles.sureYazi}>
                      {g.status === 'active' ? 'SÃ¼re' : 'Ã‡alÄ±yor'}:{' '}
                      {SureMetni(sureBas)}
                    </Text>
                  </View>
                  <View style={AdminStil.chip}>
                    <Text
                      style={[
                        AdminStil.chipYazi,
                        { color: RenkTokenlari.primarySoft },
                      ]}
                    >
                      {g.call_type === 'video' ? 'VIDEO' : 'SES'}
                    </Text>
                  </View>
                </View>
                <View style={AdminStil.aksiyonSatir}>
                  <Pressable
                    style={AdminStil.aksiyon}
                    onPress={() => gorusmeSadeceKapat(g)}
                  >
                    <Text style={AdminStil.aksiyonYazi}>Bitir</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      AdminStil.aksiyon,
                      { borderColor: RenkTokenlari.danger },
                    ]}
                    onPress={() => panelAcGorusme(g)}
                  >
                    <Text
                      style={[
                        AdminStil.aksiyonYazi,
                        { color: RenkTokenlari.danger },
                      ]}
                    >
                      Bitir + yaptÄ±rÄ±m
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!panel}
        transparent
        animationType="slide"
        onRequestClose={() => !busy && setPanel(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalKart}>
            <Text style={styles.modalBaslik}>Kapat + yaptÄ±rÄ±m</Text>
            <Text style={styles.modalAlt}>
              {panel?.baslik} Â· {panel?.alt}
            </Text>

            <ScrollView
              style={{ maxHeight: 460 }}
              contentContainerStyle={{ gap: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={AdminStil.input}
                placeholder="Sebep (yaptÄ±rÄ±mda zorunlu)"
                placeholderTextColor={RenkTokenlari.textDim}
                value={panel?.sebep ?? ''}
                onChangeText={(t) =>
                  setPanel((p) => (p ? { ...p, sebep: t } : p))
                }
                editable={!busy}
              />

              <Text style={styles.bolum}>Hedef kullanÄ±cÄ±lar</Text>
              {panel?.uyelerYukleniyor ? (
                <ActivityIndicator color={RenkTokenlari.primarySoft} />
              ) : (
                (panel?.uyeler ?? []).map((u) => {
                  const secili = panel?.secilen.includes(u.user_id);
                  return (
                    <Pressable
                      key={u.user_id}
                      style={[
                        styles.uyeSatir,
                        secili && styles.uyeSatirSecili,
                      ]}
                      onPress={() => secimToggle(u.user_id)}
                      disabled={busy}
                    >
                      <Text style={styles.uyeYazi}>
                        {secili ? 'âœ“ ' : ''}
                        {u.display_name}
                        {u.username ? ` Â· @${u.username}` : ''}
                        {u.is_host ? ' Â· host' : ` Â· ${u.role}`}
                      </Text>
                    </Pressable>
                  );
                })
              )}

              <Text style={styles.bolum}>Coin cezasÄ±</Text>
              <View style={AdminStil.aksiyonSatir}>
                {COIN_CEZA_HIZLI.map((n) => (
                  <Pressable
                    key={n}
                    style={AdminStil.aksiyon}
                    onPress={() =>
                      setPanel((p) => (p ? { ...p, coin: String(n) } : p))
                    }
                    disabled={busy}
                  >
                    <Text style={AdminStil.aksiyonYazi}>{SayiKisa(n)}</Text>
                  </Pressable>
                ))}
                <Pressable
                  style={AdminStil.aksiyon}
                  onPress={() =>
                    setPanel((p) => (p ? { ...p, coin: '' } : p))
                  }
                  disabled={busy}
                >
                  <Text style={AdminStil.aksiyonYazi}>Yok</Text>
                </Pressable>
              </View>
              <TextInput
                style={AdminStil.input}
                placeholder="Miktar (boÅŸ = yok)"
                placeholderTextColor={RenkTokenlari.textDim}
                value={panel?.coin ?? ''}
                onChangeText={(t) =>
                  setPanel((p) => (p ? { ...p, coin: t } : p))
                }
                keyboardType="number-pad"
                editable={!busy}
              />

              <Pressable
                style={[styles.toggle, panel?.ihtar && styles.toggleAcik]}
                onPress={() =>
                  setPanel((p) => (p ? { ...p, ihtar: !p.ihtar } : p))
                }
                disabled={busy}
              >
                <Text style={styles.toggleYazi}>
                  {panel?.ihtar ? 'âœ“ ' : ''}Ä°htar kaydÄ±
                </Text>
              </Pressable>

              <Text style={styles.bolum}>YÃ¼kleme cezasÄ±</Text>
              <View style={styles.chipSatir}>
                <SureChip
                  label="Yok"
                  secili={panel?.uploadHours == null}
                  onPress={() =>
                    setPanel((p) => (p ? { ...p, uploadHours: null } : p))
                  }
                />
                {YAPTIRIM_SURE_SECENEKLERI.map((s) => (
                  <SureChip
                    key={`u-${s.hours}`}
                    label={s.label}
                    secili={panel?.uploadHours === s.hours}
                    onPress={() =>
                      setPanel((p) =>
                        p ? { ...p, uploadHours: s.hours } : p,
                      )
                    }
                  />
                ))}
              </View>

              <Text style={styles.bolum}>Ses odasÄ± aÃ§ma yasaÄŸÄ±</Text>
              <View style={styles.chipSatir}>
                <SureChip
                  label="Yok"
                  secili={panel?.roomHours == null}
                  onPress={() =>
                    setPanel((p) => (p ? { ...p, roomHours: null } : p))
                  }
                />
                {YAPTIRIM_SURE_SECENEKLERI.map((s) => (
                  <SureChip
                    key={`r-${s.hours}`}
                    label={s.label}
                    secili={panel?.roomHours === s.hours}
                    onPress={() =>
                      setPanel((p) =>
                        p ? { ...p, roomHours: s.hours } : p,
                      )
                    }
                  />
                ))}
              </View>

              <Pressable
                style={[styles.toggle, panel?.hesapBan && styles.toggleTehlike]}
                onPress={() =>
                  setPanel((p) =>
                    p ? { ...p, hesapBan: !p.hesapBan } : p,
                  )
                }
                disabled={busy}
              >
                <Text
                  style={[
                    styles.toggleYazi,
                    panel?.hesapBan && { color: RenkTokenlari.danger },
                  ]}
                >
                  {panel?.hesapBan ? 'âœ“ ' : ''}HesabÄ± banla
                </Text>
              </Pressable>

              {panel?.hesapBan ? (
                <>
                  <Text style={styles.bolum}>Ban sÃ¼resi</Text>
                  <View style={styles.chipSatir}>
                    {YAPTIRIM_SURE_SECENEKLERI.map((s) => (
                      <SureChip
                        key={`b-${s.hours}`}
                        label={s.label}
                        secili={panel.hesapBanHours === s.hours}
                        onPress={() =>
                          setPanel((p) =>
                            p ? { ...p, hesapBanHours: s.hours } : p,
                          )
                        }
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.modalAksiyon}>
              <Pressable
                style={AdminStil.aksiyon}
                disabled={busy}
                onPress={() => setPanel(null)}
              >
                <Text style={AdminStil.aksiyonYazi}>VazgeÃ§</Text>
              </Pressable>
              <Pressable
                style={[
                  AdminStil.aksiyon,
                  {
                    borderColor: RenkTokenlari.danger,
                    flex: 1.4,
                    opacity: busy ? 0.6 : 1,
                  },
                ]}
                disabled={busy}
                onPress={yaptirimliKapat}
              >
                {busy ? (
                  <ActivityIndicator color={RenkTokenlari.danger} />
                ) : (
                  <Text
                    style={[
                      AdminStil.aksiyonYazi,
                      { color: RenkTokenlari.danger },
                    ]}
                  >
                    Kapat ve uygula
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalKart: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.lg,
    borderTopRightRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
    maxHeight: '92%',
  },
  modalBaslik: {
    ...TipografiTokenlari.titleSm,
    color: RenkTokenlari.text,
  },
  modalAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginBottom: 4,
  },
  bolum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipSecili: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  chipYaziSecili: {
    color: RenkTokenlari.primarySoft,
  },
  toggle: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    padding: BoslukTokenlari.sm,
  },
  toggleAcik: {
    borderColor: RenkTokenlari.primarySoft,
  },
  toggleTehlike: {
    borderColor: RenkTokenlari.danger,
  },
  toggleYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  uyeSatir: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  uyeSatirSecili: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  uyeYazi: {
    ...TipografiTokenlari.bodySm,
    color: RenkTokenlari.text,
  },
  sureYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    marginTop: 2,
  },
  modalAksiyon: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  ornekKutu: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    padding: BoslukTokenlari.md,
    gap: 8,
    marginBottom: BoslukTokenlari.sm,
  },
  ornekBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  ornekNot: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  ornekAksiyon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ornekBtn: {
    borderWidth: 1,
    borderColor: RenkTokenlari.primarySoft,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ornekBtnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
  },
  ornekKapatBtn: {
    borderWidth: 1,
    borderColor: RenkTokenlari.danger,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ornekKapatYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
  },
});

