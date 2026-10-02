import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { MesajlariGetir, type DirektMesaj } from '../../mesajlasma/okuma/MesajlariGetir';
import { MesajGonder } from '../../mesajlasma/islemler/MesajGonder';
import { useMesajKanali } from '../../mesajlasma/gercek-zamanli/useMesajKanali';
import { CeviriMetinKarti } from '../../ai-ceviri/bilesenler/CeviriMetinKarti';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  threadId: string;
  visible: boolean;
  onClose: () => void;
};

/**
 * Görüşme sırasında DM thread üzerinden sohbet + otomatik çeviri kartı.
 */
export function GorusmeCeviriSohbetPaneli({
  threadId,
  visible,
  onClose,
}: Props) {
  const { t } = useCeviri();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [mesajlar, setMesajlar] = useState<DirektMesaj[]>([]);
  const [metin, setMetin] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderiyor, setGonderiyor] = useState(false);
  const ceviriAcik = OzellikBayragiAktifMi('live_chat_translation_enabled');

  useEffect(() => {
    if (!visible || !threadId) return;
    let iptal = false;
    setYukleniyor(true);
    void MesajlariGetir({ threadId, limit: 20 })
      .then((rows) => {
        if (iptal) return;
        setMesajlar(rows.filter((m) => m.message_type === 'text' && m.body));
        setYukleniyor(false);
      })
      .catch(() => {
        if (iptal) return;
        setMesajlar([]);
        setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [visible, threadId]);

  useMesajKanali(
    visible ? threadId : undefined,
    useCallback((msg, event) => {
      if (event === 'DELETE') {
        setMesajlar((prev) => prev.filter((m) => m.id !== msg.id));
        return;
      }
      if (msg.message_type !== 'text' || !msg.body) return;
      setMesajlar((prev) => {
        if (prev.some((m) => m.id === msg.id)) {
          return prev.map((m) => (m.id === msg.id ? msg : m));
        }
        return [...prev, msg].slice(-80);
      });
    }, []),
  );

  const gonder = async () => {
    const body = metin.trim();
    if (!body || gonderiyor) return;
    setGonderiyor(true);
    const r = await MesajGonder({ threadId, body });
    setGonderiyor(false);
    if (r.ok) {
      setMetin('');
      setMesajlar((prev) =>
        prev.some((m) => m.id === r.mesaj.id) ? prev : [...prev, r.mesaj],
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.baslikSatir}>
            <Text style={styles.baslik}>{t('aiCeviri.gorusmeSohbet')}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Ionicons name="close" size={22} color={RenkTokenlari.text} />
            </Pressable>
          </View>
          {ceviriAcik ? (
            <Text style={styles.hint}>{t('aiCeviri.gorusmeHint')}</Text>
          ) : null}

          {yukleniyor ? (
            <ActivityIndicator
              color={RenkTokenlari.primarySoft}
              style={{ marginVertical: 24 }}
            />
          ) : (
            <FlatList
              data={mesajlar}
              keyExtractor={(m) => m.id}
              style={styles.liste}
              contentContainerStyle={styles.listeIcerik}
              renderItem={({ item }) => {
                const mine = item.sender_id === user?.id;
                return (
                  <View
                    style={[
                      styles.satir,
                      mine ? styles.satirMine : styles.satirTheirs,
                    ]}
                  >
                    <CeviriMetinKarti
                      text={item.body ?? ''}
                      context="call"
                      varyant="call"
                      enabled={ceviriAcik && !mine}
                    />
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.bos}>{t('aiCeviri.gorusmeBos')}</Text>
              }
            />
          )}

          <View style={styles.composer}>
            <TextInput
              value={metin}
              onChangeText={setMetin}
              placeholder={t('aiCeviri.gorusmePlaceholder')}
              placeholderTextColor={RenkTokenlari.textDim}
              style={styles.input}
              maxLength={500}
              multiline
            />
            <Pressable
              onPress={() => void gonder()}
              disabled={gonderiyor || !metin.trim()}
              style={[
                styles.send,
                (!metin.trim() || gonderiyor) && styles.sendDisabled,
              ]}
              accessibilityLabel={t('ortak.gonder')}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: RenkTokenlari.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: 4,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  hint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  liste: {
    flexGrow: 0,
    maxHeight: 320,
  },
  listeIcerik: {
    gap: 8,
    paddingVertical: 8,
  },
  satir: {
    maxWidth: '88%',
  },
  satirMine: {
    alignSelf: 'flex-end',
  },
  satirTheirs: {
    alignSelf: 'flex-start',
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    paddingVertical: 28,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: RenkTokenlari.surface,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primary,
  },
  sendDisabled: {
    opacity: 0.45,
  },
});
