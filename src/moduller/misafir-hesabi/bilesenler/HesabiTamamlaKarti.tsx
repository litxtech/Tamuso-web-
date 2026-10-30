import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { TextField } from '../../../components/TextField';
import { GradientButton } from '../../../components/GradientButton';
import { KlavyeKapatan } from '../../../components/KlavyeKapatan';
import { KlavyeGuvenliAlan } from '../../../bilesenler/klavye/KlavyeGuvenliAlan';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { useAuth, useWallet } from '../../../contexts/AuthContext';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { MisafirHesabiTamamla, EmailiTemizle } from '../islemler/MisafirHesabiTamamla';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
};

/**
 * Guest state-changing islemde gosterilen modern hesap tamamlama karti.
 */
export function HesabiTamamlaKarti({ visible, onClose, onCompleted }: Props) {
  const { t } = useCeviri();
  const { misafirBayraginiKaldir, refreshProfile } = useAuth();
  const { refreshWallet } = useWallet();
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    setHata(null);
    if (!ad.trim() || !soyad.trim()) {
      setHata(t('auth.adSoyadGerekli'));
      return;
    }
    if (password.length < 6) {
      setHata(t('auth.sifreMinKarakter'));
      return;
    }
    setLoading(true);
    const sonuc = await MisafirHesabiTamamla({ ad, soyad, email, password });
    if (!sonuc.ok) {
      setLoading(false);
      setHata(sonuc.hata ?? t('auth.tamamlamaBasarisiz'));
      return;
    }

    const mail = EmailiTemizle(email);
    if (sonuc.needsConfirm) {
      setLoading(false);
      onClose();
      router.push({
        pathname: '/(auth)/dogrula-kod',
        params: { email: mail, amac: 'email_change' },
      });
      return;
    }

    // UI anında misafir kilidini kaldır; sonra profil/cüzdanı tazele
    misafirBayraginiKaldir();
    await Promise.all([refreshProfile(), refreshWallet()]);
    setLoading(false);
    await onCompleted();
    onClose();
  };

  return (
    <TamusoModal
      visible={visible}
      onClose={onClose}
      animationType="slide"
      placement="bottom"
    >
      <KlavyeGuvenliAlan
        style={styles.sheetWrap}
        offset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}
          bounces={false}
        >
          <KlavyeKapatan>
            <View style={styles.card}>
              <Text style={styles.title}>{t('auth.hesabiniTamamla')}</Text>
              <Text style={styles.sub}>{t('auth.hesabiniTamamlaAlt')}</Text>
              <TextField
                label={t('auth.ad')}
                value={ad}
                onChangeText={setAd}
                placeholder={t('auth.ad')}
              />
              <TextField
                label={t('auth.soyad')}
                value={soyad}
                onChangeText={setSoyad}
                placeholder={t('auth.soyad')}
              />
              <TextField
                label={t('auth.eposta')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.epostaPlaceholder')}
              />
              <TextField
                label={t('auth.sifre')}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.sifreEnAz')}
                blurOnSubmit
              />
              {hata ? <Text style={styles.error}>{hata}</Text> : null}
              <GradientButton
                title={t('auth.hesabiOlustur')}
                onPress={kaydet}
                loading={loading}
              />
              <GradientButton
                title={t('auth.simdiDegil')}
                variant="ghost"
                onPress={onClose}
              />
            </View>
          </KlavyeKapatan>
        </ScrollView>
      </KlavyeGuvenliAlan>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  /** flexGrow:0 → KlavyeGuvenliAlan varsayılan flex:1 uygulamamalı (Android height:0 bug) */
  sheetWrap: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: '88%',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 18,
    borderRadius: YaricapTokenlari.xl,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 12,
    zIndex: 3,
    elevation: 28,
  },
  title: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
  },
  sub: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  error: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
  },
});
