import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  OzellikBayrakCacheAbone,
  OzellikBayrakCacheDisktenYukle,
  OzellikBayrakCacheSurum,
  OzellikBayraklariniYukle,
  OzellikBayrakRealtimeKur,
  CacheBayrakOku,
  CacheKillOku,
} from './OzellikBayrakCache';
import type {
  KillSwitchAnahtari,
  OzellikBayragiAnahtari,
} from './OzellikBayragiAnahtarlari';

type Ctx = {
  surum: string;
  bayrak: (k: OzellikBayragiAnahtari) => boolean;
  kill: (k: KillSwitchAnahtari) => boolean;
  yenile: () => Promise<void>;
};

const OzellikBayrakContext = createContext<Ctx>({
  surum: 'boot',
  bayrak: CacheBayrakOku,
  kill: CacheKillOku,
  yenile: async () => undefined,
});

export function OzellikBayrakSaglayici({ children }: { children: ReactNode }) {
  const [surum, setSurum] = useState(OzellikBayrakCacheSurum);

  useEffect(() => {
    let iptal = false;
    void (async () => {
      await OzellikBayrakCacheDisktenYukle();
      if (!iptal) setSurum(OzellikBayrakCacheSurum());
      await OzellikBayraklariniYukle();
      if (!iptal) setSurum(OzellikBayrakCacheSurum());
      void import('../unvanlar/okuma/UnvanKatalogunuYukle')
        .then(({ UnvanKatalogunuYukle }) => UnvanKatalogunuYukle(false))
        .catch(() => undefined);
    })();
    const unsub = OzellikBayrakCacheAbone(() => {
      setSurum(OzellikBayrakCacheSurum());
    });
    const stopRt = OzellikBayrakRealtimeKur();
    return () => {
      iptal = true;
      unsub();
      stopRt();
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      surum,
      bayrak: CacheBayrakOku,
      kill: CacheKillOku,
      yenile: OzellikBayraklariniYukle,
    }),
    [surum],
  );

  return (
    <OzellikBayrakContext.Provider value={value}>
      {children}
    </OzellikBayrakContext.Provider>
  );
}

export function useOzellikBayraklari() {
  return useContext(OzellikBayrakContext);
}

/** Tek bayrak — surum değişince re-render */
export function useOzellikBayragi(anahtar: OzellikBayragiAnahtari): boolean {
  const { surum, bayrak } = useOzellikBayraklari();
  return useMemo(() => bayrak(anahtar), [surum, bayrak, anahtar]);
}

export function useKillSwitch(anahtar: KillSwitchAnahtari): boolean {
  const { surum, kill } = useOzellikBayraklari();
  return useMemo(() => kill(anahtar), [surum, kill, anahtar]);
}
