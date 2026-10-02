import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, type Href } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { AiMuzikParcaDetay } from '../../../src/moduller/ai-muzik/islemler/AiMuzikApi';
import type { AiMuzikPassport, AiMuzikTrackDetay } from '../../../src/moduller/ai-muzik/tipler';
import { MsSureFormat } from '../../../src/moduller/ai-muzik/utils/SureFormat';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

function Satir({ etiket, deger }: { etiket: string; deger: string | null | undefined }) {
  if (!deger) return null;
  return (
    <View style={styles.satir}>
      <Text style={styles.etiket}>{etiket}</Text>
      <Text style={styles.deger} selectable>
        {deger}
      </Text>
    </View>
  );
}

export default function AiMuzikPasaportEkrani() {
  const { t } = useCeviri();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trackId = String(id ?? '');
  const [detay, setDetay] = useState<AiMuzikTrackDetay | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!trackId) return;
    setYukleniyor(true);
    try {
      setDetay(await AiMuzikParcaDetay(trackId));
    } finally {
      setYukleniyor(false);
    }
  }, [trackId]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const pass: AiMuzikPassport | null = detay?.passport ?? null;

  return (
    <Screen>
      <EkranBasligi
        title={t('aiMuzik.pasaport')}
        fallbackHref={`/ai-muzik/${trackId}` as Href}
      />
      {yukleniyor ? (
        <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 40 }} />
      ) : !pass ? (
        <View style={styles.bosWrap}>
          <Text style={styles.bos}>{t('aiMuzik.pasaportYok')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.uyari}>
            <Text style={styles.uyariBaslik}>{t('aiMuzik.bilgilendirme')}</Text>
            <Text style={styles.uyariMetin}>{t('aiMuzik.pasaportUyari')}</Text>
          </View>

          <Text style={styles.parcaBaslik}>{detay?.track.title}</Text>
          <Text style={styles.kod}>{pass.public_track_code}</Text>

          <Satir etiket={t('aiMuzik.etiketOlusan')} deger={pass.creator_public_handle_snapshot ?? undefined} />
          <Satir
            etiket={t('aiMuzik.etiketOlusturulma')}
            deger={new Date(pass.created_at).toLocaleString()}
          />
          <Satir etiket={t('aiMuzik.etiketSure')} deger={MsSureFormat(pass.duration_ms)} />
          <Satir etiket={t('aiMuzik.etiketAiSaglayici')} deger={pass.ai_provider} />
          <Satir etiket={t('aiMuzik.etiketModel')} deger={pass.ai_model ?? undefined} />
          <Satir etiket={t('aiMuzik.etiketPromptHash')} deger={pass.prompt_hash ?? undefined} />
          <Satir etiket={t('aiMuzik.etiketSozHash')} deger={pass.lyrics_hash ?? undefined} />
          <Satir etiket={t('aiMuzik.etiketMasterSha')} deger={pass.master_audio_sha256 ?? undefined} />
          <Satir etiket={t('aiMuzik.etiketKosullarSurum')} deger={pass.terms_version ?? undefined} />
          <Satir
            etiket={t('aiMuzik.etiketHakBildirimi')}
            deger={pass.rights_declaration_version ?? undefined}
          />
          <Satir etiket={t('aiMuzik.etiketPasaportSurum')} deger={String(pass.version)} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: BoslukTokenlari.lg,
    paddingBottom: 48,
  },
  bosWrap: {
    padding: BoslukTokenlari.xl,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  uyari: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.lg,
  },
  uyariBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: 6,
  },
  uyariMetin: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  parcaBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  kod: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    marginBottom: BoslukTokenlari.lg,
    letterSpacing: 0.5,
  },
  satir: {
    paddingVertical: BoslukTokenlari.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  etiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  deger: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    marginTop: 2,
  },
});
