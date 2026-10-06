import React from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  LAUNCH_NAV,
  PLATFORM_LABELS,
  STATUS_LABELS,
  publicUrls,
  storeButtonLabel,
  type LaunchApp,
  type LaunchPlatform,
  type LaunchSection,
  type LaunchStatus,
} from '../tipler';
import { RenkTokenlari } from '../../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

export function LaunchNav() {
  const path = usePathname();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.navRow}
    >
      {LAUNCH_NAV.map((n) => {
        const active =
          n.href === '/admin/app-launch'
            ? path === '/admin/app-launch' || path === '/admin/app-launch/'
            : path?.startsWith(n.href);
        return (
          <Pressable
            key={n.href}
            onPress={() => router.push(n.href as any)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Ionicons
              name={n.icon}
              size={13}
              color={active ? RenkTokenlari.text : RenkTokenlari.textMuted}
            />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {n.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function StatusPill({ status }: { status: LaunchStatus | string }) {
  const s = (status || 'draft') as LaunchStatus;
  const tone =
    s === 'published'
      ? RenkTokenlari.mint
      : s === 'coming_soon' || s === 'scheduled'
        ? RenkTokenlari.accent
        : s === 'archived'
          ? RenkTokenlari.textDim
          : RenkTokenlari.primarySoft;
  return (
    <View style={[styles.pill, { borderColor: tone + '66', backgroundColor: tone + '18' }]}>
      <Text style={[styles.pillText, { color: tone }]}>
        {STATUS_LABELS[s] ?? status}
      </Text>
    </View>
  );
}

export function PlatformPills({
  platforms,
}: {
  platforms: LaunchPlatform[] | string[] | null | undefined;
}) {
  const list = (platforms ?? []) as LaunchPlatform[];
  if (!list.length) {
    return <Text style={styles.muted}>—</Text>;
  }
  return (
    <View style={styles.pillRow}>
      {list.map((p) => (
        <View key={p} style={styles.platPill}>
          <Text style={styles.platText}>{PLATFORM_LABELS[p] ?? p}</Text>
        </View>
      ))}
    </View>
  );
}

type StoreButtonsProps = {
  appStoreUrl?: string | null;
  playStoreUrl?: string | null;
  onTrack?: (platform: 'ios' | 'android') => void;
  compact?: boolean;
};

export function StoreButtons({
  appStoreUrl,
  playStoreUrl,
  onTrack,
  compact,
}: StoreButtonsProps) {
  const open = async (platform: 'ios' | 'android', url?: string | null) => {
    if (!url?.trim()) return;
    onTrack?.(platform);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link', 'Could not open store URL.');
    }
  };

  return (
    <View style={[styles.storeRow, compact && { gap: 8 }]}>
      {appStoreUrl?.trim() ? (
        <Pressable
          onPress={() => void open('ios', appStoreUrl)}
          style={[styles.storeBtn, styles.storeIos]}
        >
          <Ionicons name="logo-apple" size={18} color="#fff" />
          <View>
            <Text style={styles.storeTiny}>Download on the</Text>
            <Text style={styles.storeLabel}>{storeButtonLabel('ios')}</Text>
          </View>
        </Pressable>
      ) : null}
      {playStoreUrl?.trim() ? (
        <Pressable
          onPress={() => void open('android', playStoreUrl)}
          style={[styles.storeBtn, styles.storeAndroid]}
        >
          <Ionicons name="logo-google-playstore" size={18} color="#fff" />
          <View>
            <Text style={styles.storeTiny}>Get it on</Text>
            <Text style={styles.storeLabel}>{storeButtonLabel('android')}</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PublicLinksPanel({ slug }: { slug: string }) {
  if (!slug?.trim()) {
    return (
      <Text style={styles.muted}>Slug kaydedildikten sonra public linkler görünür.</Text>
    );
  }
  const urls = publicUrls(slug);
  const rows: Array<{ label: string; url: string }> = [
    { label: 'Showcase', url: urls.showcase },
    { label: 'Privacy', url: urls.privacy },
    { label: 'Terms', url: urls.terms },
    { label: 'Child Safety', url: urls.childSafety },
    { label: 'Account Deletion', url: urls.accountDeletion },
    { label: 'Support', url: urls.support },
    { label: 'Download', url: urls.download },
    { label: 'Smart Redirect', url: urls.smartRedirect },
    { label: 'In-app', url: urls.inAppShowcase },
  ];

  const copy = async (url: string) => {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(url);
      Alert.alert('Kopyalandı', url);
    } catch {
      Alert.alert('Link', url);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>PUBLIC LINKS</Text>
      {rows.map((r) => (
        <View key={r.label} style={styles.linkRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkLabel}>{r.label}</Text>
            <Text style={styles.linkUrl} numberOfLines={1}>
              {r.url}
            </Text>
          </View>
          <Pressable onPress={() => void copy(r.url)} style={styles.iconBtn}>
            <Ionicons name="copy-outline" size={16} color={RenkTokenlari.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (r.url.startsWith('/')) router.push(r.url as any);
              else void Linking.openURL(r.url);
            }}
            style={styles.iconBtn}
          >
            <Ionicons name="open-outline" size={16} color={RenkTokenlari.text} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export function PublishChecklist({
  errors,
  ok,
}: {
  errors: string[];
  ok: boolean;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>PUBLISH CHECKLIST</Text>
      {ok ? (
        <Text style={[styles.body, { color: RenkTokenlari.mint }]}>
          All required fields look good. You can publish.
        </Text>
      ) : (
        errors.map((e) => (
          <View key={e} style={styles.checkRow}>
            <Ionicons name="close-circle" size={16} color={RenkTokenlari.danger} />
            <Text style={[styles.body, { flex: 1, color: RenkTokenlari.danger }]}>{e}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export function SectionToggleList({
  sections,
  onChange,
}: {
  sections: LaunchSection[];
  onChange: (next: LaunchSection[]) => void;
}) {
  const move = (index: number, dir: -1 | 1) => {
    const next = [...sections];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index];
    next[index] = next[j];
    next[j] = tmp;
    onChange(next.map((s, i) => ({ ...s, sort_order: i })));
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>SECTIONS</Text>
      {sections.map((s, i) => (
        <View key={`${s.key}-${i}`} style={styles.sectionRow}>
          <Switch
            value={s.enabled !== false}
            onValueChange={(v) => {
              const next = [...sections];
              next[i] = { ...s, enabled: v };
              onChange(next);
            }}
          />
          <Text style={[styles.body, { flex: 1 }]}>{s.title || s.key}</Text>
          <Pressable onPress={() => move(i, -1)} style={styles.iconBtn}>
            <Ionicons name="chevron-up" size={16} color={RenkTokenlari.textMuted} />
          </Pressable>
          <Pressable onPress={() => move(i, 1)} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={16} color={RenkTokenlari.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export function LaunchKpi({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiL}>{label}</Text>
      <Text style={styles.kpiN}>{value}</Text>
    </View>
  );
}

export function formatUpdated(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return '—';
  }
}

export function appRowMeta(app: LaunchApp): string {
  const v = app.version || '—';
  const views = app.views ?? app.analytics?.page_views ?? 0;
  const clicks = app.store_clicks ?? app.analytics?.store_clicks_total ?? 0;
  return `v${v} · ${views} views · ${clicks} store`;
}

const styles = StyleSheet.create({
  navRow: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: BoslukTokenlari.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  chipActive: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  chipText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: RenkTokenlari.text,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  pillText: {
    ...TipografiTokenlari.micro,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  platPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  platText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  storeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  storeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 180,
  },
  storeIos: { backgroundColor: '#000' },
  storeAndroid: { backgroundColor: '#01875F' },
  storeTiny: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '500',
  },
  storeLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  panel: {
    borderRadius: YaricapTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    padding: BoslukTokenlari.md,
    gap: 10,
  },
  panelTitle: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkLabel: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  linkUrl: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  body: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
  },
  muted: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  kpi: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 4,
  },
  kpiL: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  kpiN: {
    ...TipografiTokenlari.title,
    fontSize: 20,
    color: RenkTokenlari.text,
  },
});
