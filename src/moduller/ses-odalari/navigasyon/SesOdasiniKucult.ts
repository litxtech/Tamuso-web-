/**
 * Ses odasını uygulama içinde küçült — LiveKit açık kalır, kullanıcı gezinir.
 * ÖNCE arkaPlanda=true; blur temizliği medyayı kesmesin.
 */
import { router, type Href } from 'expo-router';
import {
  AktifSesOdasiArkaPlanaAl,
  AktifSesOdasiCanliMi,
} from '../oturum/AktifSesOdasiOturumu';
import {
  OdaCikisKilidiniAc,
  OdaCikisKilidiniKapat,
} from './OdaCikisKilidi';

const HEDEF = '/(tabs)' as Href;

export function SesOdasiniKucult(): boolean {
  if (!AktifSesOdasiCanliMi()) return false;
  AktifSesOdasiArkaPlanaAl();
  OdaCikisKilidiniAc();
  try {
    // fullScreenModal — tek adım dismiss en güvenilir
    if (typeof router.canDismiss === 'function' && router.canDismiss()) {
      router.dismiss();
    } else {
      router.dismissTo(HEDEF);
    }
  } catch {
    try {
      router.replace(HEDEF);
    } catch {
      try {
        router.navigate(HEDEF);
      } catch {
        /* ignore */
      }
    }
  }
  setTimeout(() => OdaCikisKilidiniKapat(), 900);
  return true;
}
