import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import {
  MusicAdminArchive,
  MusicAdminAudioYukle,
  MusicAdminCoverYukle,
  MusicAdminCreate,
  MusicAdminDashboard,
  MusicAdminList,
  MusicAdminPublish,
  MusicAdminSetActive,
  MusicAdminUpdate,
  MusicCategories,
  msMetni,
  type MusicTrackRow,
} from '../../oda-muzik/islemler/OdaMuzikApi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

export function AdminMuzikPaneli() {
  const { t } = useCeviri();
  const [liste, setListe] = useState<MusicTrackRow[]>([]);
  const [dash, setDash] = useState<Record<string, number> | null>(null);
  const [kategoriler, setKategoriler] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [audio, setAudio] = useState<{
    url: string;
    path: string;
    mime: string;
    ext: string;
  } | null>(null);
  const [cover, setCover] = useState<{ url: string; path: string } | null>(null);
  const [rightsAck, setRightsAck] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [filtre, setFiltre] = useState('');
  const [previewCalıyor, setPreviewCalıyor] = useState(false);
  const previewRef = useRef<{
    play: () => void;
    pause?: () => void;
    remove?: () => void;
    release?: () => void;
  } | null>(null);

  const previewDurdur = useCallback(() => {
    const p = previewRef.current;
    previewRef.current = null;
    setPreviewCalıyor(false);
    if (!p) return;
    try {
      p.pause?.();
    } catch {
      /* noop */
    }
    try {
      p.remove?.();
    } catch {
      /* noop */
    }
    try {
      p.release?.();
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => () => previewDurdur(), [previewDurdur]);

  const yukle = useCallback(async () => {
    setBusy(true);
    try {
      const [l, d, c] = await Promise.all([
        MusicAdminList(),
        MusicAdminDashboard(),
        MusicCategories(),
      ]);
      setListe(Array.isArray(l) ? l : []);
      setDash(d);
      setKategoriler((c ?? []).map((x) => ({ id: x.id, name: x.name })));
    } catch (e) {
      Alert.alert(
        t('odaMuzik.alertMuzik'),
        e instanceof Error ? e.message : t('odaMuzik.yuklenemedi'),
      );
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const sesSec = async () => {
    if (busy) return;
    setBusy(true);
    setProgress(0);
    try {
      const r = await MusicAdminAudioYukle((p) => setProgress(p));
      setAudio({
        url: r.audioUrl,
        path: r.storagePath,
        mime: r.mimeType,
        ext: r.fileExt,
      });
      if (!title.trim()) setTitle(r.suggestedTitle);
      if (!durationMs) setDurationMs(180000);
    } catch (e) {
      if (e instanceof Error && e.message === 'IPTAL') return;
      Alert.alert(
        t('odaMuzik.alertSes'),
        e instanceof Error ? e.message : t('odaMuzik.yuklenemedi'),
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const kapakSec = async () => {
    try {
      const r = await MusicAdminCoverYukle();
      if (r) setCover({ url: r.coverUrl, path: r.storagePath });
    } catch (e) {
      Alert.alert(
        t('odaMuzik.alertKapak'),
        e instanceof Error ? e.message : t('odaMuzik.yuklenemedi'),
      );
    }
  };

  const kaydetYayinla = async () => {
    if (!audio?.url) {
      Alert.alert(t('odaMuzik.alertMuzik'), t('odaMuzik.onceSesYukle'));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t('odaMuzik.alertMuzik'), t('odaMuzik.adZorunlu'));
      return;
    }
    if (!rightsAck) {
      Alert.alert(t('odaMuzik.alertLisans'), t('odaMuzik.haklariOnayla'));
      return;
    }
    if (!durationMs || durationMs <= 0) {
      Alert.alert(t('odaMuzik.alertMuzik'), t('odaMuzik.sureGerekli'));
      return;
    }
    setBusy(true);
    try {
      const created = await MusicAdminCreate({
        title: title.trim(),
        artist_name: artist.trim() || null,
        audio_url: audio.url,
        audio_storage_path: audio.path,
        cover_url: cover?.url ?? null,
        cover_storage_path: cover?.path ?? null,
        mime_type: audio.mime,
        file_ext: audio.ext,
        duration_ms: durationMs,
        category_id: categoryId,
        tags: [],
        status: 'PROCESSING',
        rights_ack: true,
        rights_status: 'cleared',
      });
      await MusicAdminPublish(created.id, true);
      setTitle('');
      setArtist('');
      setAudio(null);
      setCover(null);
      setRightsAck(false);
      setDurationMs(null);
      await yukle();
      Alert.alert(t('odaMuzik.alertMuzik'), t('odaMuzik.yayinlandi'));
    } catch (e) {
      Alert.alert(
        t('odaMuzik.alertMuzik'),
        e instanceof Error ? e.message : t('odaMuzik.kayitBasarisiz'),
      );
    } finally {
      setBusy(false);
    }
  };

  const filtreli = liste.filter((tRow) => {
    const q = filtre.trim().toLowerCase();
    if (!q) return true;
    return (
      tRow.title.toLowerCase().includes(q) ||
      (tRow.artist_name ?? '').toLowerCase().includes(q) ||
      tRow.id.toLowerCase().includes(q)
    );
  });

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>{t('odaMuzik.adminMerkez')}</Text>
      {dash ? (
        <View style={styles.dash}>
          {[
            [t('odaMuzik.dashToplam'), dash.toplam],
            [t('odaMuzik.dashAktif'), dash.aktif],
            [t('odaMuzik.dashPasif'), dash.pasif],
            [t('odaMuzik.dashArsiv'), dash.arsiv],
          ].map(([l, v]) => (
            <View key={String(l)} style={styles.dashKart}>
              <Text style={styles.dashN}>{v ?? 0}</Text>
              <Text style={styles.dashL}>{l}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.bolum}>{t('odaMuzik.muzikEkle')}</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={t('odaMuzik.phAd')}
        placeholderTextColor={RenkTokenlari.textDim}
      />
      <TextInput
        style={styles.input}
        value={artist}
        onChangeText={setArtist}
        placeholder={t('odaMuzik.phSanatci')}
        placeholderTextColor={RenkTokenlari.textDim}
      />
      <TextInput
        style={styles.input}
        value={durationMs != null ? String(Math.round(durationMs / 1000)) : ''}
        onChangeText={(txt) => {
          const sn = Number(txt);
          setDurationMs(Number.isFinite(sn) && sn > 0 ? Math.round(sn * 1000) : null);
        }}
        keyboardType="number-pad"
        placeholder={t('odaMuzik.phSure')}
        placeholderTextColor={RenkTokenlari.textDim}
      />

      {kategoriler.length > 0 ? (
        <View style={styles.chipRow}>
          {kategoriler.map((k) => (
            <Pressable
              key={k.id}
              style={[styles.chip, categoryId === k.id && styles.chipAktif]}
              onPress={() => setCategoryId(categoryId === k.id ? null : k.id)}
            >
              <Text style={styles.chipYazi}>{k.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.btn} onPress={() => void sesSec()} disabled={busy}>
        <Ionicons name="musical-notes" size={16} color={RenkTokenlari.textOnPrimary} />
        <Text style={styles.btnYazi}>
          {progress != null
            ? t('odaMuzik.yukleniyorPct', { n: progress })
            : audio
              ? t('odaMuzik.sesDegistir')
              : t('odaMuzik.sesDosyasi')}
        </Text>
      </Pressable>
      <Text style={styles.hint}>{t('odaMuzik.formatHint')}</Text>
      {audio ? (
        <Text style={styles.hint}>
          {t('odaMuzik.sesBilgi', { ext: audio.ext, path: audio.path })}
        </Text>
      ) : null}
      {audio?.url ? (
        <Pressable
          style={styles.btnGhost}
          onPress={() => {
            if (previewCalıyor) {
              previewDurdur();
              return;
            }
            try {
              previewDurdur();
              const p = createAudioPlayer({ uri: audio.url }) as {
                play: () => void;
                pause?: () => void;
                remove?: () => void;
                release?: () => void;
                volume?: number;
              };
              p.volume = 0.45;
              previewRef.current = p;
              p.play();
              setPreviewCalıyor(true);
            } catch (e) {
              Alert.alert(
                t('odaMuzik.alertOnizleme'),
                e instanceof Error ? e.message : t('odaMuzik.calinamadi'),
              );
            }
          }}
        >
          <Text style={styles.btnGhostYazi}>
            {previewCalıyor ? t('odaMuzik.onizlemeDurdur') : t('odaMuzik.sesOnizle')}
          </Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.btnGhost} onPress={() => void kapakSec()} disabled={busy}>
        <Text style={styles.btnGhostYazi}>
          {cover ? t('odaMuzik.kapakDegistir') : t('odaMuzik.kapakOpsiyonel')}
        </Text>
      </Pressable>

      <View style={styles.ackRow}>
        <Switch value={rightsAck} onValueChange={setRightsAck} />
        <Text style={styles.ackYazi}>{t('odaMuzik.hakOnay')}</Text>
      </View>

      <Pressable
        style={[styles.btn, busy && { opacity: 0.6 }]}
        onPress={() => void kaydetYayinla()}
        disabled={busy}
      >
        <Text style={styles.btnYazi}>
          {busy ? '…' : t('odaMuzik.kaydetYayinla')}
        </Text>
      </Pressable>

      <Text style={styles.bolum}>{t('odaMuzik.kutuphane')}</Text>
      <TextInput
        style={styles.input}
        value={filtre}
        onChangeText={setFiltre}
        placeholder={t('odaMuzik.araAdminPh')}
        placeholderTextColor={RenkTokenlari.textDim}
      />
      {busy && liste.length === 0 ? (
        <ActivityIndicator color={RenkTokenlari.primarySoft} />
      ) : (
        filtreli.map((track) => (
          <View key={track.id} style={styles.kart}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ad}>{track.title}</Text>
              <Text style={styles.alt}>
                {track.artist_name || '—'} · {msMetni(track.duration_ms)} · {track.status}
              </Text>
            </View>
            <Switch
              value={track.is_active && track.status === 'READY'}
              onValueChange={(v) => {
                void (async () => {
                  try {
                    if (track.status !== 'READY') {
                      await MusicAdminUpdate(track.id, {
                        duration_ms: track.duration_ms,
                      });
                      await MusicAdminPublish(track.id, v);
                    } else {
                      await MusicAdminSetActive(track.id, v);
                    }
                    await yukle();
                  } catch (e) {
                    Alert.alert(
                      t('odaMuzik.alertMuzik'),
                      e instanceof Error ? e.message : t('ortak.hata'),
                    );
                  }
                })();
              }}
            />
            <Pressable
              onPress={() => {
                Alert.alert(t('odaMuzik.arsivle'), track.title, [
                  { text: t('ortak.vazgec'), style: 'cancel' },
                  {
                    text: t('odaMuzik.arsivle'),
                    style: 'destructive',
                    onPress: () => {
                      void MusicAdminArchive(track.id)
                        .then(yukle)
                        .catch((e) =>
                          Alert.alert(
                            t('odaMuzik.alertMuzik'),
                            e instanceof Error ? e.message : t('ortak.hata'),
                          ),
                        );
                    },
                  },
                ]);
              }}
              hitSlop={8}
            >
              <Ionicons name="archive-outline" size={18} color={RenkTokenlari.textDim} />
            </Pressable>
          </View>
        ))
      )}
      <Pressable style={styles.yenile} onPress={() => void yukle()}>
        <Text style={styles.yenileYazi}>{t('ortak.yenile')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.xxxl,
  },
  h1: { ...TipografiTokenlari.h1, color: RenkTokenlari.text, fontWeight: '800' },
  bolum: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    marginTop: BoslukTokenlari.md,
  },
  dash: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dashKart: {
    flexGrow: 1,
    minWidth: '22%',
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    padding: 10,
    alignItems: 'center',
  },
  dashN: { ...TipografiTokenlari.h2, color: RenkTokenlari.primarySoft, fontWeight: '800' },
  dashL: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  input: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.surface,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipAktif: { borderColor: RenkTokenlari.borderAccent },
  chipYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.text },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 12,
  },
  btnYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnGhostYazi: { ...TipografiTokenlari.body, color: RenkTokenlari.text },
  hint: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  ackRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  ackYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, flex: 1 },
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.divider,
  },
  ad: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  alt: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  yenile: { alignSelf: 'center', padding: 12 },
  yenileYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.primarySoft },
});
