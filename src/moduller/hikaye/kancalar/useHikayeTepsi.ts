import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { HIKAYE_OZELLIK_BAYRAGI } from '../sabitler';
import type { HikayeTepsiOgesi } from '../tipler';
import { HikayeTepsiGetir } from '../islemler/HikayeIslemleri';
import { HikayeAnalitik } from '../islemler/HikayeAnalitik';
import { useHikayeRealtime } from '../gercek-zamanli/useHikayeRealtime';

/** Instagram: kendi → izlenmeyenler → izlenenler (yeniden eskiye) */
export function hikayeTepsiSirala(liste: HikayeTepsiOgesi[]): HikayeTepsiOgesi[] {
  return [...liste].sort((a, b) => {
    if (a.is_mine && !b.is_mine) return -1;
    if (!a.is_mine && b.is_mine) return 1;
    if (a.has_unseen !== b.has_unseen) return a.has_unseen ? -1 : 1;
    const ta = a.latest_at ? Date.parse(a.latest_at) : 0;
    const tb = b.latest_at ? Date.parse(b.latest_at) : 0;
    return tb - ta;
  });
}

function kendiHalka(
  userId: string | undefined,
  profile: {
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null,
  mevcut: HikayeTepsiOgesi | undefined,
): HikayeTepsiOgesi | null {
  if (!userId) return null;
  const profilAvatar = profile?.avatar_url ?? null;
  if (mevcut) {
    return {
      ...mevcut,
      is_mine: true,
      avatar_url: mevcut.avatar_url || profilAvatar,
      preview_url: mevcut.preview_url ?? null,
      display_name:
        mevcut.display_name ||
        profile?.display_name ||
        profile?.username ||
        mevcut.display_name,
    };
  }
  return {
    user_id: userId,
    display_name: profile?.display_name ?? profile?.username ?? 'Sen',
    username: profile?.username ?? null,
    avatar_url: profilAvatar,
    preview_url: null,
    is_mine: true,
    has_unseen: false,
    item_count: 0,
    latest_at: null,
  };
}

/**
 * Ana sayfa tepsi — kendi halkası her zaman index 0.
 * İzlenmeyenler başta, izlenenler sonda. Tab focus’ta yenilenir.
 */
export function useHikayeTepsi(opts?: { enabled?: boolean }) {
  const { user, profile } = useAuth();
  const bayrak = OzellikBayragiAktifMi(HIKAYE_OZELLIK_BAYRAGI);
  const enabled = (opts?.enabled ?? true) && bayrak;
  const [ogeler, setOgeler] = useState<HikayeTepsiOgesi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const ilk = useRef(true);

  const yenile = useCallback(async () => {
    if (!enabled) {
      setOgeler([]);
      return;
    }
    if (ilk.current) setYukleniyor(true);
    setHata(null);
    const r = await HikayeTepsiGetir();
    ilk.current = false;
    setYukleniyor(false);
    if (!r.ok) {
      setHata(r.hata);
      const kendi = kendiHalka(user?.id, profile, undefined);
      setOgeler(kendi ? [kendi] : []);
      return;
    }
    const diger = r.data.filter((o) => !o.is_mine && o.user_id !== user?.id);
    const sunucuKendi = r.data.find(
      (o) => o.is_mine || o.user_id === user?.id,
    );
    const kendi = kendiHalka(user?.id, profile, sunucuKendi);
    const sirali = hikayeTepsiSirala(kendi ? [kendi, ...diger] : diger);
    setOgeler(sirali);
  }, [enabled, user?.id, profile]);

  /** İzleme bitince tepside anında sona kaydır */
  const gorulduIsaretle = useCallback((userId: string) => {
    setOgeler((prev) =>
      hikayeTepsiSirala(
        prev.map((o) =>
          o.user_id === userId && !o.is_mine
            ? { ...o, has_unseen: false }
            : o,
        ),
      ),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      void yenile();
    }, [yenile]),
  );

  useEffect(() => {
    if (enabled) HikayeAnalitik('story_tray_open');
  }, [enabled]);

  useHikayeRealtime({
    enabled,
    onDegisti: () => {
      void yenile();
    },
  });

  return {
    enabled,
    ogeler,
    yukleniyor,
    hata,
    yenile,
    gorulduIsaretle,
  };
}
