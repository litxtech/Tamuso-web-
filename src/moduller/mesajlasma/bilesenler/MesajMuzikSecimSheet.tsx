import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { AiMuzikParcalariGetir } from '../../ai-muzik/islemler/AiMuzikApi';
import type { AiMuzikTrackOzet } from '../../ai-muzik/tipler';
import { MsSureFormat } from '../../ai-muzik/utils/SureFormat';
import {
  MusicLibraryList,
  type MusicLibraryItem,
} from '../../oda-muzik/islemler/OdaMuzikApi';
import { MedyaUriGuvenli } from '../yardimcilar/MedyaUriGecerliMi';

export type MuzikSecimOgesi = AiMuzikTrackOzet & {
  artist_name?: string | null;
  audio_url?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSec: (track: MuzikSecimOgesi) => void;
};

function katalogMap(item: MusicLibraryItem): MuzikSecimOgesi {
  return {
    id: item.id,
    title: item.title,
    cover_url: item.cover_url,
    cover_thumb_url: item.cover_url,
    duration_ms: item.duration_ms,
    status: 'READY',
    genre_code: null,
    mood: null,
    public_track_code: null,
    created_at: new Date().toISOString(),
    moderation_status: 'ACTIVE',
    is_instrumental: null,
    is_favorite: !!item.is_favorite,
    artist_name: item.artist_name,
    audio_url: item.audio_url,
  };
}

function hazirMi(status: string | null | undefined) {
  const s = (status ?? '').toUpperCase();
  return !s || s === 'READY' || s === 'COMPLETED';
}

/**
 * Hikaye / DM müzik seçici.
 * Platform kataloğu + kullanıcının tüm AI parçaları (yalnızca library-opt-in değil).
 */
export function MesajMuzikSecimSheet({ visible, onClose, onSec }: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [liste, setListe] = useState<MuzikSecimOgesi[]>([]);
  const [filtre, setFiltre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let iptal = false;
    setYukleniyor(true);
    setFiltre('');
    void (async () => {
      try {
        const [katalog, benim] = await Promise.all([
          MusicLibraryList({ tab: 'all', limit: 60 }).catch(
            () => [] as MusicLibraryItem[],
          ),
          AiMuzikParcalariGetir({ tab: 'all_owned', limit: 60 }).catch(
            () => [] as AiMuzikTrackOzet[],
          ),
        ]);

        if (iptal) return;

        const katalogRows = (Array.isArray(katalog) ? katalog : []).map(
          katalogMap,
        );
        const benimRows = (Array.isArray(benim) ? benim : [])
          .filter((r) => hazirMi(r.status))
          .map((r) => ({ ...r } as MuzikSecimOgesi));

        const seen = new Set<string>();
        const birlesik: MuzikSecimOgesi[] = [];
        for (const row of [...katalogRows, ...benimRows]) {
          if (!row?.id || seen.has(row.id)) continue;
          seen.add(row.id);
          birlesik.push(row);
        }
        setListe(birlesik);
      } catch {
        if (!iptal) setListe([]);
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => {
      iptal = true;
    };
  }, [visible]);

  const q = filtre.trim().toLocaleLowerCase('tr');
  const gorunen = !q
    ? liste
    : liste.filter((r) => {
        const ad = (r.title ?? '').toLocaleLowerCase('tr');
        const sanatci = (r.artist_name ?? '').toLocaleLowerCase('tr');
        return ad.includes(q) || sanatci.includes(q);
      });

  return (
    <TamusoModal
      visible={visible}
      onClose={onClose}
      placement="bottom"
      animationType="slide"
      contentStyle={styles.modalContent}
    >
      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <Text style={styles.baslik}>{t('hikaye.muzik')}</Text>
        <TextInput
          value={filtre}
          onChangeText={setFiltre}
          placeholder={t('ortak.ara')}
          placeholderTextColor={RenkTokenlari.textMuted}
          style={styles.ara}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {yukleniyor ? (
          <ActivityIndicator
            color={RenkTokenlari.mint}
            style={{ marginVertical: 24 }}
          />
        ) : gorunen.length === 0 ? (
          <View style={styles.bosWrap}>
            <Text style={styles.bos}>{t('mesajV2.musicUnavailable')}</Text>
            <Pressable
              style={styles.kutuphaneBtn}
              onPress={() => {
                onClose();
                router.push('/ai-muzik/kutuphane' as any);
              }}
            >
              <Text style={styles.kutuphaneYazi}>{t('aiMuzik.kutuphane')}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={gorunen}
            keyExtractor={(item) => item.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const cover = MedyaUriGuvenli(
                item.cover_thumb_url || item.cover_url,
              );
              return (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onClose();
                    onSec(item);
                  }}
                >
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.cover} />
                  ) : (
                    <View style={[styles.cover, styles.coverBos]} />
                  )}
                  <View style={styles.meta}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.sure} numberOfLines={1}>
                      {item.artist_name
                        ? `${item.artist_name} · ${MsSureFormat(item.duration_ms)}`
                        : MsSureFormat(item.duration_ms)}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
        <Pressable style={styles.iptal} onPress={onClose}>
          <Text style={styles.iptalYazi}>{t('mesajV2.cancel')}</Text>
        </Pressable>
      </View>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  modalContent: { maxHeight: '70%' },
  sheet: {
    backgroundColor: RenkTokenlari.bgCard,
    borderTopLeftRadius: YaricapTokenlari.lg,
    borderTopRightRadius: YaricapTokenlari.lg,
    paddingTop: 14,
    paddingHorizontal: 12,
    minHeight: 280,
  },
  baslik: {
    ...TipografiTokenlari.body,
    fontWeight: '800',
    color: RenkTokenlari.text,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  ara: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.pressFill,
    borderRadius: YaricapTokenlari.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  list: { maxHeight: 360 },
  bosWrap: {
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  kutuphaneBtn: {
    backgroundColor: RenkTokenlari.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  kutuphaneYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: RenkTokenlari.pressFill,
  },
  coverBos: {},
  meta: { flex: 1, gap: 2 },
  title: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  sure: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  iptal: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  iptalYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
});
