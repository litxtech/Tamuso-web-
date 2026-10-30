import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import type { Wallet } from '../../../types/models';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import { CanliCoinSimgesi } from './CanliCoinSimgesi';
import {
  UsdYazi,
  YayinciKazancOzetiGetir,
  type YayinciKazancOzeti,
} from '../yayinci/YayinciKazancIslemleri';

type Props = {
  wallet: Wallet | null | undefined;
  purchaseLocked: boolean;
  onCoinYukle: () => void;
};

/**
 * Cüzdanım: satın alınan coin, oyun coin'i ve yayıncı kazançları (USD) ayrı bölümlerde.
 * Coin ile USD birbirine dönüştürülerek gösterilmez.
 */
export function CuzdanimBolumleri({ wallet, purchaseLocked, onCoinYukle }: Props) {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const [ozet, setOzet] = useState<YayinciKazancOzeti | null>(null);
  const [ozetDurum, setOzetDurum] = useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [bilgiAcik, setBilgiAcik] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let iptal = false;
      YayinciKazancOzetiGetir()
        .then((o) => {
          if (iptal) return;
          setOzet(o);
          setOzetDurum('hazir');
        })
        .catch(() => {
          if (!iptal) setOzetDurum('hata');
        });
      return () => {
        iptal = true;
      };
    }, []),
  );

  const coin = (n: number | undefined) => (n ?? 0).toLocaleString(locale);
  const bonus = wallet?.bonus_coins ?? 0;
  const bekleyenUsd = ozet ? ozet.pending_usd + ozet.on_hold_usd : 0;

  return (
    <View style={styles.kap}>
      <LinearGradient
        colors={[...RenkTokenlari.gradientPrimary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View pointerEvents="none" style={[styles.daire, styles.daireBuyuk]} />
        <View pointerEvents="none" style={[styles.daire, styles.daireKucuk]} />

        <View style={styles.heroUst}>
          <Text style={styles.heroEtiket} numberOfLines={1}>
            {t('cuzdanY.bolumSatinAlinan')}
          </Text>
          <Pressable
            onPress={() => setBilgiAcik((a) => !a)}
            hitSlop={10}
            style={styles.heroBilgi}
            accessibilityRole="button"
            accessibilityLabel={t('cuzdanY.onemliBilgiler')}
          >
            <Ionicons name="information" size={14} color={RenkTokenlari.textOnPrimary} />
          </Pressable>
        </View>

        <View style={styles.heroBakiyeSatir}>
          <CanliCoinSimgesi size={34} seviye={0.6} />
          <Text
            style={styles.heroBakiye}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            accessibilityLabel={`${coin(wallet?.coins)} ${t('cuzdanY.coin')}`}
          >
            {coin(wallet?.coins)}
          </Text>
          <Text style={styles.heroBirim}>{t('cuzdanY.coin')}</Text>
        </View>

        <Pressable
          onPress={onCoinYukle}
          disabled={purchaseLocked}
          style={({ pressed }) => [
            styles.heroDugme,
            (pressed || purchaseLocked) && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={18} color={RenkTokenlari.primary} />
          <Text style={styles.heroDugmeYazi}>{t('cuzdanY.coinYukle')}</Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.miniSatir}>
        <View style={styles.mini}>
          <View style={[styles.miniIkon, { backgroundColor: `${RenkTokenlari.violet}26` }]}>
            <Ionicons name="game-controller" size={16} color={RenkTokenlari.violet} />
          </View>
          <Text style={styles.miniEtiket} numberOfLines={2}>
            {t('cuzdanY.bolumOyun')}
          </Text>
          <Text style={styles.miniDeger} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {coin(wallet?.game_coins)}
          </Text>
          {bonus > 0 ? (
            <View style={styles.cip}>
              <Ionicons name="gift" size={11} color={RenkTokenlari.accent} />
              <Text style={styles.cipYazi} numberOfLines={1}>
                {coin(bonus)} · {t('cuzdanY.kaynakOdul')}
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.push('/cuzdan/yayinci-kazanclari' as never)}
          style={({ pressed }) => [styles.mini, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t('cuzdanY.kazancDetaylari')}
        >
          <View style={styles.miniUst}>
            <View style={[styles.miniIkon, { backgroundColor: `${RenkTokenlari.mint}26` }]}>
              <Ionicons name="trending-up" size={16} color={RenkTokenlari.mint} />
            </View>
            <Ionicons name="chevron-forward" size={16} color={RenkTokenlari.textDim} />
          </View>
          <Text style={styles.miniEtiket} numberOfLines={2}>
            {t('cuzdanY.bolumYayinci')}
          </Text>
          {ozetDurum === 'yukleniyor' ? (
            <ActivityIndicator color={RenkTokenlari.mint} style={styles.miniYukleniyor} />
          ) : ozetDurum === 'hata' || !ozet ? (
            <Text style={styles.miniHata} numberOfLines={2}>
              {t('cuzdanY.kazancYuklenemedi')}
            </Text>
          ) : (
            <>
              <Text style={styles.miniDeger} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {UsdYazi(ozet.available_usd, locale)}
              </Text>
              {!ozet.withdrawals_enabled ? (
                <View style={[styles.cip, styles.cipUyari]}>
                  <Ionicons name="pause" size={11} color={RenkTokenlari.warning} />
                  <Text style={[styles.cipYazi, { color: RenkTokenlari.warning }]} numberOfLines={2}>
                    {t('cuzdanY.cekimKullanilamiyor')}
                  </Text>
                </View>
              ) : bekleyenUsd > 0 ? (
                <Text style={styles.miniAlt} numberOfLines={1}>
                  {t('cuzdanY.bekleyen')}: {UsdYazi(bekleyenUsd, locale)}
                </Text>
              ) : (
                <Text style={styles.miniAlt} numberOfLines={1}>
                  {t('cuzdanY.cekilebilir')}
                </Text>
              )}
            </>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={() => setBilgiAcik((a) => !a)}
        style={({ pressed }) => [styles.bilgiBaslik, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: bilgiAcik }}
      >
        <Ionicons name="shield-checkmark-outline" size={15} color={RenkTokenlari.textMuted} />
        <Text style={styles.bilgiBaslikYazi}>{t('cuzdanY.onemliBilgiler')}</Text>
        <Ionicons
          name={bilgiAcik ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={RenkTokenlari.textMuted}
        />
      </Pressable>
      {bilgiAcik ? (
        <View style={styles.bilgiKutu}>
          <BilgiMadde ikon="card-outline" renk={RenkTokenlari.accent} metin={t('cuzdanY.metinCoin')} />
          <BilgiMadde ikon="game-controller-outline" renk={RenkTokenlari.violet} metin={t('cuzdanY.metinOyunCoin')} />
          {bonus > 0 ? (
            <BilgiMadde
              ikon="gift-outline"
              renk={RenkTokenlari.accent}
              metin={t('cuzdanY.odulCoinSatir', { adet: coin(bonus) })}
            />
          ) : null}
          <BilgiMadde ikon="trending-up-outline" renk={RenkTokenlari.mint} metin={t('cuzdanY.metinYayinci')} />
          <BilgiMadde ikon="calendar-outline" renk={RenkTokenlari.textMuted} metin={t('cuzdanY.metinOdeme')} />
          <BilgiMadde ikon="lock-closed-outline" renk={RenkTokenlari.textMuted} metin={t('cuzdanY.metinGuvenlik')} />
        </View>
      ) : null}
    </View>
  );
}

function BilgiMadde({
  ikon,
  renk,
  metin,
}: {
  ikon: React.ComponentProps<typeof Ionicons>['name'];
  renk: string;
  metin: string;
}) {
  return (
    <View style={styles.madde}>
      <Ionicons name={ikon} size={14} color={renk} style={styles.maddeIkon} />
      <Text style={styles.bilgiYazi}>{metin}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { gap: 12, paddingHorizontal: 24 },
  hero: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    overflow: 'hidden',
  },
  daire: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  daireBuyuk: { width: 200, height: 200, top: -90, right: -60 },
  daireKucuk: { width: 120, height: 120, bottom: -60, left: -30, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroUst: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroEtiket: {
    flex: 1,
    color: RenkTokenlari.textOnPrimary,
    opacity: 0.85,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  heroBilgi: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroBakiyeSatir: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroBakiye: {
    flexShrink: 1,
    color: RenkTokenlari.textOnPrimary,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroBirim: {
    color: RenkTokenlari.textOnPrimary,
    opacity: 0.75,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  heroDugme: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  heroDugmeYazi: { color: RenkTokenlari.primary, fontSize: 14, fontWeight: '800' },
  miniSatir: { flexDirection: 'row', gap: 12 },
  mini: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    padding: 14,
    gap: 6,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  miniUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniIkon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniEtiket: { color: RenkTokenlari.textMuted, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  miniDeger: { color: RenkTokenlari.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  miniAlt: { color: RenkTokenlari.textDim, fontSize: 11 },
  miniHata: { color: RenkTokenlari.textDim, fontSize: 11, lineHeight: 15 },
  miniYukleniyor: { alignSelf: 'flex-start', marginVertical: 6 },
  cip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.chipFill,
    maxWidth: '100%',
  },
  cipUyari: { backgroundColor: 'rgba(255,193,7,0.12)' },
  cipYazi: { color: RenkTokenlari.textMuted, fontSize: 10.5, fontWeight: '600', flexShrink: 1 },
  bilgiBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: RenkTokenlari.surface,
  },
  bilgiBaslikYazi: { color: RenkTokenlari.textMuted, fontSize: 13, fontWeight: '600', flex: 1 },
  bilgiKutu: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: RenkTokenlari.surface,
    marginTop: -6,
  },
  madde: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  maddeIkon: { marginTop: 1 },
  bilgiYazi: { flex: 1, color: RenkTokenlari.textMuted, fontSize: 12, lineHeight: 17 },
});
