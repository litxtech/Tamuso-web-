import { useEffect, useState } from 'react';
import { LiveKitBaglantiYoneticisi } from '../../livekit/baglanti/LiveKitBaglantiYoneticisi';

/**
 * İzleyicide sosyal katman (yorum akışı, giriş bildirimi, hediye canlısı)
 * ilk video karesinden sonra — en geç `azamiMs` — başlar. Yayıncıda hemen.
 * Bir kez true olunca öyle kalır.
 */
export function useCanliVideoOncelik(
  rol: 'host' | 'izleyici',
  azamiMs = 1_500,
): boolean {
  const [hazir, setHazir] = useState(rol === 'host');

  useEffect(() => {
    if (hazir) return;
    if (rol === 'host') {
      setHazir(true);
      return;
    }
    const zamanlayici = setTimeout(() => setHazir(true), azamiMs);
    const birak = LiveKitBaglantiYoneticisi.videoDinle((s) => {
      if (s.uzakIlkKare) setHazir(true);
    });
    return () => {
      clearTimeout(zamanlayici);
      birak();
    };
  }, [rol, hazir, azamiMs]);

  return hazir;
}
