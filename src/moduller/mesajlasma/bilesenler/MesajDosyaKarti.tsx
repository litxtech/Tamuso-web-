import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DosyaMimeTahmin,
  UzakDosyayiIndirVePaylas,
} from '../islemler/MesajDosyaIndir';
import { MedyaUriGuvenli } from '../yardimcilar/MedyaUriGecerliMi';
import { mesajKartCamStil, MesajKartTokenlari } from '../tasarim/MesajKartTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  mediaUrl?: string | null;
  fileName?: string | null;
  mime?: string | null;
  body?: string | null;
  mine: boolean;
  onLongPress?: () => void;
};

export function MesajDosyaKarti({
  mediaUrl,
  fileName,
  mime,
  body,
  mine,
  onLongPress,
}: Props) {
  const { t } = useCeviri();
  const [busy, setBusy] = useState(false);
  const uri = MedyaUriGuvenli(mediaUrl);
  const ad = (fileName || body || 'dosya.pdf').trim() || 'dosya.pdf';
  const tip = DosyaMimeTahmin(ad, mime);

  const indir = async () => {
    if (!uri || busy) return;
    setBusy(true);
    try {
      await UzakDosyayiIndirVePaylas(uri, ad, {
        mimeType: tip,
        dialogTitle: t('mesajlar.indir'),
      });
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('mesajlar.indirBasarisiz'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={300}
      style={[
        styles.kart,
        mesajKartCamStil(mine),
        mine ? styles.mine : styles.theirs,
      ]}
    >
      <View style={styles.ust}>
        <View style={styles.ikon}>
          <Ionicons name="document-text" size={22} color={RenkTokenlari.primarySoft} />
        </View>
        <View style={styles.metin}>
          <Text style={styles.ad} numberOfLines={2}>
            {ad}
          </Text>
          {body && body !== ad ? (
            <Text style={styles.alt} numberOfLines={2}>
              {body}
            </Text>
          ) : (
            <Text style={styles.alt}>PDF</Text>
          )}
        </View>
      </View>
      <Pressable
        style={styles.indirBtn}
        onPress={() => void indir()}
        disabled={!uri || busy}
        accessibilityRole="button"
        accessibilityLabel={t('mesajlar.indir')}
      >
        {busy ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={styles.indirYazi}>{t('mesajlar.indir')}</Text>
          </>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: {
    minWidth: 220,
    maxWidth: 280,
    padding: MesajKartTokenlari.padding,
    borderRadius: MesajKartTokenlari.radius,
    gap: 10,
  },
  mine: {},
  theirs: {},
  ust: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  ikon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  metin: { flex: 1 },
  ad: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: 2,
  },
  indirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  indirYazi: {
    ...TipografiTokenlari.caption,
    color: '#04140C',
    fontWeight: '800',
  },
});
