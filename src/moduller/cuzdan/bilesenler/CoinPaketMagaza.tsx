import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { CoinPackage } from '../../../types/models';
import { CanliCoinSimgesi } from './CanliCoinSimgesi';
import { YetkiliAjansYukleSeridi } from './YetkiliAjansYukleSeridi';
import { PaketFiyatTry, PaketFiyatYazi } from '../katalog/CoinPaketFiyat';
import { useCeviri } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  GolgeTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

/** @deprecated Import `PaketFiyatTry` from `../katalog/CoinPaketFiyat` */
export { PaketFiyatTry };

type Props = {
  packages: CoinPackage[];
  locked?: boolean;
  onBuy: (pkg: CoinPackage) => void;
  baslikGoster?: boolean;
  yetkiliAjansGoster?: boolean;
  onPaketleriYenile?: () => void;
};

export function CoinPaketMagaza({
  packages,
  locked,
  onBuy,
  baslikGoster = true,
  yetkiliAjansGoster = true,
  onPaketleriYenile,
}: Props) {
  const { t, dil } = useCeviri();
  const loc = DIL_LOCALE_MAP[dil];
  const formatCoin = (n: number) => n.toLocaleString(loc);

  const sirali = useMemo(
    () =>
      [...packages].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          PaketFiyatTry(a) - PaketFiyatTry(b) ||
          a.coins - b.coins,
      ),
    [packages],
  );

  const odemeKanal =
    Platform.OS === 'ios'
      ? 'App Store'
      : Platform.OS === 'android'
        ? 'Google Play'
        : t('cuzdanX.kanalMagaza');

  return (
    <View style={styles.wrap}>
      {baslikGoster ? (
        <View style={styles.baslikBlok}>
          <Text style={styles.title}>{t('cuzdanX.coinPaketleri')}</Text>
          <Text style={styles.sub}>
            {t('cuzdanX.paketSecOde', { kanal: odemeKanal })}
          </Text>
        </View>
      ) : null}

      <View style={styles.guvenSeridi}>
        <View style={styles.guvenMadde}>
          <Ionicons
            name="shield-checkmark"
            size={14}
            color={RenkTokenlari.mint}
          />
          <Text style={styles.guvenYazi}>{odemeKanal}</Text>
        </View>
        <View style={styles.guvenNokta} />
        <View style={styles.guvenMadde}>
          <Ionicons name="flash" size={14} color={RenkTokenlari.accent} />
          <Text style={styles.guvenYazi}>{t('cuzdanX.anindaYukleme')}</Text>
        </View>
        <View style={styles.guvenNokta} />
        <View style={styles.guvenMadde}>
          <Ionicons name="lock-closed" size={13} color={RenkTokenlari.textMuted} />
          <Text style={styles.guvenYazi}>{t('cuzdanX.guvenliOdeme')}</Text>
        </View>
      </View>

      <View style={styles.liste}>
        {sirali.map((pkg) => {
          const bonus = pkg.bonus_coins || 0;
          const toplam = pkg.coins + bonus;
          const vurgu = !!pkg.badge;
          const fiyatYazi = PaketFiyatYazi(pkg);
          const kampanya = pkg.campaign_text?.trim();

          return (
            <Pressable
              key={pkg.id}
              disabled={locked}
              onPress={() => onBuy(pkg)}
              accessibilityRole="button"
              accessibilityLabel={t('cuzdanX.satinAlA11y', {
                baslik: pkg.title,
                adet: formatCoin(toplam),
                fiyat: fiyatYazi,
              })}
              style={({ pressed }) => [
                styles.kartDis,
                pressed && styles.kartPressed,
                locked && styles.kartKilitli,
              ]}
            >
              <LinearGradient
                colors={
                  vurgu
                    ? [...RenkTokenlari.gradientGold]
                    : [...RenkTokenlari.gradientCard]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.kart, vurgu && styles.kartVurgu]}
              >
                {pkg.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {pkg.badge}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.kartGovde}>
                  <View style={styles.sol}>
                    <CanliCoinSimgesi
                      size={vurgu ? 34 : 30}
                      seviye={vurgu ? 0.7 : 0.4}
                      animasyon={vurgu}
                    />
                    <View style={styles.metinBlok}>
                      <Text style={styles.pkgTitle} numberOfLines={1}>
                        {pkg.title.replace(/\s*Coin Paketi\s*/i, '').trim() ||
                          pkg.title}
                      </Text>

                      <View style={styles.miktarSatir}>
                        <Text
                          style={[styles.coins, vurgu && styles.coinsVurgu]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {formatCoin(toplam)}
                        </Text>
                        <Text style={styles.coinsBirim}>{t('cuzdan.coin')}</Text>
                      </View>

                      {bonus > 0 ? (
                        <View style={styles.bonusSatir}>
                          <Text style={styles.tabanYazi}>
                            {t('cuzdanX.taban', { adet: formatCoin(pkg.coins) })}
                          </Text>
                          <View style={styles.bonusPill}>
                            <Text style={styles.bonusPillText}>
                              {t('cuzdanX.bonusPill', {
                                adet: formatCoin(bonus),
                              })}
                            </Text>
                          </View>
                        </View>
                      ) : kampanya ? (
                        <Text style={styles.kampanya} numberOfLines={1}>
                          {kampanya}
                        </Text>
                      ) : null}

                      {bonus > 0 && kampanya ? (
                        <Text style={styles.kampanya} numberOfLines={1}>
                          {kampanya}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.cta, vurgu && styles.ctaVurgu]}>
                    <Text
                      style={[styles.ctaFiyat, vurgu && styles.ctaFiyatVurgu]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {fiyatYazi}
                    </Text>
                    <Text style={[styles.ctaAksiyon, vurgu && styles.ctaAksiyonVurgu]}>
                      {t('cuzdan.satinAl')}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bilgiKart}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={RenkTokenlari.textDim}
        />
        <Text style={styles.bilgi}>{t('cuzdanX.coinBilgi')}</Text>
      </View>

      {yetkiliAjansGoster ? (
        <YetkiliAjansYukleSeridi
          locked={locked}
          onPaketleriYenile={onPaketleriYenile}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: BoslukTokenlari.md },
  baslikBlok: { gap: 4 },
  title: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  sub: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  guvenSeridi: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  guvenMadde: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  guvenYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  guvenNokta: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.textDim,
    opacity: 0.5,
  },
  liste: {
    gap: BoslukTokenlari.sm,
  },
  kartDis: {
    borderRadius: YaricapTokenlari.lg,
    ...GolgeTokenlari.card,
  },
  kartPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  kartKilitli: {
    opacity: 0.5,
  },
  kart: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    overflow: 'hidden',
    minHeight: 68,
  },
  kartVurgu: {
    borderColor: RenkTokenlari.borderAccent,
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomRightRadius: YaricapTokenlari.sm,
    backgroundColor: RenkTokenlari.primary,
    zIndex: 2,
  },
  badgeText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '900',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  kartGovde: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 2,
  },
  sol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  metinBlok: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  pkgTitle: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  miktarSatir: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  coins: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  coinsVurgu: {
    color: RenkTokenlari.text,
  },
  coinsBirim: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    fontSize: 11,
  },
  bonusSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 1,
  },
  tabanYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
    fontSize: 10,
  },
  bonusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(61, 207, 176, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(61, 207, 176, 0.35)',
  },
  bonusPillText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '800',
    fontSize: 9,
  },
  kampanya: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
    fontSize: 10,
    marginTop: 1,
  },
  cta: {
    minWidth: 78,
    maxWidth: 102,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: RenkTokenlari.accent,
    marginTop: 2,
  },
  ctaVurgu: {
    backgroundColor: RenkTokenlari.primary,
  },
  ctaFiyat: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '900',
    fontSize: 13,
    maxWidth: '100%',
  },
  ctaFiyatVurgu: {
    color: RenkTokenlari.textOnPrimary,
  },
  ctaAksiyon: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnPrimary,
    opacity: 0.72,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.4,
  },
  ctaAksiyonVurgu: {
    opacity: 0.8,
  },
  bilgiKart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.chipFill,
  },
  bilgi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
