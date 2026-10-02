import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MesajLinkOnizleme } from '../okuma/MesajlariGetir';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { MedyaUriGuvenli } from '../yardimcilar/MedyaUriGecerliMi';
import {
  MesajUrlHostGoster,
  MesajUrlHostHam,
  MesajUrlNormalize,
} from '../yardimcilar/MesajUrlAyikla';
import { MesajLinkAc } from '../islemler/MesajLinkAc';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';

type Props = {
  preview?: MesajLinkOnizleme | null;
  url?: string | null;
  mine: boolean;
  /** Composer taslak önizlemesi */
  compact?: boolean;
  loading?: boolean;
  onKapat?: () => void;
};

function urlKisalt(url: string, max = 64): string {
  try {
    const u = new URL(url);
    const path =
      u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    const full = `${u.hostname}${path}${u.search ? '…' : ''}`;
    if (full.length <= max) return full;
    return `${full.slice(0, max - 1)}…`;
  } catch {
    return url.length <= max ? url : `${url.slice(0, max - 1)}…`;
  }
}

/**
 * Link önizleme kartı — görsel + tam site adı + URL (kesilmeden okunur).
 * Şeffaf cam; dikey düzen, ölçülü yükseklik.
 */
export function MesajLinkOnizlemeKarti({
  preview,
  url,
  mine,
  compact = false,
  loading = false,
  onKapat,
}: Props) {
  const { t } = useCeviri();
  const hedef =
    MesajUrlNormalize(url || preview?.url || '') ||
    url ||
    preview?.url ||
    null;
  if (!hedef) return null;

  const img = MedyaUriGuvenli(preview?.image_url);
  const hostDost = MesajUrlHostGoster(hedef);
  const hostHam = MesajUrlHostHam(hedef);
  const siteEtiket =
    (preview?.site_name || '').trim() || hostDost || hostHam;
  const metinRenk = mine
    ? 'rgba(255,255,255,0.95)'
    : RenkTokenlari.text;
  const muted = mine
    ? 'rgba(255,255,255,0.62)'
    : RenkTokenlari.textMuted;

  if (compact) {
    return (
      <View
        style={[styles.kart, styles.kartComposer]}
        accessibilityLabel={t('mesajV2.linkPreviewA11y')}
      >
        {img ? (
          <Image source={{ uri: img }} style={styles.composerThumb} />
        ) : (
          <View style={styles.composerThumbYok}>
            <Ionicons
              name={loading ? 'hourglass-outline' : 'link-outline'}
              size={20}
              color={muted}
            />
          </View>
        )}
        <View style={styles.composerGovde}>
          <View style={styles.baslikSatir}>
            <Text style={[styles.site, { color: muted }]} numberOfLines={1}>
              {siteEtiket}
              {hostHam &&
              hostHam.toLowerCase() !== siteEtiket.toLowerCase()
                ? ` · ${hostHam}`
                : ''}
            </Text>
            {onKapat ? (
              <Pressable
                onPress={onKapat}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('mesajV2.cancel')}
              >
                <Ionicons name="close" size={16} color={muted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.title, { color: metinRenk }]} numberOfLines={2}>
            {loading
              ? t('mesajV2.linkPreviewYukleniyor')
              : preview?.title || siteEtiket}
          </Text>
          <Text style={[styles.url, { color: muted }]} numberOfLines={2}>
            {urlKisalt(hedef, 72)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        void MesajLinkAc(hedef);
      }}
      style={[styles.kart, mine ? styles.kartMine : styles.kartTheirs]}
      accessibilityRole="link"
      accessibilityLabel={t('mesajV2.linkPreviewA11y')}
    >
      {img ? (
        <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
      ) : (
        <View style={styles.imgYok}>
          <Ionicons name="link-outline" size={22} color={muted} />
          <Text style={[styles.imgYokHost, { color: muted }]} numberOfLines={1}>
            {hostDost}
          </Text>
        </View>
      )}
      <View style={styles.govde}>
        <Text style={[styles.site, { color: muted }]} numberOfLines={1}>
          {siteEtiket}
          {hostHam &&
          hostHam.toLowerCase() !== siteEtiket.toLowerCase()
            ? ` · ${hostHam}`
            : ''}
        </Text>
        <Text style={[styles.title, { color: metinRenk }]} numberOfLines={2}>
          {preview?.title || siteEtiket || t('mesajV2.linkPreviewA11y')}
        </Text>
        {preview?.description ? (
          <Text style={[styles.desc, { color: muted }]} numberOfLines={2}>
            {preview.description}
          </Text>
        ) : null}
        <Text style={[styles.url, { color: muted }]} numberOfLines={2}>
          {urlKisalt(hedef, 80)}
        </Text>
        <View style={styles.acSatir}>
          <Ionicons name="open-outline" size={12} color={muted} />
          <Text style={[styles.ac, { color: muted }]} numberOfLines={1}>
            {t('mesajV2.openLink')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    width: '100%',
    maxWidth: 300,
  },
  kartMine: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'flex-end',
  },
  kartTheirs: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-start',
  },
  kartComposer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    maxWidth: '100%',
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 72,
  },
  img: {
    width: '100%',
    height: 96,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  imgYok: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 10,
  },
  imgYokHost: {
    ...TipografiTokenlari.micro,
    fontWeight: '700',
    fontSize: 11,
  },
  govde: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 3,
    backgroundColor: 'transparent',
  },
  composerThumb: {
    width: 72,
    height: 72,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  composerThumbYok: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.10)',
  },
  composerGovde: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
    justifyContent: 'center',
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  site: {
    ...TipografiTokenlari.micro,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  title: {
    ...TipografiTokenlari.body,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  desc: {
    ...TipografiTokenlari.caption,
    fontSize: 12,
    lineHeight: 16,
  },
  url: {
    ...TipografiTokenlari.micro,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  acSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ac: {
    ...TipografiTokenlari.micro,
    fontWeight: '700',
    fontSize: 11,
  },
});
