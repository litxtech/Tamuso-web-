import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AjansAltEkranKabuk,
  AjansCta,
  AjansHint,
  AjansKart,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansIzinlerim,
  AjansIzinVar,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import { AjansAjansPaketKatalogu } from '../../../src/moduller/ajanslar/islemler/AjansPaketIslemleri';
import { AjansPanelDetayGetir } from '../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import {
  AJANS_SATIS_PLATFORMLARI,
  AjansSatisHttpsUrl,
  AjansSatisLinkiAktiflik,
  AjansSatisLinkiOlustur,
  AjansSatisLinkleriListe,
  AjansSatisLinkiniPaylas,
  type AjansSatisLinki,
  type AjansSatisPlatform,
} from '../../../src/moduller/ajanslar/islemler/AjansSatisIslemleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';
import * as Clipboard from 'expo-clipboard';

export default function AjansSatisLinkleriEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [ajansAd, setAjansAd] = useState<string | null>(null);
  const [distributor, setDistributor] = useState(false);
  const [izinVar, setIzinVar] = useState(false);
  const [linkler, setLinkler] = useState<AjansSatisLinki[]>([]);
  const [paketler, setPaketler] = useState<
    Array<{ id: string; title: string; liste_fiyat_try: number; coins: number }>
  >([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formAcik, setFormAcik] = useState(false);
  const [title, setTitle] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [platform, setPlatform] = useState<AjansSatisPlatform>('whatsapp');
  const [paketId, setPaketId] = useState<string | null>(null);

  const platformEtiket = useMemo(() => {
    const m = Object.fromEntries(
      AJANS_SATIS_PLATFORMLARI.map((p) => [p.id, t(p.labelKey as any)]),
    );
    return m as Record<string, string>;
  }, [t]);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [detay, izin] = await Promise.all([
        AjansPanelDetayGetir(id),
        AjansIzinlerim(id),
      ]);
      setAjansAd(detay.agency?.name ?? null);
      const dist = Boolean(detay.agency?.is_coin_distributor);
      setDistributor(dist);
      const ok = AjansIzinVar(izin, 'agency.manage_sale_links');
      setIzinVar(ok);
      if (!dist || !ok) {
        setLinkler([]);
        return;
      }
      const [l, p] = await Promise.all([
        AjansSatisLinkleriListe(id),
        AjansAjansPaketKatalogu(id).catch(() => []),
      ]);
      setLinkler(l);
      const aktifPaketler = p
        .filter((x) => x.is_active)
        .map((x) => ({
          id: x.id,
          title: x.title,
          liste_fiyat_try: Number(x.liste_fiyat_try),
          coins: Number(x.coins),
        }));
      setPaketler(aktifPaketler);
      setPaketId((prev) => prev ?? aktifPaketler[0]?.id ?? null);
      if (l.length === 0) setFormAcik(true);
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

  const olustur = async () => {
    if (!id || busy || !izinVar) return;
    setBusy(true);
    try {
      const link = await AjansSatisLinkiOlustur({
        agencyId: id,
        title: title.trim() || t('ajans.satisLinkVarsayilan'),
        description: aciklama.trim(),
        sellingPlatform: platform,
        packageId: paketId,
      });
      setTitle('');
      setAciklama('');
      setFormAcik(false);
      await yukle();
      Alert.alert(t('ajans.satisLinkOlustu'), link.code, [
        {
          text: t('ajans.whatsappPaylas'),
          onPress: () =>
            void AjansSatisLinkiniPaylas({
              code: link.code,
              title: link.title,
              description: link.description,
              platformLabel: platformEtiket[link.selling_platform],
              agencyName: ajansAd ?? undefined,
              whatsapp: true,
            }),
        },
        {
          text: t('ajans.herYerdenPaylas'),
          onPress: () =>
            void AjansSatisLinkiniPaylas({
              code: link.code,
              title: link.title,
              description: link.description,
              platformLabel: platformEtiket[link.selling_platform],
              agencyName: ajansAd ?? undefined,
            }),
        },
        { text: t('ortak.tamam') },
      ]);
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('ajans.satisKayitBasarisiz'),
      );
    } finally {
      setBusy(false);
    }
  };

  const kopyala = async (code: string) => {
    try {
      await Clipboard.setStringAsync(AjansSatisHttpsUrl(code));
      Alert.alert(t('ortak.kopyalandi'));
    } catch {
      /* ignore */
    }
  };

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      agencyName={ajansAd}
      title={t('ajans.satisLinkleriBaslik')}
      subtitle={t('ajans.satisLinkleriAlt')}
      aktif="satis-linkleri"
      yukleniyor={yukleniyor && !linkler.length && !formAcik}
      refreshing={yukleniyor && (linkler.length > 0 || formAcik)}
      onRefresh={() => void yukle()}
    >
      {!distributor || !izinVar ? (
        <AjansKart>
          <AjansHint>{t('ajans.satisLinkYetkiYok')}</AjansHint>
        </AjansKart>
      ) : (
        <>
          <View style={styles.ustAksiyon}>
            <Text style={styles.listeBaslik}>{t('ajans.satisLinkListe')}</Text>
            <Pressable
              style={styles.yeniBtn}
              onPress={() => setFormAcik((v) => !v)}
            >
              <Ionicons
                name={formAcik ? 'close' : 'add'}
                size={16}
                color={RenkTokenlari.primarySoft}
              />
              <Text style={styles.yeniBtnYazi}>
                {formAcik ? t('ortak.kapat') : t('ajans.satisLinkYeni')}
              </Text>
            </Pressable>
          </View>

          {formAcik ? (
            <AjansKart>
              <Text style={styles.formBaslik}>{t('ajans.satisLinkOlustur')}</Text>

              <Text style={styles.label}>{t('ajans.satisPaketSec')}</Text>
              <View style={styles.secimListesi}>
                {paketler.map((p) => {
                  const secili = paketId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      style={[styles.secimSatir, secili && styles.secimAktif]}
                      onPress={() => setPaketId(p.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.secimBaslik, secili && styles.secimBaslikAktif]}
                          numberOfLines={1}
                        >
                          {p.title}
                        </Text>
                        <Text style={styles.secimMeta}>
                          {p.coins.toLocaleString('tr-TR')} coin ·{' '}
                          {p.liste_fiyat_try.toLocaleString('tr-TR')} ₺
                        </Text>
                      </View>
                      <Ionicons
                        name={secili ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={
                          secili
                            ? RenkTokenlari.primarySoft
                            : RenkTokenlari.textDim
                        }
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{t('ajans.satisPlatform')}</Text>
              <View style={styles.platformSatir}>
                {AJANS_SATIS_PLATFORMLARI.map((p) => {
                  const secili = platform === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      style={[styles.platformChip, secili && styles.platformAktif]}
                      onPress={() => setPlatform(p.id)}
                    >
                      <Text
                        style={[
                          styles.platformYazi,
                          secili && styles.platformYaziAktif,
                        ]}
                      >
                        {t(p.labelKey as any)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{t('ajans.satisLinkBaslik')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('ajans.satisLinkBaslikPh')}
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <Text style={styles.label}>{t('ajans.satisLinkAciklama')}</Text>
              <TextInput
                style={[styles.input, styles.area]}
                value={aciklama}
                onChangeText={setAciklama}
                multiline
                placeholder={t('ajans.satisLinkAciklamaPh')}
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <AjansHint>{t('ajans.satisLinkSure')}</AjansHint>
              <AjansCta
                label={
                  busy
                    ? t('ajans.paketKaydediliyor')
                    : t('ajans.satisLinkOlustur')
                }
                onPress={() => void olustur()}
                loading={busy}
              />
            </AjansKart>
          ) : null}

          {linkler.length === 0 && !formAcik ? (
            <AjansKart>
              <AjansHint>{t('ajans.satisLinkBos')}</AjansHint>
            </AjansKart>
          ) : (
            linkler.map((l) => (
              <AjansKart key={l.id}>
                <View style={styles.linkUst}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.linkBaslik} numberOfLines={1}>
                      {l.title}
                    </Text>
                    <Text style={styles.linkMeta}>
                      {platformEtiket[l.selling_platform] ?? l.selling_platform}
                      {' · '}
                      {t('ajans.satisLinkTik', { n: l.click_count })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.durumRozet,
                      l.is_active ? styles.durumAktif : styles.durumPasif,
                    ]}
                  >
                    <Text
                      style={[
                        styles.durumYazi,
                        l.is_active && styles.durumYaziAktif,
                      ]}
                    >
                      {l.is_active
                        ? t('ajans.satisLinkAktif')
                        : l.closed_reason === 'sold'
                          ? t('ajans.satisLinkKapandiSatis')
                          : l.closed_reason === 'expired'
                            ? t('ajans.satisLinkKapandiSure')
                            : t('ajans.satisLinkPasif')}
                    </Text>
                  </View>
                </View>

                {l.is_active && l.expires_at ? (
                  <Text style={styles.linkMeta}>
                    {t('ajans.satisLinkSonKullanim', {
                      t: new Date(l.expires_at).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    })}
                  </Text>
                ) : null}
                {l.is_active ? (
                  <Text style={styles.linkMeta}>{t('ajans.satisLinkSure')}</Text>
                ) : null}

                {l.description ? (
                  <Text style={styles.linkAciklama} numberOfLines={2}>
                    {l.description}
                  </Text>
                ) : null}

                <Pressable
                  style={styles.urlKutu}
                  onPress={() => void kopyala(l.code)}
                >
                  <Text style={styles.url} numberOfLines={1}>
                    {AjansSatisHttpsUrl(l.code)}
                  </Text>
                  <Ionicons
                    name="copy-outline"
                    size={14}
                    color={RenkTokenlari.primarySoft}
                  />
                </Pressable>

                <View style={styles.aksiyonSatir}>
                  <Pressable
                    style={styles.aksiyon}
                    onPress={() =>
                      void AjansSatisLinkiniPaylas({
                        code: l.code,
                        title: l.title,
                        description: l.description,
                        platformLabel: platformEtiket[l.selling_platform],
                        agencyName: ajansAd ?? undefined,
                        whatsapp: true,
                      })
                    }
                  >
                    <Ionicons
                      name="logo-whatsapp"
                      size={15}
                      color={RenkTokenlari.primarySoft}
                    />
                    <Text style={styles.aksiyonYazi}>WhatsApp</Text>
                  </Pressable>
                  <Pressable
                    style={styles.aksiyon}
                    onPress={() =>
                      void AjansSatisLinkiniPaylas({
                        code: l.code,
                        title: l.title,
                        description: l.description,
                        platformLabel: platformEtiket[l.selling_platform],
                        agencyName: ajansAd ?? undefined,
                      })
                    }
                  >
                    <Ionicons
                      name="share-outline"
                      size={15}
                      color={RenkTokenlari.primarySoft}
                    />
                    <Text style={styles.aksiyonYazi}>
                      {t('ajans.satisLinkPaylas')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.aksiyon}
                    onPress={() =>
                      void AjansSatisLinkiAktiflik(id, l.id, !l.is_active).then(
                        yukle,
                      )
                    }
                  >
                    <Ionicons
                      name={l.is_active ? 'pause-outline' : 'play-outline'}
                      size={15}
                      color={RenkTokenlari.primarySoft}
                    />
                    <Text style={styles.aksiyonYazi}>
                      {l.is_active
                        ? t('ajans.paketPasiflestir')
                        : t('ajans.paketAktiflestir')}
                    </Text>
                  </Pressable>
                </View>
              </AjansKart>
            ))
          )}
        </>
      )}
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  ustAksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  listeBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  yeniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: RenkTokenlari.pressFill,
  },
  yeniBtnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  formBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  area: { minHeight: 72, textAlignVertical: 'top' },
  secimListesi: { gap: 6 },
  secimSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  secimAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  secimBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  secimBaslikAktif: { color: RenkTokenlari.primarySoft },
  secimMeta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  platformSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  platformChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  platformAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  platformYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  platformYaziAktif: { color: RenkTokenlari.primarySoft },
  linkUst: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  linkBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  linkMeta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  linkAciklama: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 8,
  },
  durumRozet: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  durumAktif: { backgroundColor: 'rgba(94,207,138,0.14)' },
  durumPasif: { backgroundColor: 'rgba(255,255,255,0.05)' },
  durumYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
  },
  durumYaziAktif: { color: '#5ecf8a' },
  urlKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  url: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    flex: 1,
    fontWeight: '600',
  },
  aksiyonSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  aksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: RenkTokenlari.pressFill,
  },
  aksiyonYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
