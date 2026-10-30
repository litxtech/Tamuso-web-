import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function useOyunHazir(): boolean {
  const [hazir, setHazir] = useState(() => useGameStore.persist.hasHydrated());

  useEffect(() => {
    if (useGameStore.persist.hasHydrated()) {
      setHazir(true);
      return;
    }
    return useGameStore.persist.onFinishHydration(() => setHazir(true));
  }, []);

  return hazir;
}
