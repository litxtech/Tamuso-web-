import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';
import { GradientButton } from '../../../components/GradientButton';
import { TextField } from '../../../components/TextField';
import {
  KlavyeFocusKaydir,
  type KlavyeScrollHandle,
} from '../../../bilesenler/klavye/KlavyeScrollView';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { HostBolumBasligi } from './HostBolumBasligi';

type Yol = 'bagimsiz' | 'ajans';

type Madde = { metin: CeviriAnahtari; tur: 'arti' | 'bilgi' };

const YOLLAR: Record<
  Yol,
  {
    icon: keyof typeof Ionicons.glyphMap;
    baslik: CeviriAnahtari;
    ozet: CeviriAnahtari;
    maddeler: Madde[];
  }
> = {
  bagimsiz: {
    icon: 'person-outline',
    baslik: 'host.yolBagimsizBaslik',
    ozet: 'host.yolBagimsizOzet',
    maddeler: [
      { metin: 'host.yolBagimsizMadde1', tur: 'arti' },
      { metin: 'host.yolBagimsizMadde2', tur: 'arti' },
      { metin: 'host.yolBagimsizMadde3', tur: 'arti' },
    ],
  },
  ajans: {
    icon: 'business-outline',
    baslik: 'host.yolAjansBaslik',
    ozet: 'host.yolAjansOzet',
    maddeler: [
      { metin: 'host.yolAjansMadde1', tur: 'arti' },
      { metin: 'host.yolAjansMadde2', tur: 'bilgi' },
      { metin: 'host.yolAjansMadde3', tur: 'bilgi' },
    ],
  },
};

type Props = {
  /** sadeceAjans: zaten bağımsız host olan kullanıcıya ajansa geçiş */
  mod: 'tam' | 'sadeceAjans';
  islem: Yol | null;
  davetKodu: string;
  davetKoduDegisti: (deger: string) => void;
  onBagimsiz: () => void;
  onAjans: () => void;
  scrollRef: React.RefObject<KlavyeScrollHandle | null>;
};

export function HostYolSecimi({
  mod,
  islem,
  davetKodu,
  davetKoduDegisti,
  onBagimsiz,
  onAjans,
  scrollRef,
}: Props) {
  const { t } = useCeviri();
  const [secim, setSecim] = useState<Yol>(mod === 'sadeceAjans' ? 'ajans' : 'bagimsiz');
  const yollar: Yol[] = mod === 'sadeceAjans' ? ['ajans'] : ['bagimsiz', 'ajans'];

  return (
    <View style={styles.wrap}>
      <HostBolumBasligi
        baslik={t(mod === 'sadeceAjans' ? 'host.ajansaGecBaslik' : 'host.yolSecBaslik')}
        alt={t(mod === 'sadeceAjans' ? 'host.ajansaGecAlt' : 'host.yolSecAlt')}
      />

      {yollar.map((yol) => (
        <YolKarti
          key={yol}
          yol={yol}
          secili={secim === yol}
          secilebilir={yollar.length > 1}
          onPress={() => setSecim(yol)}
        />
      ))}

      <View style={styles.eylem}>
        {secim === 'bagimsiz' ? (
          <>
            <GradientButton
              title={t('host.bagimsizOl')}
              onPress={onBagimsiz}
              loading={islem === 'bagimsiz'}
              disabled={islem !== null}
            />
            <Text style={styles.not}>{t('host.bagimsizNot')}</Text>
          </>
        ) : (
          <>
            <TextField
              label={t('host.davetKodu')}
              value={davetKodu}
              onChangeText={(v) => davetKoduDegisti(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={t('host.phDavet')}
              returnKeyType="send"
              onSubmitEditing={onAjans}
              onFocus={(e) => KlavyeFocusKaydir(scrollRef.current, e)}
            />
            <GradientButton
              title={t('host.ajansaBasvur')}
              onPress={onAjans}
              loading={islem === 'ajans'}
              disabled={islem !== null || !davetKodu.trim()}
            />
            <Pressable
              onPress={() => router.push('/ajans' as any)}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              accessibilityRole="link"
            >
              <Ionicons name="compass-outline" size={16} color={RenkTokenlari.primarySoft} />
              <Text style={styles.linkYazi}>{t('host.davetKoduYok')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function YolKarti({
  yol,
  secili,
  secilebilir,
  onPress,
}: {
  yol: Yol;
  secili: boolean;
  secilebilir: boolean;
  onPress: () => void;
}) {
  const { t } = useCeviri();
  const icerik = YOLLAR[yol];
  const vurgulu = secili && secilebilir;

  return (
    <Pressable
      onPress={onPress}
      disabled={!secilebilir}
      accessibilityRole={secilebilir ? 'radio' : undefined}
      accessibilityState={secilebilir ? { checked: secili } : undefined}
      style={({ pressed }) => [
        styles.kart,
        vurgulu && styles.kartSecili,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.kartUst}>
        <View style={[styles.kartIkon, vurgulu && styles.kartIkonSecili]}>
          <Ionicons
            name={icerik.icon}
            size={20}
            color={vurgulu ? RenkTokenlari.textOnPrimary : RenkTokenlari.primarySoft}
          />
        </View>
        <View style={styles.kartMetin}>
          <Text style={styles.kartBaslik}>{t(icerik.baslik)}</Text>
          <Text style={styles.kartOzet}>{t(icerik.ozet)}</Text>
        </View>
        {secilebilir ? (
          <View style={[styles.radyo, secili && styles.radyoSecili]}>
            {secili ? <View style={styles.radyoIc} /> : null}
          </View>
        ) : null}
      </View>
      <View style={styles.maddeler}>
        {icerik.maddeler.map((m) => (
          <View key={m.metin} style={styles.madde}>
            <Ionicons
              name={m.tur === 'arti' ? 'checkmark-circle' : 'information-circle'}
              size={16}
              color={m.tur === 'arti' ? RenkTokenlari.success : RenkTokenlari.textDim}
            />
            <Text style={styles.maddeYazi}>{t(m.metin)}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: BoslukTokenlari.md },
  pressed: { opacity: 0.88 },
  kart: {
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1.5,
    borderColor: RenkTokenlari.border,
    gap: BoslukTokenlari.md,
  },
  kartSecili: {
    borderColor: RenkTokenlari.primary,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  kartUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
  },
  kartIkon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kartIkonSecili: {
    backgroundColor: RenkTokenlari.primary,
  },
  kartMetin: { flex: 1, gap: 2 },
  kartBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  kartOzet: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  radyo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radyoSecili: {
    borderColor: RenkTokenlari.primary,
  },
  radyoIc: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RenkTokenlari.primary,
  },
  maddeler: { gap: BoslukTokenlari.sm },
  madde: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
  },
  maddeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flex: 1,
  },
  eylem: {
    gap: BoslukTokenlari.md,
    marginTop: BoslukTokenlari.xs,
  },
  not: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: BoslukTokenlari.sm,
  },
  linkYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
