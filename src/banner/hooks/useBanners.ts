import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { BannerService } from '../services/BannerService';
import {
  OtomatikPromoBannerlariGetir,
  OtomatikPromoCacheTemizle,
} from '../services/PromoBannerAdapter';
import {
  OdaPromoBannerlariniUret,
  OdaPromoOnbellegiTemizle,
} from '../services/RoomPromoBannerService';
import {
  OlayBannerCacheTemizle,
  OlayBannerRealtimeDinle,
  OlayBannerlariGetir,
} from '../auto/AutoBannerService';
import { BannerEngine } from '../core/BannerEngine';
import type { BannerCampaign, BannerUserContext, BannerUserState } from '../core/BannerTypes';
import { uretimOrtamiMi } from '../../yapilandirma/OrtamDegiskenleri';
import { OzellikBayragiAktifMiSunucu } from '../../moduller/ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import { AUTO_ROOM_PROMO_PLACEMENTS } from '../core/BannerConstants';
import i18n from '../../i18n';

function makeSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

let sharedSessionId = makeSessionId();

export function useBannerSessionId(): string {
  return sharedSessionId;
}

const PROMO_SLOTS = new Set<string>(Object.values(AUTO_ROOM_PROMO_PLACEMENTS));

function sentetikMi(id: string): boolean {
  return (
    id.startsWith('promo-') ||
    id.startsWith('auto-event-') ||
    id.startsWith('auto-room-')
  );
}

export function useBanners(placement: string) {
  const { profile, isGuest } = useAuth();
  const [banners, setBanners] = useState<BannerCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statesRef = useRef<Map<string, BannerUserState>>(new Map());
  const sessionId = useBannerSessionId();

  const ctx: BannerUserContext = useMemo(() => {
    const created = profile?.created_at
      ? new Date(profile.created_at).getTime()
      : Date.now();
    const ageDays = Math.max(
      0,
      Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)),
    );
    return {
      userId: profile?.id,
      isGuest: isGuest || !!profile?.is_guest,
      isHost: !!profile?.is_host,
      isVip: false,
      isCreator: !!profile?.is_host,
      level: profile?.level ?? 0,
      language: profile?.language ?? 'tr',
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      country: profile?.country,
      countryCode: profile?.country_code,
      regionId: profile?.region_id,
      city: null,
      accountAgeDays: ageDays,
      sessionId,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bilinçli dar bağımlılık
  }, [
    profile?.id,
    profile?.created_at,
    profile?.is_guest,
    profile?.is_host,
    profile?.level,
    profile?.language,
    profile?.country,
    profile?.country_code,
    profile?.region_id,
    isGuest,
    sessionId,
  ]);

  const reload = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    setError(null);
    try {
      const [all, autoPromoAcik, autoEventAcik] = await Promise.all([
        BannerService.fetchActive(),
        PROMO_SLOTS.has(placement)
          ? OzellikBayragiAktifMiSunucu('auto_promo_banners_enabled')
          : Promise.resolve(false),
        OzellikBayragiAktifMiSunucu('auto_event_banners_enabled'),
      ]);

      const [promos, olaylar, odaPromolar] = await Promise.all([
        autoPromoAcik && PROMO_SLOTS.has(placement)
          ? OtomatikPromoBannerlariGetir()
          : Promise.resolve([] as BannerCampaign[]),
        autoEventAcik
          ? OlayBannerlariGetir()
          : Promise.resolve([] as BannerCampaign[]),
        autoPromoAcik && PROMO_SLOTS.has(placement)
          ? OdaPromoBannerlariniUret(placement)
          : Promise.resolve([] as BannerCampaign[]),
      ]);

      if (!autoPromoAcik) {
        OtomatikPromoCacheTemizle();
        OdaPromoOnbellegiTemizle();
      }
      if (!autoEventAcik) OlayBannerCacheTemizle();

      const birlesik = [...all, ...promos, ...olaylar, ...odaPromolar];
      const states = await BannerService.fetchUserStates(
        birlesik.map((b) => b.id).filter((id) => !sentetikMi(id)),
      );
      const map = new Map(states.map((s) => [s.banner_id, s]));
      statesRef.current = map;
      const filtered = BannerEngine.forPlacement(
        { banners: birlesik, userStates: map, fetchedAt: Date.now() },
        placement,
        ctx,
      );

      const admin = filtered.filter((b) => !sentetikMi(b.id));
      const events = filtered.filter((b) => b.id.startsWith('auto-event-'));
      const autoRoom = filtered.filter((b) => b.id.startsWith('auto-room-'));
      // auto-room varken aynı slotta düz promo-oda'yı tekrarlama
      const promo = filtered.filter((b) => {
        if (!b.id.startsWith('promo-')) return false;
        if (autoRoom.length > 0 && b.id.startsWith('promo-oda-')) return false;
        return true;
      });

      const karisik = [...admin, ...events, ...autoRoom, ...promo];
      setBanners(karisik.slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('banner.yuklenemedi'));
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [placement, ctx]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const unsub = BannerService.subscribeRealtime(() => {
      void reload({ soft: true });
    });
    return unsub;
  }, [reload]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = OlayBannerRealtimeDinle(() => {
        void reload({ soft: true });
      });
    } catch (e) {
      console.warn('[useBanners] olay realtime', e);
    }
    return () => {
      unsub?.();
    };
  }, [reload]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void reload({ soft: true });
    });
    return () => sub.remove();
  }, [reload]);

  const dismissLocal = useCallback((bannerId: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
  }, []);

  return {
    banners,
    loading,
    error,
    reload,
    dismissLocal,
    ctx,
    sessionId,
    debug: !uretimOrtamiMi,
  };
}
