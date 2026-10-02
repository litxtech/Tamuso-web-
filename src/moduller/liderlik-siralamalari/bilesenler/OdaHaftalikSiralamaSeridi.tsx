import React, { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  CoinSkoruFormatla,
  LiderlikSiralamasiniGetir,
  LiderlikSiralamasiniYenile,
  type SiralamaSatiri,
} from '../okuma/LiderlikSiralamasiniGetir';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useCeviri } from '../../../i18n/useCeviri';
import { SesOdasinaGit } from '../../ses-odalari/navigasyon/SesOdasinaGit';

export function OdaHaftalikSiralamaSeridi() {
  const { t } = useCeviri();
  const [rows, setRows] = useState<SiralamaSatiri[]>([]);

  const yukle = useCallback(async () => {
    try {
      let liste = await LiderlikSiralamasiniGetir({
        board: 'room',
        period: 'weekly',
        limit: 8,
      });
      if (liste.length === 0) {
        await LiderlikSiralamasiniYenile('room', 'weekly');
        liste = await LiderlikSiralamasiniGetir({
          board: 'room',
          period: 'weekly',
          limit: 8,
        });
      }
      setRows(liste);
    } catch {
      setRows([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.baslikSatir}>
        <View style={styles.baslikSol}>
          <Ionicons name="trophy" size={14} color={RenkTokenlari.accent} />
          <Text style={styles.baslik}>{t('siralamalar.podiumOdalar')}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/siralamalar?board=room' as any)}
          hitSlop={8}
        >
          <Text style={styles.link}>{t('ortak.tumunuGor')}</Text>
        </Pressable>
      </View>
      <Text style={styles.alt}>{t('siralamalar.altOda')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {rows.map((item) => (
          <OdaMiniKart key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

function OdaMiniKart({ item }: { item: SiralamaSatiri }) {
  const { t } = useCeviri();
  const ad =
    item.room_title?.trim() ||
    item.display_name?.trim() ||
    t('siralamalar.boardOda');
  const kapak = MedyaUriGuvenli(item.room_cover_url || item.avatar_url);
  const odaId = item.room_id;

  return (
    <Pressable
      style={styles.kart}
      disabled={!odaId}
      onPress={() => {
        if (!odaId) return;
        void SesOdasinaGit({ roomId: odaId });
      }}
    >
      <View style={styles.kapakWrap}>
        {kapak ? (
          <Image source={{ uri: kapak }} style={styles.kapak} />
        ) : (
          <LinearGradient
            colors={[...RenkTokenlari.gradientPrimary]}
            style={styles.kapak}
          >
            <Ionicons name="mic" size={16} color="#12040C" />
          </LinearGradient>
        )}
        <View style={styles.siraRozet}>
          <Text style={styles.siraYazi}>#{item.rank ?? '—'}</Text>
        </View>
      </View>
      <Text style={styles.ad} numberOfLines={1}>
        {ad}
      </Text>
      <Text style={styles.skor}>
        {CoinSkoruFormatla(item.score)} {t('cuzdan.coin')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.md,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  baslikSol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  link: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: -2,
  },
  row: {
    gap: 10,
    paddingRight: 8,
    paddingTop: 4,
  },
  kart: {
    width: 108,
    gap: 4,
  },
  kapakWrap: {
    width: 108,
    height: 72,
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
  },
  kapak: {
    width: 108,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  siraRozet: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(18, 16, 24, 0.78)',
    borderRadius: YaricapTokenlari.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  siraYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    fontSize: 10,
  },
  ad: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  skor: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
});
