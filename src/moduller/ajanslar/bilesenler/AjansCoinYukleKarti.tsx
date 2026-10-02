import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { ArananKullanici } from '../../mesajlasma/okuma/KullanicilariAra';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import { useCeviri } from '../../../i18n/useCeviri';

type HizliUye = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  yetkili: boolean;
  bakiye: number;
  busy: boolean;
  arama: string;
  onArama: (t: string) => void;
  sonuclar: ArananKullanici[];
  secili: ArananKullanici | null;
  onSec: (k: ArananKullanici) => void;
  onSecTemizle: () => void;
  coin: string;
  onCoin: (t: string) => void;
  hizliMiktarlar: number[];
  hizliUyeler?: HizliUye[];
  onHizliUye?: (u: HizliUye) => void;
  onYukle: () => void;
};

export function AjansCoinYukleKarti({
  yetkili,
  bakiye,
  busy,
  arama,
  onArama,
  sonuclar,
  secili,
  onSec,
  onSecTemizle,
  coin,
  onCoin,
  hizliMiktarlar,
  hizliUyeler = [],
  onHizliUye,
  onYukle,
}: Props) {
  const { t, dil } = useCeviri();
  const sayi = (n: number) =>
    new Intl.NumberFormat(DIL_LOCALE_MAP[dil]).format(n);

  if (!yetkili) {
    return (
      <View style={styles.kilitKart}>
        <View style={styles.kilitIcon}>
          <Ionicons name="lock-closed" size={22} color={RenkTokenlari.textDim} />
        </View>
        <Text style={styles.kilitBaslik}>{t('ajans.coinYetkiYok')}</Text>
        <Text style={styles.kilitAlt}>{t('ajans.coinYetkiYokAlt')}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[...RenkTokenlari.gradientCard]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.kart}
    >
      <View style={styles.ust}>
        <View style={styles.ustSol}>
          <View style={styles.rozet}>
            <Ionicons name="flash" size={14} color="#1A1208" />
            <Text style={styles.rozetYazi}>{t('ajans.coinSistemi')}</Text>
          </View>
          <Text style={styles.baslik}>{t('ajans.kullaniciyaCoinGonder')}</Text>
          <Text style={styles.alt}>{t('ajans.kullaniciyaCoinGonderAlt')}</Text>
        </View>
        <View style={styles.bakiyeKutu}>
          <Text style={styles.bakiyeLabel}>{t('cuzdan.bakiye')}</Text>
          <Text style={styles.bakiyeDeger}>{sayi(bakiye)}</Text>
        </View>
      </View>

      {hizliUyeler.length > 0 ? (
        <View style={styles.uyeSatir}>
          {hizliUyeler.slice(0, 8).map((u) => (
            <Pressable
              key={u.user_id}
              style={styles.uyeChip}
              onPress={() => onHizliUye?.(u)}
            >
              {MedyaUriGuvenli(u.avatar_url) ? (
                <Image source={{ uri: MedyaUriGuvenli(u.avatar_url)! }} style={styles.uyeAvatar} />
              ) : (
                <View style={[styles.uyeAvatar, styles.uyeAvatarBos]}>
                  <Ionicons
                    name="person"
                    size={12}
                    color={RenkTokenlari.textDim}
                  />
                </View>
              )}
              <Text style={styles.uyeAd} numberOfLines={1}>
                {u.display_name || u.username || t('ajans.uyeVarsayilan')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.aramaKutu}>
        <Ionicons name="search" size={18} color={RenkTokenlari.textDim} />
        <TextInput
          value={arama}
          onChangeText={(metin) => {
            onArama(metin);
            if (secili) onSecTemizle();
          }}
          placeholder={t('ajans.kullaniciAraPh')}
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.aramaInput}
        />
        {secili || arama ? (
          <Pressable
            onPress={() => {
              onSecTemizle();
              onArama('');
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={RenkTokenlari.textDim} />
          </Pressable>
        ) : null}
      </View>

      {secili ? (
        <View style={styles.seciliKart}>
          {MedyaUriGuvenli(secili.avatar_url) ? (
            <Image source={{ uri: MedyaUriGuvenli(secili.avatar_url)! }} style={styles.seciliAvatar} />
          ) : (
            <View style={[styles.seciliAvatar, styles.uyeAvatarBos]}>
              <Ionicons name="person" size={16} color={RenkTokenlari.textDim} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.seciliAd}>
              {secili.display_name || secili.username}
            </Text>
            <Text style={styles.seciliAlt}>
              {secili.public_user_id || secili.username}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={RenkTokenlari.mint} />
        </View>
      ) : (
        sonuclar.slice(0, 5).map((k) => (
          <Pressable key={k.id} style={styles.sonucSatir} onPress={() => onSec(k)}>
            {MedyaUriGuvenli(k.avatar_url) ? (
              <Image source={{ uri: MedyaUriGuvenli(k.avatar_url)! }} style={styles.sonucAvatar} />
            ) : (
              <View style={[styles.sonucAvatar, styles.uyeAvatarBos]}>
                <Ionicons name="person" size={14} color={RenkTokenlari.textDim} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.sonucAd}>{k.display_name || k.username}</Text>
              <Text style={styles.sonucAlt}>
                {k.public_user_id || k.username}
              </Text>
            </View>
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={RenkTokenlari.primarySoft}
            />
          </Pressable>
        ))
      )}

      <View style={styles.miktarSatir}>
        {hizliMiktarlar.map((n) => {
          const aktif = coin === String(n);
          return (
            <Pressable
              key={n}
              style={[styles.miktarChip, aktif && styles.miktarChipAktif]}
              onPress={() => onCoin(String(n))}
            >
              <Text
                style={[styles.miktarYazi, aktif && styles.miktarYaziAktif]}
              >
                {sayi(n)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.miktarKutu}>
        <Text style={styles.miktarEtiket}>{t('belge.miktar')}</Text>
        <TextInput
          value={coin}
          onChangeText={onCoin}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={RenkTokenlari.textDim}
          style={styles.miktarInput}
        />
        <Text style={styles.miktarBirim}>{t('belge.coinBirim')}</Text>
      </View>

      <Pressable
        style={[styles.cta, busy && styles.ctaDisabled]}
        onPress={onYukle}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#1A1208" />
        ) : (
          <>
            <Ionicons name="send" size={16} color="#1A1208" />
            <Text style={styles.ctaYazi}>{t('ajans.coinGonderBtn')}</Text>
          </>
        )}
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  kart: {
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 98, 0.28)',
    gap: BoslukTokenlari.md,
  },
  ust: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  ustSol: { flex: 1, gap: 6 },
  rozet: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F5C462',
  },
  rozetYazi: {
    ...TipografiTokenlari.micro,
    color: '#1A1208',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  bakiyeKutu: {
    minWidth: 92,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(245, 196, 98, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 98, 0.25)',
    alignItems: 'flex-end',
  },
  bakiyeLabel: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bakiyeDeger: {
    ...TipografiTokenlari.body,
    color: '#F5C462',
    fontWeight: '800',
  },
  uyeSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  uyeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '48%',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  uyeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  uyeAvatarBos: {
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uyeAd: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
    flexShrink: 1,
  },
  aramaKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  aramaInput: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    flex: 1,
    paddingVertical: 12,
  },
  seciliKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(110, 231, 183, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.28)',
  },
  seciliAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  seciliAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  seciliAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  sonucSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  sonucAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sonucAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  sonucAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  miktarSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miktarChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  miktarChipAktif: {
    backgroundColor: 'rgba(245, 196, 98, 0.18)',
    borderColor: '#F5C462',
  },
  miktarYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  miktarYaziAktif: {
    color: '#F5C462',
  },
  miktarKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  miktarEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  miktarInput: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    flex: 1,
    paddingVertical: 12,
    fontWeight: '800',
  },
  miktarBirim: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  cta: {
    marginTop: 2,
    backgroundColor: '#F5C462',
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaYazi: {
    ...TipografiTokenlari.body,
    color: '#1A1208',
    fontWeight: '800',
  },
  kilitKart: {
    padding: BoslukTokenlari.xl,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    gap: 8,
  },
  kilitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kilitBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  kilitAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
});
