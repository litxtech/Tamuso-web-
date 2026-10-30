import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi, guvenliGeriDon } from '../../../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { CanliKameraOnizleme } from '../../../../src/moduller/canli-yayin/bilesenler/CanliKameraOnizleme';
import {
  AjansGorusmeDetayGetir,
  AjansGorusmeIptal,
  AjansGorusmeKatil,
  AjansGorusmeKatilimcilariGetir,
  AjansGorusmeSonucKaydet,
  AjansGorusmeYenidenPlanla,
} from '../../../../src/moduller/ajans-gorusme/islemler/AjansGorusmeIslemleri';
import { ToplantiBaslangicIso } from '../../../../src/moduller/ajans-gorusme/kurallar/AjansGorusmeKurallari';
import type {
  AjansGorusmeDetay,
  AjansGorusmeKatilimci,
} from '../../../../src/moduller/ajans-gorusme/tipler';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { useCeviri } from '../../../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

function tipAnahtar(tip: string): CeviriAnahtari {
  switch (tip) {
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
    case 'custom':
      return 'ajans.gorusmeTipDiger';
    default:
      return 'ajans.gorusmeTipOzel';
  }
}

function rolAnahtar(rol: string): CeviriAnahtari {
  switch (rol) {
    case 'host':
      return 'ajans.gorusmeRolHost';
    case 'co_host':
      return 'ajans.gorusmeRolCoHost';
    case 'speaker':
      return 'ajans.gorusmeRolKonusmaci';
    case 'platform':
      return 'ajans.gorusmeRolPlatform';
    default:
      return 'ajans.gorusmeRolDinleyici';
  }
}

export default function AjansGorusmeDetayEkrani() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string; davet?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const davet = Array.isArray(params.davet) ? params.davet[0] : params.davet;
  const [detay, setDetay] = useState<AjansGorusmeDetay | null>(null);
  const [kisiler, setKisiler] = useState<AjansGorusmeKatilimci[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [prejoin, setPrejoin] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');

  const yukle = useCallback(async () => {
    if (!id) return;
    if (!user) {
      router.replace('/(auth)/login' as any);
      return;
    }
    setYukleniyor(true);
    setHata(null);
    try {
      const d = await AjansGorusmeDetayGetir(id);
      setDetay(d);
      setCam(d.media_type !== 'audio');
      setKisiler(await AjansGorusmeKatilimcilariGetir(id));
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.gorusmeErisim'));
    } finally {
      setYukleniyor(false);
    }
  }, [id, t, user]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const katil = async () => {
    if (!id) return;
    setHata(null);
    try {
      const d = await AjansGorusmeKatil(id, davet);
      setDetay(d);
      if (d.status === 'ended' || d.status === 'cancelled') {
        setHata(t('ajans.gorusmeBittiMesaj'));
        return;
      }
      router.push({
        pathname: '/ajans/gorusme/[id]/oda',
        params: { id, mic: mic ? '1' : '0', cam: cam && d.media_type !== 'audio' ? '1' : '0' },
      } as any);
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.gorusmeErisim'));
    }
  };

  const bitti = detay?.status === 'ended' || detay?.status === 'cancelled';

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ajans-gorusme" varyant="ekran" fallbackHref="/ajans/gorusmelerim">
        <EkranBasligi
          title={detay?.agency_name || t('ajans.gorusmeDetay')}
          subtitle={detay ? t(tipAnahtar(detay.room_type)) : undefined}
          border
          onBack={() => guvenliGeriDon('/ajans/gorusmelerim' as any)}
        />
        {yukleniyor ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 32 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.icerik}>
            {hata ? <Text style={styles.hata}>{hata}</Text> : null}
            {!detay ? (
              <Text style={styles.hata}>{t('ajans.gorusmeHataYok')}</Text>
            ) : (
              <>
                {detay.agency_verified ? (
                  <Text style={styles.rozet}>{t('ajans.gorusmeDogrulanmis')}</Text>
                ) : null}
                <Text style={styles.baslik}>{detay.title}</Text>
                {detay.description ? <Text style={styles.govde}>{detay.description}</Text> : null}
                <Text style={styles.meta}>
                  {detay.scheduled_at
                    ? new Date(detay.scheduled_at).toLocaleString()
                    : t('ajans.gorusmeHemen')}
                  {' · '}
                  {detay.duration_minutes} dk · {detay.participant_count} {t('ajans.gorusmeKisi')}
                </Text>
                {detay.status === 'live' ? (
                  <Text style={styles.canli}>{t('ajans.gorusmeAktifSimdi')}</Text>
                ) : null}
                {detay.locked ? <Text style={styles.hata}>{t('ajans.gorusmeKilitli')}</Text> : null}
                {bitti ? <Text style={styles.govde}>{t('ajans.gorusmeBittiMesaj')}</Text> : null}

                <Text style={styles.alt}>{t('ajans.gorusmeKatilimci')}</Text>
                {kisiler.map((k) => (
                  <Text key={k.user_id} style={styles.kisi} accessibilityLabel={k.display_name || k.username || ''}>
                    {k.is_platform_official ? '● ' : '○ '}
                    {k.display_name || k.username || k.user_id.slice(0, 8)} · {t(rolAnahtar(k.role))}
                    {k.hand_raised ? ' · ✋' : ''}
                  </Text>
                ))}

                {prejoin && !bitti ? (
                  <View style={styles.prejoin}>
                    <Text style={styles.alt}>{t('ajans.gorusmePrejoin')}</Text>
                    {cam && detay.media_type !== 'audio' ? (
                      <View style={styles.kamera}>
                        <CanliKameraOnizleme aktif />
                      </View>
                    ) : (
                      <Text style={styles.govde}>{user?.email || t('ajans.gorusmeSesliKatil')}</Text>
                    )}
                    <View style={styles.satir}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('ajans.gorusmeMic')}
                        style={styles.mini}
                        onPress={() => setMic((v) => !v)}
                      >
                        <Text style={styles.miniYazi}>{mic ? t('ajans.gorusmeMic') : t('ajans.gorusmeSessiz')}</Text>
                      </Pressable>
                      {detay.media_type !== 'audio' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('ajans.gorusmeCam')}
                          style={styles.mini}
                          onPress={() => setCam((v) => !v)}
                        >
                          <Text style={styles.miniYazi}>{cam ? t('ajans.gorusmeCam') : t('ajans.gorusmeCamKapat')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={t('ajans.gorusmeKatil')} style={styles.cta} onPress={() => void katil()}>
                      <Text style={styles.ctaYazi}>{t('ajans.gorusmeKatil')}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {!prejoin && !bitti ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('ajans.gorusmeKatil')}
                    style={styles.cta}
                    onPress={() => setPrejoin(true)}
                  >
                    <Text style={styles.ctaYazi}>{t('ajans.gorusmeKatil')}</Text>
                  </Pressable>
                ) : null}

                {detay.can_manage && detay.invite_token ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('ajans.gorusmeKopyala')}
                    onPress={() =>
                      void Clipboard.setStringAsync(
                        `/ajans/gorusme/${detay.id}?davet=${detay.invite_token}`,
                      )
                    }
                  >
                    <Text style={styles.link}>{t('ajans.gorusmeDavetLink')}</Text>
                  </Pressable>
                ) : null}

                {detay.can_manage && !bitti ? (
                  <View style={styles.satir}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('ajans.gorusmeIptal')}
                      onPress={() => void AjansGorusmeIptal(detay.id).then(setDetay).catch((e) => setHata(String(e.message ?? e)))}
                    >
                      <Text style={styles.link}>{t('ajans.gorusmeIptal')}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {detay.can_manage && detay.status === 'scheduled' ? (
                  <View>
                    <Text style={styles.alt}>{t('ajans.gorusmeYenidenPlan')}</Text>
                    <TextInput
                      value={tarih}
                      onChangeText={setTarih}
                      placeholder={t('ajans.gorusmeTarih')}
                      placeholderTextColor={RenkTokenlari.textDim}
                      accessibilityLabel={t('ajans.gorusmeTarih')}
                      autoCapitalize="none"
                      style={styles.girdi}
                    />
                    <TextInput
                      value={saat}
                      onChangeText={setSaat}
                      placeholder={t('ajans.gorusmeSaat')}
                      placeholderTextColor={RenkTokenlari.textDim}
                      accessibilityLabel={t('ajans.gorusmeSaat')}
                      autoCapitalize="none"
                      style={styles.girdi}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('ajans.gorusmeYenidenPlan')}
                      onPress={() => {
                        const iso = ToplantiBaslangicIso(tarih, saat);
                        if (!iso) {
                          setHata(t('ajans.gorusmeTarih'));
                          return;
                        }
                        void AjansGorusmeYenidenPlanla(detay.id, iso)
                          .then(setDetay)
                          .catch((e) => setHata(e instanceof Error ? e.message : t('ajans.gorusmeVideoHata')));
                      }}
                    >
                      <Text style={styles.link}>{t('ajans.gorusmeYenidenPlan')}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {detay.room_type === 'creator_interview' && detay.can_manage && bitti ? (
                  <View style={styles.satir}>
                    {([
                      ['evaluating', 'ajans.gorusmeDegerlendir'],
                      ['accepted', 'ajans.gorusmeKabulSonuc'],
                      ['rejected', 'ajans.gorusmeRedSonuc'],
                      ['follow_up', 'ajans.gorusmeTekrar'],
                    ] as const).map(([kod, anahtar]) => (
                      <Pressable
                        key={kod}
                        accessibilityRole="button"
                        accessibilityLabel={t(anahtar)}
                        onPress={() => void AjansGorusmeSonucKaydet(detay.id, kod).then(setDetay)}
                      >
                        <Text style={styles.link}>{t(anahtar)}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: BoslukTokenlari.lg, gap: 8, paddingBottom: 48 },
  baslik: { ...TipografiTokenlari.title, color: RenkTokenlari.text },
  govde: { ...TipografiTokenlari.body, color: RenkTokenlari.textDim },
  meta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  alt: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, fontWeight: '700', marginTop: 12 },
  kisi: { color: RenkTokenlari.text, paddingVertical: 4 },
  rozet: { color: RenkTokenlari.primarySoft, fontWeight: '700' },
  canli: { color: RenkTokenlari.success, fontWeight: '700' },
  hata: { color: RenkTokenlari.danger },
  cta: {
    marginTop: 16,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaYazi: { color: RenkTokenlari.text, fontWeight: '800' },
  link: { color: RenkTokenlari.primarySoft, fontWeight: '700', paddingVertical: 8 },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  prejoin: { gap: 8, marginTop: 8 },
  kamera: { height: 220, borderRadius: 16, overflow: 'hidden' },
  mini: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  miniYazi: { color: RenkTokenlari.text },
  girdi: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 12,
    color: RenkTokenlari.text,
    padding: 12,
    marginTop: 8,
  },
});
