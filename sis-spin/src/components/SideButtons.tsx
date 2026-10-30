import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSound } from '../hooks/useSound';
import { useGameStore } from '../store/gameStore';
import { boostAktifEt } from '../lib/boost';
import { COLORS } from '../lib/constants';
import { useOyunHazir } from '../hooks/useHydrated';

export const SideButtons = () => {
  const hazir = useOyunHazir();
  const { play } = useSound();
  const multiplier = useGameStore((s) => s.player.multiplier);
  const claimDailyBonus = useGameStore((s) => s.claimDailyBonus);
  const lastDailyBonus = useGameStore((s) => s.player.lastDailyBonus);
  const [mesaj, setMesaj] = useState('');
  const bonusHazir = lastDailyBonus !== new Date().toDateString();
  const boostActive = multiplier > 1;

  const handleBoost = () => {
    if (!hazir) return;
    play('click');
    if (boostActive) return;
    boostAktifEt(2);
    setMesaj('2x çarpan 5 dakika aktif');
  };

  const handleGift = () => {
    if (!hazir) return;
    const alindi = claimDailyBonus();
    if (alindi) {
      play('coinWin');
      setMesaj('Günlük bonus: +5.000 coin, +10 çevirme');
      return;
    }
    play('error');
    setMesaj('Günlük bonus zaten alındı');
  };

  return (
    <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3">
      <motion.button
        type="button"
        onClick={handleBoost}
        aria-label="Çarpan"
        className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-2xl shadow-lg backdrop-blur-sm ${
          boostActive ? 'border-[#ffd700] bg-[#ffd700]/30' : 'border-[#da70d6] bg-[#4b0082]/80'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={
          boostActive
            ? {
                boxShadow: [
                  '0 0 15px rgba(255,215,0,0.5)',
                  '0 0 30px rgba(255,215,0,0.9)',
                  '0 0 15px rgba(255,215,0,0.5)',
                ],
              }
            : undefined
        }
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        🚀
        {boostActive ? (
          <motion.div
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-black"
            style={{ background: COLORS.gold }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            x{multiplier}
          </motion.div>
        ) : null}
      </motion.button>

      <motion.button
        type="button"
        onClick={handleGift}
        aria-label="Günlük hediye"
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#da70d6] bg-[#4b0082]/80 text-2xl shadow-lg backdrop-blur-sm"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        🎁
        {bonusHazir ? (
          <motion.div
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            !
          </motion.div>
        ) : null}
      </motion.button>

      {mesaj ? (
        <p className="absolute right-16 top-1/2 w-40 -translate-y-1/2 rounded-2xl bg-black/70 px-3 py-2 text-xs font-semibold text-white">
          {mesaj}
        </p>
      ) : null}
    </div>
  );
};
