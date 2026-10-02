import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GorusmeVideoSahne } from './GorusmeVideoSahne';
import { GorusmeArkaPlan } from './GorusmeArkaPlan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { GorusmeTuru, ThreadKarsiProfil } from '../tipler';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useCeviri } from '../../../i18n/useCeviri';
import { GorusmeCeviriSohbetPaneli } from './GorusmeCeviriSohbetPaneli';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';

export function sureMetni(saniye: number): string {
  const h = Math.floor(saniye / 3600);
  const m = Math.floor((saniye % 3600) / 60);
  const s = saniye % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** answered_at veya baglandi anindan sure sayaci */
export function useGorusmeSuresi(
  baglandi: boolean,
  answeredAt?: string | null,
): number {
  const [saniye, setSaniye] = useState(0);

  useEffect(() => {
    if (!baglandi) {
      setSaniye(0);
      return;
    }
    const bas =
      answeredAt && !Number.isNaN(Date.parse(answeredAt))
        ? Date.parse(answeredAt)
        : Date.now();
    const tick = () =>
      setSaniye(Math.max(0, Math.floor((Date.now() - bas) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [baglandi, answeredAt]);

  return saniye;
}

type AktifProps = {
  peer: ThreadKarsiProfil | null;
  callType: GorusmeTuru;
  durumYazi: string;
  baglandi: boolean;
  answeredAt?: string | null;
  isCaller?: boolean;
  muted: boolean;
  speaker: boolean;
  cameraOn: boolean;
  mock?: boolean;
  /** DM thread — görüşme içi sohbet + çeviri */
  threadId?: string | null;
  /** Son 1 dk billing geri sayımı (sn) */
  billingRemainingSec?: number | null;
  billingLowBalance?: boolean;
  onMute: () => void;
  onSpeaker: () => void;
  onCamera?: () => void;
  onHangup: () => void;
  onFlip?: () => void;
  /** Bağlı görüşmeyi küçült — session açık kalır */
  onMinimize?: () => void;
};

/**
 * Ortak fullscreen call layout.
 * Tek background: GorusmeArkaPlan (parent). Bu bileşen yalnızca transparent flex içerik.
 * Yapı: Header → Main (flex:1) → Controls → Bitir
 */
export function GorusmeAktifEkrani({
  peer,
  callType,
  durumYazi,
  baglandi,
  answeredAt,
  isCaller,
  muted,
  speaker,
  cameraOn,
  mock,
  threadId,
  billingRemainingSec,
  billingLowBalance,
  onMute,
  onSpeaker,
  onCamera,
  onHangup,
  onFlip,
  onMinimize,
}: AktifProps) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const saniye = useGorusmeSuresi(baglandi, answeredAt);
  const [sohbetAcik, setSohbetAcik] = useState(false);
  const ad =
    peer?.display_name?.trim() ||
    peer?.username?.trim() ||
    t('ortak.kullanici');
  const video = callType === 'video';
  const avatarUri = MedyaUriGuvenli(peer?.avatar_url);
  const harf = ad.charAt(0).toLocaleUpperCase('tr-TR');
  const sohbetVar =
    !!threadId &&
    baglandi &&
    (OzellikBayragiAktifMi('live_chat_translation_enabled') ||
      OzellikBayragiAktifMi('messages_enabled'));

  return (
    <View style={styles.root} collapsable={false}>
      {/* Görüntülü: video katmanı absoluteFill — sesli'de yok (avatar flex main'de) */}
      {video ? (
        <View style={styles.sahne} pointerEvents="none" collapsable={false}>
          <GorusmeVideoSahne
            video
            cameraOn={cameraOn}
            mock={mock}
            peerAvatar={peer?.avatar_url}
            peerName={ad}
          />
        </View>
      ) : null}

      {/*
        flex:1 kolon — absoluteFill UI KULLANILMAZ.
        Önceki absoluteFill + boş uiOrta + üst/alt overlay gradient,
        içeriği üst yarıya yığıp Bitir altında keskin renk sınırı bırakıyordu.
      */}
      <View
        style={[
          styles.icerik,
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 10) + 8,
          },
        ]}
        collapsable={false}
      >
        <View style={styles.ustBolum} pointerEvents="box-none">
          <View style={styles.ustSatir}>
            {onMinimize ? (
              <Pressable
                onPress={onMinimize}
                style={styles.kucult}
                accessibilityLabel={t('gorusme.kucultA11y')}
                hitSlop={10}
              >
                <Ionicons name="chevron-down" size={26} color="#fff" />
              </Pressable>
            ) : (
              <View style={styles.kucultBos} />
            )}
            <View style={styles.ust}>
              <View style={styles.turPill}>
                <View style={[styles.liveDot, baglandi && styles.liveDotOn]} />
                <Text style={styles.tur}>
                  {video ? t('gorusme.goruntulu') : t('gorusme.sesli')}
                  {isCaller && !baglandi ? t('gorusme.araniyorEk') : ''}
                </Text>
              </View>
              <Text style={styles.ad} numberOfLines={1}>
                {ad}
              </Text>
              <Text style={styles.durum}>
                {baglandi ? sureMetni(saniye) : durumYazi}
              </Text>
              {baglandi ? (
                <Text style={styles.sureEtiket}>{t('gorusme.konusmaSuresi')}</Text>
              ) : null}
            </View>
            <View style={styles.kucultBos} />
          </View>
          {billingLowBalance &&
          billingRemainingSec != null &&
          billingRemainingSec <= 60 ? (
            <View style={styles.billingChip} accessibilityLiveRegion="polite">
              <Text style={styles.billingSure}>
                {sureMetni(Math.max(0, billingRemainingSec))}
              </Text>
              <Text style={styles.billingInfo} numberOfLines={1}>
                {t('gorusme.coinAzaliyorKisa')}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.orta} pointerEvents="none">
          {!video ? (
            <>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.ortaAvatar} />
              ) : (
                <View style={styles.ortaAvatarBos}>
                  <Text style={styles.ortaHarf}>{harf}</Text>
                </View>
              )}
              <Text style={styles.ortaHint}>
                {baglandi ? t('gorusme.sesliGorusme') : t('gorusme.karsiBekleniyor')}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.altBolum} pointerEvents="box-none">
          <View style={styles.kontroller}>
            <Kontrol
              icon={muted ? 'mic-off' : 'mic'}
              label={muted ? t('gorusme.sessiz') : t('gorusme.mikrofon')}
              aktif={muted}
              onPress={onMute}
            />
            <Kontrol
              icon={speaker ? 'volume-high' : 'volume-mute'}
              label={speaker ? t('gorusme.hoparlor') : t('gorusme.kulaklik')}
              aktif={speaker}
              onPress={onSpeaker}
            />
            {video && onCamera ? (
              <Kontrol
                icon={cameraOn ? 'videocam' : 'videocam-off'}
                label={t('gorusme.kamera')}
                aktif={!cameraOn}
                onPress={onCamera}
              />
            ) : null}
            {video && onFlip && cameraOn ? (
              <Kontrol
                icon="camera-reverse"
                label={t('gorusme.cevir')}
                onPress={onFlip}
              />
            ) : null}
            {sohbetVar ? (
              <Kontrol
                icon="chatbubble-ellipses"
                label={t('aiCeviri.gorusmeSohbetKisa')}
                onPress={() => setSohbetAcik(true)}
              />
            ) : !video ? (
              <Kontrol
                icon="ellipsis-horizontal"
                label={t('gorusme.diger')}
                onPress={() => undefined}
              />
            ) : null}
          </View>

          <Pressable
            style={styles.bitir}
            onPress={onHangup}
            accessibilityLabel={t('gorusme.bitirA11y')}
          >
            <Ionicons
              name="call"
              size={30}
              color="#fff"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </Pressable>
          <Text style={styles.bitirYazi}>{t('gorusme.bitir')}</Text>
        </View>
      </View>

      {threadId ? (
        <GorusmeCeviriSohbetPaneli
          threadId={threadId}
          visible={sohbetAcik}
          onClose={() => setSohbetAcik(false)}
        />
      ) : null}
    </View>
  );
}

type GelenProps = {
  peerName: string;
  peerAvatar?: string | null;
  callType: GorusmeTuru;
  onAccept: () => void;
  onReject: () => void;
};

/** Gelen arama — ortak GorusmeArkaPlan + flex kolon */
export function GorusmeGelenEkrani({
  peerName,
  peerAvatar,
  callType,
  onAccept,
  onReject,
}: GelenProps) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const harf = peerName.charAt(0).toLocaleUpperCase('tr-TR');
  // Modal'da inset 0 gelebilir — notch için güvenli taban
  const padTop = Math.max(insets.top, Platform.OS === 'ios' ? 54 : 28) + 20;
  const padBottom = Math.max(insets.bottom, 16) + 20;

  return (
    <GorusmeArkaPlan>
      <View
        style={[
          styles.gelenIcerik,
          { paddingTop: padTop, paddingBottom: padBottom },
        ]}
      >
        <View style={styles.gelenUst}>
          <Text style={styles.gelenTur}>
            {callType === 'video' ? t('gorusme.goruntuluArama') : t('gorusme.sesliArama')}
          </Text>
          <Text style={styles.gelenAlt}>{t('gorusme.ariyor')}</Text>
          <Text style={styles.gelenAd}>{peerName}</Text>
        </View>

        <View style={styles.gelenOrta}>
          <View style={styles.gelenAvatarWrap}>
            {MedyaUriGuvenli(peerAvatar) ? (
              <Image
                source={{ uri: MedyaUriGuvenli(peerAvatar)! }}
                style={styles.gelenAvatar}
              />
            ) : (
              <LinearGradient
                colors={[...RenkTokenlari.gradientPrimary]}
                style={styles.gelenAvatar}
              >
                <Text style={styles.harfBuyuk}>{harf}</Text>
              </LinearGradient>
            )}
            <View style={styles.gelenPulse} />
            <View style={[styles.gelenPulse, styles.gelenPulse2]} />
          </View>
        </View>

        <View style={styles.gelenAksiyonlar}>
          <View style={styles.gelenAksiyon}>
            <Pressable style={styles.red} onPress={onReject}>
              <Ionicons
                name="call"
                size={30}
                color="#fff"
                style={{ transform: [{ rotate: '135deg' }] }}
              />
            </Pressable>
            <Text style={styles.gelenLabel}>{t('gorusme.reddet')}</Text>
          </View>
          <View style={styles.gelenAksiyon}>
            <Pressable style={styles.kabul} onPress={onAccept}>
              <Ionicons
                name={callType === 'video' ? 'videocam' : 'call'}
                size={30}
                color="#fff"
              />
            </Pressable>
            <Text style={styles.gelenLabel}>{t('gorusme.kabulEt')}</Text>
          </View>
        </View>
      </View>
    </GorusmeArkaPlan>
  );
}

function Kontrol({
  icon,
  label,
  aktif,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  aktif?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.kontrol} onPress={onPress}>
      <View style={[styles.kontrolDaire, aktif && styles.kontrolAktif]}>
        <Ionicons
          name={icon}
          size={22}
          color={aktif ? '#111' : '#fff'}
        />
      </View>
      <Text style={styles.kontrolYazi}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  sahne: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  /** Tek kolon — absoluteFill değil; flex zinciri kırılmasın */
  icerik: {
    flex: 1,
    width: '100%',
    zIndex: 20,
    elevation: Platform.OS === 'android' ? 24 : 0,
    backgroundColor: 'transparent',
  },
  ustBolum: {
    paddingHorizontal: BoslukTokenlari.md,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  billingChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginStart: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,180,80,0.45)',
  },
  billingSure: {
    ...TipografiTokenlari.caption,
    color: '#FFB454',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontSize: 13,
  },
  billingInfo: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0,
    fontSize: 11,
    maxWidth: 160,
  },
  ustSatir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  kucult: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 2,
  },
  kucultBos: { width: 40 },
  ust: { alignItems: 'center', gap: 4, flex: 1 },
  turPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginBottom: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: RenkTokenlari.textDim,
  },
  liveDotOn: { backgroundColor: RenkTokenlari.mint },
  tur: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  ad: {
    ...TipografiTokenlari.title,
    color: '#fff',
    fontSize: 26,
    textAlign: 'center',
  },
  durum: {
    ...TipografiTokenlari.h2,
    color: '#fff',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  sureEtiket: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  orta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: 'transparent',
  },
  ortaAvatar: { width: 120, height: 120, borderRadius: 60 },
  ortaAvatarBos: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ortaHarf: { fontSize: 44, fontWeight: '800', color: '#fff' },
  ortaHint: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.65)',
  },
  altBolum: {
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  kontroller: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  kontrol: { alignItems: 'center', gap: 8, width: 72 },
  kontrolDaire: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kontrolAktif: { backgroundColor: '#fff' },
  kontrolYazi: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  bitir: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: RenkTokenlari.danger,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
  bitirYazi: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    fontWeight: '600',
  },
  gelenIcerik: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  gelenUst: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
    paddingHorizontal: BoslukTokenlari.lg,
  },
  gelenTur: {
    ...TipografiTokenlari.body,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  gelenAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
  gelenAd: {
    ...TipografiTokenlari.title,
    color: '#fff',
    fontSize: 32,
    marginTop: 4,
    textAlign: 'center',
  },
  gelenOrta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  gelenAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  gelenAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  harfBuyuk: {
    fontSize: 56,
    fontWeight: '800',
    color: RenkTokenlari.textOnPrimary,
  },
  gelenPulse: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(232,64,145,0.35)',
  },
  gelenPulse2: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderColor: 'rgba(196,59,255,0.2)',
  },
  gelenAksiyonlar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingHorizontal: BoslukTokenlari.xxl,
  },
  gelenAksiyon: { alignItems: 'center', gap: 10 },
  red: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: RenkTokenlari.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kabul: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gelenLabel: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
});
