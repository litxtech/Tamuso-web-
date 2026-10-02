import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, type Href } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../src/i18n/diller';
import { AiMuzikDefterGetir } from '../../src/moduller/ai-muzik/islemler/AiMuzikApi';
import type { AiMuzikLedgerSatir } from '../../src/moduller/ai-muzik/tipler';
import { SureFormat } from '../../src/moduller/ai-muzik/utils/SureFormat';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const LEDGER_KEYS: Record<string, CeviriAnahtari> = {
  WELCOME_GRANT: 'aiMuzik.ledgerWelcome',
  PURCHASE: 'aiMuzik.ledgerPurchase',
  GENERATION_RESERVE: 'aiMuzik.ledgerReserve',
  GENERATION_CAPTURE: 'aiMuzik.ledgerCapture',
  GENERATION_RELEASE: 'aiMuzik.ledgerRelease',
  ADMIN_ADJUST: 'aiMuzik.ledgerAdmin',
};

export default function AiMuzikIslemlerEkrani() {
  const { t, dil } = useCeviri();
  const [satirlar, setSatirlar] = useState<AiMuzikLedgerSatir[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let iptal = false;
      void (async () => {
        setYukleniyor(true);
        try {
          const rows = await AiMuzikDefterGetir(80);
          if (!iptal) setSatirlar(rows);
        } catch {
          if (!iptal) setSatirlar([]);
        } finally {
          if (!iptal) setYukleniyor(false);
        }
      })();
      return () => {
        iptal = true;
      };
    }, []),
  );

  return (
    <Screen>
      <EkranBasligi title={t('aiMuzik.islemler')} fallbackHref={'/ai-muzik' as Href} />
      {yukleniyor ? (
        <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={satirlar}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: BoslukTokenlari.lg, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.bos}>{t('aiMuzik.bosIslem')}</Text>
          }
          renderItem={({ item }) => {
            const delta = Number(item.seconds_delta ?? 0);
            const pozitif = delta >= 0;
            const key = LEDGER_KEYS[item.type];
            return (
              <View style={styles.satir}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.tur}>{key ? t(key) : item.type}</Text>
                  {item.description ? (
                    <Text style={styles.aciklama} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={styles.tarih}>
                    {new Date(item.created_at).toLocaleString(DIL_LOCALE_MAP[dil])}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.delta,
                    pozitif ? styles.deltaArti : styles.deltaEksi,
                  ]}
                >
                  {pozitif ? '+' : ''}
                  {SureFormat(Math.abs(delta))}
                </Text>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  satir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: BoslukTokenlari.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  tur: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  aciklama: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 2,
  },
  tarih: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 4,
  },
  delta: {
    ...TipografiTokenlari.h2,
  },
  deltaArti: {
    color: RenkTokenlari.mint,
  },
  deltaEksi: {
    color: RenkTokenlari.danger,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    marginTop: 48,
  },
});
