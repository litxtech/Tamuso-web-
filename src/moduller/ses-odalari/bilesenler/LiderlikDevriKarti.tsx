import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useCeviri } from '../../../i18n/useCeviri';
import { MedyaOdasiBaglan, MedyaOdasiKes } from '../../livekit/MedyaBaglantisi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { LiderlikDevriYanit } from '../islemler/LiderligiDevret';
import {
  OdaCikisKilidiniAc,
  OdaCikisKilidiniKapat,
} from '../navigasyon/OdaCikisKilidi';
import {
  AktifSesOdasiBitir,
  AktifSesOdasiDurumunuAl,
} from '../oturum/AktifSesOdasiOturumu';

type Teklif = {
  id: string;
  roomId: string;
  odaAd: string;
  isteyenAd: string;
  kanal: string;
};

/**
 * Açık ses odası olan kullanıcıya liderlik devri kartı.
 * Kabul: kendi odası kapanır, bu odanın lideri olur.
 * Vazgeç: kart kapanır, devir olmaz.
 */
export function LiderlikDevriKarti() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const [teklif, setTeklif] = useState<Teklif | null>(null);
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    if (!user?.id) {
      setTeklif(null);
      return;
    }
    const { data } = await supabase
      .from('oda_liderlik_teklifleri')
      .select('id, room_id, isteyen_id')
      .eq('hedef_id', user.id)
      .eq('durum', 'bekliyor')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.id) {
      setTeklif(null);
      return;
    }
    const roomId = data.room_id as string;
    const isteyenId = data.isteyen_id as string;
    const [{ data: profil }, { data: oda }] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', isteyenId)
        .maybeSingle(),
      supabase
        .from('rooms')
        .select('title, livekit_room_name, is_live')
        .eq('id', roomId)
        .maybeSingle(),
    ]);
    if (!oda || oda.is_live === false) {
      setTeklif(null);
      return;
    }
    const ad =
      (profil?.display_name as string | null)?.trim() ||
      (profil?.username as string | null)?.trim() ||
      t('sesOda.buKullaniciya');
    setTeklif({
      id: data.id as string,
      roomId,
      odaAd: ((oda.title as string | null) ?? '').trim() || t('sesOda.sesOdasi'),
      isteyenAd: ad,
      kanal: (oda.livekit_room_name as string | null) || `voice_${roomId}`,
    });
  }, [t, user?.id]);

  useEffect(() => {
    void yukle();
    if (!user?.id) return;
    const kanal = supabase
      .channel(`liderlik-teklif-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'oda_liderlik_teklifleri',
          filter: `hedef_id=eq.${user.id}`,
        },
        () => {
          void yukle();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [user?.id, yukle]);

  const kapat = () => {
    setTeklif(null);
  };

  const vazgec = () => {
    const id = teklif?.id;
    kapat();
    if (id) void LiderlikDevriYanit(id, false);
  };

  const kabul = async () => {
    if (!teklif || busy) return;
    setBusy(true);
    OdaCikisKilidiniAc();
    const r = await LiderlikDevriYanit(teklif.id, true);
    if (!r.ok) {
      OdaCikisKilidiniKapat();
      setBusy(false);
      return;
    }
    const aktif = AktifSesOdasiDurumunuAl();
    if (aktif?.roomId === teklif.roomId) {
      await MedyaOdasiBaglan({
        roomName: teklif.kanal,
        role: 'host',
        micAcik: true,
        zorla: true,
      });
    } else {
      AktifSesOdasiBitir();
      await MedyaOdasiKes({ zorla: true });
      router.replace(`/room/${teklif.roomId}` as never);
    }
    kapat();
    setBusy(false);
    setTimeout(() => OdaCikisKilidiniKapat(), 1500);
  };

  return (
    <TamusoModal visible={!!teklif} onClose={vazgec} backdropClosable={false}>
      <View style={styles.kart}>
        <Text style={styles.baslik}>{t('sesOda.liderlikDevriKartBaslik')}</Text>
        <Text style={styles.metin}>
          {t('sesOda.liderlikDevriKartMetin', {
            ad: teklif?.isteyenAd ?? '',
            oda: teklif?.odaAd ?? '',
          })}
        </Text>
        <View style={styles.satir}>
          <Pressable
            style={styles.vazgec}
            onPress={vazgec}
            disabled={busy}
          >
            <Text style={styles.vazgecYazi}>{t('sesOda.liderlikDevriVazgec')}</Text>
          </Pressable>
          <Pressable
            style={styles.kabul}
            onPress={() => void kabul()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.kabulYazi}>{t('sesOda.liderlikDevriKabul')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  kart: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.md,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  metin: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
  },
  satir: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
  },
  vazgec: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.chipFill,
  },
  kabul: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.primary,
  },
  vazgecYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  kabulYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
  },
});
