import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AjansAltEkranKabuk } from '../../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import {
  AjansBolumBaslik,
  AjansBos,
  AjansCta,
  AjansKart,
  AjansKpiHucre,
  AjansListeSatir,
} from '../../../../src/moduller/ajanslar/bilesenler/AjansYonetimPrimitifleri';
import {
  ajansHref,
  useAjansRouteId,
} from '../../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansGorusmeListeGetir,
  AjansGorusmeOzetGetir,
} from '../../../../src/moduller/ajans-gorusme/islemler/AjansGorusmeIslemleri';
import { AjansGorusmeAnalitik } from '../../../../src/moduller/ajans-gorusme/analitik/AjansGorusmeAnalitik';
import type { AjansGorusmeKart } from '../../../../src/moduller/ajans-gorusme/tipler';
import { useCeviri } from '../../../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

function tipAnahtar(tip: string): CeviriAnahtari {
  switch (tip) {
    case 'private_meeting':
      return 'ajans.gorusmeTipOzel';
    case 'creator_interview':
      return 'ajans.gorusmeTipMulakat';
    case 'group_meeting':
      return 'ajans.gorusmeTipGrup';
    case 'agency_meeting':
      return 'ajans.gorusmeTipAjans';
    case 'announcement_room':
      return 'ajans.gorusmeTipDuyuru';
    case 'platform_meeting':
      return 'ajans.gorusmeTipPlatform';
    default:
      return 'ajans.gorusmeTipDiger';
  }
}

function saatMetni(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AjansGorusmelerEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [ozet, setOzet] = useState({ today: 0, live: 0, pending_invites: 0, upcoming: 0 });
  const [aktif, setAktif] = useState<AjansGorusmeKart[]>([]);
  const [yaklasan, setYaklasan] = useState<AjansGorusmeKart[]>([]);
  const [gecmis, setGecmis] = useState<AjansGorusmeKart[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const [o, a, y, g] = await Promise.all([
        AjansGorusmeOzetGetir(id),
        AjansGorusmeListeGetir(id, 'live'),
        AjansGorusmeListeGetir(id, 'upcoming'),
        AjansGorusmeListeGetir(id, 'past'),
      ]);
      setOzet(o);
      setAktif(a);
      setYaklasan(y);
      setGecmis(g);
      AjansGorusmeAnalitik('agency_profile_opened');
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.gorusmeVideoHata'));
    } finally {
      setYukleniyor(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const kart = (item: AjansGorusmeKart) => (
    <AjansListeSatir
      key={item.id}
      title={item.title}
      subtitle={`${t(tipAnahtar(item.room_type))} · ${saatMetni(item.scheduled_at || item.started_at)} · ${item.participant_count} ${t('ajans.gorusmeKisi')}`}
      onPress={() => {
        AjansGorusmeAnalitik('agency_room_opened');
        router.push(`/ajans/gorusme/${item.id}` as any);
      }}
    />
  );

  const bos = aktif.length + yaklasan.length + gecmis.length === 0;

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      title={t('ajans.gorusmeMerkez')}
      subtitle={t('ajans.gorusmeBolum')}
      aktif="gorusmeler"
      yukleniyor={yukleniyor && bos}
      refreshing={yukleniyor}
      onRefresh={() => void yukle()}
    >
      {hata ? <Text style={styles.hata}>{hata}</Text> : null}
      <View style={styles.kpi}>
        <AjansKpiHucre label={t('ajans.gorusmeBugun')} value={String(ozet.today)} emphasize />
        <AjansKpiHucre label={t('ajans.gorusmeAktif')} value={String(ozet.live)} emphasize />
        <AjansKpiHucre label={t('ajans.gorusmeBekleyen')} value={String(ozet.pending_invites)} />
        <AjansKpiHucre label={t('ajans.gorusmeYaklasan')} value={String(ozet.upcoming)} />
      </View>
      <View style={styles.aksiyon}>
        <AjansCta
          label={t('ajans.gorusmeOlustur')}
          onPress={() => router.push(ajansHref(id, 'gorusmeler/olustur') as any)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ajans.gorusmeDavetlerim')}
          onPress={() => router.push('/ajans/gorusmelerim' as any)}
        >
          <Text style={styles.link}>{t('ajans.gorusmeDavetlerim')}</Text>
        </Pressable>
      </View>

      {bos && !yukleniyor ? (
        <AjansKart>
          <AjansBos title={t('ajans.gorusmeBos')} />
          <AjansCta
            label={t('ajans.gorusmeBosCta')}
            onPress={() => router.push(ajansHref(id, 'gorusmeler/olustur') as any)}
          />
        </AjansKart>
      ) : null}

      <AjansBolumBaslik>{t('ajans.gorusmeTakvim')}</AjansBolumBaslik>
      <AjansKart>
        {aktif.length === 0 && yaklasan.length === 0 ? (
          <AjansBos title={t('ajans.gorusmeBos')} />
        ) : (
          <>
            {aktif.map(kart)}
            {yaklasan.map(kart)}
          </>
        )}
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.gorusmeGecmis')}</AjansBolumBaslik>
      <AjansKart>
        {gecmis.length === 0 ? (
          <AjansBos title={t('ajans.gorusmeSon')} />
        ) : (
          gecmis.map(kart)
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  kpi: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aksiyon: { gap: 8, marginVertical: 12 },
  link: { ...TipografiTokenlari.caption, color: RenkTokenlari.primarySoft, fontWeight: '700' },
  hata: { color: RenkTokenlari.danger, marginBottom: 8 },
});
