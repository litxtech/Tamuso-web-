import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../lib/constants';

const AnimatedNumber = ({ value, icon }: { value: number; icon: string }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const start = displayValue;
    if (value === start) return;
    setIsAnimating(true);
    const diff = value - start;
    const steps = 20;
    let currentStep = 0;
    const interval = window.setInterval(() => {
      currentStep += 1;
      if (currentStep >= steps) {
        setDisplayValue(value);
        setIsAnimating(false);
        window.clearInterval(interval);
        return;
      }
      setDisplayValue(start + (diff * currentStep) / steps);
    }, 30);
    return () => window.clearInterval(interval);
    // Animasyon yalnızca hedef değer değişince başlar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatValue = (val: number): string => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return Math.floor(val).toString();
  };

  return (
    <motion.div
      className={`flex items-center gap-1.5 rounded-full border bg-black/40 px-3 py-1.5 backdrop-blur-sm ${
        isAnimating ? 'border-[#ffd700]' : 'border-[#ffd700]/40'
      }`}
      animate={isAnimating ? { scale: [1, 1.05, 1] } : undefined}
      transition={{ duration: 0.3 }}
    >
      <span className="text-base">{icon}</span>
      <span className={`text-sm font-bold ${isAnimating ? 'text-[#ffd700]' : 'text-white'}`}>
        {formatValue(displayValue)}
      </span>
    </motion.div>
  );
};

export const TopBar = () => {
  const player = useGameStore((s) => s.player);

  return (
    <div className="flex w-full items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <AnimatedNumber value={player.coins} icon="🪙" />
        <AnimatedNumber value={player.gems} icon="💎" />
      </div>
      <div className="flex items-center gap-2">
        <AnimatedNumber value={player.energy} icon="⚡" />
        <motion.div
          className="rounded-full border px-3 py-1.5"
          style={{ background: 'rgba(255,215,0,0.2)', borderColor: COLORS.gold }}
          whileHover={{ scale: 1.05 }}
        >
          <span className="text-sm font-bold" style={{ color: COLORS.gold }}>
            Lv. {player.level}
          </span>
        </motion.div>
      </div>
    </div>
  );
};
