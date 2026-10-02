import React from 'react';
import { StyleSheet, Text, View, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AnaSayfaCanliNokta } from '../moduller/ana-sayfa/bilesenler/AnaSayfaCanliNokta';
import { RenkTokenlari } from '../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { IcerikGuvenlikDugmesi } from '../moduller/moderasyon/bilesenler/IcerikGuvenlikDugmesi';
import { useAuth } from '../contexts/AuthContext';
import { useCeviri, type CeviriAnahtari } from '../i18n/useCeviri';
import type { Room } from '../types/models';
import { OdaTemasiniCoz } from '../moduller/oda-olusturma/katalog/OdaTemaKatalogu';

const MODE_KEY: Record<Room['mode'], CeviriAnahtari> = {
  party: 'modlar.parti',
  dating: 'modlar.flort',
  karaoke: 'modlar.karaoke',
  game: 'modlar.oyun',
  private: 'modlar.ozel',
};

type Props = {
  room: Room;
  onPress: () => void;
  /** avatar: yuvarlak kompakt; kart: kapaklı dikdörtgen */
  variant?: 'avatar' | 'kart';
};

function RoomCardBase({ room, onPress, variant = 'kart' }: Props) {
  if (variant === 'avatar') {
    return <AvatarKart room={room} onPress={onPress} />;
  }
  return <KapakKart room={room} onPress={onPress} />;
}

export const RoomCard = React.memo(RoomCardBase);

function AvatarKart({ room, onPress }: { room: Room; onPress: () => void }) {
  const { t } = useCeviri();
  const { isGuest } = useAuth();
  const kapak = MedyaUriGuvenli(room.cover_url ?? room.host?.avatar_url);
  const modEtiket = t(MODE_KEY[room.mode]);
  const evSahibi = room.host?.display_name ?? t('kesfet.evSahibi');
  const tema = OdaTemasiniCoz(room.theme_code);

  return (
    <Pressable
      onPress={onPress}
      style={styles.avatarPress}
      accessibilityRole="button"
      accessibilityLabel={`${room.title}, ${t('odalar.canli')}`}
    >
      <View style={styles.avatarHalka}>
        {kapak ? (
          <Image
            source={{ uri: kapak }}
            style={styles.avatarImg}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[...tema.renkler]}
            style={styles.avatarImg}
          >
            <Ionicons name="mic" size={22} color={RenkTokenlari.textOnPrimary} />
          </LinearGradient>
        )}
        <View style={styles.avatarCanli}>
          <AnaSayfaCanliNokta boyut={5} />
        </View>
        <View style={styles.avatarDinleyici}>
          <Ionicons name="headset" size={9} color={RenkTokenlari.text} />
          <Text style={styles.avatarDinleyiciYazi}>{room.listener_count}</Text>
        </View>
        <View style={styles.avatarMenu}>
          <IcerikGuvenlikDugmesi
            tur="room"
            contentId={room.id}
            roomId={room.id}
            targetUserId={room.host_id ?? room.host?.id}
            title={room.title}
            isGuest={isGuest}
            koyu
            hitSlop={6}
          />
        </View>
      </View>

      <Text style={styles.avatarBaslik} numberOfLines={2}>
        {room.title}
      </Text>
      <Text style={styles.avatarAlt} numberOfLines={1}>
        {room.room_code
          ? room.room_code
          : `${modEtiket} · ${evSahibi}`}
      </Text>
    </Pressable>
  );
}

function KapakKart({ room, onPress }: { room: Room; onPress: () => void }) {
  const { t } = useCeviri();
  const { isGuest } = useAuth();
  const kapak = MedyaUriGuvenli(room.cover_url ?? room.host?.avatar_url);
  const modEtiket = t(MODE_KEY[room.mode]);
  const evSahibi = room.host?.display_name ?? t('kesfet.evSahibi');
  const tema = OdaTemasiniCoz(room.theme_code);

  return (
    <Pressable onPress={onPress} style={styles.press}>
      <View style={styles.card}>
        {kapak ? (
          <Image source={{ uri: kapak }} style={styles.kapak} />
        ) : (
          <LinearGradient
            colors={[...tema.renkler]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.kapak}
          />
        )}
        <LinearGradient
          colors={[...RenkTokenlari.overlayGradient]}
          style={styles.overlay}
        />

        <View style={styles.top}>
          <View style={styles.livePill}>
            <AnaSayfaCanliNokta boyut={5} />
            <Text style={styles.liveText}>{t('kesfet.canliRozet')}</Text>
          </View>
          <View style={styles.topSag}>
            <Text style={styles.mode}>{modEtiket}</Text>
            <IcerikGuvenlikDugmesi
              tur="room"
              contentId={room.id}
              roomId={room.id}
              targetUserId={room.host_id ?? room.host?.id}
              title={room.title}
              isGuest={isGuest}
              koyu
            />
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>
            {room.title}
          </Text>
          {room.topic ? (
            <Text style={styles.topic} numberOfLines={1}>
              {room.topic}
            </Text>
          ) : null}
          {room.room_code ? (
            <Text style={styles.odaKod} numberOfLines={1}>
              {room.room_code}
            </Text>
          ) : null}

          <View style={styles.bottom}>
            <View style={styles.hostRow}>
              <LinearGradient
                colors={[...RenkTokenlari.gradientPrimary]}
                style={styles.avatar}
              >
                <Ionicons name="person" size={11} color={RenkTokenlari.textOnPrimary} />
              </LinearGradient>
              <Text style={styles.host} numberOfLines={1}>
                {evSahibi}
              </Text>
            </View>
            <View style={styles.meta}>
              <Ionicons name="headset" size={11} color={RenkTokenlari.primarySoft} />
              <Text style={styles.metaText}>{room.listener_count}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { width: '100%' },

  /* —— Avatar (kompakt yuvarlak) —— */
  avatarPress: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: 0,
    gap: 3,
  },
  avatarHalka: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 0,
    marginBottom: 0,
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCanli: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: RenkTokenlari.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: RenkTokenlari.primary,
  },
  avatarDinleyici: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: RenkTokenlari.chipFill,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: 'rgba(232, 64, 145, 0.35)',
  },
  avatarDinleyiciYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnOverlay,
    fontSize: 9,
    fontWeight: '700',
  },
  avatarMenu: {
    position: 'absolute',
    top: -4,
    left: -6,
    zIndex: 2,
  },
  avatarBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  avatarAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },

  /* —— Kart (kapaklı) —— */
  card: {
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: 'rgba(232, 64, 145, 0.28)',
    minHeight: 168,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  kapak: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.sm + 2,
    paddingTop: BoslukTokenlari.sm + 2,
  },
  topSag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: RenkTokenlari.chipFill,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
  },
  liveText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontSize: 9,
  },
  mode: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    textTransform: 'uppercase',
    fontSize: 9,
  },
  copy: {
    padding: BoslukTokenlari.md,
    gap: 4,
  },
  title: {
    ...TipografiTokenlari.body,
    fontWeight: '700',
    color: RenkTokenlari.textOnOverlay,
    lineHeight: 20,
  },
  topic: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnOverlay,
    opacity: 0.78,
    marginBottom: 2,
  },
  odaKod: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontSize: 10,
    marginBottom: 4,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  host: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnOverlay,
    opacity: 0.82,
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: RenkTokenlari.chipFill,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
  },
  metaText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnOverlay,
  },
});
