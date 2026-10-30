import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AjansAltEkranKabuk } from '../../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import {
  AjansBolumBaslik,
  AjansCta,
  AjansHint,
  AjansInput,
  AjansKart,
} from '../../../../src/moduller/ajanslar/bilesenler/AjansYonetimPrimitifleri';
import { useAjansRouteId } from '../../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import { AjansGorusmeOlustur } from '../../../../src/moduller/ajans-gorusme/islemler/AjansGorusmeIslemleri';
import { ToplantiBaslangicIso } from '../../../../src/moduller/ajans-gorusme/kurallar/AjansGorusmeKurallari';
import type {
  AjansGorusmeGizlilik,
  AjansGorusmeMedya,
  AjansGorusmeOdaTipi,
} from '../../../../src/moduller/ajans-gorusme/tipler';
import { useCeviri } from '../../../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

const TIPLER: { id: AjansGorusmeOdaTipi; key: CeviriAnahtari }[] = [
  { id: 'private_meeting', key: 'ajans.gorusmeTipOzel' },
  { id: 'creator_interview', key: 'ajans.gorusmeTipMulakat' },
  { id: 'group_meeting', key: 'ajans.gorusmeTipGrup' },
  { id: 'agency_meeting', key: 'ajans.gorusmeTipAjans' },
  { id: 'announcement_room', key: 'ajans.gorusmeTipDuyuru' },
  { id: 'platform_meeting', key: 'ajans.gorusmeTipPlatform' },
  { id: 'custom', key: 'ajans.gorusmeTipDiger' },
];

const MEDYA: { id: AjansGorusmeMedya; key: CeviriAnahtari }[] = [
  { id: 'audio', key: 'ajans.gorusmeSes' },
  { id: 'video', key: 'ajans.gorusmeGoruntu' },
  { id: 'audio_video', key: 'ajans.gorusmeSesGoruntu' },
];

const GIZ: { id: AjansGorusmeGizlilik; key: CeviriAnahtari }[] = [
  { id: 'private', key: 'ajans.gorusmeGizOzel' },
  { id: 'agency_members', key: 'ajans.gorusmeGizAjans' },
  { id: 'invited', key: 'ajans.gorusmeGizDavetli' },
  { id: 'link', key: 'ajans.gorusmeGizLink' },
];

function Chipler<T extends string>({
  secenekler,
  secili,
  onSec,
  t,
}: {
  secenekler: { id: T; key: CeviriAnahtari }[];
  secili: T;
  onSec: (id: T) => void;
  t: (key: CeviriAnahtari) => string;
}) {
  return (
    <View style={styles.chipler}>
      {secenekler.map((s) => {
        const aktif = s.id === secili;
        return (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityState={{ selected: aktif }}
            accessibilityLabel={t(s.key)}
            onPress={() => onSec(s.id)}
            style={[styles.chip, aktif && styles.chipAktif]}
          >
            <Text style={[styles.chipYazi, aktif && styles.chipYaziAktif]}>{t(s.key)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AjansGorusmeOlusturEkrani() {
  const { t } = useCeviri();
  const agencyId = useAjansRouteId();
  const [ad, setAd] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [tip, setTip] = useState<AjansGorusmeOdaTipi>('creator_interview');
  const [medya, setMedya] = useState<AjansGorusmeMedya>('audio_video');
  const [giz, setGiz] = useState<AjansGorusmeGizlilik>('invited');
  const [hemen, setHemen] = useState(true);
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [sure, setSure] = useState('30');
  const [limit, setLimit] = useState('12');
  const [kullanicilar, setKullanicilar] = useState('');
  const [resmi, setResmi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const olustur = async () => {
    if (ad.trim().length < 2) {
      setHata(t('ajans.gorusmeAdGerekli'));
      return;
    }
    let scheduled: string | null = null;
    if (!hemen) {
      scheduled = ToplantiBaslangicIso(tarih, saat);
      if (!scheduled) {
        setHata(t('ajans.gorusmeTarih'));
        return;
      }
    }
    setYukleniyor(true);
    setHata(null);
    try {
      const detay = await AjansGorusmeOlustur({
        agencyId,
        title: ad.trim(),
        description: aciklama.trim(),
        roomType: tip,
        mediaType: medya,
        visibility: giz,
        scheduledAt: scheduled,
        durationMinutes: Math.min(240, Math.max(5, Number(sure) || 30)),
        maxParticipants: Math.min(50, Math.max(2, Number(limit) || 12)),
        usernames: kullanicilar
          .split(/[,\s]+/)
          .map((x) => x.replace(/^@/, '').trim())
          .filter(Boolean),
        inviteOfficial: resmi,
      });
      router.replace(`/ajans/gorusme/${detay.id}` as any);
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.gorusmeVideoHata'));
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <AjansAltEkranKabuk
      agencyId={agencyId}
      title={t('ajans.gorusmeOlustur')}
      aktif="gorusmeler"
      yukleniyor={false}
    >
      <AjansKart>
        <AjansBolumBaslik>{t('ajans.gorusmeAd')}</AjansBolumBaslik>
        <AjansInput
          value={ad}
          onChangeText={setAd}
          placeholder={t('ajans.gorusmeAd')}
          accessibilityLabel={t('ajans.gorusmeAd')}
          maxLength={80}
        />
        <AjansInput
          value={aciklama}
          onChangeText={setAciklama}
          placeholder={t('ajans.gorusmeAciklama')}
          accessibilityLabel={t('ajans.gorusmeAciklama')}
          multiline
          maxLength={2000}
        />
      </AjansKart>
      <AjansBolumBaslik>{t('ajans.gorusmeOdaTipi')}</AjansBolumBaslik>
      <Chipler secenekler={TIPLER} secili={tip} onSec={setTip} t={t} />
      <AjansBolumBaslik>{t('ajans.gorusmeMedya')}</AjansBolumBaslik>
      <Chipler secenekler={MEDYA} secili={medya} onSec={setMedya} t={t} />
      <AjansBolumBaslik>{t('ajans.gorusmeGizlilik')}</AjansBolumBaslik>
      <Chipler secenekler={GIZ} secili={giz} onSec={setGiz} t={t} />
      <AjansBolumBaslik>{t('ajans.gorusmeBaslangic')}</AjansBolumBaslik>
      <Chipler
        secenekler={[
          { id: 'now', key: 'ajans.gorusmeHemen' as CeviriAnahtari },
          { id: 'plan', key: 'ajans.gorusmePlanla' as CeviriAnahtari },
        ]}
        secili={hemen ? 'now' : 'plan'}
        onSec={(v) => setHemen(v === 'now')}
        t={t}
      />
      {!hemen ? (
        <AjansKart>
          <AjansInput
            value={tarih}
            onChangeText={setTarih}
            placeholder={t('ajans.gorusmeTarih')}
            accessibilityLabel={t('ajans.gorusmeTarih')}
            autoCapitalize="none"
          />
          <AjansInput
            value={saat}
            onChangeText={setSaat}
            placeholder={t('ajans.gorusmeSaat')}
            accessibilityLabel={t('ajans.gorusmeSaat')}
            autoCapitalize="none"
          />
        </AjansKart>
      ) : null}
      <AjansKart>
        <AjansInput
          value={sure}
          onChangeText={setSure}
          keyboardType="number-pad"
          placeholder={t('ajans.gorusmeSure')}
          accessibilityLabel={t('ajans.gorusmeSure')}
        />
        <AjansInput
          value={limit}
          onChangeText={setLimit}
          keyboardType="number-pad"
          placeholder={t('ajans.gorusmeLimit')}
          accessibilityLabel={t('ajans.gorusmeLimit')}
        />
        <AjansInput
          value={kullanicilar}
          onChangeText={setKullanicilar}
          placeholder={t('ajans.gorusmeKullaniciPh')}
          accessibilityLabel={t('ajans.gorusmeKullanicilar')}
          autoCapitalize="none"
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: resmi }}
          accessibilityLabel={t('ajans.gorusmeResmiDavet')}
          onPress={() => setResmi((v) => !v)}
          style={styles.resmi}
        >
          <Text style={styles.resmiYazi}>
            {resmi ? '✓ ' : ''}
            {t('ajans.gorusmeResmiDavet')}
          </Text>
        </Pressable>
      </AjansKart>
      {hata ? <AjansHint>{hata}</AjansHint> : null}
      <AjansCta label={t('ajans.gorusmeOlusturBtn')} onPress={() => void olustur()} loading={yukleniyor} />
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  chipler: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipAktif: { borderColor: RenkTokenlari.borderAccent, backgroundColor: RenkTokenlari.pressFill },
  chipYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  chipYaziAktif: { color: RenkTokenlari.text, fontWeight: '700' },
  resmi: { paddingVertical: 10 },
  resmiYazi: { color: RenkTokenlari.text, fontWeight: '600' },
});
