import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../lib/constants';

const ODUL_METNI: Record<string, string> = {
  coin: 'Hesabına eklendi!',
  gem: 'Envanterine eklendi!',
  energy: 'Enerjin yenilendi!',
  boost: '5 dakika aktif!',
  multiplier: '5 dakika aktif!',
};

export const RewardPopup = () => {
  const selectedReward = useGameStore((s) => s.selectedReward);
  const isSpinning = useGameStore((s) => s.isSpinning);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!selectedReward || isSpinning) {
      setShow(false);
      return;
    }
    setShow(true);
    const timer = window.setTimeout(() => setShow(false), 2500);
    return () => window.clearTimeout(timer);
  }, [selectedReward, isSpinning]);

  return (
    <AnimatePresence>
      {show && selectedReward ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative rounded-3xl px-8 py-6 text-center"
            style={{
              background: `linear-gradient(135deg, ${COLORS.bgMid} 0%, ${COLORS.primaryDark} 100%)`,
              border: `4px solid ${selectedReward.color}`,
              boxShadow: `0 0 60px ${selectedReward.color}cc`,
            }}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          >
            <p className="mb-2 text-sm font-bold uppercase tracking-widest" style={{ color: COLORS.gold }}>
              Tebrikler!
            </p>
            <motion.div
              className="mb-3 text-7xl"
              animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              {selectedReward.icon}
            </motion.div>
            <p className="mb-2 text-3xl font-black text-white">{selectedReward.label}</p>
            <p className="text-sm text-white/70">{ODUL_METNI[selectedReward.type]}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
