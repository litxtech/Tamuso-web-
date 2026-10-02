import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { CanliYayinlariGetir } from '../../canli-yayin/islemler/CanliYayinIslemleri';
import { PkDavetGonder } from '../islemler/PkDavetIslemleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Yayinci = {
  id: string;
  title: string;
  host_id: string;
  hostAd: string;
  avatar: string | null;
  viewer_count: number;
};

type Props = {
  visible: boolean;
  fromLiveId: string;
  selfHostId: string;
  onClose: () => void;
  onGonderildi?: (toLiveId: string) => void;
};

/** Canlı PK rakip seçimi — TikTok tarzı davet listesi */
export function PkDavetPaneli({
  visible,
  fromLiveId,
  selfHostId,
  onClose,
  onGonderildi,
}: Props) {
  const { t } = useCeviri();
  const [liste, setListe] = useState<Yayinci[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderen, setGonderen] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setHata(null);
    setYukleniyor(true);
    void CanliYayinlariGetir(40)
      .then((rows) => {
        const mapped: Yayinci[] = (rows as any[])
          .filter((r) => r.id !== fromLiveId && r.host_id !== selfHostId)
          .map((r) => {
            const host = Array.isArray(r.host) ? r.host[0] : r.host;
            return {
              id: r.id as string,
              title: (r.title as string) ?? t('pk.canli'),
              host_id: r.host_id as string,
              hostAd:
                host?.display_name?.trim() ||
                host?.username?.trim() ||
                t('pk.yayinci'),
              avatar: host?.avatar_url ?? null,
              viewer_count: Number(r.viewer_count ?? 0),
            };
          });
        setListe(mapped);
      })
      .catch(() => setListe([]))
      .finally(() => setYukleniyor(false));
  }, [visible, fromLiveId, selfHostId, t]);

  const bos = useMemo(
    () => !yukleniyor && liste.length === 0,
    [yukleniyor, liste.length],
  );

  const davetEt = async (toLiveId: string) => {
    setGonderen(toLiveId);
    setHata(null);
    const r = await PkDavetGonder({
      fromLiveId,
      toLiveId,
      sureSaniye: 300,
    });
    setGonderen(null);
    if (!r.ok) {
      setHata(r.hata);
      return;
    }
    onGonderildi?.(toLiveId);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.kok}>
        <Pressable style={styles.perde} onPress={onClose} />
        <View style={styles.sheet}>
          <CamArkaplan
            intensity={36}
            tint="dark"
            style={StyleSheet.absoluteFill}
            fallbackColor="#16101F"
            pointerEvents="none"
          />
          <View style={styles.handle} />
          <View style={styles.ust}>
            <Text style={styles.baslik}>{t('pk.davetBaslik')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={RenkTokenlari.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.alt}>{t('pk.davetSecAlt')}</Text>

          {hata ? <Text style={styles.hata}>{hata}</Text> : null}

          {yukleniyor ? (
            <ActivityIndicator
              color={RenkTokenlari.primarySoft}
              style={{ marginTop: 28 }}
            />
          ) : bos ? (
            <Text style={styles.bos}>{t('pk.baskaCanliYok')}</Text>
          ) : (
            <FlatList
              data={liste}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.kart}
                  disabled={gonderen === item.id}
                  onPress={() => void davetEt(item.id)}
                >
                  {MedyaUriGuvenli(item.avatar) ? (
                    <Image source={{ uri: MedyaUriGuvenli(item.avatar)! }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarBos]}>
                      <Ionicons name="person" size={18} color={RenkTokenlari.textMuted} />
                    </View>
                  )}
                  <View style={styles.kartMetin}>
                    <Text style={styles.kartAd} numberOfLines={1}>
                      {item.hostAd}
                    </Text>
                    <Text style={styles.kartAlt} numberOfLines={1}>
                      {item.title} · 👁 {item.viewer_count}
                    </Text>
                  </View>
                  <View style={styles.davetBtn}>
                    {gonderen === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.davetYazi}>{t('pk.davetBtn')}</Text>
                    )}
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1, justifyContent: 'flex-end' },
  perde: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    backgroundColor: '#16101F',
    paddingBottom: BoslukTokenlari.xxl,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginTop: 10,
    marginBottom: 6,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
  },
  baslik: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.md,
  },
  hata: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: 8,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    marginTop: 32,
  },
  list: { paddingHorizontal: BoslukTokenlari.lg, gap: 8, paddingBottom: 24 },
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarBos: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kartMetin: { flex: 1, minWidth: 0 },
  kartAd: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  kartAlt: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  davetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: '#F0B429',
    minWidth: 64,
    alignItems: 'center',
  },
  davetYazi: { ...TipografiTokenlari.caption, color: '#1A1208', fontWeight: '800' },
});
