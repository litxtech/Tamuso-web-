import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CoinKaynagi } from '../../../types/models';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';
import { AktifDil } from '../../../i18n';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';

const ETIKET: Record<CoinKaynagi, CeviriAnahtari> = {
  purchased: 'cuzdanY.kaynakSatinAlinan',
  game: 'cuzdanY.kaynakOyun',
  bonus: 'cuzdanY.kaynakOdul',
};

const SIMGE: Record<CoinKaynagi, React.ComponentProps<typeof Ionicons>['name']> = {
  purchased: 'card-outline',
  game: 'game-controller-outline',
  bonus: 'gift-outline',
};

type Props = {
  kaynak: CoinKaynagi;
  bakiyeler: Record<CoinKaynagi, number>;
  onDegis: (k: CoinKaynagi) => void;
};

/** Hediye gönderirken harcanacak bakiyeyi ve sonucunu gönderimden önce gösterir. */
export function HediyeCoinKaynagiSecici({ kaynak, bakiyeler, onDegis }: Props) {
  const { t } = useCeviri();
  const locale = DIL_LOCALE_MAP[AktifDil()];
  const secenekler = (['purchased', 'game', 'bonus'] as const).filter(
    (k) => k === 'purchased' || k === kaynak || bakiyeler[k] > 0,
  );

  if (secenekler.length === 1) return null;

  return (
    <View style={styles.kap}>
      <View style={styles.satir}>
        {secenekler.map((k) => {
          const aktif = k === kaynak;
          return (
            <Pressable
              key={k}
              onPress={() => onDegis(k)}
              accessibilityRole="radio"
              accessibilityState={{ selected: aktif }}
              style={[styles.chip, aktif && styles.chipAktif]}
            >
              <Ionicons
                name={SIMGE[k]}
                size={13}
                color={aktif ? RenkTokenlari.accent : 'rgba(255,255,255,0.7)'}
              />
              <Text style={[styles.chipYazi, aktif && styles.chipYaziAktif]} numberOfLines={1}>
                {t(ETIKET[k])} · {bakiyeler[k].toLocaleString(locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.not}>
        {kaynak === 'purchased'
          ? t('cuzdanY.hediyeNotSatinAlinan')
          : t('cuzdanY.hediyeNotGelirYok')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { paddingHorizontal: 14, paddingTop: 6, gap: 4 },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipAktif: {
    borderColor: RenkTokenlari.accent,
    backgroundColor: 'rgba(230,206,146,0.12)',
  },
  chipYazi: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, fontWeight: '600' },
  chipYaziAktif: { color: '#FFFFFF' },
  not: { color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 15 },
});
