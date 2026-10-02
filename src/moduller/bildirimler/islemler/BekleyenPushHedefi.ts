/**
 * Push bildirimi tıklanınca hedef rota — cold start'ta splash / auth
 * yönlendirmesi ezmeden önce saklanır.
 */

let bekleyen: string | null = null;
const islenenYanitlar = new Set<string>();
/** app/index ilk yönlendirmeyi bitirene kadar warm listener hemen gitmesin */
let navigasyonKapisiAcik = false;

export function BekleyenPushHedefiAyarla(href: string | null) {
  const v = typeof href === 'string' ? href.trim() : '';
  bekleyen = v || null;
}

export function BekleyenPushHedefiAl(): string | null {
  return bekleyen;
}

export function BekleyenPushHedefiAlVeTemizle(): string | null {
  const v = bekleyen;
  bekleyen = null;
  return v;
}

export function PushNavigasyonKapisiAc(): void {
  navigasyonKapisiAcik = true;
}

export function PushNavigasyonKapisiAcikMi(): boolean {
  return navigasyonKapisiAcik;
}

/** Aynı OS yanıtını iki kez işlemeyi engelle (cold + listener). */
export function PushYanitiIslendiMi(anahtar: string): boolean {
  if (!anahtar) return false;
  if (islenenYanitlar.has(anahtar)) return true;
  islenenYanitlar.add(anahtar);
  if (islenenYanitlar.size > 40) {
    const ilk = islenenYanitlar.values().next().value as string | undefined;
    if (ilk) islenenYanitlar.delete(ilk);
  }
  return false;
}
