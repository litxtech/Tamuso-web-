import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';

type Kart = { anahtar: string; ad: string };

type Props = {
  sessionId: string;
  currentUserId?: string | null;
  hostId: string;
  bottom: number;
};

/** Yeni izleyici solda 3 saniye görünür, sonra sıradaki varsa o gelir. */
export function CanliIzleyiciGeldi({
  sessionId,
  currentUserId,
  hostId,
  bottom,
}: Props) {
  const { t } = useCeviri();
  const [kart, setKart] = useState<Kart | null>(null);
  const kuyruk = useRef<string[]>([]);
  const son = useRef(new Map<string, number>());
  const opacity = useRef(new Animated.Value(0)).current;
  const kayma = useRef(new Animated.Value(-20)).current;
  const ben = useRef(currentUserId);
  const yayinci = useRef(hostId);
  ben.current = currentUserId;
  yayinci.current = hostId;

  const siraya = useCallback((ad: string) => {
    kuyruk.current.push(ad);
    if (kuyruk.current.length > 6) kuyruk.current.shift();
    setKart((su) => {
      if (su) return su;
      const sonraki = kuyruk.current.shift();
      return sonraki ? { anahtar: `${Date.now()}`, ad: sonraki } : null;
    });
  }, []);

  useEffect(() => {
    if (!kart) return;
    let iptal = false;
    opacity.setValue(0);
    kayma.setValue(-20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(kayma, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    const zaman = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        () => {
          if (iptal) return;
          const sonraki = kuyruk.current.shift();
          setKart(sonraki ? { anahtar: `${Date.now()}`, ad: sonraki } : null);
        },
      );
    }, 3000);
    return () => {
      iptal = true;
      clearTimeout(zaman);
    };
  }, [kart, kayma, opacity]);

  useEffect(() => {
    const kanal = supabase
      .channel(`canli-geldi-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_viewers',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: { new: { user_id?: string } }) => {
          const id = payload.new?.user_id;
          if (!id || id === ben.current || id === yayinci.current) return;
          const simdi = Date.now();
          const once = son.current.get(id) ?? 0;
          if (simdi - once < 8000) return;
          son.current.set(id, simdi);
          void supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', id)
            .maybeSingle()
            .then(({ data }) => {
              const ad =
                data?.display_name?.trim() ||
                data?.username?.trim() ||
                '';
              if (ad) siraya(ad);
            });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [sessionId, siraya]);

  if (!kart) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.kart,
        { bottom, opacity, transform: [{ translateX: kayma }] },
      ]}
    >
      <View style={styles.harfKutu}>
        <Text style={styles.harf}>{kart.ad.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.metin}>
        <Text style={styles.ad} numberOfLines={1}>
          {kart.ad}
        </Text>
        <Text style={styles.geldi}>{t('canliYayin.izleyiciGeldi')}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  kart: {
    position: 'absolute',
    left: 12,
    zIndex: 8,
    maxWidth: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  harfKutu: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,64,145,0.85)',
  },
  harf: { color: '#fff', fontWeight: '800', fontSize: 14 },
  metin: { flexShrink: 1 },
  ad: { ...TipografiTokenlari.caption, color: '#fff', fontWeight: '800' },
  geldi: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted, marginTop: 1 },
});
