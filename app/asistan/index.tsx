import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { KlavyeGuvenliAlan } from '../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import {
  AiAsistanSohbet,
  type AsistanKart,
  type AsistanMesaj,
} from '../../src/moduller/ai-asistan/islemler/AiAsistanSohbet';
import { AsistanSonucKartlari } from '../../src/moduller/ai-asistan/bilesenler/AsistanSonucKartlari';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { KillSwitchAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { UygulamaKimligi } from '../../src/yapilandirma/UygulamaKimligi';

type UiMesaj = AsistanMesaj & { id: string; cards?: AsistanKart[] };

export default function AiAsistanEkrani() {
  const { t, dil } = useCeviri();
  const { isGuest, refreshProfile } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const [mesajlar, setMesajlar] = useState<UiMesaj[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: t('aiAsistan.hosgeldin', { app: UygulamaKimligi.APP_NAME }),
    },
  ]);
  const [metin, setMetin] = useState('');
  const [gonderiyor, setGonderiyor] = useState(false);
  const listRef = useRef<FlatList<UiMesaj>>(null);
  const mesajlarRef = useRef(mesajlar);
  mesajlarRef.current = mesajlar;

  const kapali =
    !OzellikBayragiAktifMi('ai_assistant_enabled') ||
    KillSwitchAktifMi('kill_ai_assistant');

  const mesajiGonder = useCallback(
    async (body: string) => {
      const userMsg: UiMesaj = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: body,
      };
      setMesajlar((prev) => [...prev, userMsg]);
      setMetin('');
      setGonderiyor(true);

      const history: AsistanMesaj[] = mesajlarRef.current
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const r = await AiAsistanSohbet({
        message: body,
        language: dil,
        history,
      });

      setGonderiyor(false);
      if (!r.ok) {
        setMesajlar((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: t('aiAsistan.hata'),
          },
        ]);
        return;
      }
      setMesajlar((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: r.reply,
          cards: r.cards,
        },
      ]);
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true }),
      );
    },
    [dil, t],
  );

  const gonder = useCallback(() => {
    const body = metin.trim();
    if (!body || gonderiyor || kapali) return;
    islemiDene('mesaj_gonder', () => {
      void mesajiGonder(body);
    });
  }, [metin, gonderiyor, kapali, islemiDene, mesajiGonder]);

  return (
    <Screen edges={['top', 'bottom']}>
      <ModulHataSiniri modulAdi={t('aiAsistan.baslik')} varyant="ekran">
        <EkranBasligi title={t('aiAsistan.baslik')} fallbackHref="/" />
        <KlavyeGuvenliAlan style={styles.root}>
          {kapali ? (
            <View style={styles.kapali}>
              <Ionicons
                name="sparkles-outline"
                size={36}
                color={RenkTokenlari.textDim}
              />
              <Text style={styles.kapaliYazi}>{t('aiAsistan.kapali')}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.alt}>{t('aiAsistan.alt')}</Text>
              <FlatList
                ref={listRef}
                style={styles.listeFlex}
                data={mesajlar}
                keyExtractor={(m) => m.id}
                contentContainerStyle={styles.liste}
                onContentSizeChange={() =>
                  listRef.current?.scrollToEnd({ animated: true })
                }
                renderItem={({ item }) => {
                  const mine = item.role === 'user';
                  return (
                    <View
                      style={[
                        styles.bubble,
                        mine ? styles.bubbleMine : styles.bubbleBot,
                      ]}
                    >
                      {!mine ? (
                        <Text style={styles.botEtiket}>
                          {t('aiAsistan.botAd')}
                        </Text>
                      ) : null}
                      <Text style={mine ? styles.yaziMine : styles.yaziBot}>
                        {item.content}
                      </Text>
                      {!mine && item.cards?.length ? (
                        <AsistanSonucKartlari kartlar={item.cards} />
                      ) : null}
                    </View>
                  );
                }}
              />
              {gonderiyor ? (
                <ActivityIndicator
                  color={RenkTokenlari.primarySoft}
                  style={{ marginBottom: 8 }}
                />
              ) : null}
              <View style={styles.composer}>
                <TextInput
                  value={metin}
                  onChangeText={setMetin}
                  placeholder={t('aiAsistan.placeholder')}
                  placeholderTextColor={RenkTokenlari.textDim}
                  style={styles.input}
                  maxLength={1200}
                  multiline
                  editable={!gonderiyor}
                  onSubmitEditing={gonder}
                  blurOnSubmit={false}
                />
                <Pressable
                  onPress={gonder}
                  disabled={gonderiyor || !metin.trim()}
                  hitSlop={8}
                  style={[
                    styles.send,
                    (!metin.trim() || gonderiyor) && styles.sendDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('ortak.gonder')}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            </>
          )}
        </KlavyeGuvenliAlan>
        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={refreshProfile}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: BoslukTokenlari.md,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginBottom: BoslukTokenlari.sm,
  },
  listeFlex: {
    flex: 1,
  },
  liste: {
    gap: 10,
    paddingBottom: 12,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: YaricapTokenlari.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: RenkTokenlari.primary,
  },
  bubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: RenkTokenlari.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  botEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
  yaziMine: {
    ...TipografiTokenlari.body,
    color: '#fff',
    lineHeight: 20,
  },
  yaziBot: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    lineHeight: 20,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: BoslukTokenlari.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: RenkTokenlari.surface,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primary,
  },
  sendDisabled: { opacity: 0.45 },
  kapali: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  kapaliYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
  },
});
