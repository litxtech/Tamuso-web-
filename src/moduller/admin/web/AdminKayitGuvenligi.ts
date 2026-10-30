/**
 * Yönetim panelinde kayıt (log) gizliliği.
 *
 * Personel kimlik bilgileri hiçbir kayda yazılmaz:
 *  - tarayıcı konsolu (console.*)
 *  - denetim kaydı meta verisi (guvenlik_olayi_kaydet)
 *  - yakalanmamış hata metinleri
 *
 * `adminKayitlariniTemizle()` uygulama açılışında bir kez çağrılır.
 */

const GIZLI_ANAHTAR =
  /(pass(word)?|sifre|şifre|parola|token|secret|api[_-]?key|apikey|authorization|cookie|session|refresh|access|credential|otp|kod|email|eposta|e-posta|phone|telefon|iban|card|kart|cvv|tckn|kimlik)/i;

const EPOSTA = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const JWT = /eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g;
const BEARER = /\bBearer\s+\S+/gi;
const TELEFON = /(\+?\d[\d\s()-]{7,}\d)/g;

const EPOSTA_GIZLI = '[eposta-gizli]';
const DEGER_GIZLI = '[gizli]';

/** Tek bir metindeki kişisel/kimlik verilerini maskeler. */
export function metniTemizle(metin: string): string {
  return metin
    .replace(JWT, '[jwt-gizli]')
    .replace(BEARER, `Bearer ${DEGER_GIZLI}`)
    .replace(EPOSTA, EPOSTA_GIZLI)
    .replace(TELEFON, (m) =>
      // Sürüm/ID gibi kısa sayı dizilerini bozmayalım.
      m.replace(/\D/g, '').length >= 10 ? '[telefon-gizli]' : m,
    );
}

/**
 * Denetim kaydına gönderilecek meta veriyi temizler.
 * Adı gizli anahtar kalıbına uyan alanlar tamamen düşürülür.
 */
export function guvenliMeta(
  meta?: Record<string, unknown>,
): Record<string, unknown> {
  if (!meta) return {};
  const cikti: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (GIZLI_ANAHTAR.test(k)) continue;
    if (typeof v === 'string') {
      cikti[k] = metniTemizle(v);
    } else if (v && typeof v === 'object') {
      cikti[k] = guvenliMeta(v as Record<string, unknown>);
    } else {
      cikti[k] = v;
    }
  }
  return cikti;
}

function argumaniTemizle(v: unknown, derinlik = 0): unknown {
  if (derinlik > 3) return DEGER_GIZLI;
  if (typeof v === 'string') return metniTemizle(v);
  if (v instanceof Error) {
    return `${v.name}: ${metniTemizle(v.message)}`;
  }
  if (Array.isArray(v)) return v.map((x) => argumaniTemizle(x, derinlik + 1));
  if (v && typeof v === 'object') {
    try {
      return guvenliMeta(v as Record<string, unknown>);
    } catch {
      return DEGER_GIZLI;
    }
  }
  return v;
}

let kuruldu = false;

/**
 * console.* çıktısını süzer. Üretimde hata ayıklama gürültüsünü de azaltır:
 * debug/info sessizleşir, log/warn/error maskelenerek geçer.
 */
export function adminKayitlariniTemizle(): void {
  if (kuruldu) return;
  if (typeof console === 'undefined') return;
  kuruldu = true;

  const orijinal = {
    log: console.log.bind(console),
    info: console.info?.bind(console) ?? console.log.bind(console),
    debug: console.debug?.bind(console) ?? console.log.bind(console),
    warn: console.warn?.bind(console) ?? console.log.bind(console),
    error: console.error?.bind(console) ?? console.log.bind(console),
  };

  console.debug = () => undefined;
  console.info = () => undefined;

  console.log = (...a: unknown[]) =>
    orijinal.log(...a.map((x) => argumaniTemizle(x)));
  console.warn = (...a: unknown[]) =>
    orijinal.warn(...a.map((x) => argumaniTemizle(x)));
  console.error = (...a: unknown[]) =>
    orijinal.error(...a.map((x) => argumaniTemizle(x)));
}
