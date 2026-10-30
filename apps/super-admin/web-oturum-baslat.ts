/**
 * Bu modül `app/_layout.tsx` içinde İLK import olmalıdır.
 *
 * Supabase istemcisi oluşmadan önce "yönetim paneli" modunu işaretler:
 * oturum belirteci localStorage yerine sessionStorage'da tutulur. Böylece
 * sekme kapatıldığında personel oturumu tarayıcıda kalmaz; aynı tarayıcıdaki
 * başka bir sekmeyi etkilemez.
 */

type AdminWebBayragi = { __TAMUSO_ADMIN_WEB__?: boolean };

if (typeof globalThis !== 'undefined') {
  (globalThis as AdminWebBayragi).__TAMUSO_ADMIN_WEB__ = true;
}

export {};
