import { useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { CihazKimliginiGetir } from '../kimlik-dogrulama/oturum/CihazKimliginiGetir';

let kayitSozu: Promise<void> | null = null;

/** Web açılışını bir kez bildirir. Aynı IP ve aynı cihaz sunucuda elenir. */
export function WebZiyaretKaydet(): Promise<void> {
  if (Platform.OS !== 'web') return Promise.resolve();
  if (kayitSozu) return kayitSozu;
  kayitSozu = (async () => {
    try {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        return;
      }
      const cihaz = await CihazKimliginiGetir();
      await supabase.rpc('web_ziyaret_kaydet', { p_cihaz: cihaz });
    } catch {
      kayitSozu = null;
    }
  })();
  return kayitSozu;
}

/** Kök yerleşimde bir kez çalışan web ziyaret kaydı. */
export function WebZiyaretKaydi() {
  useEffect(() => {
    void WebZiyaretKaydet();
  }, []);
  return null;
}
