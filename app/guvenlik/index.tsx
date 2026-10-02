import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { BosDurum } from '../../src/components/BosDurum';
import { TextField } from '../../src/components/TextField';
import { KlavyeScrollView } from '../../src/bilesenler/klavye/KlavyeScrollView';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import {
  GuvenlikOlaylarimiGetir,
  type GuvenlikOlayi,
} from '../../src/moduller/guvenlik/okuma/GuvenlikOlaylarimiGetir';
import {
  BildirmeSebebiEtiketi,
  KullaniciBildir,
  RaporAlindiMesaj,
  RaporAlindiMesajCocuk,
} from '../../src/moduller/moderasyon/islemler/ModerasyonIslemleri';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { UygulamaKimligi } from '../../src/yapilandirma/UygulamaKimligi';
import { useCeviri, type CeviriAnahtari } from '../../src/i18n/useCeviri';
import { BiyometriGuvenlikKarti } from '../../src/moduller/kimlik-dogrulama/biyometri/BiyometriAnahtari';

const OLAY_ANAHTAR: Record<string, CeviriAnahtari> = {
  report_submitted: 'guvenlik.olayRapor',
  child_safety_report: 'guvenlik.olayCocukRapor',
  user_block: 'guvenlik.olayEngel',
  user_blocked: 'guvenlik.olayEngel',
  user_unblock: 'guvenlik.olayEngelKaldirildi',
  user_unblocked: 'guvenlik.olayEngelKaldirildi',
  account_restricted: 'guvenlik.olayKisit',
  login_anomaly: 'guvenlik.olaySupheliGiris',
  kill_switch: 'guvenlik.olayAcilDurdurma',
  moderation_action: 'guvenlik.olayModerasyon',
};

const LOCALE_MAP: Record<string, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  ar: 'ar',
  fr: 'fr-FR',
  fil: 'fil-PH',
};

export default function GuvenlikMerkeziEkrani() {
  const { t, dil } = useCeviri();
  const { isGuest, refreshProfile, profile } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const [events, setEvents] = useState<GuvenlikOlayi[]>([]);
  const [cocukDetay, setCocukDetay] = useState('');
  const [cocukBusy, setCocukBusy] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const adminMi = profile?.is_admin === true;

  const olayAdi = useCallback(
    (type: string) => {
      const key = OLAY_ANAHTAR[type];
      return key ? t(key) : type.replace(/_/g, ' ');
    },
    [t],
  );

  const severityEtiketi = useCallback(
    (sev: string): { label: string; color: string } => {
      switch ((sev || '').toLowerCase()) {
        case 'critical':
        case 'high':
          return { label: t('guvenlik.seviyeYuksek'), color: RenkTokenlari.danger };
        case 'medium':
          return { label: t('guvenlik.seviyeOrta'), color: RenkTokenlari.accent };
        case 'low':
          return { label: t('guvenlik.seviyeDusuk'), color: RenkTokenlari.mint };
        default:
          return { label: sev || '—', color: RenkTokenlari.textMuted };
      }
    },
    [t],
  );

  const tarihKisa = useCallback(
    (iso: string) => {
      try {
        return new Date(iso).toLocaleString(LOCALE_MAP[dil] ?? dil, {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return iso;
      }
    },
    [dil],
  );

  const load = useCallback(async () => {
    setYukleniyor(true);
    try {
      setEvents(await GuvenlikOlaylarimiGetir());
    } catch {
      setEvents([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const riskOzet = useMemo(() => {
    const yuksek = events.filter((e) => e.risk_score >= 70 || e.severity === 'critical').length;
    return { toplam: events.length, yuksek };
  }, [events]);

  const hizliCocukRaporu = () => {
    islemiDene('oy_kullan', () => {
      Alert.alert(t('guvenlik.cocukBildirimBaslik'), t('guvenlik.cocukBildirimOnay'), [
        { text: t('ortak.vazgec'), style: 'cancel' },
        {
          text: t('ortak.gonder'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setCocukBusy(true);
              const etiket = BildirmeSebebiEtiketi('child_safety');
              const r = await KullaniciBildir({
                reason: etiket,
                reasonCode: 'child_safety',
                contentType: 'other',
                details:
                  cocukDetay.trim() || t('guvenlik.cocukMerkezDetay'),
                context: { source: 'safety_center' },
              });
              setCocukBusy(false);
              if (!r.ok) Alert.alert(t('guvenlik.bildirim'), r.hata);
              else {
                Alert.alert(
                  t('guvenlik.oncelikliRaporAlindi'),
                  RaporAlindiMesajCocuk(),
                );
                setCocukDetay('');
                await load();
              }
            })();
          },
        },
      ]);
    });
  };

  const genelRapor = (sebepId: string) => {
    islemiDene('oy_kullan', async () => {
      const etiket = BildirmeSebebiEtiketi(sebepId);
      const r = await KullaniciBildir({
        reason: etiket,
        reasonCode: sebepId,
        contentType: 'other',
        details: t('guvenlik.genelMerkezDetay'),
      });
      if (!r.ok) Alert.alert(t('guvenlik.bildirim'), r.hata);
      else {
        Alert.alert(
          sebepId === 'child_safety'
            ? t('guvenlik.oncelikliRaporAlindi')
            : t('guvenlik.raporAlindi'),
          sebepId === 'child_safety'
            ? RaporAlindiMesajCocuk()
            : RaporAlindiMesaj(),
        );
        await load();
      }
    });
  };

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="guvenlik">
        <EkranBasligi
          title={t('guvenlik.baslik')}
          subtitle={t('guvenlik.altBaslik')}
          fallbackHref={adminMi ? '/admin' : undefined}
        />
        <KlavyeScrollView
          contentContainerStyle={AdminStil.content}
          refreshControl={
            <RefreshControl refreshing={yukleniyor} onRefresh={() => void load()} />
          }
        >
          <View style={AdminStil.kpiGrid}>
            <View style={AdminStil.kpi}>
              <Text style={AdminStil.kpiN}>{riskOzet.toplam}</Text>
              <Text style={AdminStil.kpiL}>{t('guvenlik.kayitliOlay')}</Text>
            </View>
            <View style={AdminStil.kpi}>
              <Text style={[AdminStil.kpiN, { color: RenkTokenlari.danger }]}>
                {riskOzet.yuksek}
              </Text>
              <Text style={AdminStil.kpiL}>{t('guvenlik.yuksekRisk')}</Text>
            </View>
          </View>

          <BiyometriGuvenlikKarti />

          <Text style={AdminStil.sectionLabel}>{t('guvenlik.acilCocuk')}</Text>
          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartAlt}>{t('guvenlik.acilCocukAlt')}</Text>
            <TextField
              label={t('guvenlik.neGordun')}
              placeholder={t('guvenlik.neGordunPlaceholder')}
              value={cocukDetay}
              onChangeText={setCocukDetay}
            />
            <Pressable
              style={[styles.dangerBtn, cocukBusy && { opacity: 0.5 }]}
              onPress={hizliCocukRaporu}
              disabled={cocukBusy}
            >
              <Ionicons name="warning" size={18} color="#fff" />
              <Text style={styles.dangerBtnText}>
                {cocukBusy ? t('guvenlik.gonderiliyor') : t('guvenlik.cocukBildir')}
              </Text>
            </Pressable>
          </View>

          <Text style={AdminStil.sectionLabel}>{t('guvenlik.hizliBildir')}</Text>
          <View style={styles.quickGrid}>
            {(
              [
                { id: 'harassment', label: t('guvenlik.taciz'), icon: 'hand-left-outline' as const },
                { id: 'sexual', label: t('guvenlik.cinsel'), icon: 'eye-off-outline' as const },
                { id: 'violence', label: t('guvenlik.siddet'), icon: 'flash-outline' as const },
                { id: 'spam', label: t('guvenlik.spam'), icon: 'mail-unread-outline' as const },
              ] as const
            ).map((s) => (
              <Pressable key={s.id} style={styles.quickCard} onPress={() => genelRapor(s.id)}>
                <Ionicons name={s.icon} size={18} color={RenkTokenlari.primarySoft} />
                <Text style={styles.quickLabel}>{s.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={AdminStil.sectionLabel}>{t('guvenlik.guvenlikDestek')}</Text>
          <View style={AdminStil.kart}>
            <LinkSatir
              icon="flag-outline"
              label={t('guvenlik.sorunBildir')}
              hint={t('guvenlik.sorunHint')}
              onPress={() => router.push('/bildir' as any)}
            />
            <LinkSatir
              icon="documents-outline"
              label={t('guvenlik.raporlarim')}
              hint={t('guvenlik.raporHint')}
              onPress={() => router.push('/raporlarim' as any)}
            />
            <LinkSatir
              icon="people-outline"
              label={t('ayarlar.toplulukKurallari')}
              hint={t('guvenlik.ugcHint')}
              onPress={() => router.push('/politika/community_rules' as any)}
            />
            <LinkSatir
              icon="document-text-outline"
              label={t('guvenlik.kullanimSartlari')}
              onPress={() => router.push('/politika/tos' as any)}
            />
            <LinkSatir
              icon="lock-closed-outline"
              label={t('guvenlik.gizlilikPolitikasi')}
              onPress={() => router.push('/politika/privacy' as any)}
            />
            <LinkSatir
              icon="shield-checkmark-outline"
              label={t('guvenlik.cocukPolitikasi')}
              onPress={() => router.push('/politika/child_safety' as any)}
            />
            <LinkSatir
              icon="ban-outline"
              label={t('ayarlar.engellenenHesaplar')}
              hint={t('guvenlik.engelliHint')}
              onPress={() => router.push('/engellenen-kullanicilar' as any)}
            />
            <LinkSatir
              icon="mail-outline"
              label={t('ayarlar.bizeUlasin')}
              hint={UygulamaKimligi.SUPPORT_EMAIL}
              onPress={() => {
                void Linking.openURL(
                  `mailto:${UygulamaKimligi.SUPPORT_EMAIL}?subject=${encodeURIComponent(t('guvenlik.destekKonuUygunsuz'))}`,
                ).catch(() =>
                  Alert.alert(
                    t('ayarlar.iletisim'),
                    t('guvenlik.epostaSatir', {
                      email: UygulamaKimligi.SUPPORT_EMAIL,
                    }),
                  ),
                );
              }}
            />
            <LinkSatir
              icon="headset-outline"
              label={t('ayarlar.canliDestek')}
              onPress={() => router.push('/destek' as any)}
            />
            {adminMi ? (
              <LinkSatir
                icon="shield-half-outline"
                label={t('guvenlik.adminKuyruk')}
                onPress={() => router.push('/admin/moderasyon' as any)}
              />
            ) : null}
            <LinkSatir
              icon="trash-outline"
              label={t('hesapSil.baslik')}
              son
              onPress={() => router.push('/hesap-sil' as any)}
            />
          </View>

          <Text style={AdminStil.sectionLabel}>{t('guvenlik.sonOlaylar')}</Text>
          {events.length === 0 ? (
            <BosDurum
              icon="shield-checkmark-outline"
              title={t('guvenlik.olayYok')}
              body={t('guvenlik.olayYokBody')}
            />
          ) : (
            events.map((item) => {
              const sev = severityEtiketi(item.severity);
              return (
                <View key={item.id} style={styles.olayKart}>
                  <View style={styles.olayUst}>
                    <Text style={styles.olayBaslik}>{olayAdi(item.event_type)}</Text>
                    <View style={styles.riskBadge}>
                      <Text style={styles.riskText}>{t('guvenlik.risk')} {item.risk_score}</Text>
                    </View>
                  </View>
                  <View style={styles.olayMetaSatir}>
                    <Text style={[styles.olayMeta, { color: sev.color }]}>{sev.label}</Text>
                    <Text style={styles.olayMeta}>·</Text>
                    <Text style={styles.olayMeta}>{item.status || '—'}</Text>
                    <Text style={styles.olayMeta}>·</Text>
                    <Text style={styles.olayMeta}>{tarihKisa(item.created_at)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </KlavyeScrollView>

        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => void refreshProfile()}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

function LinkSatir({
  icon,
  label,
  hint,
  onPress,
  son,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  son?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.linkSatir, !son && styles.linkBorder]}
    >
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={16} color={RenkTokenlari.text} />
      </View>
      <Text style={styles.linkLabel}>{label}</Text>
      {hint ? <Text style={styles.linkHint}>{hint}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={RenkTokenlari.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.danger,
  },
  dangerBtnText: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BoslukTokenlari.sm,
  },
  quickCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    gap: 8,
  },
  quickLabel: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  linkSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  linkBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
    flex: 1,
  },
  linkHint: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
  olayKart: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 6,
  },
  olayUst: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  olayBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(232,64,145,0.16)',
  },
  riskText: { ...TipografiTokenlari.micro, color: RenkTokenlari.primarySoft, fontWeight: '700' },
  olayMetaSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  olayMeta: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
});
