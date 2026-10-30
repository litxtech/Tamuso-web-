import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Wheel } from './components/Wheel';
import { SpinButton } from './components/SpinButton';
import { RewardPopup } from './components/RewardPopup';
import { BottomMenu } from './components/BottomMenu';
import { SideButtons } from './components/SideButtons';
import { useCoins } from './hooks/useCoins';
import { useOyunHazir } from './hooks/useHydrated';
import { COLORS } from './lib/constants';

function App() {
  const hazir = useOyunHazir();
  const { checkDailyBonus, claimDailyBonus } = useCoins();

  useEffect(() => {
    if (!hazir) return;
    if (checkDailyBonus()) {
      const timer = window.setTimeout(() => claimDailyBonus(), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [hazir, checkDailyBonus, claimDailyBonus]);

  return (
    <div
      className="flex min-h-screen items-center justify-center overflow-hidden p-2"
      style={{
        background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, ${COLORS.bgMid} 50%, ${COLORS.primaryDark} 100%)`,
      }}
    >
      <div
        className="relative flex h-[95vh] max-h-[850px] w-full max-w-[420px] flex-col overflow-hidden rounded-[32px]"
        style={{
          background: `linear-gradient(180deg, ${COLORS.bgMid} 0%, ${COLORS.bgDark} 100%)`,
          border: `4px solid ${COLORS.primary}`,
          boxShadow: '0 0 60px rgba(138,43,226,0.6)',
        }}
      >
        <TopBar />

        <div className="relative flex flex-1 flex-col items-center justify-center px-4">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div
              className="absolute left-1/4 top-1/4 h-40 w-40 rounded-full blur-[100px]"
              style={{ background: COLORS.primaryLight }}
            />
            <div
              className="absolute bottom-1/4 right-1/4 h-40 w-40 rounded-full blur-[100px]"
              style={{ background: COLORS.gold }}
            />
          </div>

          <div className="relative">
            <Wheel />
            <SpinButton />
          </div>
        </div>

        <SideButtons />
        <BottomMenu />
        <RewardPopup />
      </div>
    </div>
  );
}

export default App;
