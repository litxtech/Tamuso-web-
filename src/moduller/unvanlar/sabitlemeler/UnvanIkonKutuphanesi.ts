import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IonName = ComponentProps<typeof Ionicons>['name'];

/** Whitelist library icons — yeni ağır icon paketi yok */
export const UNVAN_IKON_KUTUPHANESI: Record<
  string,
  { ion: IonName; label: string }
> = {
  crown: { ion: 'diamond', label: 'Crown' },
  shield: { ion: 'shield-checkmark', label: 'Shield' },
  star: { ion: 'star', label: 'Star' },
  diamond: { ion: 'diamond-outline', label: 'Diamond' },
  mic: { ion: 'mic', label: 'Mic' },
  music: { ion: 'musical-notes', label: 'Music' },
  heart: { ion: 'heart', label: 'Heart' },
  flame: { ion: 'flame', label: 'Flame' },
  sparkles: { ion: 'sparkles', label: 'Sparkles' },
  verified: { ion: 'checkmark-circle', label: 'Verified' },
  agency: { ion: 'business', label: 'Agency' },
  creator: { ion: 'create', label: 'Creator' },
  trophy: { ion: 'trophy', label: 'Trophy' },
  city: { ion: 'location', label: 'City' },
  country: { ion: 'globe', label: 'Country' },
};

export function UnvanIkonIonAdi(key: string | null | undefined): IonName | null {
  if (!key) return null;
  const hit = UNVAN_IKON_KUTUPHANESI[key.toLowerCase()];
  return hit?.ion ?? null;
}

export const UNVAN_IKON_LISTESI = Object.entries(UNVAN_IKON_KUTUPHANESI).map(
  ([key, v]) => ({ key, ...v }),
);
