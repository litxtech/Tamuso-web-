import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { GradientButton } from '../../src/components/GradientButton';
import { HostBasvurusuOlustur } from '../../src/moduller/hostlar/islemler/HostBasvuruIslemleri';
import { useCeviri } from '../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

/** Ajans davet linki — kod düz yazı değil, bu sayfayı açar. */
export default function AjansKatilEkrani() {
  const { t } = useCeviri();
  const params = useLocalSearchParams<{ kod?: string }>();
  const kod = (Array.isArray(params.kod) ? params.kod[0] : params.kod ?? '')
    .trim()
    .toUpperCase();
  const [busy, setBusy] = useState(false);

  const katil = () => {
    if (!kod || busy) return;
    void (async () => {
      setBusy(true);
      const r = await HostBasvurusuOlustur({
        path: 'join_agency',
        inviteCode: kod,
      });
      setBusy(false);
      if (!r.ok) {
        Alert.alert(t('ajans.alertDavet'), r.hata ?? t('mesajlar.basvuruGonderilemedi'));
        return;
      }
      Alert.alert(t('mesajlar.basvuruGonderildi'), t('mesajlar.basvuruGonderildiBody'), [
        { text: t('mesajlar.panelGit'), onPress: () => router.replace('/ajans/uye' as any) },
      ]);
    })();
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi title={t('ajans.katilBaslik')} subtitle={t('ajans.katilAlt')} />
      <View style={styles.govde}>
        <Text style={styles.kod}>{kod || '—'}</Text>
        <GradientButton
          title={t('host.ajansaKatil')}
          onPress={katil}
          loading={busy}
          disabled={!kod}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  govde: {
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.lg,
  },
  kod: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1,
  },
});
