import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchLiveRooms } from '../../../services/api';
import type { Room } from '../../../types/models';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { OyunKazancOdayaAc } from './OyunKazancinaGit';

type Props = {
  gameCode: string | null;
  onClose: () => void;
};

export function OyunKazancOdaSecici({ gameCode, onClose }: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [odalar, setOdalar] = useState<Room[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!gameCode) return;
    let iptal = false;
    setYukleniyor(true);
    void fetchLiveRooms(24)
      .then((liste) => {
        if (!iptal) setOdalar(liste);
      })
      .catch(() => {
        if (!iptal) setOdalar([]);
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [gameCode]);

  return (
    <Modal
      visible={!!gameCode}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.perde} onPress={onClose}>
        <Pressable
          style={[styles.kart, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={() => {}}
        >
          <View style={styles.tuta} />
          <View style={styles.uyariSatir}>
            <Ionicons name="mic" size={18} color={RenkTokenlari.accent} />
            <Text style={styles.baslik}>{t('odalar.kazancOdaUyari')}</Text>
          </View>
          <Text style={styles.govde}>{t('odalar.kazancOdaUyariBody')}</Text>

          {yukleniyor ? (
            <ActivityIndicator color={RenkTokenlari.accent} style={styles.yukleniyor} />
          ) : odalar.length === 0 ? (
            <Text style={styles.bos}>{t('odalar.kazancOdaBos')}</Text>
          ) : (
            <ScrollView style={styles.liste} showsVerticalScrollIndicator={false}>
              {odalar.map((oda) => {
                const kapak = MedyaUriGuvenli(oda.cover_url || oda.host?.avatar_url);
                return (
                  <Pressable
                    key={oda.id}
                    style={styles.oda}
                    onPress={() => {
                      const kod = gameCode || 'fruit_wheel';
                      onClose();
                      OyunKazancOdayaAc(oda, kod);
                    }}
                  >
                    {kapak ? (
                      <Image source={{ uri: kapak }} style={styles.kapak} />
                    ) : (
                      <View style={styles.kapakBos}>
                        <Ionicons name="radio" size={16} color={RenkTokenlari.accent} />
                      </View>
                    )}
                    <View style={styles.odaMetin}>
                      <Text style={styles.odaAd} numberOfLines={1}>
                        {oda.title}
                      </Text>
                      <Text style={styles.odaAlt}>
                        {oda.listener_count} · {t('odalar.canli')}
                      </Text>
                    </View>
                    <Text style={styles.katil}>{t('odalar.katil')}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Pressable
            style={styles.kur}
            onPress={() => {
              onClose();
              router.navigate('/(tabs)/create');
            }}
          >
            <Text style={styles.kurYazi}>{t('odalar.kazancOdaKur')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  perde: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  kart: {
    maxHeight: '78%',
    backgroundColor: '#141018',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 214, 107, 0.28)',
  },
  tuta: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 6,
  },
  uyariSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 17,
    flex: 1,
  },
  govde: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    fontSize: 14,
  },
  yukleniyor: { marginVertical: 18 },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    marginVertical: 12,
  },
  liste: { maxHeight: 320 },
  oda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  kapak: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.surface,
  },
  kapakBos: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 214, 107, 0.12)',
  },
  odaMetin: { flex: 1, gap: 2 },
  odaAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  odaAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  katil: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '800',
  },
  kur: {
    alignSelf: 'center',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  kurYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '800',
  },
});
