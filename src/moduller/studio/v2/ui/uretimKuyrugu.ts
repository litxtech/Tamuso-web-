const dinleyen = new Set<string>();
const sahipli = new Set<string>();
const haber = new Set<string>();
const ozetler = new Map<string, UretimOzet>();
const dinleyiciler = new Set<() => void>();

export type UretimOzet = {
  status: string;
  yuzde: number | null;
  eta: {
    remainingSeconds: number;
    minSeconds: number;
    maxSeconds: number;
    confidence: 'measured' | 'low' | 'estimating' | 'unknown' | 'done' | 'stopped';
  } | null;
};

const CALISAN = ['PLANNING', 'GENERATING_ASSETS', 'BUILDING_SCENE', 'BUILDING_GAMEPLAY', 'SCANNING'];

export function uretimCalisiyor(status: string) {
  return CALISAN.includes(status);
}

export function uretimSahiplen(id: string) {
  sahipli.add(id);
  return () => {
    sahipli.delete(id);
  };
}

export function uretimArkaPlan(id: string) {
  dinleyen.add(id);
  bildir();
}

export function uretimBirak(id: string) {
  dinleyen.delete(id);
  bildir();
}

export function uretimIzlenenler() {
  return [...dinleyen].filter((id) => !sahipli.has(id));
}

export function uretimOzet(id: string) {
  return ozetler.get(id) ?? null;
}

export function uretimOzetYaz(id: string, ozet: UretimOzet) {
  ozetler.set(id, ozet);
  if (!uretimCalisiyor(ozet.status)) dinleyen.delete(id);
  bildir();
}

export function uretimHaberVerildi(id: string) {
  if (haber.has(id)) return true;
  haber.add(id);
  return false;
}

export function uretimeAboneOl(fn: () => void) {
  dinleyiciler.add(fn);
  return () => {
    dinleyiciler.delete(fn);
  };
}

function bildir() {
  dinleyiciler.forEach((fn) => fn());
}
