export type CatismaKodu =
  | 'server_deleted'
  | 'user_blocked'
  | 'post_deleted'
  | 'conversation_deleted'
  | 'account_disabled'
  | 'content_expired';

/** Sunucu mesajını sessiz silme yerine kullanıcıya anlatılacak koda çevirir. */
export function catismaSinifla(mesaj: string | null | undefined): CatismaKodu | null {
  const m = (mesaj ?? '').toLowerCase();
  if (!m) return null;
  if (/expired|suresi doldu|süresi doldu|expires/.test(m)) return 'content_expired';
  if (/account disabled|hesap kapali|hesap kapalı|banned|yasakli|yasaklı/.test(m)) {
    return 'account_disabled';
  }
  if (/conversation|sohbet|thread/.test(m) && /delet|silin|not found|bulunamad/.test(m)) {
    return 'conversation_deleted';
  }
  if (/blocked|engel|engellen/.test(m)) return 'user_blocked';
  if (/post/.test(m) && /delet|silin|not found|bulunamad/.test(m)) return 'post_deleted';
  if (/delet|silinmis|silinmiş|not found|bulunamad/.test(m)) return 'server_deleted';
  return null;
}
