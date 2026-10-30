/**
 * Canlı oda yorum akışı — sohbet + oda hediyeleri (yorum kartında).
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import {
  CanliSohbetListeFade,
  CanliSohbetMesajKarti,
  type CanliSohbetMesajGorunum,
} from '../../canli-sohbet/bilesenler/CanliSohbetMesajKarti';
import { KullaniciGuvenlikMenusu } from '../../moderasyon/bilesenler/KullaniciGuvenlikMenusu';
import {
  OdaSohbetMesajlariniGetir,
  OdaSohbetMesajiSil,
} from '../../canli-sohbet/islemler/CanliSohbetIslemleri';
import {
  OdaHediyeYorumSatiriOlustur,
  OdaHediyeYorumSatirlariniGetir,
} from '../../hediyeler/okuma/OdaHediyeYorumSatirlariniGetir';
import { HediyeAdiCevir } from '../../hediyeler/katalog/HediyeAdiCevir';
import { ProfilMiniCache } from '../../kullanici-profili/onbellek/ProfilMiniCache';
import { OdaModerasyonUygula } from '../../moderasyon/islemler/ModerasyonIslemleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import type { Gift } from '../../../types/models';

type Props = {
  roomId: string;
  currentUserId?: string | null;
  hostId?: string | null;
  moderatorMu?: boolean;
  yenileSinyali?: number;
  baslikGizle?: boolean;
  onClose?: () => void;
  onProfil?: (item: CanliSohbetMesajGorunum) => void;
  /** Realtime hediye satırı için katalog (emoji/ad) */
  gifts?: Gift[];
  /** Canlı yayın gibi şeffaf float — kart/fade yok, yorumlar temiz */
  floatMod?: boolean;
  /**
   * Bu oda ziyaretinin başlangıcı (ms).
   * Çıkıp girince veya başka odaya geçince geçmiş yorumlar görünmez.
   */
  oturumBaslangic?: number;
};

/** Saat farkı — giriş anındaki mesaj düşmesin, eski geçmiş yine elensin */
const OTURUM_PAY_MS = 3000;

function buOturumunMesajlari(
  list: CanliSohbetMesajGorunum[],
  oturumBaslangic: number | undefined,
): CanliSohbetMesajGorunum[] {
  if (!oturumBaslangic) return list;
  const sinir = oturumBaslangic - OTURUM_PAY_MS;
  return list.filter((m) => {
    const zaman = new Date(m.created_at).getTime();
    return Number.isFinite(zaman) && zaman >= sinir;
  });
}

function listeImzasi(list: CanliSohbetMesajGorunum[]): string {
  let imza = '';
  for (const m of list) {
    imza += m.id;
    imza += '\n';
    imza += m.body;
    imza += '\n';
  }
  return imza;
}

function birlestirKronolojik(
  chat: CanliSohbetMesajGorunum[],
  hediyeler: CanliSohbetMesajGorunum[],
): CanliSohbetMesajGorunum[] {
  const map = new Map<string, CanliSohbetMesajGorunum>();
  for (const m of chat) map.set(m.id, m);
  for (const m of hediyeler) map.set(m.id, m);
  return [...map.values()].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export const OdaCanliYorumAkisi = memo(function OdaCanliYorumAkisi({
  roomId,
  currentUserId,
  hostId,
  moderatorMu = false,
  yenileSinyali = 0,
  baslikGizle = false,
  onClose,
  onProfil,
  gifts = [],
  floatMod = false,
  oturumBaslangic,
}: Props) {
  const { t } = useCeviri();
  const [messages, setMessages] = useState<CanliSohbetMesajGorunum[]>([]);
  const [hedef, setHedef] = useState<CanliSohbetMesajGorunum | null>(null);
  const listRef = useRef<FlatList<CanliSohbetMesajGorunum>>(null);
  const dibeYapisikRef = useRef(true);
  const giftsRef = useRef(gifts);
  giftsRef.current = gifts;
  const hediyeGorulenRef = useRef(new Set<string>());
  const isHost = !!currentUserId && !!hostId && currentUserId === hostId;
  const canModerate = isHost || moderatorMu;
  const gorulenOdaRef = useRef(roomId);
  const gorulenOturumRef = useRef(oturumBaslangic);
  if (
    gorulenOdaRef.current !== roomId ||
    gorulenOturumRef.current !== oturumBaslangic
  ) {
    gorulenOdaRef.current = roomId;
    gorulenOturumRef.current = oturumBaslangic;
    hediyeGorulenRef.current = new Set();
    setMessages([]);
  }

  const load = useCallback(async () => {
    try {
      const [chat, hediyeler] = await Promise.all([
        OdaSohbetMesajlariniGetir(roomId),
        OdaHediyeYorumSatirlariniGetir(roomId).catch(() => []),
      ]);
      const chatTaze = buOturumunMesajlari(chat, oturumBaslangic);
      const hediyeTaze = buOturumunMesajlari(hediyeler, oturumBaslangic);
      for (const h of hediyeTaze) hediyeGorulenRef.current.add(h.id);
      const next = birlestirKronolojik(chatTaze, hediyeTaze);
      setMessages((prev) =>
        listeImzasi(prev) === listeImzasi(next) ? prev : next,
      );
    } catch {
      /* sessiz */
    }
  }, [oturumBaslangic, roomId]);

  const hediyeSatiriEkle = useCallback(
    async (row: {
      id: string;
      sender_id: string;
      receiver_id?: string | null;
      gift_id: string;
      quantity: number;
      created_at?: string;
    }) => {
      if (!row?.id || !row.gift_id) return;
      const giftKey = `gift:${row.id}`;
      if (hediyeGorulenRef.current.has(giftKey)) return;
      hediyeGorulenRef.current.add(giftKey);

      const gift = giftsRef.current.find((g) => g.id === row.gift_id);
      const profil = await ProfilMiniCache.al(row.sender_id);
      const alici = row.receiver_id
        ? await ProfilMiniCache.al(row.receiver_id)
        : null;
      const satir = OdaHediyeYorumSatiriOlustur({
        id: row.id,
        senderId: row.sender_id,
        createdAt: row.created_at ?? new Date().toISOString(),
        quantity: Math.max(1, Number(row.quantity) || 1),
        emoji: gift?.emoji ?? '🎁',
        name: HediyeAdiCevir(gift?.code, gift?.name),
        displayName: profil?.display_name,
        username: profil?.username,
        avatarUrl: profil?.avatar_url,
        level: typeof profil?.level === 'number' ? profil.level : null,
        aliciAd: alici
          ? (alici.display_name?.trim() || alici.username?.trim() || null)
          : null,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === satir.id)) return prev;
        return birlestirKronolojik(prev, [satir]);
      });
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      // Realtime birincil; poll yalnızca yedek (eski 12 sn → 30 sn)
      const timer = setInterval(() => void load(), 30_000);
      return () => clearInterval(timer);
    }, [load]),
  );

  useEffect(() => {
    if (yenileSinyali > 0) void load();
  }, [yenileSinyali, load]);

  const sohbetSatiriEkle = useCallback(
    async (row: {
      id?: string;
      user_id?: string;
      body?: string;
      created_at?: string;
      deleted_at?: string | null;
    }) => {
      if (!row?.id || !row.user_id || row.deleted_at) return;
      const body = typeof row.body === 'string' ? row.body : '';
      if (!body.trim()) return;
      if (
        oturumBaslangic &&
        new Date(row.created_at ?? 0).getTime() < oturumBaslangic - OTURUM_PAY_MS
      ) {
        return;
      }
      const profil = await ProfilMiniCache.al(row.user_id);
      const satir: CanliSohbetMesajGorunum = {
        id: row.id,
        user_id: row.user_id,
        body,
        created_at: row.created_at ?? new Date().toISOString(),
        display_name: profil?.display_name,
        username: profil?.username,
        avatar_url: profil?.avatar_url,
        level: typeof profil?.level === 'number' ? profil.level : null,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === satir.id)) return prev;
        return birlestirKronolojik(prev, [satir]);
      });
    },
    [oturumBaslangic],
  );

  useEffect(() => {
    const imza = `oda-yorum-${roomId}`;
    for (const ch of supabase.getChannels()) {
      const topic = ch.topic ?? '';
      if (topic === imza || topic === `realtime:${imza}` || topic.includes(imza)) {
        void supabase.removeChannel(ch);
      }
    }

    // Sabit topic — Date.now() orphan kanal birikmesini önler
    const channel = supabase
      .channel(imza)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          void sohbetSatiriEkle(
            payload.new as {
              id?: string;
              user_id?: string;
              body?: string;
              created_at?: string;
              deleted_at?: string | null;
            },
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { new?: { id?: string; deleted_at?: string | null; body?: string } }) => {
          const row = payload.new;
          if (!row?.id) return;
          if (row.deleted_at) {
            setMessages((prev) => prev.filter((m) => m.id !== row.id));
            return;
          }
          // Nadir düzenleme — güvenli tam yenile
          void load();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { old?: { id?: string } }) => {
          const id = payload.old?.id;
          if (!id) return;
          setMessages((prev) => prev.filter((m) => m.id !== id));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_transactions',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as {
            id?: string;
            sender_id?: string;
            receiver_id?: string;
            gift_id?: string;
            quantity?: number;
            created_at?: string;
          };
          if (!row?.id || !row.sender_id || !row.gift_id) return;
          void hediyeSatiriEkle({
            id: row.id,
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
            gift_id: row.gift_id,
            quantity: Number(row.quantity) || 1,
            created_at: row.created_at,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hediyeSatiriEkle, load, roomId, sohbetSatiriEkle]);

  const kaydirma = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const kalan =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      dibeYapisikRef.current = kalan < 72;
    },
    [],
  );

  useEffect(() => {
    if (!dibeYapisikRef.current || messages.length === 0) return;
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  const yorumSil = (item: CanliSohbetMesajGorunum) => {
    if (item.tur === 'gift') return;
    Alert.alert(t('canliYayin.yorumSilBaslik'), t('canliYayin.yorumSilBody'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('ortak.sil'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await OdaSohbetMesajiSil(item.id);
            if (!r.ok) Alert.alert(t('canliYayin.yorum'), r.hata);
            else void load();
          })();
        },
      },
    ]);
  };

  const kullaniciyiYasakla = (item: CanliSohbetMesajGorunum) => {
    const ad =
      item.display_name?.trim() ||
      item.username?.trim() ||
      t('ortak.kullanici');
    Alert.alert(
      t('sesOda.yorumYazmayiEngelle'),
      t('sesOda.yorumYazmayiEngelleBody', { ad }),
      [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('canliYayin.engelle'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const r = await OdaModerasyonUygula({
                roomId,
                targetUserId: item.user_id,
                action: 'ban',
                reason: 'oda_sohbet',
              });
              if (!r.ok) {
                Alert.alert(
                  t('sesOda.engelleme'),
                  r.hata ?? t('sesOda.uygulanamadi'),
                );
                return;
              }
              if (item.tur !== 'gift') {
                await OdaSohbetMesajiSil(item.id).catch(() => undefined);
              }
              Alert.alert(t('ortak.tamam'), t('sesOda.yasaklandiMesaj'));
              void load();
            })();
          },
        },
      ],
    );
  };

  const uzunBas = (item: CanliSohbetMesajGorunum) => {
    if (!currentUserId) return;
    const mine = item.user_id === currentUserId;
    if (item.tur === 'gift') {
      if (mine) return;
      setHedef(item);
      return;
    }
    if (mine) {
      yorumSil(item);
      return;
    }
    if (canModerate) {
      Alert.alert(
        item.display_name || item.username || t('ortak.kullanici'),
        t('sesOda.neYapmakIstersin'),
        [
          {
            text: t('canliYayin.yorumSilBaslik'),
            style: 'destructive',
            onPress: () => yorumSil(item),
          },
          {
            text: t('sesOda.yorumYazmayiEngelle'),
            style: 'destructive',
            onPress: () => kullaniciyiYasakla(item),
          },
          { text: t('canliYayin.bildirEngelle'), onPress: () => setHedef(item) },
          { text: t('ortak.vazgec'), style: 'cancel' },
        ],
      );
      return;
    }
    setHedef(item);
  };

  return (
    <View
      style={[styles.root, floatMod && styles.rootFloat]}
      pointerEvents="box-none"
    >
      {!baslikGizle ? (
        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.title}>{t('canliYayin.yorumlar')}</Text>
          {onClose ? (
            <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
              <Ionicons name="chevron-down" size={16} color={RenkTokenlari.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.listWrap}>
        {!floatMod ? <CanliSohbetListeFade /> : null}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            floatMod && styles.listContentFloat,
            messages.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          onScroll={kaydirma}
          scrollEventThrottle={32}
          removeClippedSubviews={false}
          ListEmptyComponent={
            <Text style={[styles.empty, floatMod && styles.emptyFloat]}>
              {t('canliYayin.yorumBos')}
            </Text>
          }
          renderItem={({ item }) => (
            <CanliSohbetMesajKarti
              item={item}
              mine={!!currentUserId && item.user_id === currentUserId}
              varyant="live"
              zamanGizle={floatMod}
              onLongPress={currentUserId ? () => uzunBas(item) : undefined}
              onProfilPress={onProfil}
            />
          )}
        />
      </View>

      {hedef ? (
        <KullaniciGuvenlikMenusu
          visible
          targetUserId={hedef.user_id}
          targetName={hedef.display_name || hedef.username}
          roomId={roomId}
          contentType={hedef.tur === 'gift' ? 'user' : 'room_chat'}
          contentId={hedef.tur === 'gift' ? undefined : hedef.id}
          contentPreview={hedef.body}
          onClose={() => setHedef(null)}
          onBlocked={() => {
            setHedef(null);
            void load();
          }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  rootFloat: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  title: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  listWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  list: { flex: 1 },
  listContent: {
    gap: 4,
    paddingBottom: 2,
    paddingHorizontal: 0,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  listContentFloat: {
    gap: 2,
    paddingBottom: 4,
    paddingRight: 4,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  empty: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    paddingHorizontal: 4,
  },
  emptyFloat: {
    color: 'rgba(255,255,255,0.45)',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
