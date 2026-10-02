import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  AjansAltEkranKabuk,
  AjansHint,
  AjansKart,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansAjansPaketGuncelle,
  AjansAjansPaketKatalogu,
  type AjansAjansCoinPaket,
} from '../../../src/moduller/ajanslar/islemler/AjansPaketIslemleri';
import { AjansPanelDetayGetir } from '../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import {
  AjansIzinlerim,
  AjansIzinVar,
  type AjansIzinler,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import { GradientButton } from '../../../src/components/GradientButton';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';

type FormState = {
  title: string;
  listeFiyat: string;
  coins: string;
  indirim: string;
  sort: string;
};

function formFromPaket(p: AjansAjansCoinPaket): FormState {
  return {
    title: p.title ?? '',
    listeFiyat: String(p.liste_fiyat_try ?? ''),
    coins: String(p.coins ?? 0),
    indirim: String(p.indirim_yuzde ?? 20),
    sort: String(p.sort_order ?? 0),
  };
}

export default function AjansPaketlerEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [distributor, setDistributor] = useState(false);
  const [ajansAd, setAjansAd] = useState<string | null>(null);
  const [izinler, setIzinler] = useState<AjansIzinler | null>(null);
  const [paketler, setPaketler] = useState<AjansAjansCoinPaket[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const duzenleyebilir =
    distributor && AjansIzinVar(izinler, 'agency.manage_coin_operations');

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const [detay, izin] = await Promise.all([
        AjansPanelDetayGetir(id),
        AjansIzinlerim(id).catch(() => null),
      ]);
      const dist = Boolean(detay.agency?.is_coin_distributor);
      setDistributor(dist);
      setAjansAd(detay.agency?.name ?? null);
      setIzinler(izin);
      if (!dist) {
        setPaketler([]);
        return;
      }
      const k = await AjansAjansPaketKatalogu(id);
      setPaketler(k);
      if (seciliId) {
        const p = k.find((x) => x.id === seciliId);
        if (p) setForm(formFromPaket(p));
      }
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.paketYuklenemedi'));
      setPaketler([]);
    } finally {
      setYukleniyor(false);
    }
  }, [id, seciliId, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const sec = (p: AjansAjansCoinPaket) => {
    if (!duzenleyebilir) return;
    setSeciliId(p.id);
    setForm(formFromPaket(p));
  };

  const kaydet = async () => {
    if (!id || !seciliId || !form || kaydediyor || !duzenleyebilir) return;
    const coins = Math.floor(Number(form.coins.replace(/\D/g, '')) || 0);
    const sort = Math.floor(Number(form.sort.replace(/\D/g, '')) || 0);
    const indirim = Math.floor(Number(form.indirim.replace(/\D/g, '')) || 0);
    const fiyatRaw = form.listeFiyat.replace(',', '.').trim();
    const listeFiyat = Number(fiyatRaw);

    if (!(listeFiyat > 0)) {
      Alert.alert(t('ajans.paketEksik'), t('ajans.paketFiyatGerekli'));
      return;
    }
    if (!(coins > 0)) {
      Alert.alert(t('ajans.paketEksik'), t('ajans.paketCoinGerekli'));
      return;
    }
    if (indirim < 0 || indirim >= 100) {
      Alert.alert(t('ajans.paketEksik'), t('ajans.paketIndirimAralik'));
      return;
    }

    setKaydediyor(true);
    try {
      const guncel = await AjansAjansPaketGuncelle({
        agencyId: id,
        id: seciliId,
        title: form.title.trim(),
        listeFiyatTry: listeFiyat,
        coins,
        indirimYuzde: indirim,
        sortOrder: sort,
      });
      setForm(formFromPaket(guncel));
      await yukle();
      Alert.alert(t('ajans.paketKaydedildi'), t('ajans.paketGuncellendi'));
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('ajans.paketKayitBasarisiz'),
      );
    } finally {
      setKaydediyor(false);
    }
  };

  const aktifToggle = async (p: AjansAjansCoinPaket) => {
    if (!id || kaydediyor || !duzenleyebilir) return;
    setKaydediyor(true);
    try {
      await AjansAjansPaketGuncelle({
        agencyId: id,
        id: p.id,
        isActive: !p.is_active,
      });
      await yukle();
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('ajans.paketKayitBasarisiz'),
      );
    } finally {
      setKaydediyor(false);
    }
  };

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      agencyName={ajansAd}
      title={t('ajans.paketlerBaslik')}
      subtitle={t('ajans.paketlerAlt')}
      aktif="paketler"
      yukleniyor={yukleniyor && !paketler.length && !hata && distributor}
      refreshing={yukleniyor && paketler.length > 0}
      onRefresh={() => void yukle()}
    >
      {!distributor ? (
        <>
          <AjansKart>
            <AjansHint>{t('ajans.paketYetkiYokAlt')}</AjansHint>
          </AjansKart>
        </>
      ) : (
        <>
          <AjansKart>
            <AjansHint>
              {duzenleyebilir
                ? t('ajans.paketlerIpucu')
                : t('ajans.paketSadeceGoruntule')}
            </AjansHint>
          </AjansKart>

          {hata ? <Text style={styles.hata}>{hata}</Text> : null}

          {yukleniyor && !paketler.length ? (
            <ActivityIndicator color={RenkTokenlari.primarySoft} />
          ) : null}

          {paketler.map((p) => {
            const acik = seciliId === p.id;
            return (
              <AjansKart key={p.id}>
                <Pressable onPress={() => sec(p)} style={styles.satir}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.baslik}>{p.title}</Text>
                    <Text style={styles.alt}>
                      {Number(p.coins).toLocaleString('tr-TR')} coin · liste{' '}
                      {Number(p.liste_fiyat_try).toLocaleString('tr-TR')} ₺ · %
                      {p.indirim_yuzde} →{' '}
                      {Number(p.odenecek_try).toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                  <View style={styles.chip}>
                    <Text
                      style={[
                        styles.chipYazi,
                        {
                          color: p.is_active
                            ? RenkTokenlari.success
                            : RenkTokenlari.textDim,
                        },
                      ]}
                    >
                      {p.is_active ? t('ajans.paketAktif') : t('ajans.paketKapali')}
                    </Text>
                  </View>
                </Pressable>

                {duzenleyebilir ? (
                  <View style={styles.aksiyonSatir}>
                    <Pressable
                      style={styles.aksiyon}
                      onPress={() => void aktifToggle(p)}
                      disabled={kaydediyor}
                    >
                      <Text style={styles.aksiyonYazi}>
                        {p.is_active
                          ? t('ajans.paketPasiflestir')
                          : t('ajans.paketAktiflestir')}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.aksiyon} onPress={() => sec(p)}>
                      <Text style={styles.aksiyonYazi}>
                        {acik ? t('ajans.paketDuzenleniyor') : t('ajans.paketDuzenle')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {acik && form && duzenleyebilir ? (
                  <View style={styles.form}>
                    <Text style={styles.label}>{t('ajans.paketAdi')}</Text>
                    <TextInput
                      style={styles.input}
                      value={form.title}
                      onChangeText={(txt) => setForm({ ...form, title: txt })}
                      placeholderTextColor={RenkTokenlari.textDim}
                    />

                    <Text style={styles.label}>{t('ajans.paketListeFiyat')}</Text>
                    <TextInput
                      style={styles.input}
                      value={form.listeFiyat}
                      onChangeText={(txt) =>
                        setForm({ ...form, listeFiyat: txt })
                      }
                      keyboardType="decimal-pad"
                      placeholderTextColor={RenkTokenlari.textDim}
                    />

                    <Text style={styles.label}>{t('ajans.paketCoinMiktar')}</Text>
                    <TextInput
                      style={styles.input}
                      value={form.coins}
                      onChangeText={(txt) => setForm({ ...form, coins: txt })}
                      keyboardType="number-pad"
                      placeholderTextColor={RenkTokenlari.textDim}
                    />

                    <Text style={styles.label}>{t('ajans.paketIndirim')}</Text>
                    <TextInput
                      style={styles.input}
                      value={form.indirim}
                      onChangeText={(txt) => setForm({ ...form, indirim: txt })}
                      keyboardType="number-pad"
                      placeholderTextColor={RenkTokenlari.textDim}
                    />

                    <Text style={styles.label}>{t('ajans.paketSiralama')}</Text>
                    <TextInput
                      style={styles.input}
                      value={form.sort}
                      onChangeText={(txt) => setForm({ ...form, sort: txt })}
                      keyboardType="number-pad"
                      placeholderTextColor={RenkTokenlari.textDim}
                    />

                    <GradientButton
                      title={
                        kaydediyor ? t('ajans.paketKaydediliyor') : t('ortak.kaydet')
                      }
                      onPress={() => void kaydet()}
                      loading={kaydediyor}
                      disabled={kaydediyor}
                    />
                  </View>
                ) : null}
              </AjansKart>
            );
          })}
        </>
      )}
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  hata: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    marginBottom: BoslukTokenlari.sm,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipYazi: {
    ...TipografiTokenlari.micro,
    fontWeight: '600',
  },
  aksiyonSatir: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  aksiyon: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  aksiyonYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  form: {
    marginTop: BoslukTokenlari.md,
    gap: 6,
  },
  label: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 6,
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
