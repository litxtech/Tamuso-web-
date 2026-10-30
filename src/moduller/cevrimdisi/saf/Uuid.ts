const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function uuidGecerliMi(deger: string | null | undefined): boolean {
  return typeof deger === 'string' && UUID_RE.test(deger);
}

/** crypto.randomUUID yoksa v4. Yorum client_id gerçek UUID olmalı. */
export function yerliUuid(): string {
  const c = globalThis.crypto as {
    randomUUID?: () => string;
    getRandomValues?: (a: Uint8Array) => Uint8Array;
  } | undefined;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const bayt = new Uint8Array(16);
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(bayt);
  else {
    for (let i = 0; i < 16; i += 1) bayt[i] = Math.floor(Math.random() * 256);
  }
  bayt[6] = (bayt[6]! & 0x0f) | 0x40;
  bayt[8] = (bayt[8]! & 0x3f) | 0x80;
  const hex = Array.from(bayt, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
