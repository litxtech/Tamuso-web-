import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import type { HikayeGoruntuleyen } from '../tipler';
import { HikayeGoruntuleyenler } from '../islemler/HikayeIslemleri';
import { HikayeZamanMetni } from '../islemler/HikayeZaman';
import {
  HIKAYE_TEPKI_GORUNUM,
  type HikayeTepkiAnahtari,
} from '../sabitler';

function tepkiGoster(raw: string | null): string | null {
  if (!raw) return null;
  if (raw in HIKAYE_TEPKI_GORUNUM) {
    return HIKAYE_TEPKI_GORUNUM[raw as HikayeTepkiAnahtari];
  }
  return raw;
}

type Props = {
  visible: boolean;
  itemId: string | null;
  storyId?: string | null;
  onClose: () => void;
};

export function HikayeGoruntuleyenlerSheet({
  visible,
  itemId,
  storyId,
  onClose,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [liste, setListe] = useState<HikayeGoruntuleyen[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!visible || !itemId) {
      setListe([]);
      return;
    }
    let iptal = false;
    setYukleniyor(true);
    void HikayeGoruntuleyenler(itemId, { storyId }).then((r) => {
      if (iptal) return;
      setYukleniyor(false);
      setListe(r.ok ? r.data : []);
    });
    return () => {
      iptal = true;
    };
  }, [visible, itemId, storyId]);

  return (
    <TamusoModal
      visible={visible}
      onClose={onClose}
      placement="bottom"
      animationType="slide"
      contentStyle={[
        styles.sheet,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <View style={styles.handle} />
      <Text style={styles.baslik}>{t('hikaye.goruntuleyenler')}</Text>
      {yukleniyor ? (
        <ActivityIndicator
          color={RenkTokenlari.primary}
          style={{ marginTop: 24 }}
        />
      ) : liste.length === 0 ? (
        <Text style={styles.bos}>{t('hikaye.goruntuleyenYok')}</Text>
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(i) => i.user_id}
          style={{ maxHeight: 360 }}
          renderItem={({ item }) => (
            <View style={styles.satir}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarBos]} />
              )}
              <View style={styles.metin}>
                <Text style={styles.ad} numberOfLines={1}>
                  {item.display_name}
                </Text>
                <Text style={styles.zaman}>
                  {HikayeZamanMetni(item.viewed_at)}
                </Text>
              </View>
              {tepkiGoster(item.reaction) ? (
                <Text style={styles.tepki}>{tepkiGoster(item.reaction)}</Text>
              ) : null}
            </View>
          )}
        />
      )}
      <Pressable onPress={onClose} style={styles.kapat}>
        <Text style={styles.kapatYazi}>{t('ortak.kapat')}</Text>
      </Pressable>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 8,
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: 12,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: 12,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    paddingVertical: 28,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarBos: { backgroundColor: RenkTokenlari.surface },
  metin: { flex: 1, minWidth: 0 },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  zaman: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  tepki: { fontSize: 20 },
  kapat: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  kapatYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primary,
    fontWeight: '600',
  },
});
