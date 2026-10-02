import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useDil } from '../../src/i18n/DilSaglayici';
import { useCeviri } from '../../src/i18n/useCeviri';
import i18n from '../../src/i18n';
import { RtlYenidenBaslat } from '../../src/i18n/RtlUygula';
import { isRtlDil } from '../../src/i18n/rtl';
import {
  DilCozumle,
  DIL_ETIKETLERI,
  DESTEKLENEN_DILLER,
  type UygulamaDili,
} from '../../src/i18n/diller';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTema } from '../../src/tasarim-sistemi/tema/TemaSaglayici';

type BekleyenSecim =
  | { tur: 'manuel'; kod: UygulamaDili }
  | { tur: 'sistem'; kod: UygulamaDili };

/**
 * Dil seçimi — Sistem (cihaz/ülke) veya manuel sabit dil.
 */
export default function DilAyarlariEkrani() {
  const { palet } = useTema();
  const { t } = useCeviri();
  const { dil, dilModu, dilDegistir, sistemDiliniKullan } = useDil();
  const [bekleyen, setBekleyen] = useState<BekleyenSecim | null>(null);
  const [busy, setBusy] = useState(false);

  const kartMetin = useMemo(() => {
    if (!bekleyen) return null;
    const lng = bekleyen.kod;
    const tt = (key: string) => String(i18n.t(key, { lng }));
    return {
      baslik: tt('ayarlar.dilDemoBaslik'),
      govde: tt('ayarlar.dilDemoGovde'),
      onay: tt('ayarlar.dilDemoOnay'),
      iptal: tt('ortak.iptal'),
      dilAdi:
        bekleyen.tur === 'sistem'
          ? `${tt('ayarlar.sistemDiliniKullan')} · ${DIL_ETIKETLERI[lng]}`
          : DIL_ETIKETLERI[lng],
      rtlNot: isRtlDil(lng) ? tt('ayarlar.dilDemoRtlNot') : null,
    };
  }, [bekleyen]);

  const rtlSonrasiUyar = (hedef: UygulamaDili, reloadGerekli: boolean) => {
    if (!reloadGerekli) return;
    const lng = hedef;
    Alert.alert(
      String(i18n.t('ayarlar.dilSecBaslik', { lng })),
      String(i18n.t('ayarlar.rtlYenidenBaslat', { lng })),
      [
        {
          text: String(i18n.t('ortak.tamam', { lng })),
          onPress: () => {
            void RtlYenidenBaslat();
          },
        },
      ],
    );
  };

  const onayla = async () => {
    if (!bekleyen || busy) return;
    setBusy(true);
    try {
      const hedef = bekleyen.kod;
      const { reloadGerekli } =
        bekleyen.tur === 'sistem'
          ? await sistemDiliniKullan()
          : await dilDegistir(bekleyen.kod);
      setBekleyen(null);
      rtlSonrasiUyar(hedef, reloadGerekli);
    } finally {
      setBusy(false);
    }
  };

  const iptal = () => {
    if (busy) return;
    setBekleyen(null);
  };

  const secManuel = (kod: UygulamaDili) => {
    if (dilModu === 'MANUAL' && dil === kod) return;
    setBekleyen({ tur: 'manuel', kod });
  };

  const secSistem = () => {
    if (dilModu === 'SYSTEM') return;
    const kod = DilCozumle({ mod: 'SYSTEM' });
    setBekleyen({ tur: 'sistem', kod });
  };

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ayarlar-dil">
        <EkranBasligi
          title={t('ayarlar.dil')}
          subtitle={t('ayarlar.dilSecAlt')}
          fallbackHref="/ayarlar"
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.hint, { color: palet.textDim }]}>
            {t('ayarlar.dilKilitHint')}
          </Text>

          <Satir
            etiket={t('ayarlar.sistemDiliniKullan')}
            secili={dilModu === 'SYSTEM'}
            onPress={secSistem}
          />

          <View style={styles.ayrac} />

          {DESTEKLENEN_DILLER.map((kod) => (
            <Satir
              key={kod}
              etiket={DIL_ETIKETLERI[kod]}
              secili={dilModu === 'MANUAL' && dil === kod}
              onPress={() => secManuel(kod)}
            />
          ))}
        </ScrollView>

        <Modal
          visible={bekleyen != null && kartMetin != null}
          transparent
          animationType="fade"
          onRequestClose={iptal}
        >
          <Pressable style={styles.modalPerde} onPress={iptal}>
            <Pressable
              style={[styles.kart, { backgroundColor: RenkTokenlari.bgElevated }]}
              onPress={(e) => e.stopPropagation()}
            >
              {kartMetin ? (
                <>
                  <Text style={styles.kartBaslik}>{kartMetin.baslik}</Text>
                  <Text style={[styles.kartDil, { color: RenkTokenlari.primarySoft }]}>
                    {kartMetin.dilAdi}
                  </Text>
                  <Text style={[styles.kartGovde, { color: palet.textDim }]}>
                    {kartMetin.govde}
                  </Text>
                  {kartMetin.rtlNot ? (
                    <Text style={[styles.kartRtl, { color: palet.textMuted }]}>
                      {kartMetin.rtlNot}
                    </Text>
                  ) : null}
                  <View style={styles.kartAksiyonlar}>
                    <Pressable
                      onPress={iptal}
                      disabled={busy}
                      style={({ pressed }) => [
                        styles.btnIptal,
                        pressed && { opacity: 0.75 },
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.btnIptalYazi}>{kartMetin.iptal}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void onayla()}
                      disabled={busy}
                      style={({ pressed }) => [
                        styles.btnOnay,
                        pressed && { opacity: 0.88 },
                        busy && { opacity: 0.6 },
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.btnOnayYazi}>{kartMetin.onay}</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      </ModulHataSiniri>
    </Screen>
  );
}

function Satir({
  etiket,
  secili,
  onPress,
}: {
  etiket: string;
  secili: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.satir, secili && styles.satirSecili]}
      accessibilityRole="button"
      accessibilityState={{ selected: secili }}
    >
      <Text style={styles.satirText}>{etiket}</Text>
      {secili ? (
        <Ionicons
          name="checkmark-circle"
          size={22}
          color={RenkTokenlari.primary}
        />
      ) : (
        <View style={styles.bosCheck} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxl,
    gap: 4,
  },
  hint: {
    ...TipografiTokenlari.caption,
    marginBottom: BoslukTokenlari.lg,
    lineHeight: 18,
  },
  ayrac: { height: BoslukTokenlari.md },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.bgElevated,
    marginBottom: 6,
  },
  satirSecili: {
    borderWidth: 1,
    borderColor: RenkTokenlari.primary,
  },
  satirText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  bosCheck: { width: 22, height: 22 },
  modalPerde: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.xl,
  },
  kart: {
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    gap: BoslukTokenlari.sm,
  },
  kartBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  kartDil: {
    ...TipografiTokenlari.caption,
    fontWeight: '700',
    marginBottom: 4,
  },
  kartGovde: {
    ...TipografiTokenlari.body,
    lineHeight: 22,
    marginBottom: 4,
  },
  kartRtl: {
    ...TipografiTokenlari.caption,
    lineHeight: 18,
    marginBottom: 8,
  },
  kartAksiyonlar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: BoslukTokenlari.md,
  },
  btnIptal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.md,
    alignItems: 'center',
    backgroundColor: RenkTokenlari.pressFill,
  },
  btnIptalYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  btnOnay: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.md,
    alignItems: 'center',
    backgroundColor: RenkTokenlari.primary,
  },
  btnOnayYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },
});
