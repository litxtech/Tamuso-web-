import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { HikayeKullaniciOzetGetir } from '../islemler/HikayeIslemleri';

export type HikayeProfilOzet = {
  hasActive: boolean;
  hasUnseen: boolean;
  itemCount: number;
  previewUrl: string | null;
};

/**
 * Profil avatarı için aktif hikaye özeti (Instagram halkası).
 * Sync bayrak cache'e bağlanmaz — sunucu RPC zaten stories_enabled kontrol eder.
 */
export function useHikayeProfilOzet(userId: string | null | undefined) {
  const [ozet, setOzet] = useState<HikayeProfilOzet>({
    hasActive: false,
    hasUnseen: false,
    itemCount: 0,
    previewUrl: null,
  });

  useFocusEffect(
    useCallback(() => {
      let iptal = false;
      if (!userId) {
        setOzet({
          hasActive: false,
          hasUnseen: false,
          itemCount: 0,
          previewUrl: null,
        });
        return;
      }
      void HikayeKullaniciOzetGetir(userId).then((r) => {
        if (iptal) return;
        if (!r.ok) {
          setOzet({
            hasActive: false,
            hasUnseen: false,
            itemCount: 0,
            previewUrl: null,
          });
          return;
        }
        setOzet({
          hasActive: r.data.has_active,
          hasUnseen: r.data.has_unseen,
          itemCount: r.data.item_count,
          previewUrl: r.data.preview_url,
        });
      });
      return () => {
        iptal = true;
      };
    }, [userId]),
  );

  return ozet;
}
