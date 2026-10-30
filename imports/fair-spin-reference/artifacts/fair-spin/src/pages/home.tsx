import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { Wheel } from '@/components/wheel';
import { FairnessDialog } from '@/components/fairness-dialog';
import { HighWinOverlay } from '@/components/high-win-overlay';
import { useGameStore } from '@/store/use-game-store';
import { formatCurrency } from '@/lib/utils';
import { audioManager } from '@/lib/audio';
import { 
  useGetFairSpinConfig, 
  useCreateFairSpin, 
  useGetFairSpinAudit, 
  getGetFairSpinAuditQueryKey 
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Coins } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const DENOMINATIONS = [10, 100, 1000, 10000, 100000];

export default function Home() {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [spinning, setSpinning] = useState(false);
  const [targetSegmentId, setTargetSegmentId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showHighWin, setShowHighWin] = useState(false);

  const { balance, updateBalance, clientSeed } = useGameStore();
  const queryClient = useQueryClient();

  const { data: config, isLoading: configLoading } = useGetFairSpinConfig();
  const { data: auditLogs } = useGetFairSpinAudit();
  
  const createSpin = useCreateFairSpin();

  const handleSpin = () => {
    if (!config || spinning) return;
    
    if (betAmount <= 0 || betAmount > balance || betAmount < config.minBet || betAmount > config.maxBet) {
      alert("Geçersiz bahis miktarı veya yetersiz bakiye.");
      return;
    }

    setSpinning(true);
    setTargetSegmentId(null);
    setLastResult(null);
    setShowResultDialog(false);
    setShowHighWin(false);
    updateBalance(-betAmount);

    // Stop any existing sounds to ensure a clean start
    audioManager.stopSpin();

    // Start UI Countdown
    setCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        executeSpin();
      }
    }, 800);
  };

  const executeSpin = () => {
    if (!config) return;
    const selectedSegmentIds = config.segments.map(s => s.id);

    createSpin.mutate({
      data: {
        bet: betAmount,
        selectedSegmentIds,
        clientSeed
      }
    }, {
      onSuccess: (result) => {
        // Target received. Wheel component watches this state and triggers rotation + sync audio
        setTargetSegmentId(result.segmentId);
      },
      onError: () => {
        setSpinning(false);
        audioManager.stopSpin();
        updateBalance(betAmount); // refund
        alert("Bağlantı hatası oluştu. Bahsiniz iade edildi.");
      }
    });
  };

  const onSpinEnd = () => {
    setSpinning(false);
    
    // Explicitly reset audio to be ready for the next round
    audioManager.stopSpin();
    
    if (createSpin.data) {
      const res = createSpin.data;
      setLastResult(res);
      
      if (res.payout > 0) {
        updateBalance(res.payout);
      }

      const isHighWin = res.multiplier >= 15 || res.payout >= betAmount * 5;
      
      if (isHighWin) {
        setShowHighWin(true);
      } else {
        setShowResultDialog(true);
      }
      
      queryClient.invalidateQueries({ queryKey: getGetFairSpinAuditQueryKey() });
    }
  };

  if (configLoading) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/50">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs uppercase tracking-widest font-bold">Sistem Yükleniyor</span>
        </div>
      </Layout>
    );
  }

  if (!config) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-medium">Sunucu bağlantısı sağlanamadı.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={`flex-1 flex flex-col w-full h-full ${showHighWin ? 'animate-shake' : ''}`}>
        
        {/* Game Area (Top 60%) */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <Wheel 
            segments={config.segments} 
            spinning={spinning} 
            targetSegmentId={targetSegmentId}
            onSpinEnd={onSpinEnd}
            countdown={countdown}
          />
        </div>

        {/* Premium Control Console (Bottom 40%) */}
        <div className="w-full premium-console rounded-t-3xl pt-6 pb-6 px-4 flex flex-col relative z-20">
          
          {/* Action Row: Balance, Fairness, Rebet */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 metallic-panel rounded-2xl p-3 flex flex-col justify-center h-16">
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1">Cüzdan</span>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400/80" />
                <span className="text-lg font-mono font-black text-white/90 truncate">
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleSpin}
              disabled={spinning}
              className="glossy-button flex-[1.5] h-16 rounded-2xl font-black text-lg uppercase tracking-wider relative overflow-hidden group disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
              <span className="relative z-10">{spinning ? '...' : 'TEKRAR BAHİS'}</span>
            </button>
            
            <div className="h-16 flex items-center justify-center">
              <FairnessDialog />
            </div>
          </div>

          {/* Chips Row */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-white/60 font-medium">Seçili Tutar: <span className="text-white font-bold">{formatCurrency(betAmount)}</span></span>
              <span className="text-[9px] text-white/30 font-mono">Limit: {config.minBet}-{config.maxBet}</span>
            </div>
            <div className="flex gap-2 justify-between">
              {DENOMINATIONS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={spinning}
                  className={`flex-1 aspect-square max-h-[55px] rounded-xl chip-button flex flex-col items-center justify-center text-white/60 transition-all disabled:opacity-50 ${betAmount === amount ? 'active' : ''}`}
                >
                  <span className="text-[11px] font-black font-mono leading-none tracking-tight">
                    {amount >= 1000 ? `${amount/1000}K` : amount}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent History Strip */}
          <div className="w-full h-10 metallic-panel rounded-xl px-3 flex items-center overflow-x-auto gap-2 no-scrollbar border-white/5">
            <span className="text-[8px] uppercase text-white/40 font-bold tracking-[0.2em] pr-2 border-r border-white/10">Geçmiş</span>
            {auditLogs?.slice(0, 10).map((log) => (
              <div key={log.spinId} className="shrink-0 text-[10px] font-mono font-bold text-white/70">
                {log.multiplier}x
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Result Overlays */}
      {showHighWin && lastResult && (
        <HighWinOverlay 
          multiplier={lastResult.multiplier} 
          payout={lastResult.payout} 
          onClose={() => setShowHighWin(false)} 
        />
      )}

      {/* Standard Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-xs metallic-panel text-white rounded-3xl overflow-hidden border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-6">
          <div className="relative z-10 flex flex-col items-center text-center">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold mb-6">İşlem Tamamlandı</h3>
            
            <div className="w-20 h-20 rounded-full champagne-rim flex items-center justify-center bg-[#0a0a0f] mb-6 shadow-inner">
               <span className="text-3xl font-light text-white">{lastResult?.multiplier}x</span>
            </div>

            <div className="w-full mb-8">
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1">Kazanılan Bakiye</p>
              <p className={`text-3xl font-mono font-light tracking-tight ${lastResult?.payout > 0 ? 'text-white' : 'text-white/30'}`}>
                {formatCurrency(lastResult?.payout || 0)}
              </p>
            </div>

            <Button onClick={() => setShowResultDialog(false)} className="w-full glossy-button rounded-xl h-12 text-sm font-bold tracking-wider">
              KAPAT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
