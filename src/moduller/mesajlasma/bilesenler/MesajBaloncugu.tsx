import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DirektMesaj } from '../okuma/MesajlariGetir';
import { HostBasvurusuOlustur } from '../../hostlar/islemler/HostBasvuruIslemleri';
import { AjansDavetMesajindanKoduCikar } from '../../ajanslar/yardimcilar/AjansDavetMesajindanKoduCikar';
import { MedyaUriGuvenli } from '../yardimcilar/MedyaUriGecerliMi';
import { MesajYanitOzetMetin } from '../yardimcilar/MesajYanitOzetMetin';
import { DurumVideoOnizleme } from '../../durum/bilesenler/DurumVideoOnizleme';
import { PaylasilanGonderiKarti } from '../../durum/paylasim/bilesenler/PaylasilanGonderiKarti';
import type { PaylasilanDurumOnizleme } from '../../durum/paylasim/tipler';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import { fizikselHiza } from '../../../i18n/rtl';
import { MesajSesKarti } from './MesajSesKarti';
import { MesajMuzikKarti } from './MesajMuzikKarti';
import { MesajDosyaKarti } from './MesajDosyaKarti';
import { MesajLinkOnizlemeKarti } from './MesajLinkOnizlemeKarti';
import { MesajBaglantiliMetin } from './MesajBaglantiliMetin';
import { MesajViewOnceKarti } from './MesajViewOnceKarti';
import { MesajAjansPaketTeklifKarti } from './MesajAjansPaketTeklifKarti';
import { MesajAjansPaketFisKarti } from './MesajAjansPaketFisKarti';
import { MesajKartTokenlari } from '../tasarim/MesajKartTokenlari';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { CeviriMetinKarti } from '../../ai-ceviri/bilesenler/CeviriMetinKarti';
import { MesajIlkUrl } from '../yardimcilar/MesajUrlAyikla';
import {
  DosyaMimeTahmin,
  UzakDosyayiIndirVePaylas,
} from '../islemler/MesajDosyaIndir';

type Props = {
  item: DirektMesaj;
  mine: boolean;
  /** Karsi tarafin last_read_at — kendi mesajlarinda goruldu */
  peerLastReadAt?: string | null;
  onLongPress?: () => void;
  /** Tek ekran-seviyesi goruntuleyici — baloncuk basina Modal yok */
  onMedyaAc?: (uri: string, tur: 'image' | 'video') => void;
  /** shared_post önizleme (batch) */
  sharedPostOnizleme?: PaylasilanDurumOnizleme | null;
  sharedPostYukleniyor?: boolean;
  /** Yanıtlanan mesaj (liste içinden resolve) */
  replyTo?: DirektMesaj | null;
  onReplyPress?: (replyToId: string) => void;
  onViewOncePatch?: (patch: Partial<DirektMesaj>) => void;
  /** Çift dokunuşla yanıt */
  onReply?: (item: DirektMesaj) => void;
  highlighted?: boolean;
};

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

function mesajGorulduMu(
  item: DirektMesaj,
  peerLastReadAt: string | null | undefined,
): boolean {
  if (!peerLastReadAt || !item.created_at) return false;
  return new Date(peerLastReadAt).getTime() >= new Date(item.created_at).getTime();
}

/** Telegram tarzi baloncuk — metin / kenarsiz medya / ajans daveti / V2 kartlar */
export function MesajBaloncugu({
  item,
  mine,
  peerLastReadAt,
  onLongPress,
  onMedyaAc,
  sharedPostOnizleme,
  sharedPostYukleniyor,
  replyTo,
  onReplyPress,
  onViewOncePatch,
  onReply,
  highlighted,
}: Props) {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const pendingTap = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Baloncuk tarafı GÖNDEREN semantiği — UI dili değil.
   * mine her zaman fiziksel SAĞ, theirs fiziksel SOL.
   * RTL'de flex-end sola kaydığı için render-time fizikselHiza şart.
   */
  const hiza = fizikselHiza(mine ? 'end' : 'start');
  /** sharedWrap içi (kart + meta) aynı fiziksel kenara yaslansın */
  const icHiza = {
    alignItems: hiza.alignSelf === 'flex-end' ? ('flex-end' as const) : ('flex-start' as const),
  };
  const queued = item._localStatus === 'queued';
  const sending = item._localStatus === 'sending' || queued;
  const failed = item._localStatus === 'failed';
  const safeMediaUri = MedyaUriGuvenli(item.media_url);
  const isImage = item.message_type === 'image' && !!safeMediaUri;
  const isVideo = item.message_type === 'video' && !!safeMediaUri;
  const isVoice = item.message_type === 'voice';
  const isMusic = item.message_type === 'music';
  const isFile = item.message_type === 'file' && !!safeMediaUri;
  const isViewOnce = !!item.view_once && (item.message_type === 'image' || item.message_type === 'video');
  const isBrokenMedia =
    (item.message_type === 'image' || item.message_type === 'video' || item.message_type === 'file') &&
    !safeMediaUri &&
    !isViewOnce;
  const isMedya = isImage || isVideo;
  const isSystem = item.message_type === 'system';
  const isSharedPost = item.message_type === 'shared_post';
  const isAgencyOffer = item.message_type === 'agency_package_offer';
  const isAgencyReceipt = item.message_type === 'agency_package_receipt';
  const davet = AjansDavetMesajindanKoduCikar(item.body);
  const [davetBusy, setDavetBusy] = useState(false);
  const [davetGonderildi, setDavetGonderildi] = useState(false);
  const [indirBusy, setIndirBusy] = useState(false);
  /** Aynı URI ile her render yeni source üretmek Android'de görseli baştan fade eder. */
  const imageSource = useMemo(
    () => (isImage && safeMediaUri ? { uri: safeMediaUri } : null),
    [isImage, safeMediaUri],
  );
  const goruldu = mine && !sending && !failed && mesajGorulduMu(item, peerLastReadAt);
  const edited = !!item.edited_at;

  const yanitAktif =
    !!onReply &&
    OzellikBayragiAktifMi('message_reply_enabled') &&
    !isSystem;

  useEffect(() => {
    return () => {
      if (pendingTap.current) clearTimeout(pendingTap.current);
    };
  }, []);

  /** Çift dokunuş → yanıt; tek dokunuş (gecikmeli) → onTek */
  const ciftTik = (onTek?: () => void) => {
    if (!yanitAktif) {
      onTek?.();
      return;
    }
    if (pendingTap.current) {
      clearTimeout(pendingTap.current);
      pendingTap.current = null;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined,
      );
      onReply?.(item);
      return;
    }
    pendingTap.current = setTimeout(() => {
      pendingTap.current = null;
      onTek?.();
    }, 280);
  };

  const davetiKabulEt = () => {
    if (!davet || mine || davetBusy || davetGonderildi) return;
    const baslik = davet.ajansAdi
      ? t('mesajlar.ajansaKatil', { ad: davet.ajansAdi })
      : t('mesajlar.ajansDavetKabul');
    Alert.alert(
      baslik,
      t('mesajlar.davetOnaySoru', { kod: davet.kod }),
      [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('mesajlar.kabulEt'),
          onPress: () => {
            void (async () => {
              setDavetBusy(true);
              const r = await HostBasvurusuOlustur({
                path: 'join_agency',
                inviteCode: davet.kod,
              });
              setDavetBusy(false);
              if (!r.ok) {
                Alert.alert(t('mesajlar.davet'), r.hata ?? t('mesajlar.basvuruGonderilemedi'));
                return;
              }
              setDavetGonderildi(true);
              Alert.alert(
                t('mesajlar.basvuruGonderildi'),
                t('mesajlar.basvuruGonderildiBody'),
                [
                  {
                    text: t('mesajlar.panelGit'),
                    onPress: () => router.push('/ajans/uye' as any),
                  },
                ],
              );
            })();
          },
        },
      ],
    );
  };

  const sar = (node: React.ReactNode) => (
    <View
      style={highlighted ? styles.highlight : undefined}
      accessibilityHint={yanitAktif ? t('mesajV2.doubleTapToReply') : undefined}
    >
      {node}
    </View>
  );

  if (isSystem) {
    return (
      <View style={styles.system}>
        <Text style={styles.systemText}>{item.body}</Text>
      </View>
    );
  }

  if (isSharedPost) {
    return sar(
      <Pressable
        onPress={() => ciftTik()}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[styles.sharedWrap, hiza, icHiza, sending && styles.sending]}
      >
        <PaylasilanGonderiKarti
          onizleme={sharedPostOnizleme}
          note={item.body}
          mine={mine}
          onLongPress={onLongPress}
          yukleniyor={sharedPostYukleniyor}
        />
        <View style={styles.sharedMeta}>
          <Text style={mine ? styles.timeMine : styles.time}>
            {saat(item.created_at, locale)}
          </Text>
          {mine ? (
            <Ionicons
              name={
                failed
                  ? 'alert-circle'
                  : sending
                    ? queued
                      ? 'cloud-upload-outline'
                      : 'time-outline'
                    : goruldu
                      ? 'checkmark-done'
                      : 'checkmark'
              }
              size={14}
              color={
                failed
                  ? RenkTokenlari.danger
                  : goruldu
                    ? RenkTokenlari.mint
                    : 'rgba(18,4,12,0.55)'
              }
            />
          ) : null}
        </View>
      </Pressable>,
    );
  }

  if (isAgencyOffer) {
    return sar(
      <View style={[styles.sharedWrap, hiza, icHiza, sending && styles.sending]}>
        <MesajAjansPaketTeklifKarti
          item={item}
          mine={mine}
          onLongPress={onLongPress}
        />
        <View style={styles.sharedMeta}>
          <Text style={mine ? styles.timeMine : styles.time}>
            {saat(item.created_at, locale)}
          </Text>
          {mine ? (
            <Ionicons
              name={
                failed
                  ? 'alert-circle'
                  : sending
                    ? queued
                      ? 'cloud-upload-outline'
                      : 'time-outline'
                    : goruldu
                      ? 'checkmark-done'
                      : 'checkmark'
              }
              size={14}
              color={
                failed
                  ? RenkTokenlari.danger
                  : goruldu
                    ? RenkTokenlari.mint
                    : 'rgba(18,4,12,0.55)'
              }
            />
          ) : null}
        </View>
      </View>,
    );
  }

  if (isAgencyReceipt) {
    return sar(
      <View style={[styles.sharedWrap, hiza, icHiza, sending && styles.sending]}>
        <MesajAjansPaketFisKarti
          item={item}
          mine={mine}
          onLongPress={onLongPress}
        />
        <View style={styles.sharedMeta}>
          <Text style={mine ? styles.timeMine : styles.time}>
            {saat(item.created_at, locale)}
          </Text>
          {mine ? (
            <Ionicons
              name={
                failed
                  ? 'alert-circle'
                  : sending
                    ? queued
                      ? 'cloud-upload-outline'
                      : 'time-outline'
                    : goruldu
                      ? 'checkmark-done'
                      : 'checkmark'
              }
              size={14}
              color={
                failed
                  ? RenkTokenlari.danger
                  : goruldu
                    ? RenkTokenlari.mint
                    : 'rgba(18,4,12,0.55)'
              }
            />
          ) : null}
        </View>
      </View>,
    );
  }

  const durumIkonu = (): {
    name: keyof typeof Ionicons.glyphMap;
    color: string;
  } => {
    if (failed) return { name: 'alert-circle', color: RenkTokenlari.danger };
    if (queued) {
      return {
        name: 'cloud-upload-outline',
        color: isMedya ? 'rgba(255,255,255,0.75)' : 'rgba(18,4,12,0.55)',
      };
    }
    if (sending) {
      return {
        name: 'time-outline',
        color: isMedya ? 'rgba(255,255,255,0.75)' : 'rgba(18,4,12,0.55)',
      };
    }
    if (goruldu) return { name: 'checkmark-done', color: RenkTokenlari.mint };
    return {
      name: 'checkmark',
      color: isMedya ? 'rgba(255,255,255,0.85)' : 'rgba(18,4,12,0.55)',
    };
  };

  const metaSatiri = (medyaUstu: boolean) => {
    const ikon = durumIkonu();
    return (
      <View style={[styles.meta, medyaUstu && styles.metaMedya]}>
        {edited ? (
          <Text
            style={[
              mine
                ? medyaUstu
                  ? styles.timeMedya
                  : styles.timeMine
                : medyaUstu
                  ? styles.timeMedya
                  : styles.time,
              styles.edited,
            ]}
          >
            {t('mesajV2.edited')}
          </Text>
        ) : null}
        <Text
          style={[
            mine
              ? medyaUstu
                ? styles.timeMedya
                : styles.timeMine
              : medyaUstu
                ? styles.timeMedya
                : styles.time,
          ]}
        >
          {saat(item.created_at, locale)}
        </Text>
        {mine ? (
          <Ionicons name={ikon.name} size={14} color={ikon.color} />
        ) : null}
      </View>
    );
  };

  const ceviriAcik = OzellikBayragiAktifMi('live_chat_translation_enabled');
  const replyOzet = replyTo
    ? MesajYanitOzetMetin(replyTo, t as (k: string) => string)
    : null;
  const replyCevir = !!replyTo?.body?.trim() && ceviriAcik;

  const replyBlok =
    replyTo || item.reply_to_id ? (
      <Pressable
        onPress={() => {
          if (item.reply_to_id) onReplyPress?.(item.reply_to_id);
        }}
        style={[styles.replyBlok, mine ? styles.replyMine : styles.replyTheirs]}
      >
        <View style={styles.replyBar} />
        {replyCevir && replyTo?.body ? (
          <CeviriMetinKarti
            text={replyTo.body}
            context="dm"
            varyant={mine ? 'bubbleMine' : 'bubble'}
            numberOfLines={2}
          />
        ) : (
          <Text
            style={mine ? styles.replyTextMine : styles.replyText}
            numberOfLines={1}
          >
            {replyOzet ?? t('mesajV2.messageUnavailable')}
          </Text>
        )}
      </Pressable>
    ) : null;

  if (isViewOnce) {
    return sar(
      <Pressable
        onPress={() => ciftTik()}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[styles.kartWrap, hiza, icHiza, sending && styles.sending]}
      >
        {replyBlok}
        <MesajViewOnceKarti
          item={item}
          mine={mine}
          onLongPress={onLongPress}
          onAcildi={onMedyaAc}
          onDurumGuncelle={onViewOncePatch}
        />
        {metaSatiri(false)}
      </Pressable>,
    );
  }

  if (isVoice) {
    return sar(
      <Pressable
        // Sesli mesajda tek dokunuş oynatır; çift dokunuş yanıt gecikmesi yok
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[styles.kartWrap, hiza, icHiza, sending && styles.sending]}
      >
        {replyBlok}
        <MesajSesKarti
          messageId={item.id}
          mediaUrl={item.media_url}
          durationMs={item.media_meta?.duration_ms}
          waveform={item.media_meta?.waveform}
          mine={mine}
          onLongPress={onLongPress}
        />
        {metaSatiri(false)}
      </Pressable>,
    );
  }

  if (isMusic) {
    return sar(
      <Pressable
        onPress={() => ciftTik()}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[styles.kartWrap, hiza, icHiza, sending && styles.sending]}
      >
        {replyBlok}
        <MesajMuzikKarti
          messageId={item.id}
          musicTrackId={item.music_track_id}
          snapshot={item.media_meta?.music_snapshot}
          mediaUrl={item.media_url}
          mine={mine}
          onLongPress={onLongPress}
        />
        {metaSatiri(false)}
      </Pressable>,
    );
  }

  if (isFile) {
    const fileName =
      (typeof item.media_meta?.file_name === 'string'
        ? item.media_meta.file_name
        : null) ||
      item.body ||
      'dosya.pdf';
    const mime =
      typeof item.media_meta?.mime === 'string' ? item.media_meta.mime : 'application/pdf';
    return sar(
      <Pressable
        onPress={() => ciftTik()}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[styles.kartWrap, hiza, icHiza, sending && styles.sending]}
      >
        {replyBlok}
        <MesajDosyaKarti
          mediaUrl={item.media_url}
          fileName={fileName}
          mime={mime}
          body={item.body}
          mine={mine}
          onLongPress={onLongPress}
        />
        {metaSatiri(false)}
      </Pressable>,
    );
  }

  if (isBrokenMedia) {
    return (
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[
          styles.medyaKart,
          mine ? styles.medyaMine : styles.medyaTheirs,
          hiza,
          styles.videoFull,
        ]}
      >
        <Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.55)" />
        <Text style={styles.videoHint}>{t('mesajlar.medyaYok')}</Text>
      </Pressable>
    );
  }

  if (isMedya && safeMediaUri) {
    const medyaIndir = () => {
      if (indirBusy) return;
      setIndirBusy(true);
      const ad = isImage
        ? `tamuso-foto-${item.id.slice(0, 8)}.jpg`
        : `tamuso-video-${item.id.slice(0, 8)}.mp4`;
      void UzakDosyayiIndirVePaylas(safeMediaUri, ad, {
        mimeType: DosyaMimeTahmin(ad),
        dialogTitle: t('mesajlar.indir'),
      })
        .catch((e) =>
          Alert.alert(
            t('ortak.hata'),
            e instanceof Error ? e.message : t('mesajlar.indirBasarisiz'),
          ),
        )
        .finally(() => setIndirBusy(false));
    };

    return sar(
      <Pressable
        onPress={() =>
          ciftTik(() =>
            onMedyaAc?.(safeMediaUri, isImage ? 'image' : 'video'),
          )
        }
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[
          styles.medyaKart,
          mine ? styles.medyaMine : styles.medyaTheirs,
          hiza,
          sending && styles.sending,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          isImage ? t('mesajlar.fotoAc') : t('mesajlar.videoAc')
        }
      >
        {replyBlok}
        <View style={styles.medyaGovde} pointerEvents="box-none">
          {isImage && imageSource ? (
            <View style={styles.mediaFull} collapsable={false}>
              <Image
                source={imageSource}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                fadeDuration={0}
              />
            </View>
          ) : (
            <View style={styles.videoFull}>
              <DurumVideoOnizleme
                uri={safeMediaUri}
                style={StyleSheet.absoluteFill}
                aktif
                mod="kare"
              />
              <View style={styles.videoOverlay} pointerEvents="none">
                <Ionicons name="play-circle" size={48} color="#fff" />
              </View>
            </View>
          )}
          <Pressable
            style={styles.medyaIndir}
            onPress={(e) => {
              e.stopPropagation?.();
              medyaIndir();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('mesajlar.indir')}
          >
            {indirBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="download-outline" size={18} color="#fff" />
            )}
          </Pressable>
          {!item.body ? metaSatiri(true) : null}
        </View>
        {item.body ? (
          <View style={styles.medyaCaptionWrap}>
            {ceviriAcik ? (
              <CeviriMetinKarti
                text={item.body}
                context="dm"
                varyant={mine ? 'bubbleMine' : 'bubble'}
                linkify
              />
            ) : (
              <MesajBaglantiliMetin
                text={item.body}
                style={styles.medyaCaption}
                mine={mine}
              />
            )}
            {metaSatiri(false)}
          </View>
        ) : null}
      </Pressable>,
    );
  }

  const linkHedef =
    item.link_url ||
    item.link_preview?.url ||
    (item.message_type === 'text' || item.body
      ? MesajIlkUrl(item.body)
      : null);
  const linkKart = linkHedef ? (
    <MesajLinkOnizlemeKarti
      preview={item.link_preview}
      url={linkHedef}
      mine={mine}
    />
  ) : null;

  const balonIcerik = (
    <>
      {replyBlok}
      {davet ? (
        <View style={mine ? styles.davetKartMine : styles.davetKart}>
          <View style={styles.davetBaslikSatir}>
            <Ionicons
              name="briefcase-outline"
              size={18}
              color={mine ? 'rgba(18,4,12,0.85)' : RenkTokenlari.primarySoft}
            />
            <Text
              style={mine ? styles.davetBaslikMine : styles.davetBaslik}
              numberOfLines={2}
            >
              {davet.ajansAdi
                ? t('mesajlar.ajansDavetiAdli', { ad: davet.ajansAdi })
                : t('mesajlar.ajansDaveti')}
            </Text>
          </View>
          <Text style={mine ? styles.davetKodMine : styles.davetKod}>
            {t('mesajlar.kodEtiket', { kod: davet.kod })}
          </Text>
          {!mine ? (
            <Pressable
              onPress={davetiKabulEt}
              disabled={davetBusy || davetGonderildi}
              style={[
                styles.davetCta,
                (davetBusy || davetGonderildi) && styles.davetCtaDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('mesajlar.davetiKabulEt')}
            >
              <Text style={styles.davetCtaYazi}>
                {davetGonderildi
                  ? t('mesajlar.basvuruGonderildi')
                  : davetBusy
                    ? t('mesajlar.gonderiliyor')
                    : t('mesajlar.davetiKabulEt')}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.davetMineHint}>{t('mesajlar.davetGonderildi')}</Text>
          )}
        </View>
      ) : item.body ? (
        ceviriAcik ? (
          <CeviriMetinKarti
            text={item.body}
            context="dm"
            varyant={mine ? 'bubbleMine' : 'bubble'}
            linkify
          />
        ) : (
          <MesajBaglantiliMetin
            text={item.body}
            style={mine ? styles.bodyMine : styles.body}
            mine={mine}
          />
        )
      ) : null}
      {metaSatiri(false)}
    </>
  );

  // Link kartı balon DIŞINDA — şeffaf cam, etrafı transparan
  const paket = (
    <View style={[styles.linkPaket, hiza, icHiza]}>
      {mine ? (
        <Pressable
          onPress={() => ciftTik()}
          onLongPress={onLongPress}
          delayLongPress={300}
        >
          <LinearGradient
            colors={[...RenkTokenlari.gradientPrimary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.mine, sending && styles.sending]}
          >
            {balonIcerik}
          </LinearGradient>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => ciftTik()}
          onLongPress={onLongPress}
          delayLongPress={300}
          style={[styles.bubble, styles.theirs]}
        >
          {balonIcerik}
        </Pressable>
      )}
      {linkKart}
    </View>
  );

  return sar(paket);
}

const styles = StyleSheet.create({
  sharedWrap: {
    maxWidth: '86%',
    gap: 4,
  },
  kartWrap: {
    maxWidth: '86%',
    gap: 4,
  },
  /** Link kartı balon dışında — şeffaf boşluk */
  linkPaket: {
    maxWidth: '86%',
    gap: 4,
    backgroundColor: 'transparent',
  },
  /** shared taraf hizası render-time fizikselHiza ile — statik alignSelf YOK */
  sharedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  /** Taraf hizası render-time fizikselHiza — köşe yarıçapı FİZİKSEL kalır */
  mine: {
    borderBottomRightRadius: 4,
  },
  theirs: {
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderBottomLeftRadius: 4,
  },
  replyBlok: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  replyMine: {
    backgroundColor: 'rgba(18,4,12,0.12)',
  },
  replyTheirs: {
    backgroundColor: RenkTokenlari.pressFill,
  },
  replyBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: MesajKartTokenlari.accent,
  },
  replyText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    flex: 1,
  },
  replyTextMine: {
    ...TipografiTokenlari.caption,
    color: 'rgba(18,4,12,0.7)',
    flex: 1,
  },
  /** Kenara kadar medya — çerçeve / gradient yok, şeffaf zemin */
  medyaKart: {
    maxWidth: '78%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    gap: 0,
  },
  medyaMine: {
    borderBottomRightRadius: 4,
  },
  medyaTheirs: {
    borderBottomLeftRadius: 4,
  },
  medyaGovde: {
    position: 'relative',
  },
  medyaIndir: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 2,
  },
  mediaFull: {
    width: 248,
    height: 248,
    backgroundColor: 'rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  videoFull: {
    width: 248,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  medyaCaptionWrap: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 2,
  },
  medyaCaption: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
  },
  sending: { opacity: 0.7 },
  body: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 21,
  },
  bodyMine: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '600',
    lineHeight: 21,
  },
  davetKart: {
    gap: 8,
    paddingVertical: 4,
    minWidth: 200,
  },
  davetKartMine: {
    gap: 8,
    paddingVertical: 4,
    minWidth: 200,
  },
  davetBaslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  davetBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    flex: 1,
  },
  davetBaslikMine: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
    flex: 1,
  },
  davetKod: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    letterSpacing: 0.6,
  },
  davetKodMine: {
    ...TipografiTokenlari.caption,
    color: 'rgba(18,4,12,0.7)',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  davetCta: {
    marginTop: 2,
    alignSelf: 'stretch',
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
  },
  davetCtaDisabled: {
    opacity: 0.55,
  },
  davetCtaYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  davetMineHint: {
    ...TipografiTokenlari.micro,
    color: 'rgba(18,4,12,0.55)',
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  metaMedya: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    marginTop: 0,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  time: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 10,
  },
  timeMine: {
    ...TipografiTokenlari.micro,
    color: 'rgba(18,4,12,0.55)',
    fontSize: 10,
  },
  timeMedya: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontWeight: '600',
  },
  edited: {
    fontStyle: 'italic',
    opacity: 0.85,
  },
  videoHint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnOverlay,
    fontWeight: '700',
  },
  system: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.pressFill,
    marginVertical: 4,
  },
  systemText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  highlight: {
    borderRadius: 18,
    backgroundColor: 'rgba(232,64,145,0.18)',
  },
});
