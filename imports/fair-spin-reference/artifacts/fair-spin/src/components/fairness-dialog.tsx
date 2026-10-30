import React, { useState } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/store/use-game-store';

export function FairnessDialog() {
  const { clientSeed, regenerateClientSeed } = useGameStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(clientSeed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20 text-white/70 hover:text-white shadow-inner backdrop-blur-sm">
          <ShieldCheck className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md metallic-panel border-cyan-500/30 rounded-2xl text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-400">
            <ShieldCheck className="w-5 h-5 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
            Adil Oyun Ayarları
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-bold text-white/70 block mb-1">İstemci Tohumu (Client Seed)</label>
            <p className="text-[11px] text-white/50 mb-3 leading-relaxed">
              Sonuçları etkilemek için kendi cihazınızdan üretilen rastgele değer. İstediğiniz zaman değiştirebilirsiniz.
            </p>
            <div className="flex gap-2">
              <Input 
                readOnly 
                value={clientSeed} 
                className="font-mono text-xs bg-black/50 border-white/10 text-white/90 placeholder:text-white/30 h-10 shadow-inner" 
              />
              <Button variant="outline" size="icon" onClick={handleCopy} className="h-10 w-10 bg-black/50 border-white/10 hover:bg-white/20 hover:text-white transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/70" />}
              </Button>
            </div>
            <Button variant="secondary" size="sm" className="w-full mt-3 h-10 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 font-bold tracking-wide transition-colors" onClick={regenerateClientSeed}>
              YENİ TOHUM ÜRET
            </Button>
          </div>

          <div className="bg-black/30 rounded-xl p-4 text-sm space-y-2 border border-white/5 shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
            <h4 className="font-bold text-white/90 relative z-10 text-xs uppercase tracking-wider">Nasıl Çalışır?</h4>
            <p className="text-white/50 text-[11px] leading-relaxed relative z-10">
              Her dönüş, sunucu tohumu (server seed) ve sizin istemci tohumunuzun (client seed) kriptografik olarak birleştirilmesiyle hesaplanır.
              Sonuçlar oyun öncesinde belirlenir ve şeffaf bir şekilde doğrulanabilir.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
