import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminStil } from '../../admin/bilesenler/AdminStil';
import { useCeviri } from '../../../i18n/useCeviri';
import { useTema } from '../../../tasarim-sistemi/tema/TemaSaglayici';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  BiyometriDurumunaAboneOl,
  BiyometriIleDogrula,
  BiyometriTercihOnbellegi,
  BiyometriTercihiniOku,
  BiyometriTercihiniYaz,
  BiyometriYeteneginiOku,
  BiyometriYontemAnahtari,
  type BiyometriYetenegi,
} from './BiyometriKilidi';

const BOS: BiyometriYetenegi = {
  uygun: false,
  donanim: false,
  kayitli: false,
  yuz: false,
  parmak: false,
};

function useBiyometriAnahtar() {
  const { t } = useCeviri();
  const [hazir, setHazir] = useState(false);
  const [yetenek, setYetenek] = useState<BiyometriYetenegi>(BOS);
  const [acik, setAcik] = useState(BiyometriTercihOnbellegi() === true);
  const [mesgul, setMesgul] = useState(false);

  const yenile = useCallback(async () => {
    if (Platform.OS === 'web') {
      setHazir(true);
      return;
    }
    const [sonrakiYetenek, tercih] = await Promise.all([
      BiyometriYeteneginiOku(),
      BiyometriTercihiniOku(),
    ]);
    setYetenek(sonrakiYetenek);
    setAcik(tercih);
    setHazir(true);
  }, []);

  useEffect(() => {
    void yenile();
    return BiyometriDurumunaAboneOl(() => {
      setAcik(BiyometriTercihOnbellegi() === true);
    });
  }, [yenile]);

  const degistir = useCallback(
    async (istenen: boolean) => {
      if (mesgul || Platform.OS === 'web') return;
      const ad = t(BiyometriYontemAnahtari(yetenek));
      if (!yetenek.donanim) {
        Alert.alert(ad, t('biyometri.cihazDesteklemiyor'));
        return;
      }
      if (!yetenek.kayitli) {
        Alert.alert(ad, t('biyometri.kayitYok'));
        return;
      }
      setMesgul(true);
      try {
        const sonuc = await BiyometriIleDogrula(t('biyometri.prompt'), t('ortak.iptal'));
        if (!sonuc.ok) {
          if (!sonuc.iptal) Alert.alert(ad, t('biyometri.basarisiz'));
          return;
        }
        await BiyometriTercihiniYaz(istenen);
        setAcik(istenen);
      } catch {
        Alert.alert(ad, t('biyometri.basarisiz'));
      } finally {
        setMesgul(false);
      }
    },
    [mesgul, t, yetenek],
  );

  return { hazir, yetenek, acik, mesgul, degistir, t };
}

function BiyometriGovde({ kart }: { kart: boolean }) {
  const { palet } = useTema();
  const { t } = useCeviri();
  const durum = useBiyometriAnahtar();
  if (Platform.OS === 'web' || !durum.hazir || !durum.yetenek.donanim) return null;

  const baslik = durum.t(BiyometriYontemAnahtari(durum.yetenek));
  const satir = (
    <View style={[styles.satir, !kart && styles.ayirici]}>
      <View style={styles.ikon}>
        <Ionicons
          name={
            durum.yetenek.parmak && !durum.yetenek.yuz
              ? 'finger-print-outline'
              : 'scan-outline'
          }
          size={18}
          color={RenkTokenlari.primarySoft}
        />
      </View>
      <View style={styles.yazi}>
        <Text style={styles.etiket}>{baslik}</Text>
        <Text style={styles.ipucu}>{durum.t('biyometri.hint')}</Text>
      </View>
      <Switch
        value={durum.acik}
        disabled={durum.mesgul}
        onValueChange={(deger) => void durum.degistir(deger)}
        trackColor={{ true: RenkTokenlari.primary, false: RenkTokenlari.border }}
        thumbColor={palet.bgElevated}
      />
    </View>
  );

  if (!kart) return satir;

  return (
    <>
      <Text style={AdminStil.sectionLabel}>{t('biyometri.bolum')}</Text>
      <View style={styles.kart}>{satir}</View>
    </>
  );
}

export function BiyometriAyarSatiri() {
  return <BiyometriGovde kart={false} />;
}

export function BiyometriGuvenlikKarti() {
  return <BiyometriGovde kart />;
}

const styles = StyleSheet.create({
  kart: {
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    overflow: 'hidden',
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    minHeight: 52,
  },
  ayirici: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  ikon: {
    width: 32,
    height: 32,
    borderRadius: YaricapTokenlari.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 64, 145, 0.12)',
  },
  yazi: { flex: 1, gap: 2 },
  etiket: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  ipucu: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
