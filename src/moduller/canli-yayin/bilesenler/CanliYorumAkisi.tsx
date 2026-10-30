/**
 * Canlı yayın yorum akışı — son N mesaj, incremental realtime, float overlay.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
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
  CanliYayinSohbetMesajlariniGetir,
  CanliYayinSohbetMesajiSil,
} from '../../canli-sohbet/islemler/CanliSohbetIslemleri';
import { CanliYayinModerasyon } from '../islemler/CanliYayinIslemleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

const VARSAYILAN_MAX = 80;

type Props = {
  sessionId: string;
  currentUserId?: string | null;
  hostId?: string | null;
  yenileSinyali?: number;
  baslikGizle?: boolean;
  onClose?: () => void;
  /** Bellekte tutulan max yorum */
  maxMesaj?: number;
  /** TikTok tarzı şeffaf float — kart/fade yok */
  floatMod?: boolean;
  /** PK: karşı yayının yorumları da aynı yanda görünsün */
  ekSessionId?: string | null;
  /** Avatar / isme tık — profil sheet */
  onProfil?: (item: CanliSohbetMesajGorunum) => void;
};

function mesajiKirp(
  list: CanliSohbetMesajGorunum[],
  max: number,
): CanliSohbetMesajGorunum[] {
  if (list.length <= max) return list;
  return list.slice(list.length - max);
}

function CanliYorumAkisiInner({
  sessionId,
  currentUserId,
  hostId,
  yenileSinyali = 0,
  baslikGizle = false,
  onClose,
  maxMesaj = VARSAYILAN_MAX,
  floatMod = false,
  ekSessionId,
  onProfil,
}: Props) {
  const { t } = useCeviri();
  const [messages, setMessages] = useState<CanliSohbetMesajGorunum[]>([]);
  const [hedef, setHedef] = useState<CanliSohbetMesajGorunum | null>(null);
  const listRef = useRef<FlatList<CanliSohbetMesajGorunum>>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const isHost = !!currentUserId && !!hostId && currentUserId === hostId;

  const load = useCallback(async () => {
    try {
      const birincil = await CanliYayinSohbetMesajlariniGetir(sessionId);
      const ek = ekSessionId
        ? await CanliYayinSohbetMesajlariniGetir(ekSessionId).catch(() => [])
        : [];
      const birlesik = [...birincil, ...ek].sort(
        (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
      );
      const kirp = mesajiKirp(birlesik, maxMesaj);
      seenIds.current = new Set(kirp.map((m) => m.id));
      setMessages(kirp);
    } catch {
      /* migration yoksa sessiz */
    }
  }, [sessionId, ekSessionId, maxMesaj]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => undefined;
    }, [load]),
  );

  useEffect(() => {
    if (yenileSinyali > 0) void load();
  }, [yenileSinyali, load]);

  useEffect(() => {
    const ekle = (row: CanliSohbetMesajGorunum & { id?: string }) => {
      if (!row?.id || seenIds.current.has(row.id)) return;
      seenIds.current.add(row.id);
      setMessages((prev) =>
        mesajiKirp(
          [
            ...prev,
            {
              id: row.id,
              user_id: row.user_id,
              body: row.body,
              created_at: row.created_at ?? new Date().toISOString(),
              display_name: (row as { display_name?: string }).display_name,
              username: (row as { username?: string }).username,
              avatar_url: (row as { avatar_url?: string }).avatar_url,
              level: (row as { level?: number }).level,
            },
          ],
          maxMesaj,
        ),
      );
    };

    const bagla = (id: string, ad: string) =>
      supabase
        .channel(ad)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_chat_messages',
            filter: `session_id=eq.${id}`,
          },
          (payload) => {
            ekle(payload.new as CanliSohbetMesajGorunum & { id?: string });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'live_chat_messages',
            filter: `session_id=eq.${id}`,
          },
          () => {
            void load();
          },
        )
        .subscribe();

    const kanallar = [bagla(sessionId, `canli-yorum-${sessionId}`)];
    if (ekSessionId && ekSessionId !== sessionId) {
      kanallar.push(bagla(ekSessionId, `canli-yorum-ek-${ekSessionId}`));
    }
    return () => {
      kanallar.forEach((ch) => {
        void supabase.removeChannel(ch);
      });
    };
  }, [load, sessionId, ekSessionId, maxMesaj]);

  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  const yorumSil = (item: CanliSohbetMesajGorunum) => {
    Alert.alert(t('canliYayin.yorumSilBaslik'), t('canliYayin.yorumSilBody'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('ortak.sil'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await CanliYayinSohbetMesajiSil(item.id);
            if (!r.ok) Alert.alert(t('canliYayin.yorum'), r.hata);
            else void load();
          })();
        },
      },
    ]);
  };

  const uzunBas = (item: CanliSohbetMesajGorunum) => {
    if (!currentUserId) return;
    const mine = item.user_id === currentUserId;
    if (mine) {
      yorumSil(item);
      return;
    }
    if (!isHost) {
      setHedef(item);
      return;
    }
    Alert.alert(item.display_name || item.username || t('ortak.kullanici'), t('canliYayin.moderasyon'), [
      {
        text: t('canliYayin.yorumSilBaslik'),
        style: 'destructive',
        onPress: () => yorumSil(item),
      },
      {
        text: t('canliYayin.yayindanAt'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await CanliYayinModerasyon({
              sessionId,
              targetUserId: item.user_id,
              action: 'kick',
            });
            if (!r.ok) Alert.alert(t('canliYayin.atma'), r.hata);
            else Alert.alert(t('canliYayin.atildi'), t('canliYayin.atildiMesaj'));
          })();
        },
      },
      {
        text: t('canliYayin.engelle'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await CanliYayinModerasyon({
              sessionId,
              targetUserId: item.user_id,
              action: 'ban',
            });
            if (!r.ok) Alert.alert(t('canliYayin.engelle'), r.hata);
            else Alert.alert(t('canliYayin.engellendi'), t('canliYayin.engellendiMesaj'));
          })();
        },
      },
      { text: t('canliYayin.bildirEngelle'), onPress: () => setHedef(item) },
      { text: t('ortak.vazgec'), style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.root, floatMod && styles.rootFloat]} pointerEvents="box-none">
      {!baslikGizle ? (
        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.title}>{t('canliYayin.yorumlar')}</Text>
          {onClose ? (
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.close}
              accessibilityLabel={t('canliYayin.a11yYorumlariGizle')}
            >
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
            messages.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('canliYayin.yorumBos')}</Text>
          }
          renderItem={({ item }) => (
            <CanliSohbetMesajKarti
              item={item}
              mine={!!currentUserId && item.user_id === currentUserId}
              varyant="live"
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
          contentType="live_chat"
          contentId={hedef.id}
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

export const CanliYorumAkisi = memo(CanliYorumAkisiInner);

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  rootFloat: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
    flexShrink: 0,
  },
  title: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  listWrap: { flex: 1, minHeight: 0, position: 'relative' },
  list: { flex: 1 },
  listContent: { gap: 4, paddingBottom: 4, paddingRight: 2 },
  listEmpty: { flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 8 },
  empty: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
