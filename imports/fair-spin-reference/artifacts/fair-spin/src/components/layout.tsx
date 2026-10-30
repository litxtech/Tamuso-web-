import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Sparkles, History, Settings, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '@/store/use-game-store';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { soundEnabled, setSoundEnabled, hasInteracted, registerInteraction } = useGameStore();

  useEffect(() => {
    const handleFirstClick = () => {
      registerInteraction();
    };
    
    if (!hasInteracted) {
      window.addEventListener('pointerdown', handleFirstClick, { once: true });
      return () => window.removeEventListener('pointerdown', handleFirstClick);
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  }, [hasInteracted, registerInteraction]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden text-white font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Refined Ambient Light & Particles Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep, sweeping light gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[60vh] bg-[radial-gradient(ellipse_at_center,rgba(60,60,90,0.25),transparent_60%)] transform -rotate-12" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50vh] bg-[radial-gradient(ellipse_at_center,rgba(40,30,60,0.3),transparent_70%)] transform rotate-12" />
        
        {/* Subtle cinematic vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.95)] pointer-events-none mix-blend-multiply" />
      </div>

      <header className="sticky top-0 z-50 w-full bg-black/40 border-b border-white/5 backdrop-blur-xl">
        <div className="container max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer z-10">
            <div className="w-7 h-7 rounded-full champagne-rim flex items-center justify-center text-yellow-600 shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-[13px] tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50">
              FAIR SPIN
            </span>
          </Link>

          <nav className="flex items-center gap-1 z-10">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-full transition-colors hover:bg-white/10 text-white/50 hover:text-white"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <Link href="/">
              <button className={`p-1.5 rounded-full transition-colors ${location === '/' ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-white/50 hover:text-white'}`}>
                <History className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/admin">
              <button className={`p-1.5 rounded-full transition-colors ${location === '/admin' ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-white/50 hover:text-white'}`}>
                <Settings className="w-4 h-4" />
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main app container, restricted max width for pure portrait layout */}
      <main className="flex-1 w-full max-w-md mx-auto relative z-10 flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] bg-transparent">
        {children}
      </main>
    </div>
  );
}
