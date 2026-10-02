import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  TEMA_KATEGORILERI,
  TEMA_KODLARI,
  TEMA_META,
  type RenkPaleti,
  type TemaKategori,
  type TemaKodu,
} from '../../../tasarim-sistemi/tema/TemaTipleri';
import { useTema } from '../../../tasarim-sistemi/tema/TemaSaglayici';
import { paletiKoddanAl } from '../../../tasarim-sistemi/tema/TemaDurumu';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';

type Props = {
  onSec?: (kod: TemaKodu) => void;
  /** true: dikey grid (katalog ekranı); false: yatay şerit */
  katalogMu?: boolean;
};

/**
 * Uygulama görünüm seçici — tüm app paleti (oda temalarından bağımsız).
 */
export function GorunumSecimKartlari({ onSec, katalogMu = false }: Props) {
  const { t } = useCeviri();
  const { kod: aktif, temayiSec, palet } = useTema();
  const [kategori, setKategori] = useState<TemaKategori | 'hepsi'>('hepsi');

  const kodlar = useMemo(() => {
    if (kategori === 'hepsi') return [...TEMA_KODLARI];
    return TEMA_KODLARI.filter((k) => TEMA_META[k].kategori === kategori);
  }, [kategori]);

  const sec = async (kod: TemaKodu) => {
    await temayiSec(kod);
    onSec?.(kod);
  };

  const kart = (kod: TemaKodu) => {
    const ornek: RenkPaleti = paletiKoddanAl(kod);
    const meta = TEMA_META[kod];
    const secili = aktif === kod;
    const baslik = t(meta.adKey as CeviriAnahtari);
    const alt = t(meta.altKey as CeviriAnahtari);
    return (
      <Pressable
        key={kod}
        onPress={() => void sec(kod)}
        accessibilityRole="tab"
        accessibilityState={{ selected: secili }}
        accessibilityLabel={t('gorunum.temaA11y', { baslik })}
        style={({ pressed }) => [
          katalogMu ? styles.gridHit : styles.hit,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            katalogMu ? styles.gridKart : styles.sekme,
            {
              borderColor: secili ? palet.primary : palet.border,
              backgroundColor: secili ? palet.pressFill : palet.bgCard,
            },
          ]}
        >
          <LinearGradient
            colors={[...ornek.gradientNight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={katalogMu ? styles.gridSwatch : styles.swatch}
          >
            <View
              style={[
                styles.swatchNokta,
                katalogMu && styles.swatchNoktaBuyuk,
                { backgroundColor: ornek.primary },
              ]}
            />
            {secili ? (
              <View
                style={[styles.onay, { backgroundColor: ornek.primary }]}
              >
                <Ionicons
                  name="checkmark"
                  size={katalogMu ? 14 : 10}
                  color={ornek.textOnPrimary}
                />
              </View>
            ) : null}
          </LinearGradient>
          <View style={katalogMu ? styles.gridCopy : undefined}>
            <Text
              style={[
                katalogMu ? styles.gridAd : styles.etiket,
                {
                  color: secili ? palet.text : palet.textMuted,
                  fontWeight: secili ? '700' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {baslik}
            </Text>
            {katalogMu ? (
              <Text
                style={[styles.gridAlt, { color: palet.textDim }]}
                numberOfLines={1}
              >
                {alt}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.kok}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kategoriSerit}
      >
        {TEMA_KATEGORILERI.map((k) => {
          const secili = kategori === k.kod;
          return (
            <Pressable
              key={k.kod}
              onPress={() => setKategori(k.kod)}
              style={[
                styles.kategoriChip,
                {
                  borderColor: secili ? palet.primary : palet.border,
                  backgroundColor: secili ? palet.pressFill : palet.bgCard,
                },
              ]}
            >
              <Text
                style={[
                  styles.kategoriYazi,
                  { color: secili ? palet.text : palet.textMuted },
                ]}
              >
                {t(k.adKey as CeviriAnahtari)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.sayac, { color: palet.textDim }]}>
        {t('gorunum.temaSayisi', { n: kodlar.length })}
      </Text>

      {katalogMu ? (
        <View style={styles.grid}>{kodlar.map(kart)}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.serit}
          style={styles.scroll}
        >
          {kodlar.map(kart)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { gap: 8 },
  kategoriSerit: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  kategoriChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  kategoriYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 11,
    fontWeight: '700',
  },
  sayac: {
    ...TipografiTokenlari.micro,
    fontSize: 10,
    paddingLeft: 2,
  },
  scroll: {
    marginBottom: BoslukTokenlari.md,
    marginHorizontal: -BoslukTokenlari.sm,
  },
  serit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.sm,
    paddingVertical: 2,
  },
  hit: { flexShrink: 0 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  sekme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1.5,
    minHeight: 36,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  swatchNokta: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  swatchNoktaBuyuk: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  onay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiket: {
    ...TipografiTokenlari.micro,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridHit: {
    width: '47%',
    flexGrow: 1,
    maxWidth: '48.5%',
  },
  gridKart: {
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 118,
  },
  gridSwatch: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCopy: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  gridAd: {
    ...TipografiTokenlari.micro,
    fontSize: 13,
    fontWeight: '700',
  },
  gridAlt: {
    ...TipografiTokenlari.micro,
    fontSize: 10,
  },
});
