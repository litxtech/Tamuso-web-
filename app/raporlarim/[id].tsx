import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import {
  RaporDurumEtiketiKullanici,
  RaporumuGetir,
  type KullaniciRaporOzeti,
} from '../../src/moduller/moderasyon/okuma/RaporlarimiGetir';
import { RaporDurumKartNotuAcik } from '../../src/moduller/moderasyon/islemler/ModerasyonIslemleri';
import { ProfilAvatarKucuk } from '../../src/moduller/canli-sohbet/bilesenler/ProfilAvatarKucuk';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const LOCALE_MAP: Record<string, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  ar: 'ar',
  fr: 'fr-FR',
  fil: 'fil-PH',
};

export default function RaporDetayEkrani() {
  const { t, dil } = useCeviri();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rapor, setRapor] = useState<KullaniciRaporOzeti | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      setRapor(await RaporumuGetir(id));
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('raporlarim.yuklenemedi'));
      setRapor(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const locale = LOCALE_MAP[dil] ?? dil;
  const ad =
    rapor?.target?.display_name?.trim() ||
    (rapor?.target?.username ? `@${rapor.target.username}` : t('ortak.kullanici'));

  const ekipNotu = (() => {
    if (!rapor) return '';
    if (rapor.reporter_note?.trim()) return rapor.reporter_note.trim();
    if (rapor.status === 'open') return RaporDurumKartNotuAcik();
    if (rapor.status === 'reviewing') return t('raporlarim.notInceleniyor');
    if (rapor.status === 'resolved') return t('raporlarim.notSonuclandi');
    return t('raporlarim.notKapatildi');
  })();

  return (
    <Screen>
      <ModulHataSiniri modulAdi="rapor-detay">
        <EkranBasligi
          title={t('raporlarim.detayBaslik')}
          subtitle={t('raporlarim.detayAlt')}
          onBack={() => router.back()}
        />
        {yukleniyor && !rapor ? (
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginTop: 40 }}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.govde}
            refreshControl={
              <RefreshControl
                refreshing={yukleniyor}
                onRefresh={() => void load()}
                tintColor={RenkTokenlari.primarySoft}
              />
            }
          >
            {hata ? <Text style={styles.hata}>{hata}</Text> : null}
            {rapor ? (
              <>
                <View style={styles.kart}>
                  <View style={styles.satir}>
                    <ProfilAvatarKucuk
                      avatarUrl={rapor.target?.avatar_url}
                      displayName={rapor.target?.display_name}
                      username={rapor.target?.username}
                      size={48}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.baslik}>{ad}</Text>
                      <Text style={styles.alt}>
                        {new Date(rapor.created_at).toLocaleString(locale)}
                      </Text>
                    </View>
                    <View style={styles.durumChip}>
                      <Text style={styles.durumYazi}>
                        {RaporDurumEtiketiKullanici(rapor.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.etiket}>{t('raporlarim.sebep')}</Text>
                <View style={styles.kart}>
                  <Text style={styles.metin}>{rapor.reason}</Text>
                </View>

                {rapor.details ? (
                  <>
                    <Text style={styles.etiket}>{t('raporlarim.seninAciklama')}</Text>
                    <View style={styles.kart}>
                      <Text style={styles.metin}>{rapor.details}</Text>
                    </View>
                  </>
                ) : null}

                <Text style={styles.etiket}>{t('raporlarim.ekipNotu')}</Text>
                <View style={styles.kart}>
                  <Text style={styles.metin}>{ekipNotu}</Text>
                  {rapor.resolved_at ? (
                    <Text style={styles.alt}>
                      {t('raporlarim.guncelleme', {
                        tarih: new Date(rapor.resolved_at).toLocaleString(locale),
                      })}
                    </Text>
                  ) : null}
                </View>

                {rapor.target?.id ? (
                  <Pressable
                    style={styles.link}
                    onPress={() =>
                      router.push(`/kullanici/${rapor.target!.id}` as any)
                    }
                  >
                    <Text style={styles.linkYazi}>{t('raporlarim.profiliGor')}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  govde: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: 48,
    gap: 8,
  },
  etiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    marginTop: 8,
  },
  kart: {
    padding: 14,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 8,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  metin: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 22,
  },
  durumChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(232,64,145,0.15)',
  },
  durumYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  hata: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
  },
  link: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgCard,
  },
  linkYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
