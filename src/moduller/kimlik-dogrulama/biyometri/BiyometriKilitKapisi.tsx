import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  BiyometriDurumunaAboneOl,
  BiyometriIleDogrula,
  BiyometriOturumAcikMi,
  BiyometriOturumunuAc,
  BiyometriOturumunuKilitle,
  BiyometriTercihOnbellegi,
  BiyometriTercihiniOku,
  BiyometriTercihiniYaz,
  BiyometriYeteneginiOku,
  BiyometriYontemAnahtari,
  type BiyometriYetenegi,
} from './BiyometriKilidi';

const BOS_YETENEK: BiyometriYetenegi = {
  uygun: false,
  donanim: false,
  kayitli: false,
  yuz: false,
  parmak: false,
};

/**
 * Oturum açıkken tercih açıksa içeriği kapatır.
 * Face ID penceresi uygulamayı `inactive` yaptığı için kilit yalnızca
 * gerçek arka plana geçişte yeniden kurulur.
 */
export function BiyometriKilitKapisi() {
  const { session } = useAuth();
  const { t } = useCeviri();
  const [tercih, setTercih] = useState<boolean | null>(BiyometriTercihOnbellegi());
  const [acik, setAcik] = useState(BiyometriOturumAcikMi());
  const [yetenek, setYetenek] = useState<BiyometriYetenegi>(BOS_YETENEK);
  const [mesgul, setMesgul] = useState(false);
  const ucusta = useRef(false);
  const otomatikIstek = useRef(false);
  const oturumVar = !!session;

  useEffect(() => {
    return BiyometriDurumunaAboneOl(() => {
      setTercih(BiyometriTercihOnbellegi());
      setAcik(BiyometriOturumAcikMi());
    });
  }, []);

  useEffect(() => {
    if (tercih !== null) return;
    void BiyometriTercihiniOku().then((deger) => setTercih(deger));
  }, [tercih]);

  useEffect(() => {
    if (!tercih) return;
    void BiyometriYeteneginiOku().then(setYetenek);
  }, [tercih]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const alt = AppState.addEventListener('change', (sonraki) => {
      if (sonraki !== 'background') return;
      if (BiyometriTercihOnbellegi() !== true) return;
      BiyometriOturumunuKilitle();
    });
    return () => alt.remove();
  }, []);

  const yontem = t(BiyometriYontemAnahtari(yetenek));

  const dogrula = useCallback(async () => {
    if (ucusta.current) return;
    ucusta.current = true;
    setMesgul(true);
    try {
      const sonuc = await BiyometriIleDogrula(t('biyometri.prompt'), t('ortak.iptal'));
      if (sonuc.ok) {
        BiyometriOturumunuAc();
        return;
      }
      if (
        sonuc.kod === 'not_enrolled' ||
        sonuc.kod === 'not_available' ||
        sonuc.kod === 'passcode_not_set'
      ) {
        await BiyometriTercihiniYaz(false);
        BiyometriOturumunuAc();
      }
    } finally {
      ucusta.current = false;
      setMesgul(false);
    }
  }, [t]);

  const kilitli = tercih === true && oturumVar && !acik;

  useEffect(() => {
    if (!kilitli) {
      otomatikIstek.current = false;
      return;
    }
    if (otomatikIstek.current) return;
    otomatikIstek.current = true;
    void dogrula();
  }, [dogrula, kilitli]);

  if (Platform.OS === 'web' || !kilitli) return null;

  return (
    <View style={styles.perde} pointerEvents="auto">
        <View style={styles.icerik}>
          <View style={styles.ikon}>
            <Ionicons
              name={yetenek.parmak && !yetenek.yuz ? 'finger-print-outline' : 'scan-outline'}
              size={36}
              color={RenkTokenlari.primarySoft}
            />
          </View>
          <Text style={styles.baslik}>{t('biyometri.kilitBaslik')}</Text>
          <Text style={styles.alt}>
            {t('biyometri.kilitAlt', { yontem })}
          </Text>
          <Pressable
            style={[styles.dugme, mesgul && styles.dugmePasif]}
            onPress={() => void dogrula()}
            disabled={mesgul}
          >
            <Text style={styles.dugmeYazi}>{t('biyometri.kilidiAc')}</Text>
          </Pressable>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  perde: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
    backgroundColor: RenkTokenlari.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: BoslukTokenlari.xl,
  },
  icerik: {
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    maxWidth: 320,
  },
  ikon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 64, 145, 0.12)',
    marginBottom: BoslukTokenlari.sm,
  },
  baslik: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    textAlign: 'center',
  },
  alt: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  dugme: {
    marginTop: BoslukTokenlari.sm,
    minHeight: 48,
    paddingHorizontal: BoslukTokenlari.xl,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dugmePasif: { opacity: 0.6 },
  dugmeYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
});
