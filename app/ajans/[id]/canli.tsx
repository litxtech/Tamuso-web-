import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  AjansAltEkranKabuk,
  AjansBolumBaslik,
  AjansHint,
  AjansKart,
  AjansKpiHucre,
  AjansListeSatir,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId, ajansHref } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansCanliOperasyonGetir,
  type AjansCanliOperasyon,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../src/i18n/diller';

export default function AjansCanliEkrani() {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const id = useAjansRouteId();
  const [data, setData] = useState<AjansCanliOperasyon | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      setData(await AjansCanliOperasyonGetir(id));
    } catch {
      setData(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      title={t('ajans.canliOperasyon')}
      subtitle={t('ajans.canliOperasyonAlt')}
      aktif="canli"
      yukleniyor={yukleniyor && !data}
      refreshing={yukleniyor && !!data}
      onRefresh={() => void yukle()}
    >
      <View style={styles.kpiGrid}>
        <AjansKpiHucre
          label={t('ajans.kpiCevrimici')}
          value={String(data?.ozet.cevrimici ?? 0)}
          emphasize
        />
        <AjansKpiHucre
          label={t('ajans.kpiCanli')}
          value={String(data?.ozet.canli ?? 0)}
          emphasize
        />
        <AjansKpiHucre
          label={t('ajans.kpiSesOdasi')}
          value={String(data?.ozet.ses ?? 0)}
          emphasize
        />
      </View>

      <AjansBolumBaslik>{t('ajans.cevrimiciUyeler')}</AjansBolumBaslik>
      <AjansKart>
        {(data?.cevrimici ?? []).length === 0 ? (
          <AjansHint>{t('ajans.kimseCevrimici')}</AjansHint>
        ) : (
          data!.cevrimici.map((u) => (
            <AjansListeSatir
              key={u.user_id}
              title={u.display_name || u.username || t('ajans.uyeVarsayilan')}
              subtitle={u.username ? `@${u.username}` : undefined}
              avatarUrl={u.avatar_url}
              live
            />
          ))
        )}
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.canliYayinBolum')}</AjansBolumBaslik>
      <AjansKart accent>
        {(data?.canli_yayinlar ?? []).length === 0 ? (
          <AjansHint>{t('ajans.aktifYayinYok')}</AjansHint>
        ) : (
          data!.canli_yayinlar.map((c) => (
            <AjansListeSatir
              key={c.session_id}
              title={c.display_name || c.username || t('ajans.kpiCanli')}
              subtitle={t('ajans.izleyiciSatir', {
                title: c.title,
                count: c.viewer_count,
              })}
              avatarUrl={c.avatar_url}
              live
              trailing={<Text style={styles.link}>{t('ajans.git')}</Text>}
              onPress={() => router.push(`/canli/${c.session_id}` as any)}
            />
          ))
        )}
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.sesOdalariBolum')}</AjansBolumBaslik>
      <AjansKart>
        {(data?.ses_odalari ?? []).length === 0 ? (
          <AjansHint>{t('ajans.aktifOdaYok')}</AjansHint>
        ) : (
          data!.ses_odalari.map((r) => (
            <AjansListeSatir
              key={r.room_id}
              title={r.title}
              subtitle={t('ajans.dinleyiciSatir', {
                ad: r.display_name || r.username,
                count: r.listener_count,
              })}
              trailing={<Text style={styles.link}>{t('ajans.alertOda')}</Text>}
              onPress={() => router.push(`/room/${r.room_id}` as any)}
            />
          ))
        )}
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.yaklasanProgram')}</AjansBolumBaslik>
      <AjansKart>
        {(data?.yaklasan_programlar ?? []).length === 0 ? (
          <AjansHint>{t('ajans.planlanmisProgramYok')}</AjansHint>
        ) : (
          data!.yaklasan_programlar.map((p) => (
            <AjansListeSatir
              key={p.id}
              title={p.title}
              subtitle={t('ajans.programSatir', {
                kind: p.kind,
                zaman: new Date(p.starts_at).toLocaleString(locale),
              })}
              onPress={() => router.push(ajansHref(id, 'program') as any)}
            />
          ))
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', gap: 8 },
  link: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
