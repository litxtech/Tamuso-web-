import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  MusicLibraryList,
  type MusicLibraryItem,
} from '../../oda-muzik/islemler/OdaMuzikApi';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';

type PlayerLike = {
  volume: number;
  loop?: boolean;
  play: () => void;
  pause?: () => void;
  remove?: () => void;
  release?: () => void;
};

let player: PlayerLike | null = null;
let calanId: string | null = null;
const dinleyiciler = new Set<(id: string | null) => void>();

function sesiToparla() {
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MedyaSesOturumunuYenile } = require('../../livekit/MedyaBaglantisi') as {
      MedyaSesOturumunuYenile: (zorla?: boolean) => void;
    };
    MedyaSesOturumunuYenile(true);
  } catch {
    /* yayın sesi duruyorsa dokunma */
  }
}

function bildir() {
  for (const fn of dinleyiciler) fn(calanId);
}

export function canliMuzikDurdur() {
  const p = player;
  player = null;
  calanId = null;
  bildir();
  if (!p) return;
  try {
    p.pause?.();
  } catch {
    /* */
  }
  try {
    p.remove?.();
  } catch {
    /* */
  }
  try {
    p.release?.();
  } catch {
    /* */
  }
  sesiToparla();
}

function canliMuzikCal(item: MusicLibraryItem): boolean {
  if (!item.audio_url) return false;
  if (calanId === item.id && player) {
    canliMuzikDurdur();
    return true;
  }
  canliMuzikDurdur();
  try {
    const p = createAudioPlayer(
      { uri: item.audio_url },
      { keepAudioSessionActive: true, updateInterval: 8000 },
    ) as PlayerLike;
    p.loop = true;
    p.volume = 0.38;
    p.play();
    player = p;
    calanId = item.id;
    bildir();
    sesiToparla();
    return true;
  } catch {
    canliMuzikDurdur();
    return false;
  }
}

export function useCanliMuzikCalan(): string | null {
  const [id, setId] = useState<string | null>(calanId);
  useEffect(() => {
    dinleyiciler.add(setId);
    setId(calanId);
    return () => {
      dinleyiciler.delete(setId);
    };
  }, []);
  return id;
}

/** Yayın ekranı kapanınca yerel müziği bırakır. */
export function CanliMuzikTemizlik() {
  useEffect(() => () => canliMuzikDurdur(), []);
  return null;
}

export function CanliMuzikButonu({ onPress }: { onPress: () => void }) {
  const { t } = useCeviri();
  const calan = useCanliMuzikCalan();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, calan ? styles.btnAktif : null]}
      accessibilityLabel={t('canliYayin.canliMuzik')}
      hitSlop={6}
    >
      <Ionicons
        name={calan ? 'musical-notes' : 'musical-notes-outline'}
        size={16}
        color="#fff"
      />
    </Pressable>
  );
}

type SheetProps = {
  onKapat: () => void;
};

/** Modal yok — Android'de kamera durmasın. Liste kapanınca parça çalmaya devam eder. */
export function CanliMuzikSheet({ onKapat }: SheetProps) {
  const { t } = useCeviri();
  const calan = useCanliMuzikCalan();
  const [liste, setListe] = useState<MusicLibraryItem[]>([]);
  const [q, setQ] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    const tmr = setTimeout(() => {
      setYukleniyor(true);
      void MusicLibraryList({ query: q.trim() || undefined, tab: 'all', limit: 24 })
        .then((rows) => {
          if (!iptal) setListe(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (!iptal) setListe([]);
        })
        .finally(() => {
          if (!iptal) setYukleniyor(false);
        });
    }, 250);
    return () => {
      iptal = true;
      clearTimeout(tmr);
    };
  }, [q]);

  return (
    <View style={styles.perde} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onKapat} />
      <View style={styles.kart}>
        <View style={styles.baslikSatir}>
          <Text style={styles.baslik}>{t('canliYayin.canliMuzik')}</Text>
          <Pressable onPress={onKapat} hitSlop={8} accessibilityLabel={t('ortak.kapat')}>
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('ortak.ara')}
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={styles.ara}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        {yukleniyor && liste.length === 0 ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <FlatList
            data={liste}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.liste}
            ListEmptyComponent={<Text style={styles.bos}>{t('canliYayin.canliMuzikBos')}</Text>}
            renderItem={({ item }) => {
              const kapak = MedyaUriGuvenli(item.cover_url);
              const aktif = calan === item.id;
              return (
                <Pressable
                  onPress={() => {
                    const ok = canliMuzikCal(item);
                    if (!ok) setHata(t('canliYayin.canliMuzikYok'));
                    else setHata(null);
                  }}
                  style={styles.satir}
                >
                  {kapak ? (
                    <Image source={{ uri: kapak }} style={styles.kapak} />
                  ) : (
                    <View style={[styles.kapak, styles.kapakBos]}>
                      <Ionicons name="musical-note" size={14} color="#fff" />
                    </View>
                  )}
                  <View style={styles.metin}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.sanatci} numberOfLines={1}>
                      {item.artist_name || 'Tamuso'}
                    </Text>
                  </View>
                  <Ionicons
                    name={aktif ? 'pause' : 'play'}
                    size={16}
                    color={aktif ? RenkTokenlari.accent : '#fff'}
                  />
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  btnAktif: {
    backgroundColor: 'rgba(240,180,41,0.35)',
    borderColor: 'rgba(240,180,41,0.8)',
  },
  perde: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 36,
  },
  kart: {
    marginHorizontal: 10,
    marginBottom: 12,
    maxHeight: 280,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(12,12,16,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: 8,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
  ara: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  liste: { flexGrow: 0 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  kapak: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  kapakBos: { alignItems: 'center', justifyContent: 'center' },
  metin: { flex: 1, minWidth: 0 },
  ad: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sanatci: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.6)',
  },
  bos: {
    color: 'rgba(255,255,255,0.6)',
    paddingVertical: 8,
  },
  hata: { color: '#ff8a8a', fontSize: 12 },
});
