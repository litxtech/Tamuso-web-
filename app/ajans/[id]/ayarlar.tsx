import React, { useCallback, useState } from 'react';
import { Alert, Image, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  AjansAltEkranKabuk,
  AjansBolumBaslik,
  AjansCta,
  AjansHint,
  AjansInput,
  AjansKart,
  AjansListeSatir,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId, ajansHref } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansKurallariKaydet,
  AjansOdemeSablonuKaydet,
  AjansPanelDetayGetir,
  AjansSil,
  type AjansPanelDetay,
} from '../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import {
  AjansAkademiEkle,
  AjansAkademiListesi,
  AjansFormGetir,
  AjansFormKaydet,
  AjansKanalHazirla,
  AjansKanalListesi,
  AjansOdulTanimla,
  AjansStaffListesi,
  AjansStaffYetkiAyarla,
  AjansYoneticiAta,
  AjansYoneticiIptal,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import {
  AjansMedyaYukle,
  AjansProfilGuncelle,
} from '../../../src/moduller/ajanslar/okuma/AjansProfilGetir';
import { MedyaUriGuvenli } from '../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { AjansRolEtiket } from '../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../../src/i18n/useCeviri';

const YONETICI_TOGGLE_KODLARI: Array<{ code: string; labelKey: CeviriAnahtari }> = [
  { code: 'agency.manage_members', labelKey: 'ajans.izinUyeleriYonet' },
  { code: 'agency.manage_applications', labelKey: 'ajans.izinBasvurulariYonet' },
  { code: 'agency.manage_announcements', labelKey: 'ajans.izinDuyuruGonder' },
  { code: 'agency.manage_events', labelKey: 'ajans.izinEtkinlikOlustur' },
  { code: 'agency.manage_schedule', labelKey: 'ajans.izinProgramYonet' },
  { code: 'agency.view_analytics', labelKey: 'ajans.izinAnalitikGor' },
  { code: 'agency.view_finance', labelKey: 'ajans.izinIslemleriGor' },
  { code: 'agency.manage_coin_operations', labelKey: 'ajans.izinCoinIslemi' },
  { code: 'agency.manage_sale_links', labelKey: 'ajans.izinSatisLink' },
  { code: 'agency.view_sales', labelKey: 'ajans.izinSatisGor' },
  { code: 'agency.review_sales', labelKey: 'ajans.izinSatisIncele' },
  { code: 'agency.manage_invoices', labelKey: 'ajans.izinFaturaYonet' },
  { code: 'agency.manage_profile', labelKey: 'ajans.izinProfilDegistir' },
  { code: 'agency.manage_support', labelKey: 'ajans.izinDestekGor' },
];

export default function AjansAyarlarEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [detay, setDetay] = useState<AjansPanelDetay | null>(null);
  const [ad, setAd] = useState('');
  const [slogan, setSlogan] = useState('');
  const [ulke, setUlke] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [kurallar, setKurallar] = useState('');
  const [holder, setHolder] = useState('');
  const [banka, setBanka] = useState('');
  const [iban, setIban] = useState('');
  const [telefon, setTelefon] = useState('');
  const [odemeNot, setOdemeNot] = useState('');
  const [staff, setStaff] = useState<Array<Record<string, unknown>>>([]);
  const [seciliStaff, setSeciliStaff] = useState<string | null>(null);
  const [yoneticiAd, setYoneticiAd] = useState('');
  const [akademi, setAkademi] = useState<Array<Record<string, unknown>>>([]);
  const [akademiBaslik, setAkademiBaslik] = useState('');
  const [kanallar, setKanallar] = useState<Array<Record<string, unknown>>>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const d = await AjansPanelDetayGetir(id);
      setDetay(d);
      setAd(d.agency.name ?? '');
      setSlogan(d.agency.slogan ?? '');
      setUlke(d.agency.country ?? '');
      setAciklama(d.agency.description ?? '');
      setKurallar(d.rules?.body ?? '');
      setHolder(d.payment_template?.account_holder ?? '');
      setBanka(d.payment_template?.bank_name ?? '');
      setIban(d.payment_template?.iban ?? '');
      setTelefon(d.payment_template?.phone ?? '');
      setOdemeNot(d.payment_template?.note ?? '');
      const [s, a, k] = await Promise.all([
        AjansStaffListesi(id).catch(() => []),
        AjansAkademiListesi(id).catch(() => []),
        AjansKanalListesi(id).catch(() => []),
      ]);
      setStaff(s);
      setAkademi(a);
      setKanallar(k);
    } catch {
      setDetay(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void yukle(); }, [yukle]));

  const logoUrl = MedyaUriGuvenli(detay?.agency.logo_url);
  const bannerUrl = MedyaUriGuvenli(detay?.agency.banner_url);
  const secili = staff.find((s) => s.user_id === seciliStaff);
  const overrides = (secili?.overrides as Array<{ permission: string; granted: boolean }>) ?? [];

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      title={t('ajans.ayarlar')}
      subtitle={t('ajans.ayarlarAlt')}
      aktif="ayarlar"
      yukleniyor={yukleniyor && !detay}
      refreshing={yukleniyor && !!detay}
      onRefresh={() => void yukle()}
    >
      <AjansBolumBaslik>{t('ajans.profilBolum')}</AjansBolumBaslik>
      <AjansKart>
        {(bannerUrl || logoUrl) && (
          <View>
            {bannerUrl ? (
              <Image source={{ uri: bannerUrl }} style={{ width: '100%', height: 80, borderRadius: 8 }} />
            ) : null}
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={{ width: 48, height: 48, borderRadius: 12, marginTop: -24, marginLeft: 12 }}
              />
            ) : null}
          </View>
        )}
        <AjansCta
          ghost
          label={t('ajans.logoYukle')}
          onPress={() => {
            void (async () => {
              setBusy(true);
              const r = await AjansMedyaYukle({ agencyId: id, tur: 'logo' });
              setBusy(false);
              if (!r.ok && !r.iptal) Alert.alert(t('ajans.alertMedya'), r.hata);
              else await yukle();
            })();
          }}
        />
        <AjansCta
          ghost
          label={t('ajans.bannerYukle')}
          onPress={() => {
            void (async () => {
              setBusy(true);
              const r = await AjansMedyaYukle({ agencyId: id, tur: 'banner' });
              setBusy(false);
              if (!r.ok && !r.iptal) Alert.alert(t('ajans.alertMedya'), r.hata);
              else await yukle();
            })();
          }}
        />
        <AjansInput value={ad} onChangeText={setAd} placeholder={t('ajans.phAjansAdi')} />
        <AjansInput value={slogan} onChangeText={setSlogan} placeholder={t('ajans.phSlogan')} />
        <AjansInput value={ulke} onChangeText={setUlke} placeholder={t('ajans.phUlkeKisa')} />
        <AjansInput value={aciklama} onChangeText={setAciklama} placeholder={t('ajans.phAciklamaKisa')} multiline />
        <AjansCta
          label={t('ajans.profilKaydet')}
          onPress={() => {
            void (async () => {
              const r = await AjansProfilGuncelle({
                agencyId: id,
                name: ad.trim(),
                slogan: slogan.trim() || undefined,
                country: ulke.trim() || undefined,
                description: aciklama.trim() || undefined,
              });
              if (!r.ok) Alert.alert(t('ajans.alertProfil'), r.hata);
              else Alert.alert(t('ajans.tamam'), t('ajans.guncellendi'));
            })();
          }}
        />
        <AjansCta
          ghost
          label={t('ajans.davetler')}
          onPress={() => router.push(ajansHref(id, 'davetler') as any)}
        />
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.yoneticiAtaBaslik')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput
          value={yoneticiAd}
          onChangeText={setYoneticiAd}
          placeholder={t('ajans.yoneticiAtaPh')}
          autoCapitalize="none"
        />
        <AjansCta
          label={t('ajans.yoneticiAta')}
          onPress={() => {
            const ad = yoneticiAd.trim().replace(/^@/, '');
            if (!id || ad.length < 2) return;
            void (async () => {
              setBusy(true);
              const r = await AjansYoneticiAta({ agencyId: id, username: ad });
              setBusy(false);
              if (!r.ok) Alert.alert(t('ajans.alertYetki'), r.hata);
              else {
                setYoneticiAd('');
                Alert.alert(t('ajans.tamam'), t('ajans.yoneticiAtandi'));
                await yukle();
              }
            })();
          }}
        />
        <AjansBolumBaslik>{t('ajans.yoneticiler')}</AjansBolumBaslik>
        {staff.filter((s) => String(s.role_code) === 'MANAGER').length === 0 ? (
          <AjansHint>{t('ajans.staffYok')}</AjansHint>
        ) : (
          staff
            .filter((s) => String(s.role_code) === 'MANAGER')
            .map((s) => (
              <AjansListeSatir
                key={String(s.user_id)}
                title={`${s.display_name || s.username}`}
                subtitle={`@${s.username ?? ''}`}
                onPress={() => {
                  Alert.alert(t('ajans.yoneticiIptal'), t('ajans.yoneticiIptalOnay'), [
                    { text: t('ortak.iptal'), style: 'cancel' },
                    {
                      text: t('ajans.yoneticiIptal'),
                      style: 'destructive',
                      onPress: () => {
                        if (!id) return;
                        void (async () => {
                          setBusy(true);
                          const r = await AjansYoneticiIptal({
                            agencyId: id,
                            userId: String(s.user_id),
                          });
                          setBusy(false);
                          if (!r.ok) Alert.alert(t('ajans.alertYetki'), r.hata);
                          else {
                            Alert.alert(t('ajans.tamam'), t('ajans.yoneticiKaldirildi'));
                            await yukle();
                          }
                        })();
                      },
                    },
                  ]);
                }}
              />
            ))
        )}
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.yoneticiYetkileri')}</AjansBolumBaslik>
      <AjansKart>
        {staff.length === 0 ? (
          <AjansHint>{t('ajans.staffYok')}</AjansHint>
        ) : (
          staff.map((s) => (
            <AjansListeSatir
              key={String(s.user_id)}
              title={`${s.display_name || s.username} · ${AjansRolEtiket(String(s.role_code), t)}`}
              subtitle={t('ajans.yetkiToggleSec')}
              onPress={() => setSeciliStaff(String(s.user_id))}
            />
          ))
        )}
        {seciliStaff ? (
          <View style={{ gap: 8 }}>
            {YONETICI_TOGGLE_KODLARI.map((item) => {
              const override = overrides.find((o) => o.permission === item.code);
              const granted = override?.granted ?? false;
              return (
                <View
                  key={item.code}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={{ color: RenkTokenlari.text, flex: 1 }}>{t(item.labelKey)}</Text>
                  <Switch
                    value={granted}
                    disabled={busy}
                    onValueChange={(v) => {
                      void (async () => {
                        setBusy(true);
                        const r = await AjansStaffYetkiAyarla({
                          agencyId: id,
                          userId: seciliStaff,
                          permission: item.code,
                          granted: v,
                        });
                        setBusy(false);
                        if (!r.ok) Alert.alert(t('ajans.alertYetki'), r.hata);
                        else await yukle();
                      })();
                    }}
                  />
                </View>
              );
            })}
          </View>
        ) : null}
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.kanallarBolum')}</AjansBolumBaslik>
      <AjansKart>
        <AjansCta
          label={t('ajans.kanallariHazirla')}
          onPress={() => {
            void (async () => {
              const r = await AjansKanalHazirla(id);
              if (!r.ok) Alert.alert(t('ajans.alertKanal'), r.hata);
              else {
                setKanallar(r.kanallar);
                Alert.alert(t('ajans.tamam'), t('ajans.kanallarHazir'));
              }
            })();
          }}
        />
        {kanallar.map((k) => (
          <AjansListeSatir
            key={String(k.id)}
            title={String(k.channel_kind)}
            subtitle={String(k.thread_id ?? '')}
            onPress={() =>
              k.thread_id && router.push(`/mesaj/${k.thread_id}` as any)
            }
          />
        ))}
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.akademiBolum')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput
          value={akademiBaslik}
          onChangeText={setAkademiBaslik}
          placeholder={t('ajans.phRehberBaslik')}
        />
        <AjansCta
          label={t('ajans.ekleBaslangic')}
          onPress={() => {
            void (async () => {
              const r = await AjansAkademiEkle({
                agencyId: id,
                category: 'baslangic',
                title: akademiBaslik.trim() || t('ajans.baslangicRehberi'),
                body: t('ajans.baslangicRehberBody'),
              });
              if (!r.ok) Alert.alert(t('ajans.alertAkademi'), r.hata);
              else {
                setAkademiBaslik('');
                await yukle();
              }
            })();
          }}
        />
        {akademi.map((a) => (
          <AjansListeSatir
            key={String(a.id)}
            title={String(a.title)}
            subtitle={`${a.category}${a.completed ? t('ajans.tamamlandiSuffix') : ''}`}
          />
        ))}
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.basvuruFormuBolum')}</AjansBolumBaslik>
      <AjansKart>
        <AjansCta
          label={t('ajans.varsayilanFormKaydet')}
          onPress={() => {
            void (async () => {
              const r = await AjansFormKaydet({
                agencyId: id,
                title: t('ajans.hostBasvuruFormu'),
                fields: [
                  {
                    field_type: 'short_text',
                    label: t('ajans.formSaatler'),
                    required: true,
                    sort_order: 1,
                  },
                  {
                    field_type: 'single_choice',
                    label: t('ajans.formYayinTuru'),
                    options: [t('ajans.formSecSohbet'), t('ajans.formSecMuzik'), t('ajans.formSecOyun')],
                    required: true,
                    sort_order: 2,
                  },
                  {
                    field_type: 'yes_no',
                    label: t('ajans.formOncekiYayin'),
                    required: false,
                    sort_order: 3,
                  },
                ],
              });
              if (!r.ok) Alert.alert(t('ajans.form'), r.hata);
              else {
                const f = await AjansFormGetir(id);
                Alert.alert(t('ajans.tamam'), t('ajans.alanKaydedildi', { count: f.fields?.length ?? 0 }));
              }
            })();
          }}
        />
        <AjansCta
          ghost
          label={t('ajans.odulTanimla')}
          onPress={() => {
            void (async () => {
              const r = await AjansOdulTanimla({
                agencyId: id,
                rewardType: 'badge',
                title: t('ajans.ajansYildizi'),
                description: t('ajans.aktifHostOdulu'),
              });
              if (!r.ok) Alert.alert(t('ajans.alertOdul'), r.hata);
              else Alert.alert(t('ajans.tamam'), t('ajans.odulTanimlandi'));
            })();
          }}
        />
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.kurallarBolum')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput value={kurallar} onChangeText={setKurallar} multiline placeholder={t('ajans.phKurallar')} />
        <AjansCta
          label={t('ajans.kurallariKaydet')}
          onPress={() => {
            void (async () => {
              const r = await AjansKurallariKaydet({ agencyId: id, body: kurallar });
              if (!r.ok) Alert.alert(t('ajans.alertKurallar'), r.hata);
              else Alert.alert(t('ajans.tamam'), t('ajans.kaydedildi'));
            })();
          }}
        />
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.ibanBolum')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput value={holder} onChangeText={setHolder} placeholder={t('ajans.phHesapSahibi')} />
        <AjansInput value={banka} onChangeText={setBanka} placeholder={t('ajans.phBanka')} />
        <AjansInput value={iban} onChangeText={setIban} placeholder={t('ajans.phIban')} autoCapitalize="characters" />
        <AjansInput value={telefon} onChangeText={setTelefon} placeholder={t('ajans.phTelefonKisa')} />
        <AjansInput value={odemeNot} onChangeText={setOdemeNot} placeholder={t('ajans.phNot')} />
        <AjansCta
          label={t('ajans.odemeSablonuKaydet')}
          onPress={() => {
            void (async () => {
              const r = await AjansOdemeSablonuKaydet({
                agencyId: id,
                accountHolder: holder,
                bankName: banka,
                iban,
                phone: telefon,
                note: odemeNot,
              });
              if (!r.ok) Alert.alert(t('ajans.alertOdeme'), r.hata);
              else Alert.alert(t('ajans.tamam'), t('ajans.kaydedildi'));
            })();
          }}
        />
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.tehlikeliAlan')}</AjansBolumBaslik>
      <AjansKart>
        <AjansCta
          ghost
          label={t('ajans.ajansiKapat')}
          onPress={() => {
            Alert.alert(t('ajans.ajansiKapat'), t('ajans.ajansiKapatSoru'), [
              { text: t('ajans.vazgec'), style: 'cancel' },
              {
                text: t('ortak.kapat'),
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    const r = await AjansSil(id);
                    if (!r.ok) Alert.alert(t('ajans.alertAjans'), r.hata);
                    else router.replace('/ajans/yonetim' as any);
                  })();
                },
              },
            ]);
          }}
        />
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}
