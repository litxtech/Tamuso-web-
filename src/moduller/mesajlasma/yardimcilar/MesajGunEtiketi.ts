/** WhatsApp tarzı gün ayracı: Bugün, Dün, aksi halde yerel tarih. */

function gecerliTarih(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ayniGun(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function mesajAyniGun(
  onceki: string | null | undefined,
  simdiki: string | null | undefined,
): boolean {
  const a = gecerliTarih(onceki);
  const b = gecerliTarih(simdiki);
  if (!a || !b) return false;
  return ayniGun(a, b);
}

export function mesajGunEtiketi(
  iso: string | null | undefined,
  locale: string,
  metin: { bugun: string; dun: string },
): string | null {
  const d = gecerliTarih(iso);
  if (!d) return null;
  const simdi = new Date();
  if (ayniGun(d, simdi)) return metin.bugun;
  const dun = new Date(simdi);
  dun.setDate(simdi.getDate() - 1);
  if (ayniGun(d, dun)) return metin.dun;
  const ayniYil = d.getFullYear() === simdi.getFullYear();
  try {
    return d.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      ...(ayniYil ? {} : { year: 'numeric' }),
    });
  } catch {
    return d.toLocaleDateString();
  }
}
