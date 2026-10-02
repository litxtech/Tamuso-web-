import { useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { GirisLobisiPublicGet } from '../islemler/GirisLobisiPublicGet';
import type { GirisLobisiPublic } from '../tipler';

/**
 * Giriş lobisi ayar/medya değişince public get ile tazele.
 * Anon kullanıcılar da dinler (login ekranı).
 */
export function useGirisLobisiCanli(
  onGuncelle: (data: GirisLobisiPublic) => void,
  aktif = true,
): void {
  useEffect(() => {
    if (!aktif) return;

    let iptal = false;
    const yenile = () => {
      void GirisLobisiPublicGet().then((d) => {
        if (!iptal) onGuncelle(d);
      });
    };

    const kanal = supabase
      .channel(`giris-lobisi-live-${Date.now().toString(36)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'giris_lobisi_ayar' },
        yenile,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'giris_lobisi_medya' },
        yenile,
      )
      .subscribe();

    return () => {
      iptal = true;
      void supabase.removeChannel(kanal);
    };
  }, [aktif, onGuncelle]);
}
