import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import {
  MikrofonIstekleriniGetir,
  type MikrofonIstegi,
} from '../mikrofon/MikrofonIstekleriniGetir';
import { MikrofonIstegiYanitla } from '../mikrofon/MikrofonIstegiYanitla';
import { OdaIzinAyarla } from '../islemler/OdaIzinAyarla';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { ODA_DOCK_BTN, ODA_DOCK_ICON } from './OdaButonOlculeri';
import { useCeviri } from '../../../i18n/useCeviri';
import { useDil } from '../../../i18n/DilSaglayici';

type Props = {
  roomId: string;
  onDegisti?: () => void;
  onKaydedildi?: (oturmaIzinli: boolean, mikrofonIzinli: boolean) => void;
  /** Yalnız oda sahibi ayarı değiştirir */
  sahipMi?: boolean;
  /** Varsayılan: izinli oturma */
  oturmaIzinli?: boolean;
  /** Varsayılan: izinsiz mikrofon */
  mikrofonIzinli?: boolean;
};

const KART_W = 280;

/** Host/yardımcı: dock butonu — koltuk izinleri kartı */
export function MikrofonIstekPaneli({
  roomId,
  onDegisti,
  sahipMi = false,
  oturmaIzinli = true,
  mikrofonIzinli = false,
  onKaydedildi,
}: Props) {
  const { t } = useCeviri();
  const { locale } = useDil();
  const [liste, setListe] = useState<MikrofonIstegi[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [acik, setAcik] = useState(false);
  const [kayit, setKayit] = useState<'oturma' | 'mikrofon' | null>(null);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    w: number;
  } | null>(null);
  const btnRef = useRef<View>(null);

  const yukle = useCallback(async () => {
    try {
      setListe(await MikrofonIstekleriniGetir(roomId));
    } catch {
      setListe([]);
    }
  }, [roomId]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
      const timer = setInterval(() => void yukle(), 4000);
      return () => clearInterval(timer);
    }, [yukle]),
  );

  useEffect(() => {
    const imza = `oda-mic-istek-${roomId}`;
    for (const ch of supabase.getChannels()) {
      const topic = ch.topic ?? '';
      if (topic === imza || topic === `realtime:${imza}` || topic.includes(imza)) {
        void supabase.removeChannel(ch);
      }
    }

    const kanal = supabase
      .channel(`${imza}-${Date.now().toString(36)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_mic_requests',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void yukle();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [roomId, yukle]);

  const yanitla = async (id: string, kabul: boolean) => {
    setBusy(id);
    const r = await MikrofonIstegiYanitla({ requestId: id, kabul });
    setBusy(null);
    if (!r.ok) {
      Alert.alert(
        t('sesOda.koltukIzinleri'),
        r.hata ?? t('sesOda.istekYanitlanamadi'),
      );
      void yukle();
      return;
    }
    const kalan = liste.filter((x) => x.id !== id);
    setListe(kalan);
    if (kalan.length === 0) setAcik(false);
    onDegisti?.();
  };

  const kapat = useCallback(() => setAcik(false), []);

  const izinKaydet = useCallback(
    async (oturma: boolean, mikrofon: boolean, alan: 'oturma' | 'mikrofon') => {
      if (!sahipMi || kayit) return;
      if (oturma === oturmaIzinli && mikrofon === mikrofonIzinli) return;
      setKayit(alan);
      const r = await OdaIzinAyarla({
        roomId,
        oturmaIzinli: oturma,
        mikrofonIzinli: mikrofon,
      });
      setKayit(null);
      if (!r.ok) {
        Alert.alert(t('sesOda.koltukIzinleri'), r.hata ?? t('sesOda.izinKaydedilemedi'));
        return;
      }
      onKaydedildi?.(oturma, mikrofon);
      onDegisti?.();
    },
    [kayit, mikrofonIzinli, onDegisti, onKaydedildi, oturmaIzinli, roomId, sahipMi, t],
  );

  const acKapa = useCallback(() => {
    if (acik) {
      setAcik(false);
      return;
    }
    btnRef.current?.measureInWindow((x, y, w) => {
      setAnchor({ x, y, w });
      setAcik(true);
    });
  }, [acik]);

  const sayi = liste.length;
  const rozetYazi = sayi > 9 ? '9+' : String(sayi);
  const win = Dimensions.get('window');
  const kartLeft = anchor
    ? Math.min(
        Math.max(10, anchor.x + anchor.w / 2 - KART_W / 2),
        win.width - KART_W - 10,
      )
    : 10;
  const kartBottom = anchor ? Math.max(72, win.height - anchor.y + 8) : 96;

  return (
    <View ref={btnRef} collapsable={false}>
      <Pressable
        onPress={acKapa}
        style={[styles.buton, acik && styles.butonAcik]}
        accessibilityRole="button"
        accessibilityLabel={t('sesOda.koltukIzinleri')}
        accessibilityHint={
          sayi > 0
            ? t('sesOda.bekleyenIstekSayi', { sayi })
            : t('sesOda.bekleyenIstekYok')
        }
      >
        <MaterialCommunityIcons
          name={acik ? 'hand-back-left' : 'hand-back-left-outline'}
          size={ODA_DOCK_ICON}
          color={acik ? RenkTokenlari.primarySoft : RenkTokenlari.textMuted}
        />
        {sayi > 0 ? (
          <View style={styles.rozet} pointerEvents="none">
            <Text style={styles.rozetYazi}>{rozetYazi}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={acik}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={kapat}
      >
        <Pressable style={styles.backdrop} onPress={kapat}>
          <Pressable
            style={[
              styles.kart,
              { left: kartLeft, bottom: kartBottom },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.kartBaslik}>
              <Text style={styles.baslik}>{t('sesOda.koltukIzinleri')}</Text>
              <Text style={styles.sayiEtiket}>{sayi}</Text>
            </View>
            {sahipMi ? (
              <View style={styles.ayarlar}>
                <AyarSatiri
                  etiket={t('sesOda.oturmaAyar')}
                  izinli={oturmaIzinli}
                  kilitli={kayit != null}
                  onIzinli={() => void izinKaydet(true, mikrofonIzinli, 'oturma')}
                  onIzinsiz={() => void izinKaydet(false, mikrofonIzinli, 'oturma')}
                  izinliEtiket={t('sesOda.izinli')}
                  izinsizEtiket={t('sesOda.izinsiz')}
                />
                <AyarSatiri
                  etiket={t('sesOda.mikrofonAyar')}
                  izinli={mikrofonIzinli}
                  kilitli={kayit != null}
                  onIzinli={() => void izinKaydet(oturmaIzinli, true, 'mikrofon')}
                  onIzinsiz={() => void izinKaydet(oturmaIzinli, false, 'mikrofon')}
                  izinliEtiket={t('sesOda.izinli')}
                  izinsizEtiket={t('sesOda.izinsiz')}
                />
              </View>
            ) : null}
            {sayi === 0 ? (
              <Text style={styles.bos}>{t('sesOda.bekleyenIstekYok')}</Text>
            ) : (
              <ScrollView
                style={styles.liste}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {liste.map((istek) => {
                  const ad =
                    istek.profile?.display_name?.trim() ||
                    istek.profile?.username?.trim() ||
                    istek.user_id.slice(0, 8);
                  const koltuk =
                    istek.istek_turu === 'mikrofon'
                      ? t('sesOda.mikrofonIzni')
                      : typeof istek.requested_seat_index === 'number'
                        ? t('sesOda.koltukN', {
                            n: istek.requested_seat_index + 1,
                          })
                        : t('sesOda.ilkBosKoltuk');
                  return (
                    <View key={istek.id} style={styles.satir}>
                      {MedyaUriGuvenli(istek.profile?.avatar_url) ? (
                        <Image
                          source={{
                            uri: MedyaUriGuvenli(istek.profile?.avatar_url)!,
                          }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={[styles.avatar, styles.avatarBos]}>
                          <Text style={styles.harf}>
                            {ad.charAt(0).toLocaleUpperCase(locale)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.metin}>
                        <Text style={styles.ad} numberOfLines={1}>
                          {ad}
                        </Text>
                        <Text style={styles.koltuk} numberOfLines={1}>
                          {koltuk}
                        </Text>
                      </View>
                      {busy === istek.id ? (
                        <ActivityIndicator color={RenkTokenlari.accent} />
                      ) : (
                        <View style={styles.aksiyonlar}>
                          <Pressable
                            onPress={() => void yanitla(istek.id, false)}
                            style={[styles.btn, styles.red]}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel={t('sesOda.istegiReddet', { ad })}
                          >
                            <Text style={styles.btnYazi}>{t('sesOda.reddet')}</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => void yanitla(istek.id, true)}
                            style={[styles.btn, styles.kabul]}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel={t('sesOda.istegiOnayla', { ad })}
                          >
                            <Text style={styles.btnYazi}>{t('sesOda.onayla')}</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function AyarSatiri({
  etiket,
  izinli,
  kilitli,
  onIzinli,
  onIzinsiz,
  izinliEtiket,
  izinsizEtiket,
}: {
  etiket: string;
  izinli: boolean;
  kilitli: boolean;
  onIzinli: () => void;
  onIzinsiz: () => void;
  izinliEtiket: string;
  izinsizEtiket: string;
}) {
  return (
    <View style={styles.ayarSatir}>
      <Text style={styles.ayarEtiket}>{etiket}</Text>
      <View style={styles.ayarSecim}>
        <Pressable
          onPress={onIzinli}
          disabled={kilitli || izinli}
          style={[styles.ayarBtn, izinli && styles.ayarBtnSecili]}
          accessibilityRole="button"
          accessibilityState={{ selected: izinli }}
        >
          <Text style={[styles.ayarBtnYazi, izinli && styles.ayarBtnYaziSecili]}>
            {izinliEtiket}
          </Text>
        </Pressable>
        <Pressable
          onPress={onIzinsiz}
          disabled={kilitli || !izinli}
          style={[styles.ayarBtn, !izinli && styles.ayarBtnSecili]}
          accessibilityRole="button"
          accessibilityState={{ selected: !izinli }}
        >
          <Text style={[styles.ayarBtnYazi, !izinli && styles.ayarBtnYaziSecili]}>
            {izinsizEtiket}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ayarlar: {
    gap: 8,
    marginBottom: 10,
  },
  ayarSatir: {
    gap: 6,
  },
  ayarEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  ayarSecim: {
    flexDirection: 'row',
    gap: 6,
  },
  ayarBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ayarBtnSecili: {
    backgroundColor: 'rgba(16,185,129,0.32)',
  },
  ayarBtnYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  ayarBtnYaziSecili: {
    color: RenkTokenlari.text,
  },
  buton: {
    width: ODA_DOCK_BTN,
    height: ODA_DOCK_BTN,
    borderRadius: ODA_DOCK_BTN / 2,
    backgroundColor: 'rgba(42, 36, 56, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    flexShrink: 0,
  },
  butonAcik: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: 'rgba(232, 64, 145, 0.28)',
  },
  rozet: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: RenkTokenlari.live,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  rozetYazi: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  kart: {
    position: 'absolute',
    width: KART_W,
    maxWidth: KART_W,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: BoslukTokenlari.sm,
    elevation: 16,
  },
  kartBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  sayiEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  liste: {
    maxHeight: 260,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    paddingVertical: 6,
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarBos: {
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  harf: { color: RenkTokenlari.text, fontWeight: '800', fontSize: 12 },
  metin: { flex: 1, minWidth: 0 },
  ad: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, fontWeight: '700' },
  koltuk: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  aksiyonlar: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.pill,
  },
  red: { backgroundColor: 'rgba(239,68,68,0.28)' },
  kabul: { backgroundColor: 'rgba(16,185,129,0.32)' },
  btnYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
