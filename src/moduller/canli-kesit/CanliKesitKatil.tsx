import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useCeviri } from '../../i18n/useCeviri';
import { TipografiTokenlari } from '../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { AnalyticsOlayEkle } from '../guvenlik/analytics/AnalyticsOlayEkle';
import { canliKesitKaynakDurumu } from './CanliKesitServisi';

type Props = {
  liveId: string | null;
  pkId: string | null;
  pk: boolean;
};

export function CanliKesitKatil({ liveId, pkId, pk }: Props) {
  const { t } = useCeviri();
  const [canli, setCanli] = useState(false);
  const [pkCanli, setPkCanli] = useState(false);

  useEffect(() => {
    let iptal = false;
    void canliKesitKaynakDurumu(liveId, pkId).then((d) => {
      if (iptal) return;
      setCanli(d.canli);
      setPkCanli(d.pkCanli);
    });
    return () => {
      iptal = true;
    };
  }, [liveId, pkId]);

  const pkBitti = pk && !pkCanli;
  const katil = !pkBitti && canli && !!liveId;
  const yazi = pkBitti
    ? t('canliYayin.kesitPkBitti')
    : katil
      ? t('canliYayin.kesitYayinaKatil')
      : t('canliYayin.kesitYayinBitti');

  return (
    <Pressable
      style={styles.btn}
      disabled={!katil}
      onPress={() => {
        if (!liveId || !katil) return;
        void AnalyticsOlayEkle('live_clip_source_opened', {
          live_id: liveId,
          pk_id: pkId,
        });
        router.push(`/canli/${liveId}`);
      }}
    >
      <Text style={styles.yazi}>
        {katil ? `🔴 ${t('canliYayin.kesitCanli')} · ${yazi}` : yazi}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 118,
    alignSelf: 'center',
    left: 36,
    right: 36,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    zIndex: 8,
    alignItems: 'center',
  },
  yazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
  },
});
