/**
 * Admin oyun denetim — odaya girmeden Kozmik Kaskad oynama.
 * Coin şartı yok (yalnızca bu ekran; ses odasında gerçek settle).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { KozmikKaskadEkrani } from '../../src/moduller/oyunlar/kaskad/ekranlar/KozmikKaskadEkrani';
import { GAME_DISPLAY_NAME as KASKAD_NAME } from '../../src/moduller/oyunlar/kaskad/sabitler/KaskadSabitleri';
import { ZeusEkrani } from '../../src/moduller/oyunlar/zeus/ekranlar/ZeusEkrani';
import { GAME_DISPLAY_NAME as ZEUS_NAME } from '../../src/moduller/oyunlar/zeus/config/ZeusSabitleri';
import { SlotOyunEkrani } from '../../src/moduller/oyunlar/slot/ekranlar/SlotOyunEkrani';
import { GAME_DISPLAY_NAME as NOX_NAME } from '../../src/moduller/oyunlar/slot/sabitler/SlotAyarlari';
import { FairSpinEkrani } from '../../src/moduller/oyunlar/fair-spin/ekranlar/FairSpinEkrani';
import { GAME_DISPLAY_NAME as FAIR_SPIN_NAME } from '../../src/moduller/oyunlar/fair-spin/sabitler/FairSpinSabitleri';
import type { RoomGameMeta } from '../../src/moduller/oyunlar/ortak/tipler/OyunTipleri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type AktifOyun = 'idle' | 'kaskad' | 'zeus' | 'nox' | 'fair_spin';

export default function AdminOyunTestEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [aktif, setAktif] = useState<AktifOyun>('idle');

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)');
      }
    }, [admin]),
  );

  const roomMeta = useMemo<RoomGameMeta>(
    () => ({
      roomId: 'admin-test',
      roomName: 'Admin denetim',
      participantCount: 1,
      micEnabled: false,
    }),
    [],
  );

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi
        title="Oyun testi"
        subtitle="Odasız · coin şartı yok · denetim"
        fallbackHref={'/admin' as any}
      />

      <View style={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Admin ücretsiz test</Text>
          <Text style={styles.bannerBody}>
            Bu ekran odasız denetimdir — coin düşmez. Ses odasında oynarken
            admin hesabı da gerçek bahis/kazanç ile çalışır; bakiye anlık
            güncellenir.
          </Text>
        </View>

        <View style={[styles.card, styles.cardAlt]}>
          <Text style={styles.eyebrow}>KOZMİK KASKAD</Text>
          <Text style={styles.cardTitle}>{KASKAD_NAME}</Text>
          <Text style={styles.cardBody}>
            Canlı spin API · oda yok → coin düşmez. Ses odasında gerçek settle.
          </Text>
          <Pressable
            style={[styles.cta, styles.ctaAlt]}
            onPress={() => setAktif('kaskad')}
          >
            <Text style={styles.ctaText}>Kaskad aç</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.cardZeus]}>
          <Text style={styles.eyebrowZeus}>OLYMPUS</Text>
          <Text style={styles.cardTitle}>{ZEUS_NAME}</Text>
          <Text style={styles.cardBody}>
            6×5 cascade · sunucu settle. Bu ekranda coin düşmez.
          </Text>
          <Pressable
            style={[styles.cta, styles.ctaZeus]}
            onPress={() => setAktif('zeus')}
          >
            <Text style={styles.ctaText}>Zeus aç</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.cardNox]}>
          <Text style={styles.eyebrowNox}>NIGHT SLOT</Text>
          <Text style={styles.cardTitle}>{NOX_NAME}</Text>
          <Text style={styles.cardBody}>
            5×3 payline · wild/scatter · sunucu settle. Bu ekranda coin düşmez.
          </Text>
          <Pressable
            style={[styles.cta, styles.ctaNox]}
            onPress={() => setAktif('nox')}
          >
            <Text style={styles.ctaText}>NOX aç</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.cardFair]}>
          <Text style={styles.eyebrowFair}>FAIR WHEEL</Text>
          <Text style={styles.cardTitle}>{FAIR_SPIN_NAME}</Text>
          <Text style={styles.cardBody}>
            8 dilimli çark · sunucu RNG. Bu ekranda coin düşmez (admin test).
          </Text>
          <Pressable
            style={[styles.cta, styles.ctaFair]}
            onPress={() => setAktif('fair_spin')}
          >
            <Text style={styles.ctaText}>Fair Spin aç</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/admin/oyunlar' as any)}
          style={styles.link}
        >
          <Text style={styles.linkText}>Oyun kontrol paneline git →</Text>
        </Pressable>
      </View>

      <Modal
        visible={aktif === 'kaskad'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAktif('idle')}
      >
        {aktif === 'kaskad' ? (
          <KozmikKaskadEkrani
            roomId={null}
            voiceActive={false}
            adminTestMode
            onClose={() => setAktif('idle')}
          />
        ) : null}
      </Modal>

      <Modal
        visible={aktif === 'zeus'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAktif('idle')}
      >
        {aktif === 'zeus' ? (
          <ZeusEkrani
            roomId={null}
            voiceActive={false}
            adminTestMode
            onClose={() => setAktif('idle')}
          />
        ) : null}
      </Modal>

      <Modal
        visible={aktif === 'nox'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAktif('idle')}
      >
        {aktif === 'nox' ? (
          <SlotOyunEkrani
            roomId={null}
            voiceActive={false}
            adminTest
            onClose={() => setAktif('idle')}
          />
        ) : null}
      </Modal>

      <Modal
        visible={aktif === 'fair_spin'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAktif('idle')}
      >
        {aktif === 'fair_spin' ? (
          <FairSpinEkrani
            roomId={null}
            adminTestMode
            onClose={() => setAktif('idle')}
          />
        ) : null}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: BoslukTokenlari.md,
    gap: BoslukTokenlari.md,
    paddingBottom: 48,
  },
  banner: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
    padding: BoslukTokenlari.md,
    gap: 6,
  },
  bannerTitle: {
    color: RenkTokenlari.violet,
    fontWeight: '800',
    fontSize: TipografiTokenlari.caption.fontSize,
  },
  bannerBody: {
    color: RenkTokenlari.textMuted,
    fontSize: TipografiTokenlari.caption.fontSize,
    lineHeight: 18,
  },
  card: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 4,
  },
  cardAlt: {
    borderColor: 'rgba(167,139,250,0.35)',
  },
  cardZeus: {
    borderColor: 'rgba(232,197,71,0.45)',
  },
  cardNox: {
    borderColor: 'rgba(124,58,237,0.5)',
  },
  cardFair: {
    borderColor: 'rgba(230,206,146,0.55)',
  },
  eyebrow: {
    color: RenkTokenlari.primarySoft,
    fontSize: TipografiTokenlari.micro.fontSize,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  eyebrowZeus: {
    color: '#E8C547',
    fontSize: TipografiTokenlari.micro.fontSize,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  eyebrowNox: {
    color: '#B794F6',
    fontSize: TipografiTokenlari.micro.fontSize,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  eyebrowFair: {
    color: '#E6CE92',
    fontSize: TipografiTokenlari.micro.fontSize,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: RenkTokenlari.text,
    fontSize: TipografiTokenlari.h2.fontSize,
    fontWeight: '800',
  },
  cardBody: {
    color: RenkTokenlari.textMuted,
    marginTop: 4,
    fontSize: TipografiTokenlari.body.fontSize,
  },
  cta: {
    marginTop: 16,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaAlt: { backgroundColor: RenkTokenlari.violet },
  ctaZeus: { backgroundColor: '#C9A24A' },
  ctaNox: { backgroundColor: '#7C3AED' },
  ctaFair: { backgroundColor: '#C9A24A' },
  ctaText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  link: { paddingVertical: 8, alignItems: 'center' },
  linkText: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
