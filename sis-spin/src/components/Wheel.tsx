import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { COLORS, REWARDS } from '../lib/constants';

const SPIN_EASE = [0.12, 0.7, 0.08, 1] as const;

export const Wheel = () => {
  const currentRotation = useGameStore((s) => s.currentRotation);
  const isSpinning = useGameStore((s) => s.isSpinning);
  const selectedReward = useGameStore((s) => s.selectedReward);
  const slice = 360 / REWARDS.length;

  return (
    <div className="relative mx-auto flex h-[270px] w-[270px] items-center justify-center">
      <div className="absolute left-1/2 top-[-18px] z-30 -translate-x-1/2">
        <div
          className="h-0 w-0 border-l-[18px] border-r-[18px] border-t-[36px] border-l-transparent border-r-transparent"
          style={{
            borderTopColor: COLORS.gold,
            filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.9))',
          }}
        />
      </div>

      <div
        className="absolute inset-0 rounded-full p-[8px]"
        style={{
          background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldDark} 50%, ${COLORS.gold} 100%)`,
          boxShadow: '0 0 40px rgba(255,215,0,0.6)',
        }}
      >
        <motion.div
          className="relative h-full w-full overflow-hidden rounded-full"
          animate={{ rotate: currentRotation }}
          transition={{ duration: 4, ease: SPIN_EASE }}
          style={{
            background: `conic-gradient(${REWARDS.map((reward, index) => {
              const start = index * slice;
              const end = (index + 1) * slice;
              return `${reward.color} ${start}deg ${end}deg`;
            }).join(', ')})`,
          }}
        >
          {REWARDS.map((reward, index) => {
            const angle = index * slice + slice / 2;
            const rad = ((angle - 90) * Math.PI) / 180;
            const radius = 88;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            return (
              <div
                key={reward.id}
                className="pointer-events-none absolute left-1/2 top-1/2 flex flex-col items-center justify-center"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${angle}deg)`,
                }}
              >
                <span className="text-2xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                  {reward.icon}
                </span>
                <span
                  className="whitespace-nowrap text-xs font-bold text-white"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                >
                  {reward.label}
                </span>
              </div>
            );
          })}

          {REWARDS.map((reward, index) => (
            <div
              key={`divider-${reward.id}`}
              className="absolute left-1/2 top-0 h-1/2 w-[2px] origin-bottom bg-white/40"
              style={{ transform: `translateX(-50%) rotate(${index * slice}deg)` }}
            />
          ))}
        </motion.div>
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `linear-gradient(135deg, ${COLORS.bgMid} 0%, ${COLORS.primaryDark} 100%)`,
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)',
        }}
      />

      {isSpinning ? (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              '0 0 20px rgba(255,215,0,0.3)',
              '0 0 60px rgba(255,215,0,0.8)',
              '0 0 20px rgba(255,215,0,0.3)',
            ],
          }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      ) : null}

      {selectedReward && !isSpinning ? (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 1] }}
          transition={{ duration: 1.5 }}
          style={{
            background: `radial-gradient(circle, ${selectedReward.color}66, transparent 70%)`,
          }}
        />
      ) : null}
    </div>
  );
};
