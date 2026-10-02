import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { premiumCtaGradient } from '../../../tasarim-sistemi/premium/PremiumAmbient';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { DogrulanmisTik } from '../../kullanici-profili/bilesenler/DogrulanmisTik';
import { useCeviri } from '../../../i18n/useCeviri';

/** Şeffaf cam kart — Ajansım modern yüzey */
export function AjansKart({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <View style={[styles.kart, accent && styles.kartAccent]}>
      <CamArkaplan
        intensity={36}
        hafif
        style={StyleSheet.absoluteFill}
        fallbackColor={RenkTokenlari.bgGlass}
      />
      <View style={styles.kartIc}>{children}</View>
    </View>
  );
}

export function AjansBolumBaslik({ children }: { children: string }) {
  return <Text style={styles.bolum}>{children}</Text>;
}

export function AjansHint({ children }: { children: string }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export function AjansBos({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <View style={styles.bos}>
      <Ionicons name="ellipse-outline" size={28} color={RenkTokenlari.textDim} />
      <Text style={styles.bosBaslik}>{title}</Text>
      {body ? <Text style={styles.hint}>{body}</Text> : null}
    </View>
  );
}

export function AjansInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={RenkTokenlari.textDim}
      style={styles.input}
      {...props}
    />
  );
}

export function AjansCta({
  label,
  onPress,
  ghost,
  loading,
}: {
  label: string;
  onPress: () => void;
  ghost?: boolean;
  loading?: boolean;
}) {
  if (ghost) {
    return (
      <Pressable style={[styles.cta, styles.ctaGhost]} onPress={onPress}>
        <Text style={[styles.ctaYazi, styles.ctaGhostYazi]}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} disabled={loading}>
      <LinearGradient
        colors={[...premiumCtaGradient()]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.cta}
      >
        <Text style={styles.ctaYazi}>{loading ? '…' : label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function AjansKpiHucre({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={[styles.kpi, emphasize && styles.kpiEmph]}>
      <Text style={[styles.kpiDeger, emphasize && styles.kpiDegerEmph]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function AjansCanliNokta({ aktif }: { aktif?: boolean }) {
  return (
    <View
      style={[
        styles.nokta,
        { backgroundColor: aktif ? RenkTokenlari.live : RenkTokenlari.textDim },
      ]}
    />
  );
}

export function AjansListeSatir({
  title,
  subtitle,
  avatarUrl,
  leading,
  trailing,
  onPress,
  live,
}: {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  live?: boolean;
}) {
  const uri = avatarUrl ? MedyaUriGuvenli(avatarUrl) : null;
  return (
    <Pressable
      style={styles.satir}
      onPress={onPress}
      disabled={!onPress}
    >
      {leading ?? (
        uri ? (
          <Image source={{ uri } as ImageSourcePropType} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarBos]}>
            <Ionicons name="person" size={14} color={RenkTokenlari.textDim} />
          </View>
        )
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.satirBaslikSatir}>
          {live ? <AjansCanliNokta aktif /> : null}
          <Text style={styles.satirBaslik} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={styles.satirAlt} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={16} color={RenkTokenlari.textDim} />
        ) : null)}
    </Pressable>
  );
}

export function AjansHeroKapak({
  name,
  subtitle,
  logoUrl,
  bannerUrl,
  levelLabel,
  verified,
  meta,
  actionLabel,
  onAction,
  children,
}: {
  name: string;
  subtitle?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  levelLabel?: string | null;
  verified?: boolean;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useCeviri();
  const banner = bannerUrl ? MedyaUriGuvenli(bannerUrl) : null;
  const logo = logoUrl ? MedyaUriGuvenli(logoUrl) : null;

  return (
    <View style={styles.heroWrap}>
      <LinearGradient
        colors={[...RenkTokenlari.gradientPlaceholder]}
        style={styles.hero}
      >
        {banner ? (
          <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} />
        ) : null}
        <LinearGradient
          colors={[...RenkTokenlari.overlayGradient]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroIcerik}>
          <View style={styles.heroSatir}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoBos]}>
                <Ionicons name="business" size={22} color={RenkTokenlari.primarySoft} />
              </View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.heroAd} numberOfLines={1}>
                {name}
              </Text>
              {subtitle ? (
                <Text style={styles.heroAlt} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
              <View style={styles.badgeSatir}>
                {levelLabel ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeYazi}>{levelLabel}</Text>
                  </View>
                ) : null}
                {verified ? (
                  <View style={[styles.badge, styles.badgeOk]}>
                    <DogrulanmisTik size={12} />
                    <Text style={styles.badgeYazi}>{t('ajans.dogrulandi')}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          {meta ? <Text style={styles.heroMeta}>{meta}</Text> : null}
          {actionLabel && onAction ? (
            <Pressable style={styles.heroBtn} onPress={onAction}>
              <Text style={styles.heroBtnYazi}>{actionLabel}</Text>
            </Pressable>
          ) : null}
          {children}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  kart: {
    borderRadius: YaricapTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    overflow: 'hidden',
  },
  kartAccent: {
    borderColor: RenkTokenlari.borderAccent,
  },
  kartIc: {
    padding: BoslukTokenlari.md,
    gap: 8,
  },
  bolum: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  hint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    lineHeight: 18,
  },
  bos: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: BoslukTokenlari.xl,
  },
  bosBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: RenkTokenlari.text,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cta: {
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaGhost: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ctaYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '700',
  },
  ctaGhostYazi: {
    color: RenkTokenlari.primarySoft,
  },
  kpi: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    gap: 4,
  },
  kpiEmph: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  kpiDeger: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 16,
  },
  kpiDegerEmph: {
    color: RenkTokenlari.primarySoft,
  },
  kpiLabel: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  nokta: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  satirBaslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  satirBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  satirAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  avatarBos: {
    backgroundColor: RenkTokenlari.pressFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: {
    borderRadius: YaricapTokenlari.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  hero: {
    minHeight: 168,
    justifyContent: 'flex-end',
  },
  heroIcerik: {
    padding: BoslukTokenlari.md,
    gap: 10,
  },
  heroSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logoBos: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAd: {
    ...TipografiTokenlari.h2,
    color: '#fff',
    fontWeight: '800',
    fontSize: 20,
  },
  heroAlt: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.72)',
  },
  badgeSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  badgeOk: {
    backgroundColor: 'rgba(80,200,140,0.22)',
  },
  badgeYazi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '700',
  },
  heroMeta: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  heroBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroBtnYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '700',
  },
});
