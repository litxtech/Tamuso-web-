import React, { useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { audioManager } from '@/lib/audio';

interface HighWinOverlayProps {
  multiplier: number;
  payout: number;
  onClose: () => void;
}

export function HighWinOverlay({ multiplier, payout, onClose }: HighWinOverlayProps) {
  useEffect(() => {
    audioManager.playLightning();
    
    // Auto-clear after cinematic celebration finishes
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Deep Cinematic Background */}
      <div className="absolute inset-0 bg-[#0a0515]/90 animate-cinematic-flash mix-blend-multiply" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(45,20,80,0.8),transparent_70%)] animate-cinematic-flash" />

      {/* Elegant Golden/Cyan Energy Lines (Replacing jagged lightning) */}
      <div className="absolute inset-0 opacity-80 mix-blend-screen">
        <svg className="w-full h-full" style={{ filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.8)) drop-shadow(0 0 20px rgba(0,255,255,0.4))' }}>
          <path d="M-100,200 Q150,300 400,100 T900,250" stroke="url(#goldGradient)" strokeWidth="2" fill="none" className="animate-cinematic-flash" />
          <path d="M-100,600 Q200,500 500,700 T1000,550" stroke="url(#cyanGradient)" strokeWidth="1.5" fill="none" className="animate-cinematic-flash" style={{ animationDelay: '0.2s' }} />
          
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="50%" stopColor="#f8e7b5" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Expanding Energy Waves */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-yellow-500/50 animate-energy-wave" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-cyan-400/40 animate-energy-wave" style={{ animationDelay: '0.4s' }} />

      {/* Celebration Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center animate-in zoom-in-75 slide-in-from-bottom-5 duration-700 ease-out">
        <h2 className="text-3xl md:text-4xl font-light tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 drop-shadow-[0_2px_10px_rgba(255,215,0,0.4)] mb-4">
          PREMIUM KAZANÇ
        </h2>
        
        <div className="w-36 h-36 rounded-full champagne-rim flex items-center justify-center bg-black/80 shadow-[0_0_60px_rgba(200,170,110,0.4)] mb-8 transform scale-105">
           <span className="text-6xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tighter pr-1">
             {multiplier}x
           </span>
        </div>

        <div className="space-y-2 metallic-panel px-10 py-5 rounded-2xl border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <p className="text-xs text-white/50 font-bold uppercase tracking-[0.2em]">Ödül Tutarı</p>
          <p className="text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-sm">
            {formatCurrency(payout)}
          </p>
        </div>
      </div>
    </div>
  );
}
