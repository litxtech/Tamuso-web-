import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  AjansAltEkranKabuk,
  AjansBolumBaslik,
  AjansCta,
  AjansHint,
  AjansInput,
  AjansKart,
} from '../../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId } from '../../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansCrmGuncelle,
  AjansStaffAta,
  AjansUyeDetayGetir,
} from '../../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import {
  AjansCrmDurumEtiket,
  AjansRolEtiket,
} from '../../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../../src/i18n/useCeviri';

export default function AjansUyeDetayEkrani() {
  const { t, dil } = useCeviri();
  const agencyId = useAjansRouteId();
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const [detay, setDetay] = useState<Record<string, unknown> | null>(null);
  const [notlar, setNotlar] = useState('');
  const [etiket, setEtiket] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const locale =
    dil.startsWith('en') ? 'en-US' : dil.startsWith('es') ? 'es-ES' : dil.startsWith('ar') ? 'ar' : 'tr-TR';

  const yukle = useCallback(async () => {
    if (!agencyId || !userId) return;
    setYukleniyor(true);
    try {
      const d = await AjansUyeDetayGetir(agencyId, userId);
      setDetay(d);
      const crm = d.crm as { notes?: string; tags?: string[] } | null;
      setNotlar(crm?.notes ?? '');
      setEtiket((crm?.tags ?? []).join(', '));
    } catch (e) {
      Alert.alert(t('ajans.alertUye'), e instanceof Error ? e.message : t('ajans.yuklenemedi'));
      setDetay(null);
    } finally {
      setYukleniyor(false);
    }
  }, [agencyId, userId, t]);

  useFocusEffect(useCallback(() => { void yukle(); }, [yukle]));

  const profile = detay?.profile as {
    display_name?: string;
    username?: string;
    public_user_id?: string;
  } | undefined;
  const crm = detay?.crm as { agency_status?: string; onboarding_stage?: string } | null;
  const aktivite = detay?.aktivite as {
    ses_dakika_ay?: number;
    yayin_dakika_ay?: number;
    son_aktif?: string;
  } | undefined;
  const audit = (detay?.audit as Array<{ summary: string; created_at: string }>) ?? [];

  return (
    <AjansAltEkranKabuk
      agencyId={agencyId}
      title={t('ajans.uyeDetayi')}
      subtitle={profile?.display_name || profile?.username || 'CRM'}
      aktif="uyeler"
      yukleniyor={yukleniyor && !detay}
      refreshing={yukleniyor && !!detay}
      onRefresh={() => void yukle()}
    >
      <AjansBolumBaslik>{t('ajans.genelBolum')}</AjansBolumBaslik>
      <AjansKart>
        <Text style={styles.ad}>{profile?.display_name || '—'}</Text>
        <Text style={styles.alt}>@{profile?.username || '—'} · ID {profile?.public_user_id || '—'}</Text>
        <Text style={styles.alt}>
          {t('ajans.rolDurum', {
            rol: AjansRolEtiket(String(detay?.role ?? 'MEMBER'), t),
            durum: AjansCrmDurumEtiket(crm?.agency_status ?? 'active', t),
          })}
        </Text>
        <Text style={styles.alt}>
          {t('ajans.onboarding', {
            stage: AjansCrmDurumEtiket(crm?.onboarding_stage ?? 'active', t),
          })}
        </Text>
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.aktiviteBolum')}</AjansBolumBaslik>
      <AjansKart>
        <Text style={styles.alt}>{t('ajans.sesAy', { n: aktivite?.ses_dakika_ay ?? 0 })}</Text>
        <Text style={styles.alt}>{t('ajans.yayinAy', { n: aktivite?.yayin_dakika_ay ?? 0 })}</Text>
        <Text style={styles.alt}>
          {t('ajans.sonAktif', {
            zaman: aktivite?.son_aktif
              ? new Date(aktivite.son_aktif).toLocaleString(locale)
              : t('ajans.henuzVeriYok'),
          })}
        </Text>
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.notlarEtiketler')}</AjansBolumBaslik>
      <AjansKart>
        <AjansInput
          value={notlar}
          onChangeText={setNotlar}
          placeholder={t('ajans.phCrmNot')}
          multiline
        />
        <AjansInput
          value={etiket}
          onChangeText={setEtiket}
          placeholder={t('ajans.phCrmEtiket')}
        />
        <AjansCta
          label={t('ajans.crmKaydet')}
          onPress={() => {
            void (async () => {
              const r = await AjansCrmGuncelle({
                agencyId,
                userId: userId!,
                notes: notlar,
                tags: etiket
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
              });
              if (!r.ok) Alert.alert(t('ajans.alertCrm'), r.hata);
              else {
                Alert.alert(t('ajans.tamam'), t('ajans.kaydedildi'));
                await yukle();
              }
            })();
          }}
        />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {(['active', 'trial', 'leave', 'suspended'] as const).map((s) => (
            <AjansCta
              key={s}
              ghost
              label={AjansCrmDurumEtiket(s, t)}
              onPress={() => {
                void (async () => {
                  const r = await AjansCrmGuncelle({
                    agencyId,
                    userId: userId!,
                    agencyStatus: s,
                  });
                  if (!r.ok) Alert.alert(t('ajans.alertDurum'), r.hata);
                  else await yukle();
                })();
              }}
            />
          ))}
        </View>
        <AjansCta
          ghost
          label={t('ajans.hostManagerYap')}
          onPress={() => {
            void (async () => {
              const r = await AjansStaffAta({
                agencyId,
                userId: userId!,
                roleCode: 'HOST_MANAGER',
              });
              if (!r.ok) Alert.alert(t('ajans.alertRol'), r.hata);
              else Alert.alert(t('ajans.tamam'), t('ajans.rolAtandi'));
            })();
          }}
        />
      </AjansKart>

      <AjansBolumBaslik>{t('ajans.gecmisBolum')}</AjansBolumBaslik>
      <AjansKart>
        {audit.length === 0 ? (
          <AjansHint>{t('ajans.henuzVeriYok')}</AjansHint>
        ) : (
          audit.map((a, i) => (
            <Text key={i} style={styles.alt}>
              {new Date(a.created_at).toLocaleString(locale)} · {a.summary}
            </Text>
          ))
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  ad: { ...TipografiTokenlari.title, color: RenkTokenlari.text },
  alt: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
});
