import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { TakipSayaciniFormatla } from '../../takip/TakipSayacFormat';

type Props = {
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  giftCount: number;
  viewCount: number;
  onYorum: () => void;
  onBegen: () => void;
  onHediye: () => void;
  onPaylas?: () => void;
};

/**
 * Kompakt etkileşim çubuğu.
 * 0 değerlerde sayı gizlenir; hediye asla "selected" görünmez.
 */
export const DurumEtkilesimCubugu = memo(function DurumEtkilesimCubugu({
  commentCount,
  likeCount,
  likedByMe,
  giftCount,
  viewCount,
  onYorum,
  onBegen,
  onHediye,
  onPaylas,
}: Props) {
  const { t, dil } = useCeviri();
  return (
    <View style={styles.aksiyonlar}>
      <Pressable
        style={styles.aksiyon}
        onPress={(e) => {
          e.stopPropagation?.();
          onYorum();
        }}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={
          commentCount > 0
            ? t('durumX.yorumYapSayi', { count: commentCount })
            : t('durumX.yorumYap')
        }
      >
        <Ionicons name="chatbubble-outline" size={18} color={RenkTokenlari.textMuted} />
        {commentCount > 0 ? (
          <Text style={styles.aksiyonSayi}>{TakipSayaciniFormatla(commentCount, dil)}</Text>
        ) : null}
      </Pressable>

      <Pressable
        style={styles.aksiyon}
        onPress={(e) => {
          e.stopPropagation?.();
          onBegen();
        }}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={
          likedByMe ? t('durumX.begeniyiKaldir') : t('durumX.begen')
        }
        accessibilityState={{ selected: likedByMe }}
      >
        <Ionicons
          name={likedByMe ? 'heart' : 'heart-outline'}
          size={18}
          color={likedByMe ? RenkTokenlari.primarySoft : RenkTokenlari.textMuted}
        />
        {likeCount > 0 ? (
          <Text
            style={[
              styles.aksiyonSayi,
              likedByMe && { color: RenkTokenlari.primarySoft },
            ]}
          >
            {TakipSayaciniFormatla(likeCount, dil)}
          </Text>
        ) : null}
      </Pressable>

      <Pressable
        style={styles.aksiyon}
        onPress={(e) => {
          e.stopPropagation?.();
          onHediye();
        }}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={
          giftCount > 0 ? t('durumX.hediyeGonderSayi', { count: giftCount }) : t('durumX.hediyeGonder')
        }
      >
        <Ionicons name="gift-outline" size={18} color={RenkTokenlari.textMuted} />
        {giftCount > 0 ? (
          <Text style={styles.aksiyonSayi}>{TakipSayaciniFormatla(giftCount, dil)}</Text>
        ) : null}
      </Pressable>

      {viewCount > 0 ? (
        <View
          style={styles.aksiyon}
          accessibilityLabel={t('durumX.goruntulenme', { count: viewCount })}
        >
          <Ionicons name="eye-outline" size={18} color={RenkTokenlari.textMuted} />
          <Text style={styles.aksiyonSayi}>{TakipSayaciniFormatla(viewCount, dil)}</Text>
        </View>
      ) : null}

      {onPaylas ? (
        <Pressable
          style={styles.aksiyon}
          onPress={(e) => {
            e.stopPropagation?.();
            onPaylas();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('durumX.paylas')}
        >
          <Ionicons
            name="paper-plane-outline"
            size={18}
            color={RenkTokenlari.textMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  aksiyonlar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 18,
    paddingTop: 4,
  },
  aksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    minWidth: 36,
  },
  aksiyonSayi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
