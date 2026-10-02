import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AjansCoinPaketleriniGetir,
  AJANS_COIN_INDIRIM_YUZDE,
  type AjansCoinPaket,
} from '../../cuzdan/katalog/AjansCoinPaketKatalog';
import { AjansPaketTeklifOlustur } from '../../cuzdan/islemler/AjansPaketTeklifIslemleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  visible: boolean;
  agencyId: string;
  threadId: string;
  onClose: () => void;
  onGonderildi?: () => void;
};

function formatTry(n: number, locale: string): string {
  return `${n.toLocaleString(locale, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

/** Ajans sohbetinden Stripe ödemeli paket teklifi seç / gönder */
export function AjansPaketTeklifSecSheet({
  visible,
  agencyId,
  threadId,
  onClose,
  onGonderildi,
}: Props) {
  const { t, i18n } = useCeviri();
  const insets = useSafeAreaInsets();
  const locale = i18n.language || 'tr';
  const [paketler, setPaketler] = useState<AjansCoinPaket[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let iptal = false;
    setYukleniyor(true);
    void AjansCoinPaketleriniGetir(agencyId).then((p) => {
      if (!iptal) {
        setPaketler(p);
        setYukleniyor(false);
      }
    });
    return () => {
      iptal = true;
    };
  }, [visible, agencyId, i18n.language]);

  const gonder = async (p: AjansCoinPaket) => {
    if (busy) return;
    setBusy(p.id);
    const r = await AjansPaketTeklifOlustur({
      agencyId,
      listeFiyatTry: p.listeFiyatTry,
      threadId,
    });
    setBusy(null);
    if (!r.ok) {
      Alert.alert(t('cuzdanX.alertMesaj'), r.hata);
      return;
    }
    onGonderildi?.();
    onClose();
  };

  const indirimPct = paketler[0]?.indirimYuzde ?? AJANS_COIN_INDIRIM_YUZDE;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <Text style={styles.baslik}>{t('cuzdanX.ajansTeklifSecBaslik')}</Text>
        <Text style={styles.alt}>
          {t('cuzdanX.ajansTeklifSecAlt', { pct: indirimPct })}
        </Text>
        {yukleniyor && !paketler.length ? (
          <ActivityIndicator
            color={RenkTokenlari.mint}
            style={{ marginVertical: 24 }}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {paketler.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.kart, busy === p.id && { opacity: 0.6 }]}
                disabled={!!busy}
                onPress={() => void gonder(p)}
              >
                {busy === p.id ? (
                  <ActivityIndicator color={RenkTokenlari.mint} />
                ) : (
                  <>
                    <Text style={styles.paketAd}>{p.title}</Text>
                    <Text style={styles.paketCoin}>
                      {t('cuzdanX.coinAdet', {
                        count: p.coins.toLocaleString(locale),
                      })}
                    </Text>
                    <Text style={styles.liste}>
                      {formatTry(p.listeFiyatTry, locale)}
                    </Text>
                    <Text style={styles.ode}>
                      {formatTry(p.odenecekTry, locale)}
                    </Text>
                  </>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
        <Pressable style={styles.kapat} onPress={onClose}>
          <Ionicons name="close" size={18} color={RenkTokenlari.text} />
          <Text style={styles.kapatYazi}>{t('ortak.vazgec')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: RenkTokenlari.bg,
    borderTopLeftRadius: YaricapTokenlari.lg,
    borderTopRightRadius: YaricapTokenlari.lg,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 8,
    maxHeight: '72%',
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: 8,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 17,
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    lineHeight: 16,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 8,
  },
  kart: {
    width: '47.5%',
    flexGrow: 1,
    minWidth: '46%',
    padding: 12,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 98, 0.28)',
    gap: 4,
    minHeight: 96,
    justifyContent: 'center',
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
  liste: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    textDecorationLine: 'line-through',
  },
  ode: {
    ...TipografiTokenlari.body,
    color: '#F5C462',
    fontWeight: '900',
  },
  kapat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  kapatYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
