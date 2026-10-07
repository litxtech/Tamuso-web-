import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { KlavyeGuvenliAlan } from '../../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  BenDestekTemsilcisiMiyim,
  DestekMesajGonder,
  DestekOturumDetay,
  DestekOturumKapat,
} from '../../../src/moduller/canli-destek/islemler/DestekIslemleri';
import { useDestekKanali } from '../../../src/moduller/canli-destek/gercek-zamanli/useDestekKanali';
import {
  DESTEK_TEMSILCI_ALIAS,
  type DestekMesaj,
  type DestekOturum,
} from '../../../src/moduller/canli-destek/tipler';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

function saat(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function AdminDestekOturumEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [oturum, setOturum] = useState<DestekOturum | null>(null);
  const [mesajlar, setMesajlar] = useState<DestekMesaj[]>([]);
  const [metin, setMetin] = useState('');
  const [gonderiyor, setGonderiyor] = useState(false);
  const listRef = useRef<FlatList<DestekMesaj>>(null);

  const acik =
    oturum?.status === 'waiting' || oturum?.status === 'active';

  const yukle = useCallback(async () => {
    if (!id) return;
    const admin = AdminYetkisiVarMi(profile);
    const agent = await BenDestekTemsilcisiMiyim();
    if (!admin && !agent) {
      router.replace('/(tabs)/profile');
      return;
    }
    const r = await DestekOturumDetay(id);
    if (!r.ok) {
      Alert.alert('Destek', r.hata);
      return;
    }
    setOturum(r.paket.session);
    setMesajlar(r.paket.messages ?? []);
  }, [id, profile]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const mesajEkle = useCallback((msg: DestekMesaj) => {
    setMesajlar((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useDestekKanali(id, mesajEkle, setOturum);

  const gonder = async () => {
    if (!id || !acik) return;
    const body = metin.trim();
    if (!body) return;
    setGonderiyor(true);
    const sonuc = await DestekMesajGonder({ sessionId: id, body });
    setGonderiyor(false);
    if (!sonuc.ok) {
      Alert.alert('Mesaj', sonuc.hata);
      void yukle();
      return;
    }
    setMetin('');
    mesajEkle(sonuc.mesaj);
    setOturum((prev) =>
      prev
        ? {
            ...prev,
            last_activity_at: new Date().toISOString(),
            status: prev.status === 'waiting' ? 'active' : prev.status,
            agent_id: prev.agent_id ?? user?.id ?? null,
          }
        : prev,
    );
  };

  const kapat = () => {
    if (!id || !acik) return;
    Alert.alert('Görüşmeyi bitir', 'Oturum kapatılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Bitir',
        style: 'destructive',
        onPress: async () => {
          const r = await DestekOturumKapat(id, 'agent_close');
          if (r.ok) setOturum(r.session);
          else Alert.alert('Destek', r.hata);
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={`Destek · ${DESTEK_TEMSILCI_ALIAS}`}
        subtitle={
          oturum
            ? oturum.status === 'waiting'
              ? 'Bekliyor'
              : oturum.status === 'active'
                ? 'Aktif'
                : 'Kapalı'
            : '…'
        }
        fallbackHref={"/admin/destek" as any}
        right={
          acik ? (
            <Pressable onPress={kapat} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={RenkTokenlari.danger} />
            </Pressable>
          ) : undefined
        }
      />

      <KlavyeGuvenliAlan style={styles.kok}>
        <FlatList
          ref={listRef}
          data={mesajlar}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.liste}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => {
            if (item.sender_role === 'system') {
              return (
                <View style={styles.sistem}>
                  <Text style={styles.sistemYazi}>{item.body}</Text>
                </View>
              );
            }
            const benim =
              item.sender_role === 'agent' || item.sender_id === user?.id;
            return (
              <View
                style={[styles.balon, benim ? styles.balonBen : styles.balonKarsi]}
              >
                {item.kaynak === 'web' && !benim ? (
                  <Text style={styles.webEtiket}>Web</Text>
                ) : null}
                <Text style={benim ? styles.yaziBen : styles.yazi}>{item.body}</Text>
                <Text style={benim ? styles.saatBen : styles.saat}>
                  {saat(item.created_at)}
                </Text>
              </View>
            );
          }}
        />

        {acik ? (
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={metin}
              onChangeText={setMetin}
              placeholder={`Toprak olarak yanıtla…`}
              placeholderTextColor={RenkTokenlari.textDim}
              multiline
              maxLength={2000}
              editable={!gonderiyor}
            />
            <Pressable
              onPress={() => void gonder()}
              disabled={gonderiyor || !metin.trim()}
              style={[
                styles.send,
                (!metin.trim() || gonderiyor) && { opacity: 0.45 },
              ]}
            >
              <Ionicons name="send" size={18} color="#12040C" />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.kapali}>Görüşme kapalı</Text>
        )}
      </KlavyeGuvenliAlan>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  liste: {
    padding: BoslukTokenlari.xl,
    gap: BoslukTokenlari.sm,
    flexGrow: 1,
  },
  sistem: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sistemYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  webEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    marginBottom: 2,
  },
  balon: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 2,
  },
  balonBen: {
    alignSelf: 'flex-end',
    backgroundColor: RenkTokenlari.accent,
    borderBottomRightRadius: 4,
  },
  balonKarsi: {
    alignSelf: 'flex-start',
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderBottomLeftRadius: 4,
  },
  yazi: { ...TipografiTokenlari.body, color: RenkTokenlari.text },
  yaziBen: { ...TipografiTokenlari.body, color: '#12040C' },
  saat: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, alignSelf: 'flex-end' },
  saatBen: {
    ...TipografiTokenlari.micro,
    color: 'rgba(18,4,12,0.55)',
    alignSelf: 'flex-end',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BoslukTokenlari.sm,
    padding: BoslukTokenlari.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.accent,
  },
  kapali: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    padding: BoslukTokenlari.lg,
  },
});
