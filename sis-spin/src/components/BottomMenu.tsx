import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSound } from '../hooks/useSound';
import { COLORS } from '../lib/constants';

const MENU_ITEMS = [
  { id: 'home', icon: '🏠', label: 'Ana Sayfa' },
  { id: 'wheel', icon: '🎰', label: 'Çark' },
  { id: 'shop', icon: '🛒', label: 'Market' },
  { id: 'friends', icon: '👥', label: 'Arkadaşlar' },
  { id: 'profile', icon: '👤', label: 'Profil' },
];

export const BottomMenu = () => {
  const [active, setActive] = useState('wheel');
  const { play } = useSound();

  const handleClick = (id: string) => {
    play('click');
    setActive(id);
  };

  return (
    <div className="w-full border-t border-white/10 bg-black/30 px-2 py-2 backdrop-blur-md">
      <div className="flex items-center justify-around">
        {MENU_ITEMS.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.id)}
            className="relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1"
            whileTap={{ scale: 0.9 }}
            aria-current={active === item.id ? 'page' : undefined}
          >
            {active === item.id ? (
              <motion.div
                className="absolute -top-1 h-1 w-8 rounded-full"
                style={{ background: COLORS.gold }}
                layoutId="activeIndicator"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            ) : null}
            <span className={`text-xl ${active === item.id ? 'scale-110' : 'opacity-70'}`}>{item.icon}</span>
            <span
              className={`text-[10px] font-medium ${active === item.id ? 'text-[#ffd700]' : 'text-white/60'}`}
            >
              {item.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
