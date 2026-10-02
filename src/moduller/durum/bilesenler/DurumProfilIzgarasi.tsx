import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DurumOggesi } from '../islemler/DurumIslemleri';
import {
  DurumMedyaHttpsMi,
  DurumMuzikPayloadAl,
  DurumOyunKazanciPayloadAl,
  DurumSesPayloadAl,
} from '../islemler/DurumIslemleri';
import { DurumMuzikKarti } from './DurumMuzikKarti';
import { DurumSesKarti } from './DurumSesKarti';
import { DurumOyunKazanciKart } from './DurumOyunKazanciKart';
import { DurumVideoOnizleme } from './DurumVideoOnizleme';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  items: DurumOggesi[];
  yukleniyor?: boolean;
  baslik?: string;
  /** true ise başlık satırı hiç çizilmez (X sekmesi dışarıda) */
  baslikGizle?: boolean;
  bosMetin?: string;
  /** Dış padding parent’ta varsa false yap */
  yatayPadding?: boolean;
  onPress: (oge: DurumOggesi) => void;
  onPaylas?: () => void;
  /** Uzun basınca (kendi gönderilerinde sil vb.) */
  onUzunBas?: (oge: DurumOggesi) => void;
};

export function DurumProfilIzgarasi({
  items,
  yukleniyor,
  baslik,
  baslikGizle = false,
  bosMetin,
  yatayPadding = true,
  onPress,
  onPaylas,
  onUzunBas,
}: Props) {
  const { t } = useCeviri();
  const baslikMetin = baslik ?? t('durumX.gonderiler');
  const bosMetinCozulmus = bosMetin ?? t('durumX.paylasimYok');
  return (
    <View
      style={[
        styles.wrap,
        !yatayPadding && styles.wrapSik,
        baslikGizle && styles.wrapSekmesiz,
      ]}
    >
      {baslikGizle ? null : (
        <View style={styles.baslikSatir}>
          <Text style={styles.baslik}>{baslikMetin}</Text>
          {onPaylas ? (
            <Pressable onPress={onPaylas} hitSlop={8} style={styles.paylasHit}>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={RenkTokenlari.primarySoft}
              />
              <Text style={styles.paylasYazi}>{t('ortak.paylas')}</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {yukleniyor && !items.length ? (
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginVertical: 24 }}
        />
      ) : !items.length ? (
        <Text style={styles.bos}>{bosMetinCozulmus}</Text>
      ) : (
        <View style={styles.grid}>
          {items
            .filter((oge) => oge && typeof oge.id === 'string' && oge.id.length > 0)
            .map((oge) => {
            const kazanc = DurumOyunKazanciPayloadAl(oge);
            const muzik = DurumMuzikPayloadAl(oge);
            const ses = DurumSesPayloadAl(oge);
            return (
              <Pressable
                key={oge.id}
                style={styles.hucre}
                onPress={() => onPress(oge)}
                onLongPress={
                  onUzunBas ? () => onUzunBas(oge) : undefined
                }
                accessibilityRole="imagebutton"
                accessibilityLabel={
                  kazanc ? t('durumX.oyunKazanciDurumu') : t('durumX.durumGonderisi')
                }
              >
                {kazanc ? (
                  <DurumOyunKazanciKart payload={kazanc} compact />
                ) : muzik ? (
                  <DurumMuzikKarti payload={muzik} compact />
                ) : ses ? (
                  <DurumSesKarti
                    oynaticiId={`durum-ses:${oge.id}`}
                    uri={oge.media_url}
                    durationMs={ses.duration_ms}
                    compact
                  />
                ) : oge.media_type === 'video' ? (
                  <View style={[styles.img, styles.imgBos]}>
                    <DurumVideoOnizleme
                      uri={oge.media_url}
                      style={StyleSheet.absoluteFill}
                      aktif={DurumMedyaHttpsMi(oge.media_url)}
                      mod="kare"
                    />
                    {!DurumMedyaHttpsMi(oge.media_url) ? (
                      <Ionicons
                        name="play-circle"
                        size={28}
                        color="rgba(255,255,255,0.75)"
                      />
                    ) : null}
                  </View>
                ) : typeof oge.media_url === 'string' &&
                  /^https?:\/\//i.test(oge.media_url.trim()) ? (
                  <Image
                    source={{ uri: oge.media_url.trim() }}
                    style={styles.img}
                  />
                ) : (
                  <View style={[styles.img, styles.imgBos, styles.imgMetin]}>
                    <Text style={styles.metinOnizleme} numberOfLines={4}>
                      {oge.caption?.trim() || t('durum.baslik')}
                    </Text>
                  </View>
                )}
                {oge.media_type === 'video' && !kazanc && !ses ? (
                  <View style={styles.videoBadge} pointerEvents="none">
                    <Ionicons name="play" size={12} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: BoslukTokenlari.lg,
    paddingHorizontal: BoslukTokenlari.lg,
    gap: 12,
    width: '100%',
  },
  wrapSik: {
    paddingHorizontal: 0,
  },
  wrapSekmesiz: {
    marginTop: BoslukTokenlari.sm,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 17,
    fontWeight: '800',
  },
  paylasHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paylasYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    paddingVertical: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  hucre: {
    width: '32.5%',
    aspectRatio: 1,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgElevated,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgBos: {
    backgroundColor: '#1a1a22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgMetin: {
    padding: 8,
    backgroundColor: RenkTokenlari.bgCard,
  },
  metinOnizleme: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
  videoBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
