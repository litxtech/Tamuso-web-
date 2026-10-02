import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { GradientButton } from '../../../src/components/GradientButton';
import { TextField } from '../../../src/components/TextField';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { BosDurum } from '../../../src/components/BosDurum';
import { KlavyeGuvenliAlan } from '../../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { ModulHataSiniri } from '../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { supabase } from '../../../src/lib/supabase';
import {
  SehirAdayBasvurusu,
  SehirOyuKullan,
  SehirSecimGidisatGetir,
  type SehirSecimGidisat,
} from '../../../src/moduller/sehir-secimleri/islemler/SehirSecimIslemleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { MedyaUriGuvenli } from '../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { CeviriAnahtari } from '../../../src/i18n/useCeviri';

function durumEtiketi(
  status: string,
  t: (key: CeviriAnahtari, opts?: Record<string, unknown>) => string,
) {
  const map: Record<string, CeviriAnahtari> = {
    nominating: 'sehir.adaylikAcik',
    voting: 'sehir.oylamaSuruyor',
    tallied: 'sehir.durumSonuclandi',
    cancelled: 'sehir.durumIptal',
    closed: 'sehir.durumKapandi',
  };
  const key = map[status];
  return key ? t(key) : status;
}

function kalanSure(
  endsAt: string,
  t: (key: CeviriAnahtari, opts?: Record<string, unknown>) => string,
): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return t('sehir.sureDoldu');
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 24) return t('sehir.sureGunSa', { g: Math.floor(h / 24), sa: h % 24 });
  if (h > 0) return t('sehir.sureSaDk', { sa: h, dk: m });
  return t('sehir.sureDk', { dk: m });
}

export default function SehirSecimDetayEkrani() {
  const { t } = useCeviri();
  const { id } = useLocalSearchParams<{ id: string }>();
  const electionId = Array.isArray(id) ? id[0] : id;
  const { isGuest, refreshProfile } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);

  const [data, setData] = useState<SehirSecimGidisat | null>(null);
  const [manifesto, setManifesto] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!electionId) return;
    try {
      const g = await SehirSecimGidisatGetir(electionId);
      setData(g);
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.yuklenemedi'));
    }
  }, [electionId, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!electionId) return;
    const ch = supabase
      .channel(`sehir-secim-${electionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'city_candidates',
          filter: `election_id=eq.${electionId}`,
        },
        () => {
          void yukle();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'city_elections',
          filter: `id=eq.${electionId}`,
        },
        () => {
          void yukle();
        },
      )
      .subscribe();
    const poll = setInterval(() => void yukle(), 12_000);
    return () => {
      void supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [electionId, yukle]);

  const status = data?.election.status;
  const canApply = status === 'nominating' || status === 'voting';
  const canVote = status === 'voting';
  const myVote = data?.my_vote_candidate_id;

  const headerMeta = useMemo(() => {
    if (!data) return '';
    void tick;
    const pieces = [durumEtiketi(data.election.status, t)];
    if (data.election.status === 'voting') {
      pieces.push(t('sehir.kalanSure', { sure: kalanSure(data.election.ends_at, t) }));
    }
    pieces.push(t('sehir.oySayisi', { count: data.election.total_votes }));
    return pieces.join(' · ');
  }, [data, tick, t]);

  const adayOl = () => {
    if (!electionId) return;
    islemiDene('oy_kullan', async () => {
      setBusy(true);
      const sonuc = await SehirAdayBasvurusu({
        electionId,
        manifesto: manifesto.trim() || undefined,
      });
      setBusy(false);
      if (!sonuc.ok) {
        Alert.alert(t('sehir.adaylikAlert'), sonuc.hata);
        return;
      }
      Alert.alert(t('sehir.adayOldun'), t('sehir.adayOldunBody'));
      setManifesto('');
      await yukle();
    });
  };

  const oyVer = (candidateId: string) => {
    if (!electionId) return;
    if (myVote) {
      Alert.alert(t('sehir.oyAlert'), t('sehir.zatenOy'));
      return;
    }
    islemiDene('oy_kullan', async () => {
      setBusy(true);
      const sonuc = await SehirOyuKullan({ electionId, candidateId });
      setBusy(false);
      if (!sonuc.ok) {
        Alert.alert(t('sehir.oyAlert'), sonuc.hata);
        return;
      }
      await yukle();
    });
  };

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="sehir-secim-detay">
        <KlavyeGuvenliAlan style={{ flex: 1 }}>
        <EkranBasligi
          title={data?.election.title ?? t('sehir.secim')}
          subtitle={
            data
              ? `${data.city?.name ?? ''} · ${headerMeta}`
              : t('ortak.yukleniyor')
          }
          onBack={() => router.back()}
        />

        {hata ? (
          <BosDurum icon="alert-circle-outline" title={t('sehir.secimYok')} body={hata} />
        ) : null}

        {data?.winner ? (
          <View style={styles.winner}>
            <Ionicons name="trophy" size={22} color={RenkTokenlari.accent} />
            <View style={styles.winnerCopy}>
              <Text style={styles.winnerLabel}>{t('sehir.secilenLider')}</Text>
              <Text style={styles.winnerName}>{data.winner.display_name}</Text>
            </View>
            {MedyaUriGuvenli(data.winner.avatar_url) ? (
              <Image
                source={{ uri: MedyaUriGuvenli(data.winner.avatar_url)! }}
                style={styles.winnerAvatar}
              />
            ) : null}
          </View>
        ) : null}

        {canApply ? (
          <View style={styles.apply}>
            <TextField
              label={t('sehir.adaylikBildirisi')}
              value={manifesto}
              onChangeText={setManifesto}
              placeholder={t('sehir.vaatPlaceholder')}
            />
            <GradientButton title={t('sehir.adayOl')} onPress={adayOl} loading={busy} />
          </View>
        ) : null}

        <FlatList
          data={data?.candidates ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.section}>
              {t('sehir.canliGidisat')}
              {canVote && !myVote ? t('sehir.oyunuKullanSuffix') : ''}
              {myVote ? t('sehir.oyunKaydedildiSuffix') : ''}
            </Text>
          }
          ListEmptyComponent={
            <BosDurum
              icon="people-outline"
              title={t('sehir.henuzAdayYok')}
              body={t('sehir.ilkAdaySen')}
            />
          }
          renderItem={({ item, index }) => {
            const selected = myVote === item.id;
            return (
              <View style={[styles.cand, selected && styles.candMine]}>
                <Text style={styles.rank}>{index + 1}</Text>
                {MedyaUriGuvenli(item.avatar_url) ? (
                  <Image source={{ uri: MedyaUriGuvenli(item.avatar_url)! }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarBos]}>
                    <Ionicons name="person" size={16} color={RenkTokenlari.textMuted} />
                  </View>
                )}
                <View style={styles.candBody}>
                  <Text style={styles.candName} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  {item.manifesto ? (
                    <Text style={styles.manifesto} numberOfLines={2}>
                      {item.manifesto}
                    </Text>
                  ) : null}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.min(100, Number(item.percent) || 0)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.votes}>
                    {t('sehir.oyYuzde', {
                      count: item.vote_count,
                      pct: item.percent,
                    })}
                  </Text>
                </View>
                {canVote && !myVote ? (
                  <Pressable
                    style={styles.voteBtn}
                    onPress={() => oyVer(item.id)}
                    disabled={busy}
                  >
                    <Text style={styles.voteBtnText}>{t('sehir.oyVer')}</Text>
                  </Pressable>
                ) : selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={RenkTokenlari.mint} />
                ) : null}
              </View>
            );
          }}
        />

        </KlavyeGuvenliAlan>

        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => void refreshProfile()}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  winner: {
    marginHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(255,196,84,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,196,84,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
  },
  winnerCopy: { flex: 1, gap: 2 },
  winnerLabel: { ...TipografiTokenlari.micro, color: RenkTokenlari.accent },
  winnerName: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  winnerAvatar: { width: 44, height: 44, borderRadius: 22 },
  apply: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
    marginBottom: BoslukTokenlari.sm,
  },
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.sm,
  },
  section: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: BoslukTokenlari.sm,
  },
  cand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  candMine: { borderColor: RenkTokenlari.mint },
  rank: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    width: 18,
    fontWeight: '700',
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarBos: {
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candBody: { flex: 1, gap: 4, minWidth: 0 },
  candName: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  manifesto: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: 3,
  },
  votes: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  voteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: 'rgba(232,64,145,0.18)',
  },
  voteBtnText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
