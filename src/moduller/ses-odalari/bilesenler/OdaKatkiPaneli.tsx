import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { useCeviri } from '../../../i18n/useCeviri';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { SayiKisaBicim } from '../../../tasarim-sistemi/premium/SeviyeXpHesap';
import {
  OdaKatkiListesiniGetir,
  type OdaKatkiDonemi,
  type OdaKatkiSatiri,
} from '../okuma/OdaIslemOzeti';

type Props = {
  visible: boolean;
  roomId: string;
  onClose: () => void;
};

const DONEMLER: OdaKatkiDonemi[] = ['daily', 'weekly', 'monthly'];

const SIRA_RENK = ['#F0B429', '#C9CDD4', '#E0A06A'] as const;

/** Hediye atan ve oyun oynayan kullanıcıların dönemlik katkı listesi. */
export function OdaKatkiPaneli({ visible, roomId, onClose }: Props) {
  const { t } = useCeviri();
  const { height: ekran } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [donem, setDonem] = useState<OdaKatkiDonemi>('daily');
  const [satirlar, setSatirlar] = useState<OdaKatkiSatiri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const yukseklik = Math.round(ekran * 0.58);

  useEffect(() => {
    if (!visible) return;
    let iptal = false;
    setYukleniyor(true);
    void OdaKatkiListesiniGetir(roomId, donem).then((liste) => {
      if (iptal) return;
      setSatirlar(liste);
      setYukleniyor(false);
    });
    return () => {
      iptal = true;
    };
  }, [visible, roomId, donem]);

  const toplam = useMemo(
    () =>
      satirlar.reduce(
        (acc, s) => ({
          hediye: acc.hediye + s.hediye_coin,
          oyun: acc.oyun + s.oyun_coin,
        }),
        { hediye: 0, oyun: 0 },
      ),
    [satirlar],
  );

  const etiket = (d: OdaKatkiDonemi) =>
    d === 'weekly'
      ? t('sesOda.katkiHaftalik')
      : d === 'monthly'
        ? t('sesOda.katkiAylik')
        : t('sesOda.katkiGunluk');

  return (
    <TamusoModal
      visible={visible}
      onClose={onClose}
      placement="bottom"
      animationType="slide"
    >
      <View
        style={[
          styles.kart,
          {
            height: yukseklik,
            paddingBottom: Math.max(insets.bottom, BoslukTokenlari.md),
          },
        ]}
      >
        <View style={styles.tutamac} />
        <View style={styles.baslikSatir}>
          <View style={styles.baslikMetin}>
            <Text style={styles.baslik}>{t('sesOda.katkiBaslik')}</Text>
            <Text style={styles.altBaslik}>{etiket(donem)}</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.kapat}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.kapat')}
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={RenkTokenlari.text} />
          </Pressable>
        </View>

        <View style={styles.sekmeler}>
          {DONEMLER.map((d) => {
            const secili = d === donem;
            return (
              <Pressable
                key={d}
                onPress={() => setDonem(d)}
                style={[styles.sekme, secili && styles.sekmeSecili]}
              >
                <Text style={[styles.sekmeYazi, secili && styles.sekmeYaziSecili]}>
                  {etiket(d)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.ozet}>
          <View style={styles.ozetHucre}>
            <Ionicons name="gift" size={15} color="#FFE08A" />
            <Text style={styles.ozetSayi}>{SayiKisaBicim(toplam.hediye)}</Text>
            <Text style={styles.ozetEtiket}>{t('sesOda.katkiHediye')}</Text>
          </View>
          <View style={styles.ozetHucre}>
            <Ionicons name="game-controller" size={15} color="#E4D4FF" />
            <Text style={styles.ozetSayi}>{SayiKisaBicim(toplam.oyun)}</Text>
            <Text style={styles.ozetEtiket}>{t('sesOda.katkiOyun')}</Text>
          </View>
          <View style={[styles.ozetHucre, styles.ozetToplam]}>
            <Ionicons name="sparkles" size={15} color={RenkTokenlari.primarySoft} />
            <Text style={styles.ozetSayi}>
              {SayiKisaBicim(toplam.hediye + toplam.oyun)}
            </Text>
            <Text style={styles.ozetEtiket}>{t('sesOda.katkiToplam')}</Text>
          </View>
        </View>

        {yukleniyor ? (
          <View style={styles.bos}>
            <ActivityIndicator color={RenkTokenlari.primary} />
          </View>
        ) : satirlar.length === 0 ? (
          <View style={styles.bos}>
            <Ionicons name="leaf-outline" size={28} color={RenkTokenlari.textMuted} />
            <Text style={styles.bosYazi}>{t('sesOda.katkiBos')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.liste}
            contentContainerStyle={styles.listeIc}
            showsVerticalScrollIndicator={false}
          >
            {satirlar.map((s, i) => {
              const avatar = MedyaUriGuvenli(s.avatar_url);
              const ad = s.display_name || s.username || '—';
              const siraRenk = SIRA_RENK[i] ?? RenkTokenlari.textMuted;
              return (
                <View key={s.user_id} style={styles.satir}>
                  <View style={[styles.sira, { borderColor: siraRenk }]}>
                    <Text style={[styles.siraYazi, { color: siraRenk }]}>{i + 1}</Text>
                  </View>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarBos}>
                      <Ionicons name="person" size={16} color={RenkTokenlari.textOnPrimary} />
                    </View>
                  )}
                  <View style={styles.adBlok}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {ad}
                    </Text>
                    {s.username ? (
                      <Text style={styles.kullanici} numberOfLines={1}>
                        @{s.username}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.coinler}>
                    <View style={styles.coinRozet}>
                      <Ionicons name="gift" size={11} color="#FFE08A" />
                      <Text style={styles.coin}>{SayiKisaBicim(s.hediye_coin)}</Text>
                    </View>
                    <View style={styles.coinRozet}>
                      <Ionicons name="game-controller" size={11} color="#E4D4FF" />
                      <Text style={styles.coin}>{SayiKisaBicim(s.oyun_coin)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  kart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    gap: BoslukTokenlari.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(240, 180, 41, 0.35)',
  },
  tutamac: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 224, 138, 0.45)',
    marginBottom: 2,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
  },
  baslikMetin: { flex: 1 },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  altBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: 2,
  },
  kapat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.chipFill,
  },
  sekmeler: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.chipFill,
  },
  sekme: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
  },
  sekmeSecili: {
    backgroundColor: RenkTokenlari.primary,
  },
  sekmeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  sekmeYaziSecili: {
    color: RenkTokenlari.textOnPrimary,
  },
  ozet: {
    flexDirection: 'row',
    gap: 8,
  },
  ozetHucre: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.chipFill,
  },
  ozetToplam: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 64, 145, 0.45)',
  },
  ozetEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  ozetSayi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  liste: { flex: 1 },
  listeIc: { gap: 8, paddingBottom: BoslukTokenlari.sm },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.chipFill,
  },
  sira: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siraYazi: {
    ...TipografiTokenlari.micro,
    fontWeight: '800',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarBos: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primary,
  },
  adBlok: { flex: 1, minWidth: 0 },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kullanici: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  coinler: { alignItems: 'flex-end', gap: 4 },
  coinRozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coin: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  bos: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: BoslukTokenlari.sm,
  },
  bosYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
});
