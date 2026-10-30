import { useCallback, useEffect } from 'react';
import { Howl, Howler } from 'howler';
import { useGameStore } from '../store/gameStore';
import { SOUNDS } from '../lib/constants';

const SES_ADLARI = [
  'spinStart',
  'spinLoop',
  'spinStop',
  'coinWin',
  'gemWin',
  'jackpot',
  'click',
  'error',
  'levelUp',
] as const;

type SesAdi = (typeof SES_ADLARI)[number];

let sesler: Partial<Record<SesAdi, Howl>> | null = null;
let muzik: Howl | null = null;
let kullaniciSayisi = 0;

function howlOlustur(src: string, volume: number, loop = false): Howl {
  return new Howl({
    src: [src],
    volume,
    loop,
    preload: true,
    onloaderror: () => undefined,
    onplayerror: () => undefined,
  });
}

function sesleriKur(): void {
  if (sesler) return;
  sesler = {
    spinStart: howlOlustur(SOUNDS.spinStart, 0.6),
    spinLoop: howlOlustur(SOUNDS.spinLoop, 0.4, true),
    spinStop: howlOlustur(SOUNDS.spinStop, 0.7),
    coinWin: howlOlustur(SOUNDS.coinWin, 0.8),
    gemWin: howlOlustur(SOUNDS.gemWin, 0.8),
    jackpot: howlOlustur(SOUNDS.jackpot, 1),
    click: howlOlustur(SOUNDS.click, 0.5),
    error: howlOlustur(SOUNDS.error, 0.6),
    levelUp: howlOlustur(SOUNDS.levelUp, 0.9),
  };
  muzik = howlOlustur(SOUNDS.backgroundMusic, 0.2, true);
}

function sesleriBirak(): void {
  if (!sesler) return;
  for (const ad of SES_ADLARI) sesler[ad]?.unload();
  muzik?.unload();
  sesler = null;
  muzik = null;
}

function cal(ad: string): void {
  if (!useGameStore.getState().soundEnabled || !sesler) return;
  const ses = sesler[ad as SesAdi];
  if (!ses || ses.state() === 'unloaded') return;
  try {
    ses.play();
  } catch {
    /* dosya yoksa sessiz kal */
  }
}

export const useSound = () => {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const musicEnabled = useGameStore((s) => s.musicEnabled);

  useEffect(() => {
    kullaniciSayisi += 1;
    sesleriKur();
    return () => {
      kullaniciSayisi -= 1;
      if (kullaniciSayisi <= 0) {
        kullaniciSayisi = 0;
        sesleriBirak();
      }
    };
  }, []);

  useEffect(() => {
    Howler.mute(!soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (!muzik) return;
    if (musicEnabled && soundEnabled && muzik.state() === 'loaded') muzik.play();
    else muzik.pause();
  }, [musicEnabled, soundEnabled]);

  const play = useCallback((name: string) => {
    cal(name);
  }, []);

  const stop = useCallback((name: string) => {
    sesler?.[name as SesAdi]?.stop();
  }, []);

  const playRewardSound = useCallback(
    (type: string, value: number) => {
      if (type === 'coin' && value >= 100000) play('jackpot');
      else if (type === 'gem') play('gemWin');
      else play('coinWin');
    },
    [play],
  );

  return { play, stop, playRewardSound };
};
