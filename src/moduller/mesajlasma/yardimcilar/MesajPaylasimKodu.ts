/** Cüzdan no (18 hane) veya kullanıcı ID paylaşımını metinden ayıklar. */

export type MesajPaylasimKodu = {
  tur: 'cuzdan' | 'id';
  deger: string;
};

export function mesajPaylasimKodu(
  body: string | null | undefined,
): MesajPaylasimKodu | null {
  if (!body) return null;
  const cuzdan = body.match(/\b(\d{4}(?:\s\d{4}){3}|\d{18})\b/);
  if (cuzdan?.[1]) {
    return { tur: 'cuzdan', deger: cuzdan[1].replace(/\s/g, '') };
  }
  const id = body.match(/ID[^\n:]{0,24}:\s*([A-Za-z0-9_-]{3,40})/i);
  if (id?.[1]) return { tur: 'id', deger: id[1] };
  return null;
}
