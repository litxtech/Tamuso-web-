import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  YetkiliAjanslariGetir,
  type YetkiliAjans,
} from '../okuma/YetkiliAjanslariGetir';
import {
  AjansCoinPaketleriniGetir,
  AJANS_COIN_INDIRIM_YUZDE,
  type AjansCoinPaket,
} from '../katalog/AjansCoinPaketKatalog';
import { AjansPaketTeklifOlustur } from '../islemler/AjansPaketTeklifIslemleri';
import { AjansSohbetAcVeyaGetir } from '../../mesajlasma/islemler/MesajGonder';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  /** Mağaza kilitliyken mesaj yine açık kalabilir */
  locked?: boolean;
  /** Ajans seçilince IAP paketlerini de yenile */
  onPaketleriYenile?: () => void;
};

function formatTry(n: number, locale: string): string {
  return `${n.toLocaleString(locale, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

/**
 * IAP paketlerinin altında: yetkili ajans seç → indirimli paketler görünür.
 */
export function YetkiliAjansYukleSeridi({ locked, onPaketleriYenile }: Props) {
  const { t, i18n } = useCeviri();
  const router = useRouter();
  const [liste, setListe] = useState<YetkiliAjans[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [secili, setSecili] = useState<YetkiliAjans | null>(null);
  const [ajansPaketler, setAjansPaketler] = useState<AjansCoinPaket[]>([]);
  const locale = i18n.language || 'tr';

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const rows = await YetkiliAjanslariGetir(40);
    setListe(rows);
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const ajansSec = useCallback(
    (ajans: YetkiliAjans) => {
      const ayni = secili?.id === ajans.id;
      if (ayni) {
        setSecili(null);
        setAjansPaketler([]);
        return;
      }
      setSecili(ajans);
      void AjansCoinPaketleriniGetir(ajans.id).then((p) => {
        setAjansPaketler(p);
        onPaketleriYenile?.();
      });
    },
    [onPaketleriYenile, secili?.id],
  );

  const sohbetAc = async (ajans: YetkiliAjans, paket?: AjansCoinPaket) => {
    if (busyId) return;
    setBusyId(ajans.id);
    if (paket) {
      const r = await AjansPaketTeklifOlustur({
        agencyId: ajans.id,
        listeFiyatTry: paket.listeFiyatTry,
      });
      setBusyId(null);
      if (!r.ok) {
        Alert.alert(t('cuzdanX.alertMesaj'), r.hata);
        return;
      }
      router.push(`/mesaj/${r.threadId}` as any);
      return;
    }
    const r = await AjansSohbetAcVeyaGetir(ajans.id);
    setBusyId(null);
    if (!r.ok) {
      Alert.alert(t('cuzdanX.alertMesaj'), r.hata);
      return;
    }
    router.push(`/mesaj/${r.threadId}` as any);
  };

  const magazaEtiket =
    Platform.OS === 'ios'
      ? t('cuzdanX.appleOdeme')
      : Platform.OS === 'android'
        ? t('cuzdanX.googleOdeme')
        : t('cuzdanX.magazaOdeme');

  return (
    <View style={styles.wrap}>
      <View style={styles.ayrac}>
        <View style={styles.ayracCizgi} />
        <Text style={styles.ayracYazi}>{t('auth.veya')}</Text>
        <View style={styles.ayracCizgi} />
      </View>

      <Text style={styles.baslik}>{t('cuzdanX.yetkiliAjansBaslik')}</Text>
      <Text style={styles.alt}>
        {t('cuzdanX.yetkiliAjansAlt', {
          magaza: magazaEtiket,
          pct: ajansPaketler[0]?.indirimYuzde ?? AJANS_COIN_INDIRIM_YUZDE,
        })}
      </Text>

      {yukleniyor ? (
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginVertical: 16 }}
        />
      ) : liste.length === 0 ? (
        <Text style={styles.bos}>{t('cuzdanX.yetkiliAjansBos')}</Text>
      ) : (
        <View style={styles.liste}>
          {liste.map((a) => {
            const aktif = secili?.id === a.id;
            const logo = MedyaUriGuvenli(a.logo_url);
            return (
              <Pressable
                key={a.id}
                style={[styles.kart, aktif && styles.kartAktif]}
                onPress={() => ajansSec(a)}
              >
                <View style={styles.sol}>
                  {logo ? (
                    <Image source={{ uri: logo }} style={styles.logo} />
                  ) : (
                    <LinearGradient
                      colors={[...RenkTokenlari.gradientPrimary]}
                      style={styles.logo}
                    >
                      <Text style={styles.logoHarf}>
                        {(a.name[0] || 'A').toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                  <View style={styles.metin}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {a.agency_public_id ?? t('cuzdanX.yetkiliDagitici')}
                      {a.slogan ? ` · ${a.slogan}` : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={aktif ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={aktif ? RenkTokenlari.mint : RenkTokenlari.textDim}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {secili ? (
        <View style={styles.paketBolum}>
          <View style={styles.paketBaslikSatir}>
            <Text style={styles.paketBaslik}>
              {t('cuzdanX.ajansIndirimBaslik', {
                name: secili.name,
                pct: ajansPaketler[0]?.indirimYuzde ?? AJANS_COIN_INDIRIM_YUZDE,
              })}
            </Text>
            <Pressable
              style={[styles.mesajBtn, busyId === secili.id && { opacity: 0.6 }]}
              disabled={!!busyId || locked}
              onPress={() => void sohbetAc(secili)}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
              <Text style={styles.mesajYazi}>{t('cuzdanX.alertMesaj')}</Text>
            </Pressable>
          </View>
          <Text style={styles.paketAlt}>
            {t('cuzdanX.paketTalepAlt', {
              pct: ajansPaketler[0]?.indirimYuzde ?? AJANS_COIN_INDIRIM_YUZDE,
            })}
          </Text>
          <View style={styles.paketGrid}>
            {ajansPaketler.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.paketKart, locked && { opacity: 0.5 }]}
                disabled={!!busyId || locked}
                onPress={() => void sohbetAc(secili, p)}
              >
                <View style={styles.indirimChip}>
                  <Text style={styles.indirimChipYazi}>
                    -%{p.indirimYuzde}
                  </Text>
                </View>
                <Text style={styles.paketAd}>{p.title}</Text>
                <Text style={styles.paketCoin}>
                  {t('cuzdanX.coinAdet', {
                    count: p.coins.toLocaleString(locale),
                  })}
                </Text>
                <Text style={styles.paketListe}>
                  {formatTry(p.listeFiyatTry, locale)}
                </Text>
                <Text style={styles.paketOde}>
                  {formatTry(p.odenecekTry, locale)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : liste.length > 0 ? (
        <Text style={styles.secUyari}>{t('cuzdanX.ajansSecUyari')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: BoslukTokenlari.xl,
    gap: BoslukTokenlari.sm,
  },
  ayrac: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  ayracCizgi: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: RenkTokenlari.border,
  },
  ayracYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 17,
    fontWeight: '800',
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    lineHeight: 16,
    marginBottom: 4,
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    paddingVertical: 12,
  },
  secUyari: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    paddingVertical: 8,
  },
  liste: { gap: 10 },
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  kartAktif: {
    borderColor: RenkTokenlari.mint,
    backgroundColor: 'rgba(110, 231, 183, 0.08)',
  },
  sol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHarf: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
  metin: { flex: 1, minWidth: 0, gap: 2 },
  ad: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  mesajBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.primary,
  },
  mesajYazi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '800',
  },
  paketBolum: {
    marginTop: BoslukTokenlari.md,
    gap: BoslukTokenlari.sm,
  },
  paketBaslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paketBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    flex: 1,
  },
  paketAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    lineHeight: 16,
  },
  paketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paketKart: {
    width: '47.5%',
    flexGrow: 1,
    minWidth: '46%',
    padding: 12,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 98, 0.28)',
    gap: 4,
    overflow: 'hidden',
  },
  indirimChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(110, 231, 183, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.35)',
  },
  indirimChipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '900',
    fontSize: 10,
  },
  paketAd: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  paketCoin: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.accent,
    fontWeight: '900',
  },
  paketListe: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    textDecorationLine: 'line-through',
  },
  paketOde: {
    ...TipografiTokenlari.body,
    color: '#F5C462',
    fontWeight: '900',
  },
});
