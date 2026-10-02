import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { premiumCtaGradient } from '../../../tasarim-sistemi/premium/PremiumAmbient';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';
import { useCeviri } from '../../../i18n/useCeviri';
import { useDil } from '../../../i18n/DilSaglayici';
import { rtlMetinStili } from '../../../i18n/rtl';

export type AnaSayfaMenuOgesi = {
  /** Locale-bağımsız unique id — React key olarak kullanılır */
  key: string;
  baslik: string;
  alt: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  href: string;
  /** Okunmamış resmi duyuru sayısı */
  rozet?: number;
  /** Remote hamburger group — varsa menuGruplarinaBol bunu kullanır */
  groupId?: string;
  sortOrder?: number;
};

export type MenuGrubu = {
  id: string;
  baslik: string;
  ogeler: AnaSayfaMenuOgesi[];
};

type GrupProps = {
  grup: MenuGrubu;
  onOgeSec: (href: string) => void;
};

/**
 * Menü satırları.
 *
 * Drawer absolute + fiziksel left/right kullandığı için satırlarda
 * direction:'ltr' kilitlenir; semantic sıra JSX ile üretilir.
 * I18nManager row aynası + manuel reverse = ÇİFT AYNA olmasın.
 */
export function HamburgerMenuGrubu({ grup, onOgeSec }: GrupProps) {
  useTemayaAboneOl();
  const { rtl } = useDil();
  const metinRtl = rtlMetinStili(rtl, true);

  if (grup.ogeler.length === 0) return null;

  if (__DEV__) {
    const ids = grup.ogeler.map((o) => o.key);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length > 0) {
      console.warn(
        `[HamburgerMenuGrubu] duplicate keys in section "${grup.id}":`,
        [...new Set(dup)],
      );
    }
  }

  return (
    <View style={styles.grup}>
      <Text style={[styles.grupBaslik, metinRtl]} numberOfLines={2}>
        {grup.baslik}
      </Text>
      <View style={styles.liste}>
        {grup.ogeler.map((oge) => {
          const ikon = (
            <View style={styles.ikonWrap}>
              <Ionicons name={oge.icon} size={18} color={RenkTokenlari.text} />
            </View>
          );
          const yazi = (
            <View style={styles.yaziSatir}>
              <Text
                style={[styles.baslik, metinRtl, styles.baslikEsnek]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {oge.baslik}
              </Text>
              {oge.rozet && oge.rozet > 0 ? (
                <View style={styles.rozet}>
                  <Text style={styles.rozetYazi}>{oge.rozet > 99 ? '99+' : String(oge.rozet)}</Text>
                </View>
              ) : null}
            </View>
          );
          return (
            <Pressable
              key={oge.key}
              onPress={() => onOgeSec(oge.href)}
              style={({ pressed }) => [
                styles.satir,
                pressed && styles.satirPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${oge.baslik}. ${oge.alt}`}
            >
              {rtl ? (
                <>
                  {yazi}
                  {ikon}
                </>
              ) : (
                <>
                  {ikon}
                  {yazi}
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type CtaProps = {
  onPress: () => void;
};

/** Gerçek hedef: /platform (görev · etkinlik · rozet hub) */
export function HamburgerPremiumCta({ onPress }: CtaProps) {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const { rtl } = useDil();
  const metinRtl = rtlMetinStili(rtl, true);

  const ikon = (
    <View style={styles.ctaIconWrap}>
      <Ionicons name="diamond" size={14} color="#fff" />
    </View>
  );
  const copy = (
    <View style={styles.ctaCopy}>
      <Text
        style={[styles.ctaBaslik, metinRtl]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {t('anaSayfa.dahaFazlaKesfet')}
      </Text>
      <Text
        style={[styles.ctaAlt, metinRtl]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {t('anaSayfa.dahaFazlaKesfetAlt')}
      </Text>
    </View>
  );
  /** direction:ltr kilitli — ok yönü dil intent’ine göre (I18nManager değil) */
  const ok = (
    <Ionicons
      name={rtl ? 'arrow-back' : 'arrow-forward'}
      size={12}
      color="#fff"
      style={styles.ctaOk}
    />
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ctaDis, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={t('anaSayfa.dahaFazlaOzellikA11y')}
    >
      <LinearGradient
        colors={[...premiumCtaGradient()]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cta}
      >
        {rtl ? (
          <>
            {ok}
            {copy}
            {ikon}
          </>
        ) : (
          <>
            {ikon}
            {copy}
            {ok}
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

/** Menü öğelerini yardım / yayın / hesap / keşif gruplarına ayır.
 * Remote `groupId` + `sortOrder` varsa onları kullanır; yoksa key fallback. */
export function menuGruplarinaBol(
  ogeler: AnaSayfaMenuOgesi[],
  etiketler: {
    yardim: string;
    yayin: string;
    hesap: string;
    kesfet: string;
    yonetim: string;
  },
): MenuGrubu[] {
  const etiketMap: Record<string, string> = {
    yardim: etiketler.yardim,
    yayin: etiketler.yayin,
    hesap: etiketler.hesap,
    kesfet: etiketler.kesfet,
    yonetim: etiketler.yonetim,
  };

  const remoteIle = ogeler.some((o) => !!o.groupId);
  if (remoteIle) {
    const siraliGruplar = ['yardim', 'yayin', 'hesap', 'kesfet', 'yonetim'];
    const buckets = new Map<string, AnaSayfaMenuOgesi[]>();
    for (const id of siraliGruplar) buckets.set(id, []);
    for (const o of ogeler) {
      const gid = o.groupId && etiketMap[o.groupId] ? o.groupId : 'kesfet';
      if (!buckets.has(gid)) buckets.set(gid, []);
      buckets.get(gid)!.push(o);
    }
    for (const list of buckets.values()) {
      list.sort(
        (a, b) =>
          (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
          a.key.localeCompare(b.key),
      );
    }
    return siraliGruplar
      .map((id) => ({
        id,
        baslik: etiketMap[id] ?? id,
        ogeler: buckets.get(id) ?? [],
      }))
      .filter((g) => g.ogeler.length > 0);
  }

  const yardimKeys = new Set(['asistan', 'destek', 'bildir', 'fikir']);
  const odaKeys = new Set(['live', 'pk']);
  const hesapKeys = new Set(['agency_manage', 'host']);
  const kesfetKeys = new Set([
    'official_city_rooms',
    'city_league',
    'country_league',
    'ulke_ligi',
    'events',
    'creators_for_you',
    'kesfet',
    'ranks',
    'ai_muzik',
    'kisiler',
  ]);
  const adminKeys = new Set(['admin_oyun_test', 'admin_panel']);

  const al = (keys: Set<string>) =>
    [...keys]
      .map((k) => ogeler.find((o) => o.key === k))
      .filter((o): o is AnaSayfaMenuOgesi => !!o);

  const kullanilan = new Set([
    ...yardimKeys,
    ...odaKeys,
    ...hesapKeys,
    ...kesfetKeys,
    ...adminKeys,
  ]);
  const diger = ogeler.filter((o) => !kullanilan.has(o.key));

  return [
    { id: 'yardim', baslik: etiketler.yardim, ogeler: al(yardimKeys) },
    { id: 'yayin', baslik: etiketler.yayin, ogeler: al(odaKeys) },
    { id: 'hesap', baslik: etiketler.hesap, ogeler: al(hesapKeys) },
    { id: 'kesfet', baslik: etiketler.kesfet, ogeler: [...al(kesfetKeys), ...diger] },
    { id: 'yonetim', baslik: etiketler.yonetim, ogeler: al(adminKeys) },
  ].filter((g) => g.ogeler.length > 0);
}

const styles = StyleSheet.create({
  grup: {
    alignSelf: 'stretch',
    width: '100%',
    marginBottom: 6,
    gap: 2,
  },
  grupBaslik: {
    ...TipografiTokenlari.micro,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: RenkTokenlari.textDim,
    marginBottom: 2,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  liste: {
    alignSelf: 'stretch',
    width: '100%',
    gap: 0,
  },
  /** LTR kilit — Yoga RTL flex aynalamasın; sıra JSX’te */
  satir: {
    direction: 'ltr',
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  satirPressed: {
    backgroundColor: RenkTokenlari.pressFill,
  },
  ikonWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  baslik: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: RenkTokenlari.text,
  },
  yaziSatir: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  baslikEsnek: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  rozet: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.accent,
  },
  rozetYazi: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  ctaDis: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 4,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
  },
  cta: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  ctaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexGrow: 0,
    flexShrink: 0,
  },
  ctaCopy: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: 1,
    overflow: 'hidden',
  },
  ctaBaslik: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 15,
  },
  ctaAlt: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    lineHeight: 13,
  },
  ctaOk: { flexGrow: 0, flexShrink: 0 },
});
