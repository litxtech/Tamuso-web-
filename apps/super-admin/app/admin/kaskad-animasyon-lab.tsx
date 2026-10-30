/**
 * Realm of Storms — Animation Lab (yalnızca admin/developer).
 * SADECE görsel test: particle, shake, lightning, karakter, big win, bonus intro.
 * Wallet / RNG / production sonucuna KESİNLİKLE bağlı değildir.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  ParticleBurst,
  newBurstId,
  type ActiveBurst,
  type ParticlePreset,
} from '../../../../src/moduller/oyunlar/kaskad/animasyonlar/ParticleController';
import { useScreenShake, type ShakePreset } from '../../../../src/moduller/oyunlar/kaskad/animasyonlar/ScreenShakeController';
import { BigWinAnimation } from '../../../../src/moduller/oyunlar/kaskad/animasyonlar/BigWinAnimation';
import { BonusIntroAnimation } from '../../../../src/moduller/oyunlar/kaskad/animasyonlar/BonusIntroAnimation';
import {
  LightningLayer,
  type LightningHandle,
} from '../../../../src/moduller/oyunlar/kaskad/arkaplan/LightningLayer';
import { GameBackground } from '../../../../src/moduller/oyunlar/kaskad/arkaplan/GameBackground';
import { StormGuardian } from '../../../../src/moduller/oyunlar/kaskad/karakter/StormGuardian';
import {
  createCharacterMachine,
  type CharacterMachine,
} from '../../../../src/moduller/oyunlar/kaskad/karakter/CharacterStateMachine';
import type {
  CharacterState,
  WinTier,
} from '../../../../src/moduller/oyunlar/kaskad/tipler/KaskadTipleri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari } from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const PARTICLE_PRESETS: ParticlePreset[] = [
  'CRYSTAL_BREAK',
  'STORM_SPARK',
  'MULTIPLIER_ENERGY',
  'SCATTER_PORTAL',
  'BIG_WIN',
  'SUPER_WIN',
];

const SHAKE_PRESETS: ShakePreset[] = ['SMALL', 'MEDIUM', 'LARGE'];

const CHARACTER_STATES: CharacterState[] = [
  'WATCHING',
  'CAST_SMALL',
  'CAST_MEDIUM',
  'CAST_LARGE',
  'BONUS_TRIGGER',
  'BIG_WIN',
  'SUPER_WIN',
];

const WIN_TIERS: Array<{ tier: WinTier; amount: number; mult: number }> = [
  { tier: 'STORM', amount: 500, mult: 1 },
  { tier: 'THUNDER', amount: 2_500, mult: 5 },
  { tier: 'COSMIC', amount: 12_000, mult: 25 },
  { tier: 'DIVINE', amount: 60_000, mult: 100 },
];

export default function KaskadAnimasyonLabEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const { width } = useWindowDimensions();

  const machine = useMemo<CharacterMachine>(() => createCharacterMachine(), []);
  const lightningRef = useRef<LightningHandle>(null);
  const { style: shakeStyle, shake } = useScreenShake(true);

  const [bursts, setBursts] = useState<ActiveBurst[]>([]);
  const [bigWin, setBigWin] = useState<{ tier: WinTier; amount: number; mult: number } | null>(null);
  const [bonusIntro, setBonusIntro] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!admin) router.replace('/(tabs)');
    }, [admin]),
  );

  useEffect(() => () => machine.dispose(), [machine]);

  if (!admin) return null;

  const stageW = width - BoslukTokenlari.md * 2;
  const patlat = (preset: ParticlePreset) => {
    const id = newBurstId();
    setBursts((prev) => [
      ...prev,
      { id, preset, x: stageW / 2, y: 110 },
    ]);
  };

  return (
    <Screen>
      <EkranBasligi
        title="Animation Lab"
        subtitle="Sadece görsel test — wallet/RNG'ye bağlı değil"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={[styles.stage, shakeStyle]}>
          <GameBackground bonusMode={false} performance="HIGH" />
          <LightningLayer ref={lightningRef} ambient={false} />
          <View style={styles.guardianWrap}>
            <StormGuardian machine={machine} size={120} performance="HIGH" />
          </View>
          {bursts.map((b) => (
            <ParticleBurst
              key={b.id}
              preset={b.preset}
              x={b.x}
              y={b.y}
              performance="HIGH"
              onDone={() =>
                setBursts((prev) => prev.filter((p) => p.id !== b.id))
              }
            />
          ))}
        </Animated.View>

        <Bolum baslik="Particle preset">
          {PARTICLE_PRESETS.map((p) => (
            <Buton key={p} ad={p} onPress={() => patlat(p)} />
          ))}
        </Bolum>

        <Bolum baslik="Screen shake">
          {SHAKE_PRESETS.map((p) => (
            <Buton key={p} ad={p} onPress={() => shake(p)} />
          ))}
        </Bolum>

        <Bolum baslik="Lightning">
          <Buton ad="Küçük" onPress={() => lightningRef.current?.strike('small')} />
          <Buton ad="Büyük" onPress={() => lightningRef.current?.strike('large')} />
        </Bolum>

        <Bolum baslik="Karakter state">
          {CHARACTER_STATES.map((s) => (
            <Buton key={s} ad={s} onPress={() => machine.request(s)} />
          ))}
        </Bolum>

        <Bolum baslik="Win presentation">
          {WIN_TIERS.map((w) => (
            <Buton
              key={w.tier}
              ad={`${w.tier} (${w.mult}×)`}
              onPress={() => setBigWin(w)}
            />
          ))}
        </Bolum>

        <Bolum baslik="Bonus intro">
          <Buton ad="4 scatter → 15 spin" onPress={() => setBonusIntro(true)} />
        </Bolum>
      </ScrollView>

      <BigWinAnimation
        visible={bigWin !== null}
        tier={bigWin?.tier ?? 'STORM'}
        amount={bigWin?.amount ?? 0}
        baseWin={bigWin ? Math.round(bigWin.amount / bigWin.mult) : 0}
        totalMultiplier={bigWin?.mult ?? 1}
        performance="HIGH"
        onDone={() => setBigWin(null)}
      />
      <BonusIntroAnimation
        visible={bonusIntro}
        bonus={bonusIntro ? { scatterCount: 4, freeSpins: 15 } : null}
        performance="HIGH"
        onDone={() => setBonusIntro(false)}
      />
    </Screen>
  );
}

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{baslik}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function Buton({ ad, onPress }: { ad: string; onPress: () => void }) {
  return (
    <Pressable style={styles.chip} onPress={onPress}>
      <Text style={styles.chipText}>{ad}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: BoslukTokenlari.md,
    gap: BoslukTokenlari.md,
    paddingBottom: 48,
  },
  stage: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: '#0A1030',
  },
  guardianWrap: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: 16,
    padding: BoslukTokenlari.md,
    gap: 10,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  title: {
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 15,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bg,
  },
  chipText: { color: RenkTokenlari.text, fontSize: 12, fontWeight: '600' },
});
