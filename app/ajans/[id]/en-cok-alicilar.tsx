import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  AjansAltEkranKabuk,
  AjansBolumBaslik,
  AjansHint,
  AjansKart,
  AjansKpiHucre,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansIzinlerim,
  AjansIzinVar,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import { AjansPanelDetayGetir } from '../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import {
  AjansSatisOzetiGetir,
  type AjansSatisOzeti,
} from '../../../src/moduller/ajanslar/islemler/AjansSatisIslemleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';

/** En çok alışveriş yapan kullanıcılar + ciro özeti */
export default function AjansEnCokAlicilarEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [ajansAd, setAjansAd] = useState<string | null>(null);
  const [okuma, setOkuma] = useState(false);
  const [ozet, setOzet] = useState<AjansSatisOzeti | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [detay, izin] = await Promise.all([
        AjansPanelDetayGetir(id),
        AjansIzinlerim(id),
      ]);
      setAjansAd(detay.agency?.name ?? null);
      const g =
        AjansIzinVar(izin, 'agency.view_sales') ||
        AjansIzinVar(izin, 'agency.review_sales');
      setOkuma(g);
      if (!g) {
        setOzet(null);
        return;
      }
      setOzet(await AjansSatisOzetiGetir(id));
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('ajans.satisYuklenemedi'),
      );
    } finally {
      setYukleniyor(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const alicilar = ozet?.top_alicilar ?? [];

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      agencyName={ajansAd}
      title={t('ajans.topAlicilarBaslik')}
      subtitle={t('ajans.topAlicilarAlt')}
      aktif="en-cok-alicilar"
      yukleniyor={yukleniyor && !ozet}
      refreshing={yukleniyor && !!ozet}
      onRefresh={() => void yukle()}
    >
      {!okuma ? (
        <AjansKart>
          <AjansHint>{t('ajans.satisTakipYetkiYok')}</AjansHint>
        </AjansKart>
      ) : ozet ? (
        <>
          <AjansBolumBaslik>{t('ajans.ciroBaslik')}</AjansBolumBaslik>
          <View style={styles.kpiGrid}>
            <AjansKpiHucre
              label={t('ajans.ciroToplamTry')}
              value={`${Number(ozet.toplam_try).toLocaleString('tr-TR')} ₺`}
              emphasize
            />
            <AjansKpiHucre
              label={t('ajans.ciroToplamCoin')}
              value={Number(ozet.toplam_coin).toLocaleString('tr-TR')}
              emphasize
            />
            <AjansKpiHucre
              label={t('ajans.ciroIslemEtiket')}
              value={String(ozet.islem_adet)}
            />
          </View>

          <AjansBolumBaslik>{t('ajans.ciroTopAlicilar')}</AjansBolumBaslik>
          {alicilar.length === 0 ? (
            <AjansKart>
              <AjansHint>{t('ajans.ciroTopBos')}</AjansHint>
            </AjansKart>
          ) : (
            <AjansKart>
              {alicilar.map((alici, i) => (
                <View
                  key={`${alici.buyer_id ?? alici.buyer_name}-${i}`}
                  style={[
                    styles.satir,
                    i < alicilar.length - 1 && styles.satirCizgi,
                  ]}
                >
                  <View
                    style={[
                      styles.siraRozet,
                      i === 0 && styles.siraAltin,
                      i === 1 && styles.siraGumus,
                      i === 2 && styles.siraBronz,
                    ]}
                  >
                    <Text style={styles.siraYazi}>{i + 1}</Text>
                  </View>
                  <View style={styles.satirGovde}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {alici.buyer_name}
                    </Text>
                    <Text style={styles.meta}>
                      {t('ajans.topAlicilarIslem', {
                        n: Number(alici.islem_adet) || 0,
                      })}
                    </Text>
                  </View>
                  <View style={styles.rakamlar}>
                    <Text style={styles.coin}>
                      {Number(alici.toplam_coin).toLocaleString('tr-TR')}
                    </Text>
                    <Text style={styles.try}>
                      {Number(alici.toplam_try).toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                </View>
              ))}
            </AjansKart>
          )}
        </>
      ) : (
        <AjansKart>
          <AjansHint>{t('ajans.yuklenemedi')}</AjansHint>
        </AjansKart>
      )}
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  satirCizgi: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  siraRozet: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.pressFill,
  },
  siraAltin: { backgroundColor: 'rgba(212,175,55,0.22)' },
  siraGumus: { backgroundColor: 'rgba(180,180,190,0.18)' },
  siraBronz: { backgroundColor: 'rgba(180,120,70,0.18)' },
  siraYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  satirGovde: { flex: 1, gap: 2 },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  rakamlar: { alignItems: 'flex-end', gap: 2 },
  coin: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  try: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
});
