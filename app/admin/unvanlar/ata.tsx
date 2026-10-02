import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { GradientButton } from '../../../src/components/GradientButton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminKullaniciOneri,
  OneriAdi,
  type AdminKullaniciOneriSatiri,
} from '../../../src/moduller/admin/kullanici/okuma/AdminKullaniciOneri';
import {
  AdminUnvanAta,
  AdminUnvanDetay,
  AdminUnvanTopluAta,
} from '../../../src/moduller/unvanlar/islemler/UnvanAdminIslemleri';
import { UserTitleBadge } from '../../../src/moduller/unvanlar/bilesenler/UserTitleBadge';
import type { UnvanKayit } from '../../../src/moduller/unvanlar/tipler';
import { MedyaUriGuvenli } from '../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type SureModu = 'permanent' | '1d' | '7d' | '30d' | '90d' | 'custom';

const SURELER: { id: SureModu; label: string }[] = [
  { id: 'permanent', label: 'Kalıcı' },
  { id: '1d', label: '1 gün' },
  { id: '7d', label: '7 gün' },
  { id: '30d', label: '30 gün' },
  { id: '90d', label: '90 gün' },
  { id: 'custom', label: 'Özel tarih' },
];

function expiresFor(mod: SureModu, customIso: string): string | null {
  if (mod === 'permanent') return null;
  if (mod === 'custom') {
    const d = new Date(customIso);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  const days = mod === '1d' ? 1 : mod === '7d' ? 7 : mod === '30d' ? 30 : 90;
  return new Date(Date.now() + days * 86400000).toISOString();
}

function Avatar({
  url,
  ad,
  size = 36,
}: {
  url?: string | null;
  ad: string;
  size?: number;
}) {
  const harf = (ad.trim() || '?').charAt(0).toLocaleUpperCase('tr-TR');
  const safe = MedyaUriGuvenli(url);
  if (safe) {
    return (
      <Image
        source={{ uri: safe }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: 'rgba(232,64,145,0.35)',
        }}
      />
    );
  }
  return (
    <LinearGradient
      colors={[...RenkTokenlari.gradientPrimary]}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#12040C', fontWeight: '900', fontSize: size * 0.36 }}>
        {harf}
      </Text>
    </LinearGradient>
  );
}

export default function AdminUnvanAtaEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const params = useLocalSearchParams<{ titleId?: string }>();
  const titleId = typeof params.titleId === 'string' ? params.titleId : '';

  const [title, setTitle] = useState<UnvanKayit | null>(null);
  const [q, setQ] = useState('');
  const [oneriler, setOneriler] = useState<AdminKullaniciOneriSatiri[]>([]);
  const [secilenler, setSecilenler] = useState<AdminKullaniciOneriSatiri[]>([]);
  const [sure, setSure] = useState<SureModu>('permanent');
  const [customDate, setCustomDate] = useState('');
  const [setSelected, setSetSelected] = useState(true);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [notify, setNotify] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [araniyor, setAraniyor] = useState(false);

  useEffect(() => {
    if (!admin) {
      router.replace('/(tabs)/profile');
      return;
    }
    if (!titleId) {
      Alert.alert('Eksik', 'titleId gerekli');
      router.back();
      return;
    }
    void AdminUnvanDetay(titleId).then((res) => {
      if (res.title) setTitle(res.title);
    });
  }, [admin, titleId]);

  useEffect(() => {
    const t = setTimeout(() => {
      const sorgu = q.trim();
      if (sorgu.length < 1) {
        setOneriler([]);
        return;
      }
      setAraniyor(true);
      void AdminKullaniciOneri(sorgu, 10)
        .then(setOneriler)
        .finally(() => setAraniyor(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const seciliIds = useMemo(
    () => new Set(secilenler.map((s) => s.id)),
    [secilenler],
  );

  const toggle = useCallback((k: AdminKullaniciOneriSatiri) => {
    setSecilenler((prev) => {
      if (prev.some((p) => p.id === k.id)) {
        return prev.filter((p) => p.id !== k.id);
      }
      return [...prev, k];
    });
  }, []);

  const ata = async () => {
    if (!titleId || secilenler.length === 0) {
      Alert.alert('Eksik', 'En az bir kullanıcı seç.');
      return;
    }
    const expiresAt = expiresFor(sure, customDate);
    if (sure === 'custom' && !expiresAt) {
      Alert.alert('Tarih', 'Geçerli bir bitiş tarihi gir (YYYY-MM-DD).');
      return;
    }
    setBusy(true);
    try {
      if (secilenler.length === 1) {
        const res = await AdminUnvanAta({
          userId: secilenler[0]!.id,
          titleId,
          expiresAt,
          setSelected,
          selectionLocked,
          reason: reason.trim() || null,
          notifyUser: notify,
        });
        if (!res.ok) {
          Alert.alert('Hata', res.hata ?? 'Atanamadı');
          return;
        }
        Alert.alert('Tamam', 'Ünvan atandı.');
      } else {
        const res = await AdminUnvanTopluAta({
          userIds: secilenler.map((s) => s.id),
          titleId,
          expiresAt,
          setSelected,
          selectionLocked,
          reason: reason.trim() || null,
          notifyUser: notify,
        });
        if (!res.ok) {
          Alert.alert('Hata', res.hata ?? 'Toplu atama başarısız');
          return;
        }
        Alert.alert(
          'Tamam',
          `${res.success_count ?? 0} başarılı · ${res.fail_count ?? 0} hata`,
        );
      }
      setSecilenler([]);
      setQ('');
      setOneriler([]);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Atanamadı');
    } finally {
      setBusy(false);
    }
  };

  if (!admin) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Ünvan Ata"
        subtitle={title?.name ?? titleId}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
      >
        {title ? (
          <View style={styles.titleRow}>
            <UserTitleBadge design={title.design} label={title.name} />
            <Text style={styles.titleMeta}>{title.slug}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Kullanıcı ara</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Kullanıcı adı · görünen ad · public id"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
          autoCapitalize="none"
        />
        {araniyor ? (
          <ActivityIndicator color={RenkTokenlari.primary} />
        ) : null}

        {secilenler.length > 0 ? (
          <View style={styles.chipWrap}>
            {secilenler.map((s) => (
              <Pressable
                key={s.id}
                style={styles.seciliChip}
                onPress={() => toggle(s)}
              >
                <Text style={styles.seciliChipText} numberOfLines={1}>
                  {OneriAdi(s)}
                </Text>
                <Ionicons name="close" size={14} color={RenkTokenlari.text} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {oneriler.map((k) => {
          const ad = OneriAdi(k);
          const secili = seciliIds.has(k.id);
          return (
            <Pressable
              key={k.id}
              style={[styles.userRow, secili && styles.userRowAktif]}
              onPress={() => toggle(k)}
            >
              <Avatar url={k.avatar_url} ad={ad} />
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>
                  {ad}
                </Text>
                <Text style={styles.userMeta} numberOfLines={1}>
                  {k.username ? `@${k.username}` : k.id.slice(0, 8)}
                </Text>
              </View>
              <Ionicons
                name={secili ? 'checkmark-circle' : 'add-circle-outline'}
                size={22}
                color={secili ? RenkTokenlari.mint : RenkTokenlari.textMuted}
              />
            </Pressable>
          );
        })}

        <Text style={styles.label}>Süre</Text>
        <View style={styles.chipWrap}>
          {SURELER.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.chip, sure === s.id && styles.chipAktif]}
              onPress={() => setSure(s.id)}
            >
              <Text
                style={[styles.chipYazi, sure === s.id && styles.chipYaziAktif]}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {sure === 'custom' ? (
          <TextInput
            value={customDate}
            onChangeText={setCustomDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={RenkTokenlari.textDim}
            style={styles.input}
            autoCapitalize="none"
          />
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Seçili yap (profilde göster)</Text>
          <Switch
            value={setSelected}
            onValueChange={setSetSelected}
            trackColor={{ true: RenkTokenlari.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Seçim kilitli</Text>
          <Switch
            value={selectionLocked}
            onValueChange={setSelectionLocked}
            trackColor={{ true: RenkTokenlari.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Bildirim gönder</Text>
          <Switch
            value={notify}
            onValueChange={setNotify}
            trackColor={{ true: RenkTokenlari.primary }}
          />
        </View>

        <Text style={styles.label}>Sebep</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Opsiyonel not"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.input}
        />

        <GradientButton
          title={
            busy
              ? 'Atanıyor…'
              : secilenler.length > 1
                ? `${secilenler.length} kişiye ata`
                : 'Ata'
          }
          onPress={() => void ata()}
          disabled={busy || secilenler.length === 0}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleMeta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  label: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipAktif: {
    backgroundColor: 'rgba(232,64,145,0.22)',
    borderColor: RenkTokenlari.borderAccent,
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  chipYaziAktif: {
    color: RenkTokenlari.text,
  },
  seciliChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '48%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(232,64,145,0.22)',
  },
  seciliChipText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    flexShrink: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  userRowAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: 'rgba(232,64,145,0.12)',
  },
  userName: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  userMeta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchLabel: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    flex: 1,
    paddingRight: 12,
  },
});
