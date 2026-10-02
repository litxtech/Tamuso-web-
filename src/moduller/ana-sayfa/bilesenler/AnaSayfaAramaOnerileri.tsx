import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AnaSayfaKesfetAra,
  type KesfetAramaAjans,
  type KesfetAramaCanli,
  type KesfetAramaKullanici,
  type KesfetAramaOda,
} from '../okuma/AnaSayfaKesfetAra';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { kullaniciTemaKodunuAl, temaAcikMi } from '../../../tasarim-sistemi/tema/TemaDurumu';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';
import { DogrulanmisTik } from '../../kullanici-profili/bilesenler/DogrulanmisTik';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  sorgu: string;
  haricUserId?: string | null;
  onKullaniciSec: (k: KesfetAramaKullanici) => void;
  onAjansSec: (a: KesfetAramaAjans) => void;
  onOdaSec: (o: KesfetAramaOda) => void;
  onCanliSec: (c: KesfetAramaCanli) => void;
};

/** Arama kutusunun altında — kullanıcı + ajans + ses odası + canlı yayın önerileri */
export function AnaSayfaAramaOnerileri({
  sorgu,
  haricUserId,
  onKullaniciSec,
  onAjansSec,
  onOdaSec,
  onCanliSec,
}: Props) {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const acik = temaAcikMi(kullaniciTemaKodunuAl());
  const [kullanicilar, setKullanicilar] = useState<KesfetAramaKullanici[]>([]);
  const [ajanslar, setAjanslar] = useState<KesfetAramaAjans[]>([]);
  const [odalar, setOdalar] = useState<KesfetAramaOda[]>([]);
  const [canlilar, setCanlilar] = useState<KesfetAramaCanli[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const istekNo = useRef(0);

  useEffect(() => {
    const q = sorgu.trim();
    if (q.length < 1) {
      setKullanicilar([]);
      setAjanslar([]);
      setOdalar([]);
      setCanlilar([]);
      setYukleniyor(false);
      return;
    }

    const no = ++istekNo.current;
    setYukleniyor(true);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const sonuc = await AnaSayfaKesfetAra({
            sorgu: q,
            haricUserId,
          });
          if (istekNo.current !== no) return;
          setKullanicilar(sonuc.kullanicilar);
          setAjanslar(sonuc.ajanslar);
          setOdalar(sonuc.odalar);
          setCanlilar(sonuc.canlilar);
        } catch {
          if (istekNo.current !== no) return;
          setKullanicilar([]);
          setAjanslar([]);
          setOdalar([]);
          setCanlilar([]);
        } finally {
          if (istekNo.current === no) setYukleniyor(false);
        }
      })();
    }, 160);

    return () => clearTimeout(timer);
  }, [sorgu, haricUserId]);

  const q = sorgu.trim();
  if (q.length < 1) return null;

  const bos =
    !yukleniyor &&
    kullanicilar.length === 0 &&
    ajanslar.length === 0 &&
    odalar.length === 0 &&
    canlilar.length === 0;

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: acik ? RenkTokenlari.bgElevated : RenkTokenlari.bgCard,
          borderColor: RenkTokenlari.border,
        },
      ]}
    >
      <ScrollView
        style={styles.liste}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {yukleniyor ? (
          <View style={styles.loaderSatir}>
            <ActivityIndicator size="small" color={RenkTokenlari.primary} />
            <Text style={styles.loaderYazi}>{t('anaSayfa.oneriler')}</Text>
          </View>
        ) : null}

        {bos ? (
          <Text style={styles.bos}>{t('anaSayfa.kullaniciVeyaAjansYok')}</Text>
        ) : null}

        {odalar.length > 0 ? (
          <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>{t('anaSayfa.sesliSohbetOdalari')}</Text>
            {odalar.map((o) => {
              const kapak = MedyaUriGuvenli(o.cover_url ?? o.host_avatar_url);
              const harf = (o.title[0] ?? 'O').toUpperCase();
              const hostAd =
                o.host_display_name?.trim() ||
                (o.host_username ? `@${o.host_username}` : null);
              return (
                <Pressable
                  key={`o:${o.id}`}
                  onPress={() => onOdaSec(o)}
                  style={({ pressed }) => [
                    styles.satir,
                    pressed && styles.satirPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('anaSayfa.sesA11y', { baslik: o.title })}
                >
                  {kapak ? (
                    <Image source={{ uri: kapak }} style={styles.avatar} />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarBos,
                        { backgroundColor: `${RenkTokenlari.success}33` },
                      ]}
                    >
                      <Text
                        style={[styles.avatarHarf, { color: RenkTokenlari.success }]}
                      >
                        {harf}
                      </Text>
                    </View>
                  )}
                  <View style={styles.copy}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {o.title}
                    </Text>
                    <Text style={styles.alt} numberOfLines={1}>
                      {hostAd
                        ? `${hostAd} · ${o.listener_count}`
                        : t('anaSayfa.sesOdasiEtiket')}
                    </Text>
                  </View>
                  <Ionicons
                    name="mic-outline"
                    size={14}
                    color={RenkTokenlari.success}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {canlilar.length > 0 ? (
          <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>{t('anaSayfa.canliYayinlar')}</Text>
            {canlilar.map((c) => {
              const kapak = MedyaUriGuvenli(c.host_avatar_url);
              const harf = (c.title[0] ?? 'C').toUpperCase();
              const hostAd =
                c.host_display_name?.trim() ||
                (c.host_username ? `@${c.host_username}` : null);
              return (
                <Pressable
                  key={`c:${c.id}`}
                  onPress={() => onCanliSec(c)}
                  style={({ pressed }) => [
                    styles.satir,
                    pressed && styles.satirPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('anaSayfa.canliA11y', { baslik: c.title })}
                >
                  {kapak ? (
                    <Image source={{ uri: kapak }} style={styles.avatar} />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarBos,
                        { backgroundColor: `${RenkTokenlari.danger}33` },
                      ]}
                    >
                      <Text
                        style={[styles.avatarHarf, { color: RenkTokenlari.danger }]}
                      >
                        {harf}
                      </Text>
                    </View>
                  )}
                  <View style={styles.copy}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {c.title}
                    </Text>
                    <Text style={styles.alt} numberOfLines={1}>
                      {hostAd
                        ? `${hostAd} · ${c.viewer_count}`
                        : t('anaSayfa.yayin')}
                    </Text>
                  </View>
                  <Ionicons
                    name="radio-outline"
                    size={14}
                    color={RenkTokenlari.danger}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {kullanicilar.length > 0 ? (
          <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>{t('anaSayfa.kullanicilar')}</Text>
            {kullanicilar.map((k) => {
              const ad =
                k.display_name?.trim() ||
                (k.username ? `@${k.username}` : t('ortak.kullanici'));
              const avatar = MedyaUriGuvenli(k.avatar_url);
              const harf = (ad[0] ?? 'K').toUpperCase();
              return (
                <Pressable
                  key={`u:${k.id}`}
                  onPress={() => onKullaniciSec(k)}
                  style={({ pressed }) => [
                    styles.satir,
                    pressed && styles.satirPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('anaSayfa.profilA11y', { ad })}
                >
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarBos]}>
                      <Text style={styles.avatarHarf}>{harf}</Text>
                    </View>
                  )}
                  <View style={styles.copy}>
                    <View style={styles.adSatir}>
                      <Text style={styles.ad} numberOfLines={1}>
                        {ad}
                      </Text>
                      <DogrulanmisTik dogrulandi={k.is_verified} size={14} />
                    </View>
                    {k.username ? (
                      <Text style={styles.alt} numberOfLines={1}>
                        @{k.username}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={RenkTokenlari.primarySoft}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {ajanslar.length > 0 ? (
          <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>{t('anaSayfa.ajanslar')}</Text>
            {ajanslar.map((a) => {
              const logo = MedyaUriGuvenli(a.logo_url);
              const harf = (a.name?.[0] ?? 'A').toUpperCase();
              return (
                <Pressable
                  key={`a:${a.id}`}
                  onPress={() => onAjansSec(a)}
                  style={({ pressed }) => [
                    styles.satir,
                    pressed && styles.satirPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('anaSayfa.ajansA11y', { ad: a.name })}
                >
                  {logo ? (
                    <Image source={{ uri: logo }} style={styles.avatar} />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarBos,
                        { backgroundColor: `${RenkTokenlari.violet}33` },
                      ]}
                    >
                      <Text
                        style={[styles.avatarHarf, { color: RenkTokenlari.violet }]}
                      >
                        {harf}
                      </Text>
                    </View>
                  )}
                  <View style={styles.copy}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {a.name}
                    </Text>
                    {a.agency_public_id ? (
                      <Text style={styles.alt} numberOfLines={1}>
                        {a.agency_public_id}
                      </Text>
                    ) : (
                      <Text style={styles.alt}>{t('anaSayfa.ajansEtiket')}</Text>
                    )}
                  </View>
                  <Ionicons
                    name="briefcase-outline"
                    size={14}
                    color={RenkTokenlari.violet}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  liste: {
    maxHeight: 320,
  },
  loaderSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 10,
  },
  loaderYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 12,
  },
  bolum: {
    paddingBottom: 4,
  },
  bolumBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 10,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 8,
  },
  satirPressed: {
    backgroundColor: RenkTokenlari.pressFill,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarBos: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${RenkTokenlari.primary}28`,
  },
  avatarHarf: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  adSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  ad: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 1,
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontSize: 11,
  },
});
