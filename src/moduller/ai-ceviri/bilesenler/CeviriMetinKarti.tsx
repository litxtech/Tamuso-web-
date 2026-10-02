import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useMetinCevirisi } from '../kancalar/useMetinCevirisi';
import { useCeviri } from '../../../i18n/useCeviri';
import { MesajBaglantiliMetin } from '../../mesajlasma/bilesenler/MesajBaglantiliMetin';

type Props = {
  text: string;
  context?: 'live' | 'room' | 'dm' | 'call' | 'other';
  /** live overlay: beyaz metin + gölge */
  varyant?: 'live' | 'bubble' | 'bubbleMine' | 'kart' | 'call';
  /** Çeviriyi kapat (ör. hediye satırı) */
  enabled?: boolean;
  numberOfLines?: number;
  /** DM bubble: URL tıklanabilir */
  linkify?: boolean;
};

/**
 * Çeviri kartı:
 * Üstte hedef dil çevirisi, altta orijinal.
 * Aynı dilde çeviri/yazım düzeltmesi yok — yalnızca orijinal.
 * Çeviri gelene kadar yalnızca orijinal gösterilir (spinner yok).
 */
export function CeviriMetinKarti({
  text,
  context = 'other',
  varyant = 'live',
  enabled = true,
  numberOfLines,
  linkify = false,
}: Props) {
  const { dil } = useCeviri();
  const { orijinal, altSatir } = useMetinCevirisi(text, dil, context, enabled);
  const baglantiAktif =
    linkify || varyant === 'bubble' || varyant === 'bubbleMine';
  const mine = varyant === 'bubbleMine';

  const primaryStyle =
    varyant === 'bubbleMine'
      ? styles.primaryMine
      : varyant === 'bubble'
        ? styles.primaryBubble
        : varyant === 'kart'
          ? styles.primaryKart
          : varyant === 'call'
            ? styles.primaryCall
            : styles.primaryLive;

  const secondaryStyle =
    varyant === 'bubbleMine'
      ? styles.originalMine
      : varyant === 'bubble'
        ? styles.originalBubble
        : varyant === 'kart'
          ? styles.originalKart
          : varyant === 'call'
            ? styles.originalCall
            : styles.originalLive;

  const metinSatiri = (
    deger: string,
    stil: StyleProp<TextStyle>,
    linkMi: boolean,
  ) =>
    linkMi && baglantiAktif ? (
      <MesajBaglantiliMetin
        text={deger}
        style={stil}
        mine={mine}
        numberOfLines={numberOfLines}
      />
    ) : (
      <Text style={stil} numberOfLines={numberOfLines}>
        {deger}
      </Text>
    );

  // Çeviri yok: yalnız orijinal
  if (!altSatir) {
    return (
      <View style={styles.wrap}>
        {metinSatiri(orijinal || text, primaryStyle, true)}
      </View>
    );
  }

  // Üst: çapraz dil çevirisi · Alt: orijinal
  return (
    <View
      style={[
        styles.card,
        varyant === 'live' && styles.cardLive,
        varyant === 'call' && styles.cardCall,
        varyant === 'kart' && styles.cardKart,
        (varyant === 'bubble' || varyant === 'bubbleMine') && styles.cardBubble,
        varyant === 'bubbleMine' && styles.cardBubbleMine,
      ]}
    >
      {metinSatiri(altSatir, primaryStyle, true)}
      <View
        style={[
          styles.divider,
          varyant === 'bubbleMine' && styles.dividerMine,
          (varyant === 'bubble' || varyant === 'kart') && styles.dividerBubble,
          varyant === 'live' && styles.dividerLive,
        ]}
      />
      {metinSatiri(orijinal || text, secondaryStyle, true)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
  card: {
    gap: 5,
    borderRadius: 10,
    paddingVertical: 2,
  },
  cardLive: {
    paddingHorizontal: 0,
  },
  cardCall: {
    backgroundColor: 'rgba(12,10,18,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardKart: {
    gap: 4,
  },
  cardBubble: {
    gap: 4,
  },
  cardBubbleMine: {
    gap: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: 1,
  },
  dividerLive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  dividerBubble: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerMine: {
    backgroundColor: 'rgba(18,4,12,0.22)',
  },
  primaryLive: {
    ...TipografiTokenlari.body,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  originalLive: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  primaryBubble: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 20,
    fontWeight: '600',
  },
  originalBubble: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontSize: 12,
    lineHeight: 16,
  },
  primaryMine: {
    ...TipografiTokenlari.body,
    color: 'rgba(18,4,12,0.95)',
    lineHeight: 20,
    fontWeight: '700',
  },
  originalMine: {
    ...TipografiTokenlari.caption,
    color: 'rgba(18,4,12,0.62)',
    fontSize: 12,
    lineHeight: 16,
  },
  primaryKart: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 20,
    fontWeight: '600',
  },
  originalKart: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontSize: 12,
    lineHeight: 16,
  },
  primaryCall: {
    ...TipografiTokenlari.body,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 19,
  },
  originalCall: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    lineHeight: 16,
  },
});
