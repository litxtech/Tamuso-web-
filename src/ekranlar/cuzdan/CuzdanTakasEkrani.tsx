import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { EkranBasligi } from '../../components/EkranBasligi';
import { useCeviri } from '../../i18n/useCeviri';
import {
  KlavyeFocusKaydir,
  KlavyeRefIleKaydir,
  KlavyeScrollView,
  type KlavyeScrollHandle,
} from '../../bilesenler/klavye/KlavyeScrollView';
import { useAuth, useWallet } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { OzellikBayragiAktifMiSunucu } from '../../moduller/ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import { CuzdanHesabiGarantile } from '../../moduller/cuzdan/takas/CuzdanHesabi';
import {
  CuzdanNoIleAliciGetir,
  CuzdanNoIleTransfer,
  CuzdanNoQrdenCoz,
  AjansNoQrdenCoz,
  TakasAjansAra,
  TakasKullaniciAra,
  TakasKullaniciGorunenAd,
  TakasTeklifOlustur,
  TakasTekliflerimiGetir,
  TakasAliciYanit,
  type TakasAjansSatir,
  type TakasKullaniciSatir,
} from '../../moduller/cuzdan/takas/CuzdanTakasIslemleri';
import {
  CuzdanAdSoyadMaskele,
  CuzdanKartiniWhatsAppPaylas,
} from '../../moduller/cuzdan/islemler/CuzdanKartPaylasimi';
import { CuzdanQrKarti } from '../../moduller/cuzdan/bilesenler/CuzdanQrKarti';
import {
  CUZDAN_MARKA_ADI,
  TAKAS_DURUM_ETIKET,
} from '../../moduller/cuzdan/takas/CuzdanTakasTipleri';
import {
  TakasIadeUyari,
  TakasOdemeBilgisi,
} from '../../moduller/cuzdan/takas/TakasOdemeBilgisi';
import { DIL_LOCALE_MAP } from '../../i18n/diller';
import { TeklifMesajiOlustur } from '../../moduller/cuzdan/takas/TeklifMesaji';
import { CoinDegerOzetiPaneli } from '../../moduller/cuzdan/bilesenler/CoinDegerOzetiPaneli';
import { useCuzdanUiConfig } from '../../moduller/cuzdan/ui-config/useCuzdanUiConfig';
import { TakasProfilKarti } from '../../moduller/cuzdan/bilesenler/TakasProfilKarti';
import {
  CoinDegerOzeti,
  TryYazi,
} from '../../moduller/cuzdan/katalog/CoinTakasPaylasimi';
import {
  AjansSohbetAcVeyaGetir,
  MesajGonder,
  OzelSohbetAcVeyaGetir,
} from '../../moduller/mesajlasma/islemler/MesajGonder';
import { TakasMahkemeKur } from '../../moduller/cuzdan/takas/TakasMahkemeIslemleri';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Mod = 'menu' | 'transfer' | 'ajans' | 'kullanici' | 'teklifler';

type PeerOzet = {
  id: string;
  ad: string;
  avatar: string | null;
};

function formatCuzdanNo(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 18);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export default function CuzdanTakasEkrani() {
  const { t, dil } = useCeviri();
  const loc = DIL_LOCALE_MAP[dil];
  const router = useRouter();
  const params = useLocalSearchParams<{ sekme?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { wallet, refreshWallet, adjustWallet } = useWallet();
  const { config: cuzdanUi } = useCuzdanUiConfig();
  const [camIzin, camIzinIste] = useCameraPermissions();
  const [mod, setMod] = useState<Mod>('menu');
  const [kyc, setKyc] = useState<string>('none');
  const [walletNo, setWalletNo] = useState('');
  const [bayrakKontrol, setBayrakKontrol] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void OzellikBayragiAktifMiSunucu('wallet_exchange_enabled').then((acik) => {
        if (!alive) return;
        if (!acik) {
          Alert.alert(t('takas.kapaliBaslik'), t('takas.kapaliBody'));
          router.replace('/(tabs)/wallet' as any);
          return;
        }
        setBayrakKontrol(false);
      });
      return () => {
        alive = false;
      };
    }, [router, t]),
  );

  const [tNo, setTNo] = useState('');
  const [tAd, setTAd] = useState('');
  const [tSoyad, setTSoyad] = useState('');
  const [tCoin, setTCoin] = useState('');
  const [aliciDurum, setAliciDurum] = useState<string | null>(null);
  const [taramaAcik, setTaramaAcik] = useState(false);
  const taramaKilit = useRef(false);
  const aliciIstek = useRef(0);

  const [q, setQ] = useState('');
  const [ajanslar, setAjanslar] = useState<TakasAjansSatir[]>([]);
  const [kullanicilar, setKullanicilar] = useState<TakasKullaniciSatir[]>([]);
  const [seciliIds, setSeciliIds] = useState<string[]>([]);
  const [teklifCoin, setTeklifCoin] = useState('');
  const [teklifler, setTeklifler] = useState<
    Awaited<ReturnType<typeof TakasTekliflerimiGetir>>
  >([]);
  const [peerMap, setPeerMap] = useState<Record<string, PeerOzet>>({});
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<KlavyeScrollHandle>(null);
  const tCoinRef = useRef<TextInput>(null);
  const teklifCoinRef = useRef<TextInput>(null);

  const klavyeKaydir = useCallback(
    (e?: Parameters<typeof KlavyeFocusKaydir>[1]) => {
      KlavyeFocusKaydir(scrollRef.current, e, { ustBosluk: 48 });
    },
    [],
  );

  const coinAlaniKaydir = useCallback((hangi: 'transfer' | 'teklif') => {
    KlavyeRefIleKaydir(
      scrollRef.current,
      hangi === 'transfer' ? tCoinRef : teklifCoinRef,
      { ustBosluk: 64, delayMs: 80 },
    );
  }, []);

  const yenileHesap = useCallback(async () => {
    const r = await CuzdanHesabiGarantile();
    if (r.ok) {
      setWalletNo(r.hesap.wallet_number);
      setKyc(r.hesap.kyc_status);
    }
  }, []);

  useEffect(() => {
    void yenileHesap();
  }, [yenileHesap]);

  const mahkemeKurGonder = useCallback(
    async (offerId: string, reason: string) => {
      const gerekce = reason.trim();
      if (gerekce.length < 10) {
        Alert.alert(t('takas.mahkeme'), t('takas.mahkemeGerekceMin'));
        return;
      }
      setBusy(true);
      const r = await TakasMahkemeKur({ offerId, reason: gerekce });
      setBusy(false);
      if (!r.ok) {
        Alert.alert(t('takas.mahkeme'), r.hata);
        return;
      }
      Alert.alert(
        r.already ? t('takas.mahkemeZatenAcik') : t('takas.mahkemeKuruldu'),
        t('takas.mahkemeKurulduBody'),
        [
          {
            text: t('takas.grubaGit'),
            onPress: () => router.push(`/mesaj/${r.threadId}` as any),
          },
          { text: t('ortak.tamam') },
        ],
      );
    },
    [router],
  );

  const secimToggle = useCallback((id: string) => {
    setSeciliIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const sohbetAc = useCallback(
    async (
      otherUserId: string,
      ilkMesaj?: string,
      sohbeteGit = true,
      agencyId?: string | null,
    ) => {
      if (!otherUserId && !agencyId) return;
      const ac = agencyId
        ? await AjansSohbetAcVeyaGetir(agencyId)
        : await OzelSohbetAcVeyaGetir(otherUserId);
      if (!ac.ok) {
        Alert.alert(t('sekmeler.mesaj'), ac.hata);
        return;
      }
      if (ilkMesaj?.trim()) {
        await MesajGonder({ threadId: ac.threadId, body: ilkMesaj.trim() });
      }
      if (sohbeteGit) {
        router.push(`/mesaj/${ac.threadId}` as any);
      }
    },
    [router],
  );

  const teklifleriAc = useCallback(async () => {
    const list = await TakasTekliflerimiGetir();
    setTeklifler(list);
    setMod('teklifler');

    const userIds = new Set<string>();
    const agencyIds = new Set<string>();
    for (const t of list) {
      if (t.seller_id) userIds.add(t.seller_id);
      if (t.buyer_user_id) userIds.add(t.buyer_user_id);
      if (t.buyer_agency_id) agencyIds.add(t.buyer_agency_id);
    }
    const next: Record<string, PeerOzet> = {};
    const uidList = [...userIds];
    if (uidList.length) {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', uidList);
      for (const p of data ?? []) {
        next[p.id] = {
          id: p.id,
          ad: (p.display_name ?? p.username ?? t('ortak.kullanici')) as string,
          avatar: (p.avatar_url as string | null) ?? null,
        };
      }
    }
    const aidList = [...agencyIds];
    if (aidList.length) {
      const { data } = await supabase
        .from('agencies')
        .select('id, name, logo_url, owner_id')
        .in('id', aidList);
      for (const a of data ?? []) {
        next[`agency:${a.id}`] = {
          id: (a.owner_id as string) || a.id,
          ad: (a.name as string) || t('ajans.baslik'),
          avatar: (a.logo_url as string | null) ?? null,
        };
      }
    }
    setPeerMap(next);
  }, []);

  useEffect(() => {
    const sekme = String(params.sekme ?? '');
    if (sekme === 'teklifler') {
      void teklifleriAc();
    }
  }, [params.sekme, teklifleriAc]);

  const aliciDoldur = useCallback(async (no: string, kaynaktan?: 'qr' | 'yaz') => {
    const digits = no.replace(/\D/g, '');
    if (digits.length !== 18) {
      setAliciDurum(null);
      return;
    }
    const req = ++aliciIstek.current;
    setAliciDurum(t('takas.aliciAraniyor'));
    const r = await CuzdanNoIleAliciGetir(digits);
    if (req !== aliciIstek.current) return;
    if (!r.ok) {
      setTAd('');
      setTSoyad('');
      setAliciDurum(r.hata);
      if (kaynaktan === 'qr') Alert.alert(t('takas.qr'), r.hata);
      return;
    }
    if (r.kycStatus !== 'approved' || !r.firstName || !r.lastName) {
      setTAd('');
      setTSoyad('');
      const msg = t('takas.aliciKycYok');
      setAliciDurum(msg);
      if (kaynaktan === 'qr') Alert.alert(t('takas.qrOkundu'), msg);
      return;
    }
    setTAd(r.firstName);
    setTSoyad(r.lastName);
    const maskeli = CuzdanAdSoyadMaskele(r.firstName, r.lastName);
    const ozet = t('takas.aliciKycOnayli', { maskeli });
    setAliciDurum(ozet);
    if (kaynaktan === 'qr') {
      Alert.alert(
        t('takas.qrOkundu'),
        t('takas.qrCuzdanOzet', { no: formatCuzdanNo(digits), maskeli }),
      );
    }
  }, []);

  const cuzdanNoYaz = useCallback(
    (text: string, kaynaktan?: 'qr' | 'yaz') => {
      const formatted = formatCuzdanNo(text);
      setTNo(formatted);
      const digits = formatted.replace(/\D/g, '');
      if (digits.length < 18) {
        setTAd('');
        setTSoyad('');
        setAliciDurum(null);
        return;
      }
      void aliciDoldur(digits, kaynaktan);
    },
    [aliciDoldur],
  );

  const kameraAc = async () => {
    if (!camIzin?.granted) {
      const n = await camIzinIste();
      if (!n.granted) {
        Alert.alert(t('kyc.kamera'), t('takas.kameraIzin'));
        return;
      }
    }
    taramaKilit.current = false;
    setTaramaAcik(true);
  };

  const cuzdanNoKopyala = async () => {
    if (!walletNo || walletNo.replace(/\D/g, '').length !== 18) {
      Alert.alert(t('sekmeler.cuzdan'), t('cuzdanX.numaraHazirDegil'));
      return;
    }
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(walletNo.replace(/\D/g, ''));
      Alert.alert(t('ortak.kopyalandi'), formatCuzdanNo(walletNo));
    } catch {
      Alert.alert(t('ortak.kopyala'), t('takas.kopyalaBasarisiz'));
    }
  };

  const panodanYapistir = async () => {
    try {
      const Clipboard = await import('expo-clipboard');
      const raw = await Clipboard.getStringAsync();
      const no = CuzdanNoQrdenCoz(raw ?? '') ?? raw?.replace(/\D/g, '') ?? '';
      if (no.replace(/\D/g, '').length !== 18) {
        Alert.alert(t('takas.yapistir'), t('takas.yapistirBos'));
        return;
      }
      setMod('transfer');
      cuzdanNoYaz(no, 'yaz');
    } catch {
      Alert.alert(t('takas.yapistir'), t('takas.yapistirOkunamadi'));
    }
  };

  const qrOkundu = useCallback(
    ({ data }: { data: string }) => {
      if (taramaKilit.current) return;
      const ajans = AjansNoQrdenCoz(data);
      if (ajans) {
        taramaKilit.current = true;
        setTaramaAcik(false);
        setMod('ajans');
        setQ(ajans);
        void TakasAjansAra(ajans).then(setAjanslar);
        Alert.alert(t('takas.qrOkundu'), t('takas.ajansNo', { no: ajans }));
        return;
      }
      const no = CuzdanNoQrdenCoz(data);
      if (!no) return;
      taramaKilit.current = true;
      setTaramaAcik(false);
      setMod('transfer');
      cuzdanNoYaz(no, 'qr');
    },
    [cuzdanNoYaz],
  );

  const araAjans = async (text: string) => {
    setQ(text);
    setAjanslar(await TakasAjansAra(text));
  };

  const araKullanici = async (text: string) => {
    setQ(text);
    if (text.trim().length < 2) {
      setKullanicilar([]);
      return;
    }
    setKullanicilar(await TakasKullaniciAra(text));
  };

  const transferYap = async () => {
    const coins = Math.floor(Number(tCoin));
    if (!coins || coins <= 0) {
      Alert.alert(t('cuzdan.coin'), t('takas.gecerliMiktar'));
      return;
    }
    if (tNo.replace(/\D/g, '').length !== 18) {
      Alert.alert(t('sekmeler.cuzdan'), t('takas.cuzdanNoGerekli'));
      return;
    }
    if (!tAd.trim() || !tSoyad.trim()) {
      Alert.alert(t('takas.peerKullanici'), t('takas.aliciAdSoyadYok'));
      return;
    }
    setBusy(true);
    const r = await CuzdanNoIleTransfer({
      walletNumber: tNo,
      firstName: tAd,
      lastName: tSoyad,
      coins,
    });
    setBusy(false);
    if (!r.ok) {
      Alert.alert(t('takas.transferIptal'), r.hata);
      return;
    }
    adjustWallet({ coins: -coins });
    void refreshWallet();
    Alert.alert(t('ortak.tamam'), t('takas.transferTamam'));
    setMod('menu');
  };

  const teklifGonder = async (tip: 'user' | 'agency') => {
    if (kyc !== 'approved') {
      Alert.alert(t('kyc.baslik'), t('takas.kycGerekli'), [
        { text: t('ortak.vazgec'), style: 'cancel' },
        { text: t('takas.onayaGit'), onPress: () => router.push('/kyc' as any) },
      ]);
      return;
    }
    const coins = Math.floor(Number(teklifCoin));
    if (!seciliIds.length || !coins) {
      Alert.alert(t('kyc.eksik'), t('takas.eksikAliciCoin'));
      return;
    }
    const mesaj = TeklifMesajiOlustur(coins);
    const ozet = CoinDegerOzeti(coins);
    const seciliAdlar =
      tip === 'agency'
        ? ajanslar
            .filter((a) => seciliIds.includes(a.id))
            .map((a) => a.name)
            .join(', ')
        : kullanicilar
            .filter((k) => seciliIds.includes(k.id))
            .map((k) => TakasKullaniciGorunenAd(k))
            .join(', ');

    Alert.alert(
      t('takas.anlasmaOzeti'),
      t('takas.anlasmaOzetiBody', {
        adet: seciliIds.length,
        adlar: seciliAdlar,
        mesaj,
        katalog: TryYazi(ozet.katalogTl),
        net: TryYazi(ozet.saticiNetTl),
        iade: TakasIadeUyari(),
      }),
      [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('takas.teklifGonder'),
          onPress: () => {
            void (async () => {
              setBusy(true);
              let okSay = 0;
              const hatalar: string[] = [];
              let sonThreadAgency: string | null = null;
              let sonThreadUser: string | null = null;
              for (const id of seciliIds) {
                const r = await TakasTeklifOlustur({
                  buyerType: tip,
                  buyerUserId: tip === 'user' ? id : null,
                  buyerAgencyId: tip === 'agency' ? id : null,
                  coins,
                  note: mesaj,
                });
                if (!r.ok) {
                  hatalar.push(r.hata);
                  continue;
                }
                okSay += 1;
                if (tip === 'user') {
                  await sohbetAc(id, mesaj, false);
                  sonThreadUser = id;
                } else {
                  await sohbetAc('', mesaj, false, id);
                  sonThreadAgency = id;
                }
              }
              setBusy(false);
              void refreshWallet();
              if (okSay === 0) {
                Alert.alert(t('takas.teklif'), hatalar[0] ?? t('takas.gonderilemedi'));
                return;
              }
              Alert.alert(
                t('takas.teklifGonderildi'),
                t('takas.teklifGonderildiBody', {
                  ok: okSay,
                  hata: hatalar.length
                    ? t('takas.teklifGonderildiHata', { adet: hatalar.length })
                    : '',
                }),
                [
                  {
                    text: t('cuzdanX.sohbeteGit'),
                    onPress: () => {
                      if (sonThreadAgency) {
                        void sohbetAc('', undefined, true, sonThreadAgency);
                      } else if (sonThreadUser) {
                        void sohbetAc(sonThreadUser, undefined, true);
                      }
                    },
                  },
                  {
                    text: t('takas.tekliflerim'),
                    onPress: () => void teklifleriAc(),
                  },
                  {
                    text: t('ortak.tamam'),
                    onPress: () => {
                      setSeciliIds([]);
                      setMod('menu');
                    },
                  },
                ],
              );
            })();
          },
        },
      ],
    );
  };

  if (bayrakKontrol) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <EkranBasligi title={t('takas.baslik')} subtitle={t('takas.kontrolEdiliyor')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <EkranBasligi
        title={t('takas.baslik')}
        subtitle={t('takas.altBaslik', {
          marka: cuzdanUi.brand?.name || CUZDAN_MARKA_ADI,
        })}
      />
      <KlavyeScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.pad,
          { paddingBottom: insets.bottom + 48 },
        ]}
        ekstraPad={72}
      >
        <View style={styles.kart}>
          <Text style={styles.marka}>
            {cuzdanUi.brand?.name || CUZDAN_MARKA_ADI}
          </Text>
          <View style={styles.noSatirKart}>
            <Text style={styles.no} numberOfLines={1}>
              {walletNo
                ? walletNo.replace(/(\d{4})(?=\d)/g, '$1 ')
                : t('takas.cuzdanNoYukleniyor')}
            </Text>
            {walletNo.replace(/\D/g, '').length === 18 ? (
              <Pressable
                style={styles.ikonBtn}
                onPress={() => void cuzdanNoKopyala()}
                hitSlop={8}
                accessibilityLabel={t('takas.a11yCuzdanKopyala')}
              >
                <Ionicons
                  name="copy-outline"
                  size={18}
                  color={RenkTokenlari.accent}
                />
              </Pressable>
            ) : null}
            <Pressable
              style={styles.ikonBtn}
              onPress={() => void kameraAc()}
              hitSlop={8}
              accessibilityLabel={t('takas.a11yQrOku')}
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={RenkTokenlari.accent}
              />
            </Pressable>
          </View>
          <Text style={styles.meta}>
            {t('takas.bakiyeKyc', {
              adet: (wallet?.coins ?? 0).toLocaleString(loc),
              durum:
                kyc === 'approved'
                  ? t('takas.kycOnayli')
                  : kyc === 'pending'
                    ? t('takas.kycIncelemede')
                    : t('takas.kycYok'),
            })}
          </Text>
          {(wallet?.coins ?? 0) > 0 ? (
            <View style={{ marginTop: 10 }}>
              <CoinDegerOzetiPaneli
                coins={wallet?.coins ?? 0}
                kompakt
                ozet={cuzdanUi.value_summary}
              />
            </View>
          ) : null}
          {walletNo.replace(/\D/g, '').length === 18 ? (
            <CuzdanQrKarti
              walletNumber={walletNo}
              marka={CUZDAN_MARKA_ADI}
              onKameraOku={() => void kameraAc()}
              onWhatsAppPaylas={() => {
                void (async () => {
                  const r = await CuzdanKartiniWhatsAppPaylas(walletNo);
                  if (!r.ok) Alert.alert(t('ortak.whatsapp'), r.hata);
                })();
              }}
            />
          ) : null}
          {kyc !== 'approved' ? (
            <Pressable
              style={styles.link}
              onPress={() => router.push('/kyc' as any)}
            >
              <Text style={styles.linkYazi}>{t('takas.kimlikOnayiYap')}</Text>
            </Pressable>
          ) : null}
        </View>

        {mod === 'menu' ? (
          <>
            <Text style={styles.odemeNot}>{TakasOdemeBilgisi()}</Text>
            <Text style={styles.iadeNot}>{TakasIadeUyari()}</Text>
            <Pressable style={styles.btn} onPress={() => void kameraAc()}>
              <Text style={styles.btnYazi}>{t('takas.qrOkuKamera')}</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={() => setMod('transfer')}>
              <Text style={styles.btnYazi}>{t('takas.cuzdanNoTransfer')}</Text>
            </Pressable>
            <Pressable
              style={styles.btn}
              onPress={() => {
                setSeciliIds([]);
                setMod('ajans');
                void araAjans('');
              }}
            >
              <Text style={styles.btnYazi}>{t('takas.ajansaTeklif')}</Text>
            </Pressable>
            <Pressable
              style={styles.btn}
              onPress={() => {
                setSeciliIds([]);
                setMod('kullanici');
              }}
            >
              <Text style={styles.btnYazi}>{t('takas.kullaniciyaTeklif')}</Text>
            </Pressable>
            <Pressable
              style={styles.btnIkincil}
              onPress={() => void teklifleriAc()}
            >
              <Text style={styles.btnIkincilYazi}>{t('takas.tekliflerim')}</Text>
            </Pressable>
          </>
        ) : null}

        {mod === 'transfer' ? (
          <View style={styles.form}>
            <Text style={styles.bolum}>{t('takas.bolumCuzdanNo')}</Text>
            <View style={styles.noSatir}>
              <TextInput
                style={[styles.input, styles.noInput]}
                value={tNo}
                onChangeText={(t) => cuzdanNoYaz(t)}
                keyboardType="number-pad"
                maxLength={22}
                placeholder="XXXX XXXX XXXX XXXX XX"
                placeholderTextColor={RenkTokenlari.textDim}
                onFocus={klavyeKaydir}
              />
              <Pressable
                style={styles.kameraBtn}
                onPress={() => void panodanYapistir()}
                accessibilityLabel={t('takas.a11yPanodanYapistir')}
              >
                <Ionicons name="clipboard-outline" size={20} color="#fff" />
              </Pressable>
              <Pressable
                style={styles.kameraBtn}
                onPress={() => void kameraAc()}
                accessibilityLabel={t('takas.a11yQrOku')}
              >
                <Ionicons name="camera-outline" size={22} color="#fff" />
              </Pressable>
            </View>
            {aliciDurum ? (
              <Text style={styles.aliciDurum}>{aliciDurum}</Text>
            ) : null}
            <TextInput
              style={[styles.input, styles.readonly]}
              value={tAd ? `${tAd.charAt(0).toLocaleUpperCase(loc)}.` : ''}
              editable={false}
              placeholder={t('takas.placeholderAliciAd')}
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <TextInput
              style={[styles.input, styles.readonly]}
              value={
                tSoyad ? `${tSoyad.charAt(0).toLocaleUpperCase(loc)}.` : ''
              }
              editable={false}
              placeholder={t('takas.placeholderAliciSoyad')}
              placeholderTextColor={RenkTokenlari.textDim}
            />
            <TextInput
              ref={tCoinRef}
              style={styles.input}
              value={tCoin}
              onChangeText={setTCoin}
              keyboardType="number-pad"
              placeholder={t('takas.placeholderCoin')}
              placeholderTextColor={RenkTokenlari.textDim}
              onFocus={() => coinAlaniKaydir('transfer')}
            />
            <Text style={styles.uyari}>{t('takas.transferUyari')}</Text>
            <Pressable
              style={[styles.btn, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => void transferYap()}
            >
              <Text style={styles.btnYazi}>{t('takas.transferEt')}</Text>
            </Pressable>
            <Pressable onPress={() => setMod('menu')}>
              <Text style={styles.geri}>{t('takas.geriOk')}</Text>
            </Pressable>
          </View>
        ) : null}

        {mod === 'ajans' || mod === 'kullanici' ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={q}
              onChangeText={(qText) =>
                void (mod === 'ajans' ? araAjans(qText) : araKullanici(qText))
              }
              placeholder={
                mod === 'ajans' ? t('takas.araAjans') : t('takas.araKullanici')
              }
              placeholderTextColor={RenkTokenlari.textDim}
              onFocus={klavyeKaydir}
            />
            {mod === 'ajans'
              ? ajanslar.map((item) => (
                  <TakasProfilKarti
                    key={item.id}
                    baslik={item.name}
                    altYazi={item.agency_public_id ?? item.id.slice(0, 8)}
                    avatarUrl={item.logo_url}
                    secili={seciliIds.includes(item.id)}
                    onPress={() => secimToggle(item.id)}
                    onProfil={() =>
                      router.push(`/ajans/profil/${item.id}` as any)
                    }
                    onMesaj={() =>
                      void sohbetAc('', undefined, true, item.id)
                    }
                  />
                ))
              : kullanicilar.map((item) => (
                  <TakasProfilKarti
                    key={item.id}
                    baslik={TakasKullaniciGorunenAd(item)}
                    altYazi={
                      item.wallet_number
                        ? item.wallet_number.replace(
                            /(\d{4})(?=\d)/g,
                            '$1 ',
                          )
                        : item.username
                    }
                    avatarUrl={item.avatar_url}
                    secili={seciliIds.includes(item.id)}
                    onPress={() => secimToggle(item.id)}
                    onProfil={() =>
                      router.push(`/kullanici/${item.id}` as any)
                    }
                    onMesaj={() => void sohbetAc(item.id, undefined, true)}
                  />
                ))}
            {seciliIds.length > 0 ? (
              <Text style={styles.meta}>
                {t('takas.seciliTeklif', { count: seciliIds.length })}
              </Text>
            ) : (
              <Text style={styles.meta}>
                {t('takas.cokluSecim')}
              </Text>
            )}
            <TextInput
              ref={teklifCoinRef}
              style={styles.input}
              value={teklifCoin}
              onChangeText={setTeklifCoin}
              keyboardType="number-pad"
              placeholder={t('takas.placeholderTeklifCoin')}
              placeholderTextColor={RenkTokenlari.textDim}
              onFocus={() => coinAlaniKaydir('teklif')}
            />
            {Math.floor(Number(teklifCoin)) > 0 ? (
              <>
                <CoinDegerOzetiPaneli
                  coins={Math.floor(Number(teklifCoin))}
                  iadeUyari
                  iadeMetin={TakasIadeUyari()}
                  ozet={cuzdanUi.value_summary}
                />
                <Text style={styles.teklifOnizleme}>
                  {TeklifMesajiOlustur(Math.floor(Number(teklifCoin)))}
                </Text>
              </>
            ) : null}
            <Pressable
              style={[styles.btn, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() =>
                void teklifGonder(mod === 'ajans' ? 'agency' : 'user')
              }
            >
              <Text style={styles.btnYazi}>
                {seciliIds.length > 1
                  ? t('takas.teklifGonderN', { count: seciliIds.length })
                  : t('takas.teklifGonder')}
              </Text>
            </Pressable>
            <Pressable onPress={() => setMod('menu')}>
              <Text style={styles.geri}>{t('takas.geriOk')}</Text>
            </Pressable>
          </View>
        ) : null}

        {mod === 'teklifler' ? (
          <View style={styles.form}>
            <Text style={styles.bolum}>{t('takas.gelenGiden')}</Text>
            <Pressable
              style={styles.btnIkincil}
              onPress={() => router.push('/ajans/teklifler' as any)}
            >
              <Text style={styles.btnIkincilYazi}>{t('takas.ajansTeklifPaneli')}</Text>
            </Pressable>
            {teklifler.length === 0 ? (
              <Text style={styles.meta}>{t('takas.teklifYok')}</Text>
            ) : (
              teklifler.map((teklif) => {
                const benAliciyim =
                  teklif.buyer_user_id === user?.id && teklif.seller_id !== user?.id;
                const aliciBekliyor =
                  teklif.status === 'pending_buyer' &&
                  (benAliciyim ||
                    (teklif.buyer_type === 'agency' && teklif.seller_id !== user?.id));
                const net =
                  teklif.satici_net_tl != null
                    ? Number(teklif.satici_net_tl)
                    : CoinDegerOzeti(teklif.coins).saticiNetTl;
                const benSaticiyim = teklif.seller_id === user?.id;
                const peer = benSaticiyim
                  ? teklif.buyer_type === 'agency' && teklif.buyer_agency_id
                    ? peerMap[`agency:${teklif.buyer_agency_id}`]
                    : teklif.buyer_user_id
                      ? peerMap[teklif.buyer_user_id]
                      : undefined
                  : peerMap[teklif.seller_id];
                const teklifMetni =
                  teklif.note?.trim() || TeklifMesajiOlustur(teklif.coins);
                const mesajUserId = benSaticiyim
                  ? teklif.buyer_type === 'agency'
                    ? peer?.id
                    : teklif.buyer_user_id
                  : teklif.seller_id;
                const mesajAgencyId =
                  benSaticiyim && teklif.buyer_type === 'agency'
                    ? teklif.buyer_agency_id
                    : null;
                const ajansMesajAc = () => {
                  if (mesajAgencyId) {
                    void sohbetAc('', undefined, true, mesajAgencyId);
                  } else if (mesajUserId) {
                    void sohbetAc(mesajUserId, undefined, true);
                  }
                };
                const profilYolu = benSaticiyim
                  ? teklif.buyer_type === 'agency' && teklif.buyer_agency_id
                    ? `/ajans/profil/${teklif.buyer_agency_id}`
                    : teklif.buyer_user_id
                      ? `/kullanici/${teklif.buyer_user_id}`
                      : null
                  : `/kullanici/${teklif.seller_id}`;

                const mahkemeAcilabilir =
                  teklif.status !== 'cancelled' &&
                  teklif.status !== 'rejected' &&
                  teklif.status !== 'expired';

                const mahkemeKur = () => {
                  Alert.alert(
                    t('takas.mahkemeKur'),
                    t('takas.mahkemeKurBody'),
                    [
                      { text: t('ortak.vazgec'), style: 'cancel' },
                      {
                        text: t('takas.kur'),
                        onPress: () =>
                          void mahkemeKurGonder(
                            teklif.id,
                            t('takas.mahkemeVarsayilanGerekce'),
                          ),
                      },
                    ],
                  );
                };

                return (
                  <View key={teklif.id} style={styles.listeSatir}>
                    {peer ? (
                      <TakasProfilKarti
                        baslik={peer.ad}
                        altYazi={
                          benSaticiyim && teklif.buyer_type === 'agency'
                            ? t('takas.peerAjans')
                            : t('takas.peerKullanici')
                        }
                        avatarUrl={peer.avatar}
                        onPress={() => {
                          if (profilYolu) router.push(profilYolu as any);
                        }}
                        onMesaj={
                          mesajAgencyId || mesajUserId
                            ? () => ajansMesajAc()
                            : undefined
                        }
                      />
                    ) : null}
                    <Text style={styles.listeYazi}>
                      {t('takas.coinDurum', {
                        adet: teklif.coins.toLocaleString(loc),
                        durum: TAKAS_DURUM_ETIKET[teklif.status] ?? teklif.status,
                        tip:
                          teklif.buyer_type === 'agency'
                            ? t('takas.tipAjans')
                            : t('takas.tipKullanici'),
                      })}
                    </Text>
                    <Text style={styles.teklifOnizleme}>{teklifMetni}</Text>
                    <Text style={styles.meta}>
                      {t('takas.anlasmaTutari', { tutar: TryYazi(net) })}
                    </Text>
                    {aliciBekliyor ? (
                      <View style={styles.yanitSatir}>
                        <Pressable
                          onPress={async () => {
                            const r = await TakasAliciYanit(teklif.id, true);
                            if (!r.ok) {
                              Alert.alert(t('ortak.hata'), r.hata);
                              return;
                            }
                            if (teklif.buyer_type === 'agency') {
                              Alert.alert(
                                t('takas.kabulEdildi'),
                                t('takas.ajansOdemeFormu'),
                                [
                                  {
                                    text: t('takas.paneleGit'),
                                    onPress: () =>
                                      router.push('/ajans/teklifler' as any),
                                  },
                                  { text: t('ortak.tamam') },
                                ],
                              );
                            } else if (teklif.seller_id) {
                              Alert.alert(
                                t('takas.kabulEdildi'),
                                t('takas.islemlerSohbet'),
                                [
                                  {
                                    text: t('takas.mesajaGit'),
                                    onPress: () =>
                                      void sohbetAc(
                                        teklif.seller_id,
                                        t('takas.kabulMesaji'),
                                        true,
                                      ),
                                  },
                                  { text: t('ortak.tamam') },
                                ],
                              );
                            }
                            void teklifleriAc();
                          }}
                        >
                          <Text style={styles.linkYazi}>{t('takas.kabul')}</Text>
                        </Pressable>
                        <Pressable
                          onPress={async () => {
                            const r = await TakasAliciYanit(teklif.id, false);
                            if (!r.ok) Alert.alert(t('ortak.hata'), r.hata);
                            else {
                              void refreshWallet();
                              void teklifleriAc();
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.linkYazi,
                              { color: RenkTokenlari.danger },
                            ]}
                          >
                            {t('takas.red')}
                          </Text>
                        </Pressable>
                        {mesajAgencyId || mesajUserId ? (
                          <Pressable onPress={ajansMesajAc}>
                            <Text style={styles.linkYazi}>{t('sekmeler.mesaj')}</Text>
                          </Pressable>
                        ) : null}
                        {mahkemeAcilabilir ? (
                          <Pressable onPress={mahkemeKur}>
                            <Text
                              style={[
                                styles.linkYazi,
                                { color: '#4DA3FF' },
                              ]}
                            >
                              {t('takas.mahkemeKur')}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.yanitSatir}>
                        {mesajAgencyId || mesajUserId ? (
                          <Pressable onPress={ajansMesajAc}>
                            <Text style={styles.linkYazi}>{t('takas.mesajlas')}</Text>
                          </Pressable>
                        ) : null}
                        {mahkemeAcilabilir ? (
                          <Pressable onPress={mahkemeKur}>
                            <Text
                              style={[
                                styles.linkYazi,
                                { color: '#4DA3FF' },
                              ]}
                            >
                              {t('takas.mahkemeKur')}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })
            )}
            <Pressable onPress={() => setMod('menu')}>
              <Text style={styles.geri}>{t('takas.geriOk')}</Text>
            </Pressable>
          </View>
        ) : null}
      </KlavyeScrollView>

      <Modal
        visible={taramaAcik}
        animationType="slide"
        presentationStyle="fullScreen"
        onShow={() => {
          taramaKilit.current = false;
        }}
      >
        <View style={[styles.taramaWrap, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.taramaBaslik}>{t('takas.qrTaramaBaslik')}</Text>
          <View style={styles.taramaCam}>
            {taramaAcik ? (
              <CameraView
                key={`cam-${taramaAcik}`}
                style={styles.taramaKamera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={qrOkundu}
              />
            ) : null}
            <View pointerEvents="none" style={styles.taramaOverlay}>
              <View style={styles.taramaKutu}>
                <View style={[styles.taramaKose, styles.taramaTL]} />
                <View style={[styles.taramaKose, styles.taramaTR]} />
                <View style={[styles.taramaKose, styles.taramaBL]} />
                <View style={[styles.taramaKose, styles.taramaBR]} />
              </View>
              <Text style={styles.taramaIpucu}>{t('takas.qrTaramaIpucu')}</Text>
            </View>
          </View>
          <Pressable
            style={styles.btnIkincil}
            onPress={() => setTaramaAcik(false)}
          >
            <Text style={styles.btnIkincilYazi}>{t('ortak.kapat')}</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: BoslukTokenlari.lg, gap: 12 },
  kart: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: 4,
  },
  marka: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  no: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontVariant: ['tabular-nums'],
    flex: 1,
    minWidth: 0,
  },
  noSatirKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ikonBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  meta: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  odemeNot: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  iadeNot: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.danger,
    fontSize: 11,
    lineHeight: 16,
  },
  btn: {
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnYazi: { ...TipografiTokenlari.body, color: '#fff', fontWeight: '800' },
  btnIkincil: {
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  btnIkincilYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  form: { gap: 10 },
  bolum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '800',
  },
  noSatir: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  noInput: { flex: 1 },
  kameraBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: RenkTokenlari.text,
  },
  readonly: { opacity: 0.85 },
  aliciDurum: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
  uyari: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
  },
  listeSatir: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 6,
  },
  listeAktif: {
    borderColor: RenkTokenlari.accent,
    backgroundColor: 'rgba(240,180,41,0.12)',
  },
  listeYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.text },
  teklifOnizleme: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  link: { marginTop: 6 },
  linkYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  geri: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 8,
  },
  yanitSatir: { flexDirection: 'row', gap: 16 },
  taramaWrap: {
    flex: 1,
    backgroundColor: RenkTokenlari.bg,
    padding: BoslukTokenlari.lg,
    gap: 12,
  },
  taramaBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  taramaCam: {
    width: '100%',
    height: 420,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  taramaKamera: {
    width: '100%',
    height: '100%',
  },
  taramaOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  taramaKutu: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  taramaKose: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: RenkTokenlari.accent,
  },
  taramaTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  taramaTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  taramaBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  taramaBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  taramaIpucu: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    marginTop: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
