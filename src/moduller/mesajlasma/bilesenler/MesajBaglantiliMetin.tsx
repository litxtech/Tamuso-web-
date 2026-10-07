import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextLayoutEventData,
  type TextStyle,
} from 'react-native';
import { MesajMetniLinkParcala } from '../yardimcilar/MesajUrlAyikla';
import { MesajLinkAc } from '../islemler/MesajLinkAc';
import { MesajTelefonKarti } from './MesajTelefonKarti';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  /** mine bubble → koyu link */
  mine?: boolean;
  /** DM: telefon numarası dokununca arama kartı */
  telefonKarti?: boolean;
  numberOfLines?: number;
  onTextLayout?: (e: NativeSyntheticEvent<TextLayoutEventData>) => void;
};

/**
 * Metindeki URL'leri tıklanabilir render eder (DM / durum / yorum).
 */
export function MesajBaglantiliMetin({
  text,
  style,
  linkStyle,
  mine = false,
  telefonKarti = false,
  numberOfLines,
  onTextLayout,
}: Props) {
  const parcalar = useMemo(() => MesajMetniLinkParcala(text), [text]);
  const [tel, setTel] = useState<{ numara: string; gorunen: string } | null>(null);
  const hasLink = parcalar.some(
    (p) => p.tur === 'link' || (telefonKarti && p.tur === 'tel'),
  );

  if (!hasLink) {
    return (
      <Text
        style={style}
        numberOfLines={numberOfLines}
        onTextLayout={onTextLayout}
      >
        {text}
      </Text>
    );
  }

  const linkColor = mine ? 'rgba(18,4,12,0.95)' : RenkTokenlari.primarySoft;

  return (
    <>
    <Text
      style={style}
      numberOfLines={numberOfLines}
      onTextLayout={onTextLayout}
    >
      {parcalar.map((p, i) => {
        if (p.tur === 'text' || (p.tur === 'tel' && !telefonKarti)) {
          return <Text key={`t-${i}`}>{p.deger}</Text>;
        }
        if (p.tur === 'tel') {
          return (
            <Text
              key={`p-${i}`}
              style={[
                styles.link,
                { color: linkColor },
                mine && styles.linkMine,
                linkStyle,
              ]}
              onPress={() => setTel({ numara: p.numara, gorunen: p.deger })}
              accessibilityRole="link"
              accessibilityLabel={p.deger}
            >
              {p.deger}
            </Text>
          );
        }
        return (
          <Text
            key={`l-${i}`}
            style={[
              styles.link,
              { color: linkColor },
              mine && styles.linkMine,
              linkStyle,
            ]}
            onPress={() => {
              void MesajLinkAc(p.url);
            }}
            accessibilityRole="link"
            accessibilityLabel={p.deger}
          >
            {p.deger}
          </Text>
        );
      })}
    </Text>
    {telefonKarti ? (
      <MesajTelefonKarti
        numara={tel?.numara ?? null}
        gorunen={tel?.gorunen ?? null}
        onKapat={() => setTel(null)}
      />
    ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  linkMine: {
    textDecorationLine: 'underline',
  },
});
