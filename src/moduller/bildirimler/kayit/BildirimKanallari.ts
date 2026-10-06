/**
 * Android gelen arama — Play-uyumlu yüksek öncelikli kanal.
 * Yalnızca gerçek 1:1 arama (incoming_call); pazarlama/DM için KULLANILMAZ.
 */
export const ANDROID_BILDIRIM_KANALI = 'genel';
export const ANDROID_MESAJ_BILDIRIM_KANALI = 'mesaj';
/** Dedicated call channel — MAX importance + ringtone (Google: calling apps) */
export const ANDROID_ARAMA_BILDIRIM_KANALI = 'arama';
export const MESAJ_BILDIRIM_SESI = 'mesaj_uc_ton.wav';
export const ARAMA_BILDIRIM_SESI = 'gelen_arama.wav';
