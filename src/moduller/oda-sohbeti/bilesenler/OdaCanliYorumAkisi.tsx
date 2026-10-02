/**
 * Canlı oda yorum akışı — sohbet + oda hediyeleri (yorum kartında).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
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
};

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

export function OdaCanliYorumAkisi({
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
}: Props) {
  const { t } = useCeviri();
  const [messages, setMessages] = useState<CanliSohbetMesajGorunum[]>([]);
  const [hedef, setHedef] = useState<CanliSohbetMesajGorunum | null>(null);
  const listRef = useRef<FlatList<CanliSohbetMesajGorunum>>(null);
  const giftsRef = useRef(gifts);
  giftsRef.current = gifts;
  const hediyeGorulenRef = useRef(new Set<string>());
  const isHost = !!currentUserId && !!hostId && currentUserId === hostId;
  const canModerate = isHost || moderatorMu;

  const load = useCallback(async () => {
    try {
      const [chat, hediyeler] = await Promise.all([
        OdaSohbetMesajlariniGetir(roomId),
        OdaHediyeYorumSatirlariniGetir(roomId).catch(() => []),
      ]);
      for (const h of hediyeler) hediyeGorulenRef.current.add(h.id);
      setMessages(birlestirKronolojik(chat, hediyeler));
    } catch {
      /* sessiz */
    }
  }, [roomId]);

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
      const timer = setInterval(() => void load(), 12_000);
      return () => clearInterval(timer);
    }, [load]),
  );

  useEffect(() => {
    if (yenileSinyali > 0) void load();
  }, [yenileSinyali, load]);

  useEffect(() => {
    const imza = `oda-yorum-${roomId}`;
    for (const ch of supabase.getChannels()) {
      const topic = ch.topic ?? '';
      if (topic === imza || topic === `realtime:${imza}` || topic.includes(imza)) {
        void supabase.removeChannel(ch);
      }
    }

    const channel = supabase
      .channel(`${imza}-${Date.now().toString(36)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void load();
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
  }, [hediyeSatiriEkle, load, roomId]);

  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

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
}

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
