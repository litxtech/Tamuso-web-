/**
 * Oda / sohbet — küçük avatarı saran kompakt taç halkası.
 */
import React from 'react';
import { View } from 'react-native';
import { AvatarTacHalkasi } from '../../kullanici-profili/bilesenler/AvatarTacHalkasi';

type Props = {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  animasyonluMu?: boolean;
  gizli?: boolean;
  /** Avatar çapı — varsayılan size etiketinden */
  avatarBoy?: number;
  children: React.ReactNode;
};

const BOY: Record<'sm' | 'md' | 'lg', number> = {
  sm: 40,
  md: 52,
  lg: 72,
};

/** Avatarı saran seviye tacı — children zorunlu (avatarla bütün) */
export function SeviyeTaci({
  level,
  size = 'sm',
  animasyonluMu = true,
  gizli = false,
  avatarBoy,
  children,
}: Props) {
  const boy = avatarBoy ?? BOY[size];
  const gecerli = !!level && level >= 1;

  if (!gecerli || gizli) {
    return (
      <View
        style={{
          width: boy,
          height: boy,
          borderRadius: boy / 2,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    );
  }

  return (
    <AvatarTacHalkasi
      size={boy}
      level={level}
      yogunluk="oda"
      gizli={gizli}
      animasyonlu={animasyonluMu}
    >
      {children}
    </AvatarTacHalkasi>
  );
}
