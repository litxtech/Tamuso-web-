/**
 * DM gövdesinden ajans davet kodunu çıkarır.
 * Hem yeni hem eski “Davet kodu: …” mesajlarıyla uyumlu.
 */
export function AjansDavetMesajindanKoduCikar(
  body: string | null | undefined,
): { kod: string; ajansAdi: string | null } | null {
  const metin = (body ?? '').trim();
  if (!metin) return null;

  const kodEslesme =
    metin.match(/[?&](?:ajans|kod)=([A-Za-z0-9_-]{4,32})/i) ??
    metin.match(/Davet\s*kodu\s*[:：]\s*([A-Za-z0-9_-]{4,32})/i);
  if (!kodEslesme?.[1]) return null;

  const adEslesme = metin.match(/^(.+?)\s+ajansına\s+davet/i);
  return {
    kod: kodEslesme[1].trim().toUpperCase(),
    ajansAdi: adEslesme?.[1]?.trim() || null,
  };
}
