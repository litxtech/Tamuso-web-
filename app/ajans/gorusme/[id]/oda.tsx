import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { RoomEvent, Track } from 'livekit-client';
import { Screen } from '../../../../src/components/Screen';
import { LiveKitBaglantiYoneticisi } from '../../../../src/moduller/livekit/baglanti/LiveKitBaglantiYoneticisi';
import { LiveKitVideoViewAl } from '../../../../src/moduller/livekit/bilesenler/LiveKitVideoViewAl';
import {
  MedyaDinleyiciyeDusur,
  MedyaKameraAyarla,
  MedyaKonusmaciyaYukselt,
  MedyaMikrofonAyarla,
  MedyaOdasiBaglan,
  MedyaOdasiKes,
} from '../../../../src/moduller/livekit/MedyaBaglantisi';
import { KonusmaciSesSeviyesi } from '../../../../src/moduller/livekit/ses/KonusmaciSesSeviyesi';
import { CanliRolYayinlar, OdaIzgarasiSec } from '../../../../src/moduller/ajans-gorusme/kurallar/AjansGorusmeKurallari';
import {
  AjansGorusmeAyril,
  AjansGorusmeBitir,
  AjansGorusmeCanliYetkiUygula,
  AjansGorusmeCikar,
  AjansGorusmeDetayGetir,
  AjansGorusmeKatilimcilariGetir,
  AjansGorusmeKilitle,
  AjansGorusmeMedyaKapat,
  AjansGorusmeMesajGonder,
  AjansGorusmeMesajlariGetir,
  AjansGorusmeRolAta,
  AjansGorusmeSozIste,
} from '../../../../src/moduller/ajans-gorusme/islemler/AjansGorusmeIslemleri';
import { AjansGorusmeAnalitik } from '../../../../src/moduller/ajans-gorusme/analitik/AjansGorusmeAnalitik';
import { KullaniciBildir, KullaniciEngelle } from '../../../../src/moduller/moderasyon/islemler/ModerasyonIslemleri';
import type {
  AjansGorusmeDetay,
  AjansGorusmeKatilimci,
  AjansGorusmeMesaj,
} from '../../../../src/moduller/ajans-gorusme/tipler';
import { supabase } from '../../../../src/lib/supabase';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { useCeviri } from '../../../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

function rolAnahtar(rol: string): CeviriAnahtari {
  switch (rol) {
    case 'host':
      return 'ajans.gorusmeRolHost';
    case 'co_host':
      return 'ajans.gorusmeRolCoHost';
    case 'speaker':
      return 'ajans.gorusmeRolKonusmaci';
    case 'platform':
      return 'ajans.gorusmeRolPlatform';
    default:
      return 'ajans.gorusmeRolDinleyici';
  }
}

function sistemMetin(body: string, t: (k: CeviriAnahtari) => string): string {
  switch (body) {
    case 'participant_joined':
      return t('ajans.gorusmeSistemKatildi');
    case 'moved_on_stage':
      return t('ajans.gorusmeSistemSahne');
    case 'moved_off_stage':
      return t('ajans.gorusmeSistemSahneIndi');
    case 'meeting_started':
      return t('ajans.gorusmeSistemBasladi');
    case 'meeting_ended':
    case 'force_ended':
      return t('ajans.gorusmeSistemBitti');
    default:
      return body;
  }
}

type Kare = { id: string; ad: string; track: Track | null };

export default function AjansGorusmeOdaEkrani() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ id: string; mic?: string; cam?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const micBas = params.mic !== '0';
  const camBas = params.cam === '1';
  const [detay, setDetay] = useState<AjansGorusmeDetay | null>(null);
  const [kisiler, setKisiler] = useState<AjansGorusmeKatilimci[]>([]);
  const [mesajlar, setMesajlar] = useState<AjansGorusmeMesaj[]>([]);
  const [baglanti, setBaglanti] = useState(t('ajans.gorusmeBaglaniyor'));
  const [hata, setHata] = useState<string | null>(null);
  const [mic, setMic] = useState(micBas);
  const [cam, setCam] = useState(camBas);
  const [sohbet, setSohbet] = useState(false);
  const [panel, setPanel] = useState(false);
  const [secili, setSecili] = useState<AjansGorusmeKatilimci | null>(null);
  const [yazi, setYazi] = useState('');
  const [kareler, setKareler] = useState<Kare[]>([]);
  const [konusan, setKonusan] = useState<string | null>(null);
  const rolRef = useRef<string>('listener');
  const odaAdi = useRef<string | null>(null);
  const Video = LiveKitVideoViewAl();
  const yatay = width > height;

  const yenileKare = useCallback(() => {
    const room = LiveKitBaglantiYoneticisi.oda();
    if (!room) {
      setKareler([]);
      return;
    }
    const liste: Kare[] = [];
    const yerel = room.localParticipant.getTrackPublication(Track.Source.Camera);
    liste.push({
      id: room.localParticipant.identity,
      ad: room.localParticipant.name || t('ajans.gorusmeMic'),
      track: yerel?.track ?? null,
    });
    room.remoteParticipants.forEach((p) => {
      const pub = p.getTrackPublication(Track.Source.Camera);
      liste.push({
        id: p.identity,
        ad: p.name || p.identity.slice(0, 6),
        track: pub?.track ?? null,
      });
    });
    setKareler(liste);
  }, [t]);

  const yukle = useCallback(async () => {
    if (!id) return;
    const d = await AjansGorusmeDetayGetir(id);
    setDetay(d);
    setKisiler(await AjansGorusmeKatilimcilariGetir(id));
    setMesajlar(await AjansGorusmeMesajlariGetir(id));
    return d;
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    let kapali = false;
    const baglan = async () => {
      try {
        const acik = LiveKitBaglantiYoneticisi.durumGetir();
        const ad = LiveKitBaglantiYoneticisi.odaAdi();
        const d = await yukle();
        if (!d || kapali) return;
        if ((acik === 'connected' || acik === 'connecting') && ad && ad !== d.livekit_room_name) {
          setHata(t('ajans.gorusmeBaskaOturum'));
          setBaglanti(t('ajans.gorusmeKoptu'));
          return;
        }
        if (d.status !== 'live') {
          setBaglanti(d.status === 'ended' || d.status === 'cancelled' ? t('ajans.gorusmeBitti') : t('ajans.gorusmeYaklasan'));
          return;
        }
        const ben = (await AjansGorusmeKatilimcilariGetir(id)).find((k) => k.user_id === user.id);
        const rol = CanliRolYayinlar(ben?.role ?? 'listener', ben?.can_speak ?? false);
        rolRef.current = rol;
        odaAdi.current = d.livekit_room_name;
        setBaglanti(t('ajans.gorusmeBaglaniyor'));
        const sonuc = await MedyaOdasiBaglan({
          roomName: d.livekit_room_name,
          role: rol,
          video: camBas && d.media_type !== 'audio' && rol !== 'listener',
          gorusmeModu: true,
          micAcik: micBas && rol !== 'listener',
        });
        if (!sonuc.ok) {
          setHata(sonuc.hata);
          setBaglanti(t('ajans.gorusmeKoptu'));
          return;
        }
        setBaglanti(t('ajans.gorusmeBaglandi'));
        yenileKare();
      } catch (e) {
        setHata(e instanceof Error ? e.message : t('ajans.gorusmeVideoHata'));
        setBaglanti(t('ajans.gorusmeKoptu'));
      }
    };
    void baglan();
    const kanal = supabase
      .channel(`agency-meeting-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agency_meeting_participants', filter: `meeting_id=eq.${id}` }, () => {
        void yukle();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agency_meetings', filter: `id=eq.${id}` }, () => {
        void yukle();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agency_meeting_messages', filter: `meeting_id=eq.${id}` }, () => {
        void AjansGorusmeMesajlariGetir(id).then(setMesajlar).catch(() => undefined);
      })
      .subscribe();
    const dur = LiveKitBaglantiYoneticisi.dinle((durum) => {
      if (durum === 'connecting') setBaglanti(t('ajans.gorusmeBaglaniyor'));
      if (durum === 'connected') setBaglanti(t('ajans.gorusmeBaglandi'));
      if (durum === 'disconnected') setBaglanti(t('ajans.gorusmeAyrildi'));
      if (durum === 'error') setBaglanti(t('ajans.gorusmeYeniden'));
      yenileKare();
    });
    const ses = KonusmaciSesSeviyesi.dinle((userId, level) => {
      setKonusan(level > 0.08 ? userId : null);
    });
    return () => {
      kapali = true;
      dur();
      ses();
      void supabase.removeChannel(kanal);
      if (odaAdi.current && LiveKitBaglantiYoneticisi.odaAdi() === odaAdi.current) {
        void MedyaOdasiKes({ zorla: true });
      }
    };
  }, [camBas, id, micBas, t, user, yenileKare, yukle]);

  useEffect(() => {
    const room = LiveKitBaglantiYoneticisi.oda();
    if (!room) return;
    const guncelle = () => yenileKare();
    room.on(RoomEvent.Reconnecting, () => setBaglanti(t('ajans.gorusmeYeniden')));
    room.on(RoomEvent.Reconnected, () => setBaglanti(t('ajans.gorusmeBaglandi')));
    room.on(RoomEvent.TrackSubscribed, guncelle);
    room.on(RoomEvent.TrackUnsubscribed, guncelle);
    room.on(RoomEvent.ParticipantConnected, guncelle);
    room.on(RoomEvent.ParticipantDisconnected, guncelle);
    return () => {
      room.off(RoomEvent.TrackSubscribed, guncelle);
      room.off(RoomEvent.TrackUnsubscribed, guncelle);
      room.off(RoomEvent.ParticipantConnected, guncelle);
      room.off(RoomEvent.ParticipantDisconnected, guncelle);
    };
  }, [baglanti, t, yenileKare]);

  useEffect(() => {
    if (!user || !detay || detay.status !== 'live' || !odaAdi.current) return;
    const ben = kisiler.find((k) => k.user_id === user.id);
    if (!ben) return;
    const rol = CanliRolYayinlar(ben.role, ben.can_speak);
    if (rol === rolRef.current) {
      if (!ben.can_speak) MedyaMikrofonAyarla(false);
      if (!ben.can_video) MedyaKameraAyarla(false);
      return;
    }
    rolRef.current = rol;
    if (rol === 'listener') void MedyaDinleyiciyeDusur(odaAdi.current);
    else void MedyaKonusmaciyaYukselt(odaAdi.current);
  }, [detay, kisiler, user]);

  const ayril = async () => {
    if (id) await AjansGorusmeAyril(id).catch(() => undefined);
    router.back();
  };

  const izgara = OdaIzgarasiSec(Math.max(kareler.length, kisiler.filter((k) => k.status === 'joined').length, 1));
  const kutu = izgara === 'single' ? width - 24 : izgara === 'split' ? (yatay ? width / 2 - 16 : width - 24) : (width - 36) / 2;
  const bitti = detay?.status === 'ended' || detay?.status === 'cancelled';
  const ben = kisiler.find((k) => k.user_id === user?.id);
  const elKaldir = !!ben?.hand_raised;

  const kontroller = useMemo(
    () => [
      { ad: t('ajans.gorusmeMic'), fn: () => { const n = !mic; setMic(n); MedyaMikrofonAyarla(n); } },
      { ad: cam ? t('ajans.gorusmeCam') : t('ajans.gorusmeCamKapat'), fn: () => { const n = !cam; setCam(n); MedyaKameraAyarla(n); } },
      { ad: t('ajans.gorusmeKatilimci'), fn: () => setPanel(true) },
      { ad: t('ajans.gorusmeSohbet'), fn: () => setSohbet(true) },
      { ad: t('ajans.gorusmeSoz'), fn: () => id && void AjansGorusmeSozIste(id, !elKaldir) },
      { ad: t('ajans.gorusmeAyril'), fn: () => void ayril() },
    ],
    [cam, elKaldir, id, mic, t],
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.ust}>
        <Text style={styles.ajans} numberOfLines={1}>{detay?.agency_name || t('ajans.gorusmeResmi')}</Text>
        <Text style={styles.baslik} numberOfLines={1}>{detay?.title}</Text>
        <Text style={styles.meta}>
          {detay?.participant_count ?? kisiler.length} {t('ajans.gorusmeKisi')} · {baglanti}
        </Text>
      </View>
      {hata ? <Text style={styles.hata}>{hata}</Text> : null}
      {bitti ? <Text style={styles.hata}>{t('ajans.gorusmeBittiMesaj')}</Text> : null}
      <View style={[styles.sahne, izgara === 'split' && yatay && styles.yatay]}>
        {(kareler.length ? kareler : kisiler.filter((k) => k.status === 'joined')).map((k) => {
          const kim = 'user_id' in k ? k.user_id : k.id;
          const ad = 'display_name' in k ? (k.display_name || k.username || '') : k.ad;
          const track = 'track' in k ? k.track : null;
          const aktif = konusan === kim;
          return (
            <Pressable
              key={kim}
              accessibilityRole="button"
              accessibilityLabel={ad}
              onPress={() => {
                const kisi = kisiler.find((x) => x.user_id === kim);
                if (kisi && detay?.can_manage && kisi.user_id !== user?.id) setSecili(kisi);
              }}
              style={[styles.kare, { width: kutu, height: izgara === 'single' ? height * 0.46 : 160 }, aktif && styles.aktif]}
            >
              {Video && track ? (
                <Video style={StyleSheet.absoluteFill} videoTrack={track as never} objectFit="cover" />
              ) : (
                <Text style={styles.avatar}>{(ad || '?').slice(0, 1).toUpperCase()}</Text>
              )}
              <Text style={styles.etiket} numberOfLines={1}>{ad}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.kontroller}>
        {kontroller.map((k) => (
          <Pressable key={k.ad} accessibilityRole="button" accessibilityLabel={k.ad} style={styles.dugme} onPress={k.fn}>
            <Text style={styles.dugmeYazi} numberOfLines={1}>{k.ad}</Text>
          </Pressable>
        ))}
        {detay?.can_manage && detay.status === 'live' ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeKilitle')} style={styles.dugme} onPress={() => void AjansGorusmeKilitle(detay.id, !detay.locked).then(setDetay)}>
              <Text style={styles.dugmeYazi}>{detay.locked ? t('ajans.gorusmeKilitAc') : t('ajans.gorusmeKilitle')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeBitir')} style={styles.dugme} onPress={() => void AjansGorusmeBitir(detay.id).then(() => router.back())}>
              <Text style={styles.dugmeYazi}>{t('ajans.gorusmeBitir')}</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <Modal visible={panel} animationType="slide" transparent onRequestClose={() => setPanel(false)}>
        <View style={styles.sheet}>
          <Text style={styles.baslik}>{t('ajans.gorusmeKatilimci')}</Text>
          {kisiler.map((k) => (
            <Pressable key={k.user_id} accessibilityRole="button" accessibilityLabel={`${k.display_name || ''} ${t(rolAnahtar(k.role))}`} onPress={() => detay?.can_manage && setSecili(k)}>
              <Text style={styles.kisi}>
                {k.is_platform_official ? '● ' : '○ '}
                {k.display_name || k.username} · {t(rolAnahtar(k.role))}
                {k.can_speak ? ' · 🎙' : ''}
                {k.hand_raised ? ' · ✋' : ''}
              </Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel={t('ortak.kapat')} onPress={() => setPanel(false)}>
            <Text style={styles.link}>{t('ortak.kapat')}</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={!!secili} animationType="fade" transparent onRequestClose={() => setSecili(null)}>
        <View style={styles.sheet}>
          <Text style={styles.baslik}>{t('ajans.gorusmeYonet')}</Text>
          {secili && id ? (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeSahneye')} onPress={() => void AjansGorusmeRolAta(id, secili.user_id, 'speaker').then(() => AjansGorusmeCanliYetkiUygula(detay?.livekit_room_name || '', secili.user_id)).then(() => setSecili(null))}>
                <Text style={styles.link}>{t('ajans.gorusmeSahneye')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeSahneden')} onPress={() => void AjansGorusmeRolAta(id, secili.user_id, 'listener').then(() => AjansGorusmeCanliYetkiUygula(detay?.livekit_room_name || '', secili.user_id)).then(() => setSecili(null))}>
                <Text style={styles.link}>{t('ajans.gorusmeSahneden')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeSessiz')} onPress={() => void AjansGorusmeMedyaKapat(id, secili.user_id, true, false).then(() => AjansGorusmeCanliYetkiUygula(detay?.livekit_room_name || '', secili.user_id))}>
                <Text style={styles.link}>{t('ajans.gorusmeSessiz')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeCamKapat')} onPress={() => void AjansGorusmeMedyaKapat(id, secili.user_id, false, true)}>
                <Text style={styles.link}>{t('ajans.gorusmeCamKapat')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeCikar')} onPress={() => void AjansGorusmeCikar(id, secili.user_id).then(() => AjansGorusmeCanliYetkiUygula(detay?.livekit_room_name || '', secili.user_id)).then(() => setSecili(null))}>
                <Text style={styles.link}>{t('ajans.gorusmeCikar')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeEngelle')} onPress={() => void KullaniciEngelle(secili.user_id).then(() => AjansGorusmeCikar(id, secili.user_id))}>
                <Text style={styles.link}>{t('ajans.gorusmeEngelle')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeRapor')} onPress={() => void KullaniciBildir({ reason: 'agency_meeting', targetUserId: secili.user_id, contentType: 'other', contentId: id, context: { kind: 'agency_meeting', meeting_id: id } }).then(() => { AjansGorusmeAnalitik('agency_room_reported'); setHata(t('ajans.gorusmeRaporGitti')); })}>
                <Text style={styles.link}>{t('ajans.gorusmeRapor')}</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={t('ortak.kapat')} onPress={() => setSecili(null)}>
            <Text style={styles.link}>{t('ortak.kapat')}</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={sohbet} animationType="slide" transparent onRequestClose={() => setSohbet(false)}>
        <View style={styles.sheet}>
          <Text style={styles.baslik}>{t('ajans.gorusmeSohbet')}</Text>
          <FlatList
            data={mesajlar}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <Text style={styles.kisi}>
                {item.kind === 'system'
                  ? sistemMetin(item.body, t)
                  : `${item.display_name || ''}: ${item.body}`}
              </Text>
            )}
          />
          <TextInput
            value={yazi}
            onChangeText={setYazi}
            placeholder={t('ajans.gorusmeMesajPh')}
            placeholderTextColor={RenkTokenlari.textDim}
            accessibilityLabel={t('ajans.gorusmeSohbet')}
            style={styles.girdi}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ajans.gorusmeSohbet')}
            onPress={() => {
              if (!id || !yazi.trim()) return;
              void AjansGorusmeMesajGonder(id, yazi.trim()).then(() => setYazi(''));
            }}
          >
            <Text style={styles.link}>{t('ortak.kaydet')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('ortak.kapat')} onPress={() => setSohbet(false)}>
            <Text style={styles.link}>{t('ortak.kapat')}</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ust: { paddingHorizontal: 16, paddingBottom: 8 },
  ajans: { ...TipografiTokenlari.caption, color: RenkTokenlari.primarySoft, fontWeight: '700' },
  baslik: { ...TipografiTokenlari.title, color: RenkTokenlari.text },
  meta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  hata: { color: RenkTokenlari.danger, paddingHorizontal: 16 },
  sahne: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  yatay: { flexWrap: 'nowrap' },
  kare: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aktif: { borderColor: RenkTokenlari.primarySoft, borderWidth: 2 },
  avatar: { color: RenkTokenlari.text, fontSize: 28, fontWeight: '800' },
  etiket: { position: 'absolute', left: 8, bottom: 8, color: RenkTokenlari.text, fontWeight: '700' },
  kontroller: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  dugme: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 72,
  },
  dugmeYazi: { color: RenkTokenlari.text, fontSize: 12, fontWeight: '700' },
  sheet: {
    marginTop: 'auto',
    backgroundColor: RenkTokenlari.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 8,
    maxHeight: '80%',
  },
  kisi: { color: RenkTokenlari.text, paddingVertical: 6 },
  link: { color: RenkTokenlari.primarySoft, fontWeight: '700', paddingVertical: 8 },
  girdi: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 12,
    color: RenkTokenlari.text,
    padding: 12,
  },
});
