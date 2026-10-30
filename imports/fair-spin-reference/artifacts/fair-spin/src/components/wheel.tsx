import React, { useEffect, useRef, useState } from 'react';
import type { FairSpinSegment } from '@workspace/api-client-react';
import { Camera, Crown, Gem, Gift, Heart, Rocket, Star, Trophy, PartyPopper, Gamepad2 } from 'lucide-react';
import { audioManager } from '@/lib/audio';

interface WheelProps {
  segments: FairSpinSegment[];
  spinning: boolean;
  targetSegmentId: string | null;
  onSpinEnd: () => void;
  countdown: number | null;
}

const ICONS = [Crown, Gem, Gift, Heart, Rocket, Star, Trophy, PartyPopper, Camera, Gamepad2];

export function Wheel({ segments, spinning, targetSegmentId, onSpinEnd, countdown }: WheelProps) {
  const [rotation, setRotation] = useState(0);
  const onSpinEndRef = useRef(onSpinEnd);
  const numSegments = segments.length || 8;
  const sliceAngle = 360 / numSegments;

  useEffect(() => {
    onSpinEndRef.current = onSpinEnd;
  }, [onSpinEnd]);

  useEffect(() => {
    if (spinning && targetSegmentId && numSegments > 0) {
      const targetIndex = segments.findIndex(s => s.id === targetSegmentId);
      if (targetIndex === -1) return;

      // Use functional state update to avoid dependency issues
      setRotation(prev => {
        const currentMod = prev % 360;
        const targetAngle = 360 - (targetIndex * sliceAngle);
        
        const spins = 360 * 6; // 6 full spins
        const newRot = prev + spins + (targetAngle - currentMod);
        
        // Random offset within the segment safe zone
        const offset = (Math.random() * (sliceAngle * 0.7)) - (sliceAngle * 0.35);
        return newRot + offset;
      });

      // EXACT AUDIO SYNC: Start the synchronized spin audio right as the CSS transform begins
      audioManager.playSpin();

      // CSS transition is exactly 5000ms. End event fires exactly at the finish line.
      const endTimeout = setTimeout(() => {
        onSpinEndRef.current();
      }, 5000);

      return () => {
        clearTimeout(endTimeout);
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  }, [spinning, targetSegmentId, segments, numSegments, sliceAngle]);

  if (numSegments === 0) return null;

  return (
    <div className="relative w-full max-w-[340px] aspect-square mx-auto my-6 select-none z-10">
      
      {/* Decorative Outer Shadow & Ambient Glow */}
      <div className="absolute inset-[-20px] rounded-full bg-black/40 blur-xl opacity-80" />
      <div className="absolute inset-[-10px] rounded-full bg-yellow-500/5 blur-2xl" />
      
      {/* Premium Pointer Assembly (Top Center) */}
      <div className="absolute top-[-25px] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]">
        {/* Mount */}
        <div className="w-12 h-6 bg-gradient-to-b from-[#3a3a4a] to-[#1a1a25] rounded-t-lg shadow-inner border border-white/10 flex items-center justify-center">
          <div className="w-8 h-1 bg-black/60 rounded-full" />
        </div>
        {/* Pointer Blade */}
        <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-[#e6ce92] -mt-1 relative drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)]">
           <div className="absolute top-[-22px] left-[-7px] w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[18px] border-t-white/40" />
        </div>
      </div>
      
      {/* Main Wheel Chassis */}
      <div className="w-full h-full rounded-full relative shadow-[0_25px_60px_rgba(0,0,0,0.95)] champagne-rim p-[4px] bg-[#111]">
        
        {/* Rotating Track */}
        <div
          className="w-full h-full rounded-full transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1)] brushed-metal overflow-hidden relative shadow-[inset_0_0_40px_rgba(0,0,0,0.9)]"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? '5000ms' : '0ms',
          }}
        >
          {/* Subtle division lines underneath medallions */}
          {segments.map((_, index) => (
             <div 
               key={`div-${index}`}
               className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/5"
               style={{ transform: `translateX(-50%) rotate(${index * (360/numSegments) + (180/numSegments)}deg)` }}
             />
          ))}

          {/* Segments/Spokes and Medallions */}
          {segments.map((segment, index) => {
            const angle = index * sliceAngle;
            const Icon = ICONS[index % ICONS.length];
            
            return (
              <div
                key={segment.id}
                className="absolute top-0 left-1/2 w-0 h-[50%] origin-bottom"
                style={{
                  transform: `translateX(-50%) rotate(${angle}deg)`,
                }}
              >
                {/* Embedded Prize Medallion */}
                <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[55px] h-[75px] rounded-full prize-medallion flex flex-col items-center justify-center p-1"
                     style={{
                       background: `linear-gradient(160deg, rgba(255,255,255,0.05), rgba(0,0,0,0.6)), ${segment.color || 'transparent'}`,
                       backgroundBlendMode: 'overlay'
                     }}>
                  
                  {/* Glass Reflection Arc */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[80%] h-[30%] bg-gradient-to-b from-white/30 to-transparent rounded-full opacity-60" />

                  {/* Counter-rotating container */}
                  <div
                    className="flex flex-col items-center justify-center w-full h-full transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1)] z-10"
                    style={{
                      transform: `rotate(${-rotation - angle}deg)`,
                      transitionDuration: spinning ? '5000ms' : '0ms',
                    }}
                  >
                    <Icon className="w-5 h-5 text-white/90 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)] mb-1" strokeWidth={2} />
                    <span className="text-[10px] font-black text-white tracking-tighter bg-black/50 px-2 py-0.5 rounded-full border border-white/10 shadow-sm">
                      {segment.multiplier}x
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Center Hub (Illuminated Mechanism) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full champagne-rim z-20 flex flex-col items-center justify-center bg-[#0a0a0f] shadow-[0_15px_35px_rgba(0,0,0,0.95)] p-1.5">
          <div className="w-full h-full rounded-full glass-lens flex flex-col items-center justify-center overflow-hidden relative">
            {/* Digital grid background inside lens */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4px_4px] opacity-30" />
            
            <div className="relative z-10 flex flex-col items-center">
              {countdown !== null ? (
                <>
                  <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-[0.2em] mb-0.5">Sistem</span>
                  <span className="text-4xl font-light font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">{countdown}</span>
                </>
              ) : (
                <div className="flex flex-col items-center opacity-80">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse mb-1 shadow-[0_0_8px_rgba(34,211,238,1)]" />
                  <span className="text-[7px] text-white/50 uppercase tracking-[0.3em] font-medium">Hazır</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
