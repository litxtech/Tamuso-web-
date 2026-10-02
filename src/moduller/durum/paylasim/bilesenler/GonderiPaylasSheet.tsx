import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../contexts/AuthContext';
import { MesajKonulariniGetir } from '../../../mesajlasma/okuma/MesajKonulariniGetir';
import { KullanicilariAra } from '../../../mesajlasma/okuma/KullanicilariAra';
import { TakipServisi } from '../../../takip/islemler/TakipServisi';
import { RenkTokenlari } from '../../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { GonderiPaylasServisi } from '../GonderiPaylasServisi';
import { GonderiPaylasKullaniciListesi } from './GonderiPaylasKullaniciListesi';
import type { GonderiPaylasAlici } from '../tipler';
import { useCeviri } from '../../../../i18n/useCeviri';
import { MesajComposerLinkOnizleme } from '../../../mesajlasma/bilesenler/MesajComposerLinkOnizleme';

type Props = {
  visible: boolean;
  statusId: string;
  onClose: () => void;
  onBasarili?: (sentCount: number) => void;
};

export function GonderiPaylasSheet({
  visible,
  statusId,
  onClose,
  onBasarili,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [sorgu, setSorgu] = useState('');
  const [note, setNote] = useState('');
  const [sonKonusmalar, setSonKonusmalar] = useState<GonderiPaylasAlici[]>([]);
  const [takipEdilenler, setTakipEdilenler] = useState<GonderiPaylasAlici[]>([]);
  const [arama, setArama] = useState<GonderiPaylasAlici[]>([]);
  const [secilen, setSecilen] = useState<Set<string>>(() => new Set());
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderiyor, setGonderiyor] = useState(false);
  const istekNo = useRef(0);
  const gonderLock = useRef(false);

  const sifirla = useCallback(() => {
    setSorgu('');
    setNote('');
    setSecilen(new Set());
    setArama([]);
    gonderLock.current = false;
    setGonderiyor(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      sifirla();
      return;
    }

    let iptal = false;
    setYukleniyor(true);
    void (async () => {
      try {
        const [konular, takip] = await Promise.all([
          MesajKonulariniGetir(false),
          user?.id
            ? TakipServisi.takipEdilenler({ userId: user.id, limit: 40 })
            : Promise.resolve({ items: [] as { user_id: string; display_name: string; username: string | null; avatar_url: string | null }[] }),
        ]);
        if (iptal) return;

        const konusmaList: GonderiPaylasAlici[] = [];
        for (const k of konular) {
          if (k.thread_kind && k.thread_kind !== 'dm') continue;
          if (!k.peer_id) continue;
          konusmaList.push({
            id: k.peer_id,
            display_name: k.peer_display_name || k.peer_username || t('ortak.kullanici'),
            username: k.peer_username ?? null,
            avatar_url: k.peer_avatar_url ?? null,
            thread_id: k.id,
          });
        }
        setSonKonusmalar(konusmaList);

        const takipList: GonderiPaylasAlici[] = (takip.items ?? []).map((t) => ({
          id: t.user_id,
          display_name: t.display_name,
          username: t.username,
          avatar_url: t.avatar_url,
        }));
        setTakipEdilenler(takipList);
      } catch {
        if (!iptal) {
          setSonKonusmalar([]);
          setTakipEdilenler([]);
        }
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();

    return () => {
      iptal = true;
    };
  }, [visible, user?.id, sifirla]);

  useEffect(() => {
    if (!visible) return;
    const q = sorgu.trim();
    if (q.length < 1) {
      setArama([]);
      return;
    }
    const no = ++istekNo.current;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const liste = await KullanicilariAra({
            sorgu: q,
            haricUserId: user?.id,
            limit: 30,
          });
          if (istekNo.current !== no) return;
          setArama(
            liste.map((k) => ({
              id: k.id,
              display_name: k.display_name || k.username || t('ortak.kullanici'),
              username: k.username,
              avatar_url: k.avatar_url,
            })),
          );
        } catch {
          if (istekNo.current === no) setArama([]);
        }
      })();
    }, 180);
    return () => clearTimeout(timer);
  }, [sorgu, visible, user?.id]);

  const aramaAktif = sorgu.trim().length > 0;

  const birlesikListe = useMemo(() => {
    if (aramaAktif) return arama;
    const seen = new Set<string>();
    const out: GonderiPaylasAlici[] = [];
    for (const x of [...sonKonusmalar, ...takipEdilenler]) {
      if (seen.has(x.id) || x.id === user?.id) continue;
      seen.add(x.id);
      out.push(x);
    }
    return out;
  }, [aramaAktif, arama, sonKonusmalar, takipEdilenler, user?.id]);

  const toggle = (id: string) => {
    setSecilen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const gonder = async () => {
    if (gonderLock.current || gonderiyor) return;
    const ids = Array.from(secilen);
    if (ids.length === 0) return;

    gonderLock.current = true;
    setGonderiyor(true);
    try {
      const r = await GonderiPaylasServisi({
        statusId,
        recipientIds: ids,
        note: note.trim() || null,
      });
      if (!r.ok) {
        Alert.alert(t('ortak.paylas'), r.hata ?? t('durumX.gonderilemedi'));
        return;
      }
      const n = r.sent_count;
      onBasarili?.(n);
      onClose();
      Alert.alert(
        t('ortak.basarili'),
        n > 1 ? t('durumX.gonderildiN', { n }) : t('ortak.basarili'),
      );
    } finally {
      gonderLock.current = false;
      setGonderiyor(false);
    }
  };

  const secimSayisi = secilen.size;
  const cta =
    secimSayisi === 0
      ? t('ortak.gonder')
      : secimSayisi === 1
        ? t('durumX.birKisiyeGonder')
        : t('durumX.nKisiyeGonder', { n: secimSayisi });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.baslik}>{t('durumX.gonderiyiPaylas')}</Text>

          <View style={styles.aramaKutu}>
            <Ionicons
              name="search"
              size={18}
              color={RenkTokenlari.primarySoft}
            />
            <TextInput
              value={sorgu}
              onChangeText={setSorgu}
              placeholder={t('ortak.ara')}
              placeholderTextColor={RenkTokenlari.textDim}
              style={styles.aramaInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              maxLength={40}
              editable={!gonderiyor}
            />
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('durumX.mesajEkle')}
            placeholderTextColor={RenkTokenlari.textDim}
            style={styles.noteInput}
            maxLength={500}
            editable={!gonderiyor}
          />
          <MesajComposerLinkOnizleme metin={note} />

          <Text style={styles.bolum}>
            {aramaAktif ? t('durumX.sonuclar') : t('durumX.sonKonusmalar')}
          </Text>

          <View style={styles.listeAlan}>
            {yukleniyor ? (
              <ActivityIndicator color={RenkTokenlari.primary} style={{ marginTop: 24 }} />
            ) : (
              <GonderiPaylasKullaniciListesi
                items={birlesikListe}
                secilen={secilen}
                onToggle={toggle}
                bosMetin={
                  aramaAktif
                    ? t('durumX.kullaniciBulunamadi')
                    : t('durumX.konusmaTakipYok')
                }
              />
            )}
          </View>

          <Pressable
            style={[
              styles.cta,
              (secimSayisi === 0 || gonderiyor) && styles.ctaDisabled,
            ]}
            onPress={() => void gonder()}
            disabled={secimSayisi === 0 || gonderiyor}
            accessibilityRole="button"
            accessibilityLabel={cta}
          >
            {gonderiyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaYazi}>{cta}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 10,
    maxHeight: '88%',
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: 4,
  },
  baslik: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    fontSize: 18,
  },
  aramaKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  aramaInput: {
    flex: 1,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    paddingVertical: 4,
  },
  noteInput: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  bolum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    marginTop: 2,
  },
  listeAlan: {
    minHeight: 180,
    maxHeight: 320,
  },
  cta: {
    marginTop: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
});
