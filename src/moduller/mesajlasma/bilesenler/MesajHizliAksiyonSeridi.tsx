import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { useKlavyeYuksekligi } from '../../../bilesenler/klavye/useKlavyeYuksekligi';
import {
  HIZLI_AKSIYON_MAX,
  HizliAksiyonEkle,
  HizliAksiyonSil,
  HizliAksiyonlariGetir,
  type HizliAksiyonOge,
} from '../depolama/MesajHizliAksiyonDepolama';

const SAKLAMA_ANAHTAR = '@muta/mesaj_hizli_aksiyon_gizli';

type Props = {
  /** Ajans sohbetinde daha vurgulu */
  ajansMi?: boolean;
  onCuzdanNoPaylas: () => void;
  onIdPaylas: () => void;
  onMetinPaylas: (metin: string) => void;
  /** Ajans paket teklifi (Stripe) — ajans sohbetinde */
  onPaketTeklif?: () => void;
};

/**
 * WhatsApp tarzı hızlı paylaşım — sistem çipleri + kullanıcı ekledikleri.
 */
export function MesajHizliAksiyonSeridi({
  ajansMi,
  onCuzdanNoPaylas,
  onIdPaylas,
  onMetinPaylas,
  onPaketTeklif,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { yukseklik: klavyeH, acik: klavyeAcik } = useKlavyeYuksekligi();
  const [gizli, setGizli] = useState(false);
  const [hazir, setHazir] = useState(false);
  const [ozel, setOzel] = useState<HizliAksiyonOge[]>([]);
  const [ekleAcik, setEkleAcik] = useState(false);
  const [etiket, setEtiket] = useState('');
  const [metin, setMetin] = useState('');
  const [kaydediyor, setKaydediyor] = useState(false);

  const modalPadBottom =
    Math.max(insets.bottom, 12) +
    8 +
    (Platform.OS === 'android' && klavyeAcik ? klavyeH : 0);

  useEffect(() => {
    void (async () => {
      const [g, liste] = await Promise.all([
        AsyncStorage.getItem(SAKLAMA_ANAHTAR),
        HizliAksiyonlariGetir(),
      ]);
      setGizli(g === '1');
      setOzel(liste);
      setHazir(true);
    })();
  }, []);

  const kapat = useCallback(() => {
    setGizli(true);
    void AsyncStorage.setItem(SAKLAMA_ANAHTAR, '1');
  }, []);

  const ac = useCallback(() => {
    setGizli(false);
    void AsyncStorage.removeItem(SAKLAMA_ANAHTAR);
  }, []);

  const ekleKaydet = async () => {
    if (kaydediyor) return;
    setKaydediyor(true);
    const r = await HizliAksiyonEkle({ etiket, metin });
    setKaydediyor(false);
    if (!r.ok) {
      Alert.alert(
        t('mesajlar.hizliEkleBaslik'),
        r.hata === 'limit'
          ? t('mesajlar.hizliLimit', { n: HIZLI_AKSIYON_MAX })
          : t('mesajlar.hizliBos'),
      );
      return;
    }
    setOzel(r.liste);
    setEtiket('');
    setMetin('');
    setEkleAcik(false);
  };

  const ozelSil = (oge: HizliAksiyonOge) => {
    Alert.alert(t('mesajlar.hizliSilBaslik'), oge.etiket, [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('ortak.sil'),
        style: 'destructive',
        onPress: () => {
          void HizliAksiyonSil(oge.id).then(setOzel);
        },
      },
    ]);
  };

  if (!hazir) return null;

  if (gizli) {
    return (
      <Pressable style={styles.gizliSatir} onPress={ac}>
        <Ionicons name="apps-outline" size={14} color={RenkTokenlari.textDim} />
        <Text style={styles.gizliYazi}>{t('mesajlar.hizliGoster')}</Text>
      </Pressable>
    );
  }

  return (
    <>
      <View style={[styles.wrap, ajansMi && styles.wrapAjans]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.cip} onPress={onCuzdanNoPaylas}>
            <Ionicons name="wallet-outline" size={15} color={RenkTokenlari.mint} />
            <Text style={styles.cipYazi}>{t('mesajlar.cuzdanNoPaylas')}</Text>
          </Pressable>
          <Pressable style={styles.cip} onPress={onIdPaylas}>
            <Ionicons
              name="id-card-outline"
              size={15}
              color={RenkTokenlari.primarySoft}
            />
            <Text style={styles.cipYazi}>{t('mesajlar.idPaylas')}</Text>
          </Pressable>
          {ajansMi && onPaketTeklif ? (
            <Pressable style={[styles.cip, styles.cipTeklif]} onPress={onPaketTeklif}>
              <Ionicons name="card-outline" size={15} color="#F5C462" />
              <Text style={styles.cipYazi}>{t('cuzdanX.paketTeklifCip')}</Text>
            </Pressable>
          ) : null}
          {ozel.map((oge) => (
            <Pressable
              key={oge.id}
              style={styles.cip}
              onPress={() => onMetinPaylas(oge.metin)}
              onLongPress={() => ozelSil(oge)}
              delayLongPress={350}
              accessibilityHint={t('mesajlar.hizliSilIpucu')}
            >
              <Ionicons
                name="flash-outline"
                size={15}
                color={RenkTokenlari.accent}
              />
              <Text style={styles.cipYazi} numberOfLines={1}>
                {oge.etiket}
              </Text>
            </Pressable>
          ))}
          {ozel.length < HIZLI_AKSIYON_MAX ? (
            <Pressable
              style={[styles.cip, styles.cipEkle]}
              onPress={() => setEkleAcik(true)}
              accessibilityLabel={t('mesajlar.hizliEkle')}
            >
              <Ionicons name="add" size={16} color={RenkTokenlari.mint} />
              <Text style={[styles.cipYazi, styles.cipEkleYazi]}>
                {t('mesajlar.hizliEkle')}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
        <Pressable
          style={styles.kapat}
          onPress={kapat}
          hitSlop={8}
          accessibilityLabel={t('mesajlar.hizliGizle')}
        >
          <Ionicons name="close" size={16} color={RenkTokenlari.textDim} />
        </Pressable>
      </View>

      <Modal
        visible={ekleAcik}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setEkleAcik(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKlavye}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setEkleAcik(false)}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.kapat')}
          />
          <View style={[styles.modal, { paddingBottom: modalPadBottom }]}>
            <Text style={styles.modalBaslik}>{t('mesajlar.hizliEkleBaslik')}</Text>
            <Text style={styles.modalAlt}>{t('mesajlar.hizliEkleAlt')}</Text>
            <TextInput
              value={etiket}
              onChangeText={setEtiket}
              placeholder={t('mesajlar.hizliEtiketPh')}
              placeholderTextColor={RenkTokenlari.textDim}
              style={styles.input}
              maxLength={40}
              autoFocus
            />
            <TextInput
              value={metin}
              onChangeText={setMetin}
              placeholder={t('mesajlar.hizliMetinPh')}
              placeholderTextColor={RenkTokenlari.textDim}
              style={[styles.input, styles.inputCoklu]}
              maxLength={2000}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalAksiyon}>
              <Pressable
                style={styles.modalIptal}
                onPress={() => setEkleAcik(false)}
              >
                <Text style={styles.modalIptalYazi}>{t('ortak.vazgec')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalKaydet,
                  (!etiket.trim() || !metin.trim() || kaydediyor) &&
                    styles.modalKaydetDisabled,
                ]}
                onPress={() => void ekleKaydet()}
                disabled={!etiket.trim() || !metin.trim() || kaydediyor}
              >
                <Text style={styles.modalKaydetYazi}>{t('ortak.ekle')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.sm,
    paddingTop: 6,
    gap: 4,
  },
  wrapAjans: {
    backgroundColor: 'rgba(34,197,94,0.06)',
  },
  scroll: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 8,
    alignItems: 'center',
  },
  cip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    maxWidth: 180,
  },
  cipEkle: {
    borderStyle: 'dashed',
    borderColor: RenkTokenlari.mint,
    backgroundColor: 'rgba(90,220,200,0.08)',
  },
  cipTeklif: {
    borderColor: 'rgba(245, 196, 98, 0.45)',
    backgroundColor: 'rgba(245, 196, 98, 0.1)',
  },
  cipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  cipEkleYazi: {
    color: RenkTokenlari.mint,
  },
  kapat: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gizliSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 6,
  },
  gizliYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  modalKlavye: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modal: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  modalBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 17,
  },
  modalAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: 4,
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  inputCoklu: {
    minHeight: 88,
  },
  modalAksiyon: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalIptal: {
    flex: 1,
    height: 44,
    borderRadius: YaricapTokenlari.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  modalIptalYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  modalKaydet: {
    flex: 1.2,
    height: 44,
    borderRadius: YaricapTokenlari.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primarySoft,
  },
  modalKaydetDisabled: { opacity: 0.5 },
  modalKaydetYazi: {
    ...TipografiTokenlari.body,
    color: '#12040C',
    fontWeight: '800',
  },
});
