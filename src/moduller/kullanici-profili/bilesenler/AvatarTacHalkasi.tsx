/**
 * Avatarı saran metalik taç halkası — profil / oda ortak.
 * Taç SADECE dışarıda dolaşır; avatar resmi üstte, içine müdahale yok.
 */

import React, { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';

export type AvatarTacYogunluk = 'oda' | 'profil';

type Props = {
  size: number;
  level?: number | null;
  gizli?: boolean;
  yogunluk?: AvatarTacYogunluk;
  children: React.ReactNode;
};

type Palet = {
  metal: readonly [string, string, string, string];
  kenar: string;
  murassa: string;
  murassaIsik: string;
  glow: string;
  yazi: string;
};

function paletSec(level: number): Palet {
  if (level >= 50) {
    return {
      metal: ['#FFF8D0', '#FFC94A', '#E07010', '#FFE08A'],
      kenar: 'rgba(255, 230, 150, 0.95)',
      murassa: '#FF2D55',
      murassaIsik: '#FFB0C4',
      glow: '#FFB020',
      yazi: '#2A1400',
    };
  }
  if (level >= 20) {
    return {
      metal: ['#FFFBEA', '#F5D76E', '#B8860B', '#FFE9A8'],
      kenar: 'rgba(255, 236, 180, 0.95)',
      murassa: '#29B6F6',
      murassaIsik: '#E1F5FE',
      glow: '#D4AF37',
      yazi: '#2A2008',
    };
  }
  if (level >= 10) {
    return {
      metal: ['#FFFFFF', '#E2E8F0', '#94A3B8', '#F1F5F9'],
      kenar: 'rgba(255,255,255,0.9)',
      murassa: '#8B5CF6',
      murassaIsik: '#DDD6FE',
      glow: '#A8B4C8',
      yazi: '#1E2430',
    };
  }
  return {
    metal: ['#F5E0C8', '#D4A574', '#8B5E3C', '#E8C49A'],
    kenar: 'rgba(255, 220, 180, 0.85)',
    murassa: '#34D399',
    murassaIsik: '#A7F3D0',
    glow: '#C4A484',
    yazi: '#2A1810',
  };
}

function halkaNoktasi(
  cx: number,
  cy: number,
  r: number,
  degFromTop: number,
  half: number,
) {
  const rad = ((degFromTop - 90) * Math.PI) / 180;
  return {
    left: cx + r * Math.cos(rad) - half,
    top: cy + r * Math.sin(rad) - half,
  };
}

function Kivilcim({
  delay,
  top,
  left,
  size,
  renk,
}: {
  delay: number;
  top: number;
  left: number;
  size: number;
  renk: string;
}) {
  const twinkle = useSharedValue(0);

  useEffect(() => {
    twinkle.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }),
          withTiming(0.25, { duration: 700 }),
          withTiming(0.25, { duration: 900 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, twinkle]);

  const stil = useAnimatedStyle(() => ({
    opacity: interpolate(twinkle.value, [0, 1], [0.25, 0.95]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top,
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: renk,
          zIndex: 20,
        },
        stil,
      ]}
    />
  );
}

function TacUc({
  w,
  h,
  rot,
  pos,
  palet,
  murassaBoy,
  merkezMi,
}: {
  w: number;
  h: number;
  rot: number;
  pos: { left: number; top: number };
  palet: Palet;
  murassaBoy: number;
  merkezMi?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: pos.left,
        top: pos.top,
        width: w,
        height: h,
        transform: [{ rotate: `${rot}deg` }],
        zIndex: merkezMi ? 23 : 22,
        alignItems: 'center',
      }}
    >
      <LinearGradient
        colors={
          merkezMi
            ? [palet.metal[0], palet.metal[1], palet.metal[2]]
            : [palet.metal[0], palet.metal[2]]
        }
        style={{
          width: w,
          height: h,
          borderTopLeftRadius: w * 0.45,
          borderTopRightRadius: w * 0.45,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          borderWidth: 1,
          borderColor: palet.kenar,
          alignItems: 'center',
          paddingTop: 2,
          shadowColor: palet.glow,
          shadowOpacity: 0.35,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        }}
      >
        <View
          style={{
            width: murassaBoy,
            height: murassaBoy,
            borderRadius: murassaBoy / 2,
            backgroundColor: palet.murassa,
            borderWidth: 1,
            borderColor: palet.murassaIsik,
          }}
        />
      </LinearGradient>
    </View>
  );
}

export function AvatarTacHalkasi({
  size,
  level,
  gizli = false,
  yogunluk = 'profil',
  children,
}: Props) {
  const safeSize =
    Number.isFinite(Number(size)) && Number(size) > 0 ? Number(size) : 64;
  const seviye = Math.max(0, Math.floor(Number(level) || 0));
  const profilMi = yogunluk === 'profil';
  const ringKal = profilMi ? 9 : 4;
  const peakH = profilMi
    ? Math.round(safeSize * 0.28)
    : Math.round(safeSize * 0.2);
  const pad = peakH + (profilMi ? 14 : 6);
  const outer = safeSize + ringKal * 2 + pad * 2;
  const ringSize = safeSize + ringKal * 2;
  /** Tam geometrik merkez — kayma olmasın */
  const cx = outer / 2;
  const cy = outer / 2;
  const ringR = ringSize / 2;
  const peakR = ringR + peakH * 0.12;
  const palet = paletSec(seviye || 1);

  const orbit = useSharedValue(0);
  const pulse = useSharedValue(0);
  const shine = useSharedValue(0);

  useEffect(() => {
    if (gizli) return;
    // Tek dönüş — kıvılcımlar parent ile döner (left/top güncellenmez → scroll titremez)
    orbit.value = withRepeat(
      withTiming(360, {
        duration: profilMi ? 14000 : 18000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    shine.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 600 }),
        withTiming(0, { duration: 1200 }),
      ),
      -1,
      false,
    );
  }, [gizli, profilMi, orbit, pulse, shine]);

  // Sadece opacity — scale/shadow scroll'da titretime yol açar
  const auraStil = useAnimatedStyle(() => ({
    opacity: 0.28 + pulse.value * 0.22,
  }));

  const orbitStil = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value}deg` }],
  }));

  const shineStil = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.4, 1], [0, 0.75, 0]),
    transform: [
      { translateX: interpolate(shine.value, [0, 1], [-24, 24]) },
    ],
  }));

  const ucAci = useMemo(() => {
    if (profilMi) return [-78, -52, -28, -10, 0, 10, 28, 52, 78];
    return [-48, -24, 0, 24, 48];
  }, [profilMi]);

  if (gizli) {
    return (
      <View
        style={{
          width: safeSize,
          height: safeSize,
          borderRadius: safeSize / 2,
          overflow: 'hidden',
          backgroundColor: '#1A1224',
        }}
        collapsable={false}
      >
        {children}
      </View>
    );
  }

  const murassaBoy = profilMi ? 8 : 4;
  const kivilcimSay = profilMi ? 8 : 4;
  const avatarLeft = cx - safeSize / 2;
  const avatarTop = cy - safeSize / 2;
  const orbitR = ringR + (profilMi ? 6 : 2);
  const orbitBox = orbitR * 2 + 12;

  return (
    <View
      style={{
        width: outer,
        height: outer,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      // Hardware texture + Reanimated bazı Android cihazlarda profil çökertir
      collapsable={false}
    >
      {/* Aura — sabit boyut, sadece opacity (scale yok) */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: ringSize + (profilMi ? 20 : 10),
            height: ringSize + (profilMi ? 20 : 10),
            borderRadius: 999,
            backgroundColor: palet.glow,
            zIndex: 0,
          },
          auraStil,
        ]}
      />

      {/* Metal halka — ORTASI BOŞ */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          left: cx - ringR,
          top: cy - ringR,
          borderWidth: ringKal,
          borderColor: palet.metal[1],
          backgroundColor: 'transparent',
          zIndex: 2,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          left: cx - ringR,
          top: cy - ringR,
          borderWidth: 1.5,
          borderColor: palet.kenar,
          backgroundColor: 'transparent',
          zIndex: 3,
        }}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: ringKal + 2,
            height: ringSize * 0.45,
            left: cx + ringR - ringKal - 1,
            top: cy - ringSize * 0.22,
            borderRadius: 4,
            overflow: 'hidden',
            zIndex: 4,
          },
          shineStil,
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.7)',
            'transparent',
          ]}
          style={{ flex: 1, width: '100%' }}
        />
      </Animated.View>

      {/* Avatar — çerçeve üstünde kalsın; solid zemin boş/çökmüş Image'de delik bırakmaz */}
      <View
        style={{
          position: 'absolute',
          left: avatarLeft,
          top: avatarTop,
          width: safeSize,
          height: safeSize,
          borderRadius: safeSize / 2,
          overflow: 'hidden',
          zIndex: 30,
          elevation: 10,
          backgroundColor: '#1A1224',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.5)',
        }}
        collapsable={false}
      >
        {children}
      </View>

      {ucAci.map((deg, i) => {
        const merkezMi = deg === 0;
        const w = merkezMi
          ? profilMi
            ? 18
            : 10
          : profilMi
            ? Math.max(9, 14 - Math.abs(deg) / 18)
            : 7;
        const h = merkezMi
          ? peakH * 1.25
          : peakH * (0.72 + (1 - Math.abs(deg) / 90) * 0.25);
        const pos = halkaNoktasi(cx, cy, peakR, deg, w / 2);
        return (
          <TacUc
            key={`uc-${i}`}
            w={w}
            h={h}
            rot={deg * 0.9}
            pos={{ left: pos.left, top: pos.top - h * 0.58 }}
            palet={palet}
            murassaBoy={merkezMi ? murassaBoy + 2 : murassaBoy}
            merkezMi={merkezMi}
          />
        );
      })}

      {seviye >= 1 ? (
        <LinearGradient
          pointerEvents="none"
          colors={[palet.metal[0], palet.metal[1], palet.metal[2]]}
          style={{
            position: 'absolute',
            left: cx - (profilMi ? 20 : 12),
            top: cy + ringR - (profilMi ? 15 : 9),
            minWidth: profilMi ? 40 : 24,
            height: profilMi ? 22 : 14,
            borderRadius: 11,
            paddingHorizontal: 7,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: palet.kenar,
            zIndex: 24,
          }}
        >
          <Text
            style={{
              ...TipografiTokenlari.micro,
              color: palet.yazi,
              fontWeight: '900',
              fontSize: profilMi ? 12 : 8,
            }}
          >
            {seviye}
          </Text>
        </LinearGradient>
      ) : null}

      {/* Kıvılcımlar — sabit konum, parent döner (left/top animasyonu yok) */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: orbitBox,
            height: orbitBox,
            left: cx - orbitBox / 2,
            top: cy - orbitBox / 2,
            zIndex: 18,
          },
          orbitStil,
        ]}
      >
        {Array.from({ length: kivilcimSay }, (_, i) => {
          const deg = (360 / kivilcimSay) * i;
          const rad = ((deg - 90) * Math.PI) / 180;
          const sparkSize = profilMi ? (i % 3 === 0 ? 4 : 2.5) : 2;
          const ox = orbitBox / 2 + orbitR * Math.cos(rad) - sparkSize / 2;
          const oy = orbitBox / 2 + orbitR * Math.sin(rad) - sparkSize / 2;
          return (
            <Kivilcim
              key={`k-${i}`}
              delay={i * 200}
              top={oy}
              left={ox}
              size={sparkSize}
              renk={i % 2 === 0 ? '#FFFBEA' : palet.murassaIsik}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

export function ProfilAvatarCerceve({
  size,
  level,
  gizli,
  children,
}: {
  size: number;
  level?: number | null;
  gizli?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AvatarTacHalkasi
      size={size}
      level={level}
      gizli={gizli}
      yogunluk="profil"
    >
      {children}
    </AvatarTacHalkasi>
  );
}
