import React, { memo, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { KonusmaciAktiflikEfekti } from './KonusmaciAktiflikEfekti';
import { KoltukTahti } from './KoltukTahti';
import { SeviyeTaci } from './SeviyeTaci';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import type { RoomSeat } from '../../../types/models';
import { useCeviri } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';

type Props = {
  seat: RoomSeat;
  hostId?: string | null;
  tahtMi?: boolean;
  /** Görünüm ölçeği — düzen kataloğundan */
  olcek?: 'mikro' | 'kompakt' | 'normal' | 'buyuk' | 'dev';
  /** Premium halo halkası */
  halo?: boolean;
  /**
   * Yoğun salon (12–20 koltuk): podium/rozet gizlenir, isim kısalır —
   * satır yüksekliği düşer, herkes ekranda kalır.
   */
  yogun?: boolean;
  onPress?: (seat: RoomSeat) => void;
  onLongPress?: (seat: RoomSeat) => void;
};

const OLCEK_AVATAR: Record<NonNullable<Props['olcek']>, { dolu: number; efekt: number }> = {
  mikro: { dolu: 28, efekt: 32 },
  kompakt: { dolu: 34, efekt: 40 },
  normal: { dolu: 40, efekt: 46 },
  buyuk: { dolu: 50, efekt: 56 },
  dev: { dolu: 64, efekt: 72 },
};

function HarfAvatar({
  boy,
  harf,
  hostMu,
  tahtMi,
}: {
  boy: number;
  harf: string;
  hostMu: boolean;
  tahtMi: boolean;
}) {
  return (
    <View
      style={[
        styles.avatar,
        styles.filled,
        {
          width: boy,
          height: boy,
          borderRadius: boy / 2,
          backgroundColor:
            tahtMi || hostMu ? RenkTokenlari.accent : RenkTokenlari.primary,
        },
        (tahtMi || hostMu) && styles.avatarHost,
      ]}
    >
      <Text style={[styles.harf, tahtMi && styles.harfTaht]}>{harf}</Text>
    </View>
  );
}

function KonusmaciKartiIc({
  seat,
  hostId,
  tahtMi = false,
  olcek,
  halo = false,
  yogun = false,
  onPress,
  onLongPress,
}: Props) {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const dolu = !!seat.user_id;
  const hostMu = !!seat.user_id && !!hostId && seat.user_id === hostId;
  const yardimciMu = !hostMu && !!seat.is_cohost;
  const seviye = Number(seat.profile?.level) || 0;
  const cozulmusOlcek =
    olcek ?? (tahtMi ? 'buyuk' : yogun ? 'mikro' : 'normal');
  const boyutlar = OLCEK_AVATAR[cozulmusOlcek];
  const avatarBoy = tahtMi && !olcek ? (yogun ? 48 : 58) : boyutlar.dolu;
  const efektBoy = tahtMi && !olcek ? (yogun ? 54 : 66) : boyutlar.efekt;
  const podiumGizle = yogun && !tahtMi;
  const muted = !!seat.is_muted;
  const micKilitli = !!seat.is_mic_locked;
  const koltukNo = seat.seat_index + 1;

  const ad =
    seat.profile?.display_name?.trim() ||
    seat.profile?.username?.trim() ||
    (tahtMi || seat.seat_index === 0
      ? t('sesOda.evSahibi')
      : t('sesOda.koltukN', { n: koltukNo }));
  const harf = ad.charAt(0).toLocaleUpperCase(locale);
  const avatarUrl = MedyaUriGuvenli(seat.profile?.avatar_url);
  const [avatarBozuk, setAvatarBozuk] = useState(false);

  useEffect(() => {
    setAvatarBozuk(false);
  }, [avatarUrl]);

  const avatarGoster = !!avatarUrl && !avatarBozuk;

  return (
    <Pressable
      onPress={onPress ? () => onPress(seat) : undefined}
      onLongPress={onLongPress ? () => onLongPress(seat) : undefined}
      delayLongPress={380}
      style={[
        styles.wrap,
        tahtMi && styles.wrapTaht,
        yogun && !tahtMi && styles.wrapYogun,
      ]}
    >
      <View style={styles.avatarKutu}>
        {halo && !yogun ? (
          <View
            pointerEvents="none"
            style={[
              styles.haloHalka,
              {
                width: avatarBoy + 12,
                height: avatarBoy + 12,
                borderRadius: (avatarBoy + 12) / 2,
                borderColor: tahtMi || hostMu
                  ? 'rgba(240,180,41,0.45)'
                  : 'rgba(196,59,255,0.35)',
              },
            ]}
          />
        ) : null}
        {dolu ? (
          <KonusmaciAktiflikEfekti
            userId={seat.user_id}
            size={avatarBoy}
            hostMu={hostMu || tahtMi}
          >
            <SeviyeTaci
              level={seviye}
              size={tahtMi ? 'md' : 'sm'}
              avatarBoy={avatarBoy}
            >
              {avatarGoster ? (
                <Image
                  source={{ uri: avatarUrl! }}
                  resizeMode="cover"
                  onError={() => setAvatarBozuk(true)}
                  style={{
                    width: avatarBoy,
                    height: avatarBoy,
                    borderRadius: avatarBoy / 2,
                  }}
                />
              ) : (
                <HarfAvatar
                  boy={avatarBoy}
                  harf={harf}
                  hostMu={hostMu}
                  tahtMi={tahtMi}
                />
              )}
            </SeviyeTaci>
          </KonusmaciAktiflikEfekti>
        ) : (
          <KonusmaciAktiflikEfekti
            userId={seat.user_id}
            size={efektBoy}
            hostMu={hostMu || tahtMi}
          >
            <View
              style={[
                styles.avatar,
                tahtMi && styles.avatarTahtBos,
                {
                  width: avatarBoy,
                  height: avatarBoy,
                  borderRadius: avatarBoy / 2,
                },
              ]}
            >
              <Ionicons
                name={tahtMi ? 'ribbon-outline' : 'add'}
                size={tahtMi ? (yogun ? 16 : 20) : yogun ? 12 : 14}
                color={tahtMi ? RenkTokenlari.accent : RenkTokenlari.textMuted}
              />
            </View>
          </KonusmaciAktiflikEfekti>
        )}
        {dolu && (muted || micKilitli) ? (
          <View
            style={[styles.micBadge, yogun && styles.micBadgeYogun]}
            pointerEvents="none"
          >
            <Ionicons
              name={micKilitli ? 'lock-closed' : 'mic-off'}
              size={yogun ? 7 : 9}
              color="#fff"
            />
          </View>
        ) : null}
        {podiumGizle && !dolu ? (
          <View style={styles.koltukNoRozet} pointerEvents="none">
            <Text style={styles.koltukNoRozetYazi}>{koltukNo}</Text>
          </View>
        ) : null}
      </View>

      {!podiumGizle ? (
        <KoltukTahti
          numara={tahtMi ? null : koltukNo}
          tahtMi={tahtMi}
          doluMu={dolu}
          hostMu={hostMu}
          yardimciMu={yardimciMu}
        />
      ) : null}

      {tahtMi ? (
        <Text
          style={[styles.name, styles.nameTaht, yogun && styles.nameYogun]}
          numberOfLines={1}
        >
          {ad}
        </Text>
      ) : (
        <Text
          style={[
            styles.name,
            dolu && styles.nameDolu,
            yogun && styles.nameYogun,
          ]}
          numberOfLines={1}
        >
          {ad}
        </Text>
      )}
      {!yogun && hostMu ? (
        <View style={styles.hostRozet}>
          <Ionicons name="ribbon" size={8} color={RenkTokenlari.accent} />
          <Text style={styles.hostYazi}>{t('sesOda.sahipRozet')}</Text>
        </View>
      ) : !yogun && yardimciMu ? (
        <View style={styles.cohostRozet}>
          <Ionicons name="shield-checkmark" size={8} color="#8ec8ff" />
          <Text style={styles.cohostYazi}>ADMIN</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ayniKart(a: Props, b: Props) {
  return (
    a.tahtMi === b.tahtMi &&
    a.hostId === b.hostId &&
    a.olcek === b.olcek &&
    a.halo === b.halo &&
    a.yogun === b.yogun &&
    a.onPress === b.onPress &&
    a.onLongPress === b.onLongPress &&
    a.seat.id === b.seat.id &&
    a.seat.user_id === b.seat.user_id &&
    a.seat.is_muted === b.seat.is_muted &&
    a.seat.is_mic_locked === b.seat.is_mic_locked &&
    a.seat.is_cohost === b.seat.is_cohost &&
    a.seat.seat_index === b.seat.seat_index &&
    a.seat.profile?.avatar_url === b.seat.profile?.avatar_url &&
    a.seat.profile?.display_name === b.seat.profile?.display_name &&
    a.seat.profile?.username === b.seat.profile?.username &&
    a.seat.profile?.level === b.seat.profile?.level
  );
}

export const KonusmaciKarti = memo(KonusmaciKartiIc, ayniKart);

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', gap: 2 },
  wrapTaht: {
    width: '100%',
    maxWidth: 130,
    alignSelf: 'center',
    marginBottom: 4,
    gap: 0,
  },
  wrapYogun: {
    gap: 1,
    paddingVertical: 0,
  },
  avatarKutu: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 4,
  },
  haloHalka: {
    position: 'absolute',
    borderWidth: 1.5,
    opacity: 0.9,
  },
  avatar: {
    backgroundColor: RenkTokenlari.seatEmpty,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarTahtBos: {
    borderColor: 'rgba(240,180,41,0.55)',
    borderWidth: 2,
  },
  avatarImg: {
    borderWidth: 1.5,
    borderColor: RenkTokenlari.primarySoft,
  },
  avatarHost: {
    borderColor: RenkTokenlari.accent,
    borderWidth: 2,
  },
  filled: {
    borderColor: RenkTokenlari.primarySoft,
    borderWidth: 1.5,
  },
  harf: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  harfTaht: {
    fontSize: 20,
  },
  name: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    maxWidth: 78,
    marginTop: 1,
    fontSize: 10,
  },
  nameDolu: {
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  nameTaht: {
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 110,
    color: RenkTokenlari.accent,
  },
  nameYogun: {
    fontSize: 9,
    maxWidth: 58,
    marginTop: 0,
  },
  koltukNoRozet: {
    position: 'absolute',
    right: -4,
    top: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: 'rgba(18,16,24,0.85)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  koltukNoRozetYazi: {
    color: 'rgba(220,215,230,0.9)',
    fontSize: 8,
    fontWeight: '700',
  },
  hostRozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(240,180,41,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.35)',
  },
  hostYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cohostRozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(100,180,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.35)',
  },
  cohostYazi: {
    ...TipografiTokenlari.micro,
    color: '#8ec8ff',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  micBadge: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(18,16,24,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  micBadgeYogun: {
    width: 12,
    height: 12,
    borderRadius: 6,
    right: -3,
    bottom: -1,
  },
});
