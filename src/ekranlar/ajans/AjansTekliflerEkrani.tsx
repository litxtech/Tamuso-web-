import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { EkranBasligi } from '../../components/EkranBasligi';
import { useCeviri } from '../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../i18n/diller';
import { KlavyeScrollView } from '../../bilesenler/klavye/KlavyeScrollView';
import { useAuth, useWallet } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DepoyaMedyaYukle } from '../../ortak/medya/DepoyaMedyaYukle';
import {
  TakasAliciYanit,
  TakasDekontUrl,
  TakasDekontYukle,
  TakasOdemeBilgisiKaydet,
  TakasTekliflerimiGetir,
} from '../../moduller/cuzdan/takas/CuzdanTakasIslemleri';
import {
  TAKAS_DURUM_ETIKET,
  type CoinTradeOffer,
} from '../../moduller/cuzdan/takas/CuzdanTakasTipleri';
import { ProfilMedyaBuyutucu } from '../../moduller/kullanici-profili/bilesenler/ProfilMedyaBuyutucu';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AjansTekliflerEkrani() {
  const { t, dil } = useCeviri();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshWallet } = useWallet();
  const [liste, setListe] = useState<CoinTradeOffer[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formTeklif, setFormTeklif] = useState<CoinTradeOffer | null>(null);
  const [satinAlinan, setSatinAlinan] = useState('');
  const [odemeKaynak, setOdemeKaynak] = useState('');
  const [buyutUri, setBuyutUri] = useState<string | null>(null);

  const localeTag = DIL_LOCALE_MAP[dil];

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const all = await TakasTekliflerimiGetir();
      setListe(all.filter((o) => o.buyer_type === 'agency' && o.buyer_agency_id));
    } catch {
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const yanitla = (offer: CoinTradeOffer, accept: boolean) => {
    Alert.alert(
      accept ? t('ajans.teklifKabulEt') : t('ajans.teklifReddet'),
      `${Number(offer.coins).toLocaleString(localeTag)} coin`,
      [
        { text: t('ajans.vazgec'), style: 'cancel' },
        {
          text: accept ? t('ajans.kabul') : t('ajans.red'),
          style: accept ? 'default' : 'destructive',
          onPress: () => {
            void (async () => {
              setBusyId(offer.id);
              const r = await TakasAliciYanit(offer.id, accept);
              setBusyId(null);
              if (!r.ok) {
                Alert.alert(t('ajans.hata'), r.hata);
                return;
              }
              if (accept) {
                setFormTeklif({ ...offer, status: 'pending_payment_info' });
                setSatinAlinan(String(offer.coins));
                setOdemeKaynak('');
              } else {
                void refreshWallet();
              }
              await yukle();
            })();
          },
        },
      ],
    );
  };

  const odemeKaydet = async () => {
    if (!formTeklif) return;
    const n = Math.floor(Number(satinAlinan));
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert(t('ajans.form'), t('ajans.formCoinGerekli'));
      return;
    }
    if (odemeKaynak.trim().length < 3) {
      Alert.alert(t('ajans.form'), t('ajans.formKaynakGerekli'));
      return;
    }
    setBusyId(formTeklif.id);
    const r = await TakasOdemeBilgisiKaydet({
      offerId: formTeklif.id,
      coinsBought: n,
      paymentSource: odemeKaynak,
    });
    setBusyId(null);
    if (!r.ok) {
      Alert.alert(t('ajans.form'), r.hata);
      return;
    }
    Alert.alert(t('ajans.kaydedildi'), t('ajans.kaydedildiBody'));
    setFormTeklif(null);
    await yukle();
  };

  const dekontYukle = async (offer: CoinTradeOffer) => {
    const uid = user?.id;
    if (!uid) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('ajans.izin'), t('ajans.dekontIzin'));
      return;
    }
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (pick.canceled || !pick.assets[0]?.uri) return;

    setBusyId(offer.id);
    try {
      const path = `${uid}/receipt-${offer.id}-${Date.now()}.jpg`;
      const up = await DepoyaMedyaYukle(supabase, {
        bucket: 'trade-receipts',
        path,
        uri: pick.assets[0].uri,
        mime: 'image/jpeg',
        tur: 'image',
      });
      if (!up.ok) {
        Alert.alert(t('ajans.dekont'), up.hata ?? t('ajans.yuklenemedi'));
        return;
      }
      const r = await TakasDekontYukle({ offerId: offer.id, receiptPath: path });
      if (!r.ok) {
        Alert.alert(t('ajans.dekont'), r.hata);
        return;
      }
      Alert.alert(t('ajans.tamam'), t('ajans.dekontYuklendi'));
      await yukle();
    } finally {
      setBusyId(null);
    }
  };

  const dekontGor = async (path: string) => {
    const url = await TakasDekontUrl(path);
    if (!url) {
      Alert.alert(t('ajans.dekont'), t('ajans.acilamadi'));
      return;
    }
    setBuyutUri(url);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <EkranBasligi
        title={t('ajans.teklifler')}
        subtitle={t('ajans.teklifAlt')}
        fallbackHref="/ajans"
      />
      <KlavyeScrollView
        contentContainerStyle={[
          styles.pad,
          { paddingBottom: insets.bottom + 24 },
        ]}
        ekstraPad={40}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        {yukleniyor && !liste.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !liste.length ? (
          <Text style={styles.bos}>{t('ajans.teklifBos')}</Text>
        ) : (
          liste.map((offer) => {
            const deadline = offer.receipt_deadline_at
              ? new Date(offer.receipt_deadline_at)
              : null;
            const kalanSaat =
              deadline && offer.status === 'pending_receipt'
                ? Math.max(
                    0,
                    Math.round((deadline.getTime() - Date.now()) / 3600000),
                  )
                : null;
            return (
              <View key={offer.id} style={styles.kart}>
                <Text style={styles.baslik}>
                  {Number(offer.coins).toLocaleString(localeTag)} coin
                </Text>
                <Text style={styles.meta}>
                  {TAKAS_DURUM_ETIKET[offer.status] ?? offer.status}
                </Text>
                {offer.note ? (
                  <Text style={styles.teklifNot}>{offer.note}</Text>
                ) : null}
                {offer.payment_source ? (
                  <Text style={styles.meta}>
                    {t('ajans.satinAlinan', {
                      coins: offer.payment_coins_bought ?? '—',
                      kaynak: offer.payment_source,
                    })}
                  </Text>
                ) : null}
                {kalanSaat != null ? (
                  <Text style={[styles.meta, { color: RenkTokenlari.accent }]}>
                    {t('ajans.dekontKalan', { saat: kalanSaat })}
                  </Text>
                ) : null}
                {offer.status === 'receipt_overdue' ? (
                  <Text style={[styles.meta, { color: RenkTokenlari.danger }]}>
                    {t('ajans.dekontSureAsildi')}
                  </Text>
                ) : null}

                {offer.status === 'pending_buyer' ? (
                  <View style={styles.aksiyon}>
                    <Pressable
                      disabled={busyId === offer.id}
                      onPress={() => yanitla(offer, true)}
                    >
                      <Text style={[styles.link, { color: RenkTokenlari.mint }]}>
                        {t('ajans.kabul')}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={busyId === offer.id}
                      onPress={() => yanitla(offer, false)}
                    >
                      <Text
                        style={[styles.link, { color: RenkTokenlari.danger }]}
                      >
                        {t('ajans.red')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {offer.status === 'pending_payment_info' ? (
                  <Pressable
                    style={styles.btn}
                    onPress={() => {
                      setFormTeklif(offer);
                      setSatinAlinan(String(offer.coins));
                      setOdemeKaynak(offer.payment_source ?? '');
                    }}
                  >
                    <Text style={styles.btnYazi}>{t('ajans.odemeFormuDoldur')}</Text>
                  </Pressable>
                ) : null}

                {offer.status === 'pending_receipt' ||
                offer.status === 'receipt_overdue' ? (
                  <Pressable
                    style={styles.btn}
                    disabled={busyId === offer.id}
                    onPress={() => void dekontYukle(offer)}
                  >
                    <Text style={styles.btnYazi}>{t('ajans.dekontYukle')}</Text>
                  </Pressable>
                ) : null}

                {offer.receipt_path ? (
                  <Pressable onPress={() => void dekontGor(offer.receipt_path!)}>
                    <Text style={styles.link}>{t('ajans.dekontuGor')}</Text>
                  </Pressable>
                ) : null}

                <Text style={styles.tarih}>
                  {new Date(offer.created_at).toLocaleString(localeTag)}
                </Text>
              </View>
            );
          })
        )}
      </KlavyeScrollView>

      <Modal visible={!!formTeklif} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <KlavyeScrollView
            contentContainerStyle={styles.modalScroll}
            ekstraPad={32}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalKart}>
              <Text style={styles.baslik}>{t('ajans.odemeBilgisi')}</Text>
              <Text style={styles.meta}>
                {t('ajans.teklifCoin', {
                  coins: Number(formTeklif?.coins ?? 0).toLocaleString(localeTag),
                })}
              </Text>
              <TextInput
                style={styles.input}
                value={satinAlinan}
                onChangeText={setSatinAlinan}
                keyboardType="number-pad"
                placeholder={t('ajans.phCoinAdet')}
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={odemeKaynak}
                onChangeText={setOdemeKaynak}
                multiline
                placeholder={t('ajans.phOdemeKaynak')}
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <Text style={styles.uyari}>{t('ajans.odemeUyari')}</Text>
              <Pressable style={styles.btn} onPress={() => void odemeKaydet()}>
                <Text style={styles.btnYazi}>{t('ajans.kaydetDekont')}</Text>
              </Pressable>
              <Pressable onPress={() => setFormTeklif(null)}>
                <Text
                  style={[styles.link, { textAlign: 'center', marginTop: 8 }]}
                >
                  {t('ajans.vazgec')}
                </Text>
              </Pressable>
            </View>
          </KlavyeScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <ProfilMedyaBuyutucu
        uri={buyutUri}
        onKapat={() => setBuyutUri(null)}
        tur="cover"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: BoslukTokenlari.lg, gap: 12 },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  kart: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 6,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  meta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  teklifNot: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 4,
  },
  tarih: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  aksiyon: { flexDirection: 'row', gap: 16, marginTop: 8 },
  link: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  btn: {
    marginTop: 8,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnYazi: { ...TipografiTokenlari.caption, color: '#fff', fontWeight: '800' },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalKart: {
    backgroundColor: RenkTokenlari.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
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
  uyari: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    lineHeight: 18,
  },
});
