import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { KlavyeGuvenliAlan } from '../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import {
  DestekMesajGonder,
  DestekOturumAc,
  DestekOturumDetay,
  DestekOturumKapat,
} from '../../src/moduller/canli-destek/islemler/DestekIslemleri';
import { useDestekKanali } from '../../src/moduller/canli-destek/gercek-zamanli/useDestekKanali';
import {
  DESTEK_IDLE_MS,
  DESTEK_TEMSILCI_ALIAS,
  type DestekMesaj,
  type DestekOturum,
} from '../../src/moduller/canli-destek/tipler';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../src/i18n/diller';

function saat(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function CanliDestekEkrani() {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const { user, isGuest, refreshProfile } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const [oturum, setOturum] = useState<DestekOturum | null>(null);
  const [mesajlar, setMesajlar] = useState<DestekMesaj[]>([]);
  const [metin, setMetin] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [kalanSn, setKalanSn] = useState<number | null>(null);
  const listRef = useRef<FlatList<DestekMesaj>>(null);

  const acik =
    oturum?.status === 'waiting' || oturum?.status === 'active';

  const baslat = useCallback(async () => {
    setYukleniyor(true);
    const sonuc = await DestekOturumAc();
    setYukleniyor(false);
    if (!sonuc.ok) {
      Alert.alert(t('destek.canliBaslik'), sonuc.hata);
      return;
    }
    setOturum(sonuc.paket.session);
    setMesajlar(sonuc.paket.messages ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      void baslat();
    }, [isGuest, baslat]),
  );

  const mesajEkle = useCallback((msg: DestekMesaj) => {
    setMesajlar((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useDestekKanali(
    oturum?.id,
    mesajEkle,
    (row) => {
      setOturum(row);
    },
  );

  // 3 dk idle geri sayim — sunucu da kapatir
  useEffect(() => {
    if (!acik || !oturum?.last_activity_at) {
      setKalanSn(null);
      return;
    }
    const tick = () => {
      const bitis =
        new Date(oturum.last_activity_at).getTime() + DESTEK_IDLE_MS;
      const kalan = Math.max(0, Math.ceil((bitis - Date.now()) / 1000));
      setKalanSn(kalan);
      if (kalan <= 0 && oturum.id) {
        void DestekOturumDetay(oturum.id).then((r) => {
          if (r.ok) {
            setOturum(r.paket.session);
            setMesajlar(r.paket.messages ?? []);
          }
        });
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [acik, oturum?.id, oturum?.last_activity_at]);

  const gonder = () => {
    if (!oturum || !acik) return;
    const body = metin.trim();
    if (!body) return;
    islemiDene('destek', async () => {
      setGonderiyor(true);
      const sonuc = await DestekMesajGonder({
        sessionId: oturum.id,
        body,
      });
      setGonderiyor(false);
      if (!sonuc.ok) {
        Alert.alert('Mesaj', sonuc.hata);
        if (sonuc.hata.toLowerCase().includes('kapandi')) {
          void DestekOturumDetay(oturum.id).then((r) => {
            if (r.ok) {
              setOturum(r.paket.session);
              setMesajlar(r.paket.messages ?? []);
            }
          });
        }
        return;
      }
      setMetin('');
      mesajEkle(sonuc.mesaj);
      setOturum((prev) =>
        prev
          ? { ...prev, last_activity_at: new Date().toISOString() }
          : prev,
      );
    });
  };

  const kapat = () => {
    if (!oturum || !acik) return;
    Alert.alert(t('destek.bitirBaslik'), t('destek.bitirSoru'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('destek.bitir'),
        style: 'destructive',
        onPress: async () => {
          const r = await DestekOturumKapat(oturum.id);
          if (r.ok) setOturum(r.session);
          else Alert.alert(t('destek.baslik'), r.hata);
        },
      },
    ]);
  };

  const durumYazi = useMemo(() => {
    if (!oturum) return '';
    if (oturum.status === 'waiting') return t('destek.durumBekliyor');
    if (oturum.status === 'active') return t('destek.durumAktif');
    if (oturum.status === 'idle_closed') return t('destek.durumIdle');
    return t('destek.durumKapandi');
  }, [oturum, t]);

  if (isGuest) {
    return (
      <Screen edges={['top']}>
        <EkranBasligi title={t('destek.canliBaslik')} fallbackHref="/(tabs)" />
        <View style={styles.misafir}>
          <Text style={styles.misafirBaslik}>{t('ortak.hesapGerekli')}</Text>
          <Text style={styles.misafirAlt}>{t('destek.misafirAlt')}</Text>
          <Pressable
            style={styles.misafirBtn}
            onPress={() => islemiDene('destek', () => undefined)}
          >
            <Text style={styles.misafirBtnYazi}>{t('ortak.hesabiTamamla')}</Text>
          </Pressable>
        </View>
        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => {
            void refreshProfile();
            void baslat();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="canli-destek">
        <EkranBasligi
          title={t('destek.canliBaslik')}
          subtitle={durumYazi}
          fallbackHref="/(tabs)"
          right={
            acik ? (
              <Pressable onPress={kapat} hitSlop={8} style={styles.kapatBtn}>
                <Ionicons name="close-circle" size={22} color={RenkTokenlari.danger} />
              </Pressable>
            ) : undefined
          }
        />

        <View style={styles.temsilciBar}>
          <View style={styles.avatar}>
            <Ionicons name="headset" size={20} color={RenkTokenlari.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.temsilciAd}>{DESTEK_TEMSILCI_ALIAS}</Text>
            <Text style={styles.temsilciAlt}>
              {t('destek.temsilciAlt')}
              {acik && kalanSn != null
                ? ` · ${Math.floor(kalanSn / 60)}:${String(kalanSn % 60).padStart(2, '0')}`
                : ''}
            </Text>
          </View>
          {!acik ? (
            <Pressable style={styles.yeniden} onPress={() => void baslat()}>
              <Text style={styles.yenidenYazi}>{t('destek.yeniGorusme')}</Text>
            </Pressable>
          ) : null}
        </View>

        <KlavyeGuvenliAlan style={styles.kok}>
          <FlatList
            ref={listRef}
            data={mesajlar}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.liste}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            ListEmptyComponent={
              yukleniyor ? (
                <Text style={styles.bos}>{t('destek.baglaniyor')}</Text>
              ) : (
                <Text style={styles.bos}>{t('destek.mesajYok')}</Text>
              )
            }
            renderItem={({ item }) => {
              if (item.sender_role === 'system') {
                return (
                  <View style={styles.sistem}>
                    <Text style={styles.sistemYazi}>{item.body}</Text>
                  </View>
                );
              }
              const benim = item.sender_id === user?.id;
              return (
                <View
                  style={[
                    styles.balon,
                    benim ? styles.balonBen : styles.balonKarsi,
                  ]}
                >
                  {!benim ? (
                    <Text style={styles.balonKim}>{DESTEK_TEMSILCI_ALIAS}</Text>
                  ) : null}
                  <Text style={benim ? styles.balonYaziBen : styles.balonYazi}>
                    {item.body}
                  </Text>
                  <Text style={benim ? styles.saatBen : styles.saat}>
                    {saat(item.created_at, locale)}
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
                placeholder={t('destek.yaz')}
                placeholderTextColor={RenkTokenlari.textDim}
                multiline
                maxLength={2000}
                editable={!gonderiyor}
              />
              <Pressable
                onPress={gonder}
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
            <View style={styles.kapaliBar}>
              <Text style={styles.kapaliYazi}>
                {oturum?.status === 'idle_closed'
                  ? t('destek.idleKapandi')
                  : t('destek.gorusmeBitti')}
              </Text>
            </View>
          )}
        </KlavyeGuvenliAlan>

        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => void refreshProfile()}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  kapatBtn: { padding: 4 },
  temsilciBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,180,41,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.35)',
  },
  temsilciAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  temsilciAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  yeniden: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.primary,
  },
  yenidenYazi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '700',
  },
  liste: {
    padding: BoslukTokenlari.xl,
    gap: BoslukTokenlari.sm,
    flexGrow: 1,
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  sistem: {
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 4,
  },
  sistemYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  balon: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginVertical: 2,
    gap: 2,
  },
  balonBen: {
    alignSelf: 'flex-end',
    backgroundColor: RenkTokenlari.primary,
    borderBottomRightRadius: 4,
  },
  balonKarsi: {
    alignSelf: 'flex-start',
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderBottomLeftRadius: 4,
  },
  balonKim: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
  balonYazi: { ...TipografiTokenlari.body, color: RenkTokenlari.text },
  balonYaziBen: { ...TipografiTokenlari.body, color: '#fff' },
  saat: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, alignSelf: 'flex-end' },
  saatBen: { ...TipografiTokenlari.micro, color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-end' },
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
  kapaliBar: {
    padding: BoslukTokenlari.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  kapaliYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  misafir: {
    flex: 1,
    padding: BoslukTokenlari.xl,
    justifyContent: 'center',
    gap: BoslukTokenlari.md,
  },
  misafirBaslik: { ...TipografiTokenlari.h1, color: RenkTokenlari.text },
  misafirAlt: { ...TipografiTokenlari.body, color: RenkTokenlari.textMuted },
  misafirBtn: {
    alignSelf: 'flex-start',
    backgroundColor: RenkTokenlari.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.pill,
  },
  misafirBtnYazi: { ...TipografiTokenlari.caption, color: '#fff', fontWeight: '700' },
});
