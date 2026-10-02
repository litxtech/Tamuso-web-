import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { PkDavet } from '../islemler/PkDavetIslemleri';
import { PkDavetYanitla } from '../islemler/PkDavetIslemleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  davet: PkDavet | null;
  onKapat: () => void;
  onSonuc?: (sonuc: {
    status: 'accepted' | 'rejected' | 'expired';
    matchId?: string;
  }) => void;
};

/** Gelen PK daveti — kabul / red (TikTok tarzı) */
export function PkDavetModal({ davet, onKapat, onSonuc }: Props) {
  const { t } = useCeviri();
  const [busy, setBusy] = useState(false);
  const [kalan, setKalan] = useState(0);

  useEffect(() => {
    if (!davet) return;
    const tick = () => {
      const s = Math.max(
        0,
        Math.ceil((new Date(davet.expires_at).getTime() - Date.now()) / 1000),
      );
      setKalan(s);
      if (s <= 0) onKapat();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [davet, onKapat]);

  if (!davet) return null;

  const yanitla = async (kabul: boolean) => {
    setBusy(true);
    const r = await PkDavetYanitla({ inviteId: davet.id, kabul });
    setBusy(false);
    if (!r.ok) {
      onKapat();
      return;
    }
    onSonuc?.({
      status: r.status,
      matchId: r.matchId,
    });
    onKapat();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onKapat}>
      <View style={styles.kok}>
        <Pressable style={styles.perde} onPress={onKapat} />
        <LinearGradient colors={[...RenkTokenlari.gradientCard]} style={styles.kart}>
          <View style={styles.badge}>
            <Ionicons name="flash" size={16} color="#F0B429" />
            <Text style={styles.badgeYazi}>{t('pk.davetBadge')}</Text>
          </View>

          {MedyaUriGuvenli(davet.from_avatar) ? (
            <Image source={{ uri: MedyaUriGuvenli(davet.from_avatar)! }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarBos]}>
              <Ionicons name="person" size={28} color={RenkTokenlari.textMuted} />
            </View>
          )}

          <Text style={styles.ad}>{davet.from_host_name ?? t('pk.yayinci')}</Text>
          <Text style={styles.alt}>
            {davet.from_title
              ? t('pk.davetEttiBaslikli', { baslik: davet.from_title })
              : t('pk.davetEtti')}
          </Text>
          <Text style={styles.sure}>
            {t('pk.macDk', {
              dk: Math.floor(davet.sure_saniye / 60),
              sn: kalan,
            })}
          </Text>

          <View style={styles.aksiyonlar}>
            <Pressable
              style={[styles.btn, styles.red]}
              disabled={busy}
              onPress={() => void yanitla(false)}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnYazi}>{t('ortak.reddet')}</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.btn, styles.kabul]}
              disabled={busy}
              onPress={() => void yanitla(true)}
            >
              {busy ? (
                <ActivityIndicator color="#1A1208" />
              ) : (
                <Text style={[styles.btnYazi, { color: '#1A1208' }]}>
                  {t('ortak.kabul')}
                </Text>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
    justifyContent: 'center',
    padding: BoslukTokenlari.xl,
  },
  perde: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  kart: {
    borderRadius: YaricapTokenlari.xl,
    padding: BoslukTokenlari.xl,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.35)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(240,180,41,0.15)',
    marginBottom: 4,
  },
  badgeYazi: {
    ...TipografiTokenlari.micro,
    color: '#F0B429',
    fontWeight: '800',
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginVertical: 6 },
  avatarBos: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ad: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  alt: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  sure: { ...TipografiTokenlari.caption, color: RenkTokenlari.accent },
  aksiyonlar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: YaricapTokenlari.pill,
    alignItems: 'center',
  },
  red: { backgroundColor: 'rgba(255,255,255,0.1)' },
  kabul: { backgroundColor: '#F0B429' },
  btnYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
});
