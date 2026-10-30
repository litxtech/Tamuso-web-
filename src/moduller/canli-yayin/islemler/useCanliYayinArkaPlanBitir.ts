import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Yayıncı uygulamadan çıkınca (arka plan) yayını kapatır.
 * Bildirim çubuğu gibi kısa 'inactive' anlarında bitirmez.
 */
export function useCanliYayinArkaPlanBitir(
  aktif: boolean,
  bitir: () => void,
) {
  const bitirRef = useRef(bitir);
  bitirRef.current = bitir;

  useEffect(() => {
    if (!aktif) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        if (timer) clearTimeout(timer);
        timer = null;
        return;
      }
      if (state !== 'background') return;
      if (timer) clearTimeout(timer);
      // Kısa uygulama değişiminde PK kabulü kaçmasın; çıkış kalıcıysa yayın biter
      timer = setTimeout(() => {
        timer = null;
        if (AppState.currentState !== 'background') return;
        bitirRef.current();
      }, 12_000);
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [aktif]);
}
