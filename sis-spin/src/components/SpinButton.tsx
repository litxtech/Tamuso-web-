import { motion } from 'framer-motion';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useWheel } from '../hooks/useWheel';
import { useSound } from '../hooks/useSound';
import { COLORS } from '../lib/constants';
import { useOyunHazir } from '../hooks/useHydrated';

export const SpinButton = () => {
  const hazir = useOyunHazir();
  const spins = useGameStore((s) => s.player.spins);
  const isSpinning = useGameStore((s) => s.isSpinning);
  const { spin } = useWheel();
  const { play } = useSound();
  const [hata, setHata] = useState('');

  const handleClick = () => {
    if (!hazir || isSpinning) return;
    if (spins <= 0) {
      play('error');
      setHata('Çevirme hakkınız bitti!');
      return;
    }
    play('click');
    setHata('');
    const sonuc = spin();
    if (!sonuc.success) setHata(sonuc.error);
  };

  const disabled = !hazir || isSpinning || spins <= 0;

  return (
    <>
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={isSpinning ? 'Çark dönüyor' : 'Çevir'}
        className="absolute left-1/2 top-1/2 z-20 flex h-[90px] w-[90px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full font-bold"
        style={{
          background: disabled
            ? 'linear-gradient(135deg, #666, #888)'
            : `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldDark} 100%)`,
          color: COLORS.primaryDark,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled && !isSpinning ? 0.6 : 1,
          boxShadow: disabled ? 'none' : '0 0 25px rgba(255,215,0,0.8)',
          border: '3px solid #fff',
        }}
        whileHover={!disabled ? { scale: 1.05 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        animate={
          !disabled
            ? {
                boxShadow: [
                  '0 0 20px rgba(255,215,0,0.6)',
                  '0 0 40px rgba(255,215,0,0.9)',
                  '0 0 20px rgba(255,215,0,0.6)',
                ],
              }
            : undefined
        }
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <span className="text-3xl font-black text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {isSpinning ? '⏳' : spins}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider">
          {isSpinning ? 'Dönüyor' : 'ÇEVİR'}
        </span>
      </motion.button>
      {hata ? (
        <p className="absolute left-1/2 top-[calc(100%+12px)] z-20 w-max -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
          {hata}
        </p>
      ) : null}
    </>
  );
};
