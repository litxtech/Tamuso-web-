import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { ProfilMiniCache } from '../../kullanici-profili/onbellek/ProfilMiniCache';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { OyunKazancOdaSecici } from '../../oyunlar/kazanc-balonu/OyunKazancOdaSecici';
import { OyunKazanciAc } from '../../oyunlar/kazanc-balonu/OyunKazancinaGit';
import type { OyunKazancDuyurusu } from '../../oyunlar/kazanc-balonu/OyunKazancDuyuruTipleri';
import { OyunAuraCerceve } from '../../oyunlar/ortak/bilesenler/OyunAuraCerceve';

const PENCERE_MS = 24 * 60 * 60 * 1000;
const LIMIT = 12;

type Ham = {
  id: string;
  user_id: string;
  room_id: string | null;
  game_code: string;
  game_title: string;
  win_amount: number | string;
  bet_amount: number | string;
  multiplier?: number | string | null;
  round_id: string | null;
  created_at: string;
};

function carpanOku(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function satirlariOku(): Promise<OyunKazancDuyurusu[]> {
  const since = new Date(Date.now() - PENCERE_MS).toISOString();
  const tam =
    'id, user_id, room_id, game_code, game_title, win_amount, bet_amount, multiplier, round_id, created_at';
  let { data, error } = await supabase
    .from('oyun_kazanc_duyurulari')
    .select(tam)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    const yedek = await supabase
      .from('oyun_kazanc_duyurulari')
      .select(
        'id, user_id, room_id, game_code, game_title, win_amount, bet_amount, round_id, created_at',
      )
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(LIMIT);
    data = yedek.data;
    error = yedek.error;
  }
  if (error || !data?.length) return [];

  const ham = data as Ham[];
  const profiller = await ProfilMiniCache.topluAl(ham.map((r) => r.user_id));
  return ham.map((row) => {
    const profil = profiller.get(row.user_id) ?? null;
    return {
      id: row.id,
      user_id: row.user_id,
      room_id: row.room_id,
      game_code: row.game_code,
      game_title: row.game_title,
      win_amount: Number(row.win_amount) || 0,
      bet_amount: Number(row.bet_amount) || 0,
      multiplier: carpanOku(row.multiplier),
      round_id: row.round_id,
      created_at: row.created_at,
      display_name: ProfilMiniCache.gosterimAdi(profil),
      avatar_url: profil?.avatar_url ?? null,
    };
  });
}

export function OdalarKazancSeridi() {
  const { t } = useCeviri();
  const [liste, setListe] = useState<OyunKazancDuyurusu[]>([]);
  const [odaSecici, setOdaSecici] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      setListe(await satirlariOku());
    } catch {
      setListe([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  useEffect(() => {
    const topic = 'odalar-kazanc-seridi';
    const kanal = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'oyun_kazanc_duyurulari' },
        () => {
          void yukle();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [yukle]);

  const ac = useCallback((kod: string) => {
    if (OyunKazanciAc(kod)) return;
    setOdaSecici(kod);
  }, []);

  if (liste.length === 0 && !odaSecici) return null;

  return (
    <View style={styles.wrap}>
      {liste.length > 0 ? (
        <>
          <View style={styles.baslikSatir}>
            <Ionicons name="cash-outline" size={14} color={RenkTokenlari.accent} />
            <Text style={styles.baslik}>{t('odalar.kazancBaslik')}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {liste.map((oge, index) => (
              <KazancKarti
                key={oge.id}
                oge={oge}
                yanik={index === 0}
                onPress={() => ac(oge.game_code)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
      <OyunKazancOdaSecici gameCode={odaSecici} onClose={() => setOdaSecici(null)} />
    </View>
  );
}

function KazancKarti({
  oge,
  yanik,
  onPress,
}: {
  oge: OyunKazancDuyurusu;
  yanik: boolean;
  onPress: () => void;
}) {
  const { t } = useCeviri();
  const oyun = KazancOyunAdi(oge.game_code, oge.game_title, t('oyun.meyveKisa'));
  const carpan = KazancCarpani(oge.multiplier, oge.win_amount, oge.bet_amount);
  const coin = KazancCoin(oge.win_amount);
  const metin = carpan
    ? t('odalar.kazancMetin', { ad: oge.display_name, oyun, carpan, coin })
    : t('odalar.kazancMetinDuz', { ad: oge.display_name, oyun, coin });
  const avatar = MedyaUriGuvenli(oge.avatar_url);

  const kart = (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.kart, !yanik && styles.kartSakin, pressed && styles.kartBasili]}
      accessibilityRole="button"
      accessibilityLabel={metin}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarBos}>
          <Ionicons name="person" size={16} color="#FFB15A" />
        </View>
      )}
      <Text style={styles.metin} numberOfLines={3}>
        {metin}
      </Text>
      <Text style={styles.oyna}>{t('odalar.kazancOyna')}</Text>
    </Pressable>
  );

  if (!yanik) return kart;

  return (
    <OyunAuraCerceve
      renkler={['#FF1E00', '#FFD15A', '#FF6A00']}
      yaricap={YaricapTokenlari.lg}
      kalinlik={2.5}
      hizMs={680}
      parlamaRengi="#FF2A00"
    >
      {kart}
    </OyunAuraCerceve>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  row: {
    gap: 10,
    paddingRight: 8,
  },
  kart: {
    width: 220,
    gap: 6,
    padding: 10,
    borderRadius: 0,
    backgroundColor: 'rgba(28, 6, 4, 0.96)',
    borderWidth: 0,
  },
  kartBasili: { opacity: 0.88 },
  kartSakin: {
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 0, 0.45)',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: RenkTokenlari.surface,
  },
  avatarBos: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 214, 107, 0.12)',
  },
  metin: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
    minHeight: 48,
  },
  oyna: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontWeight: '800',
  },
});
