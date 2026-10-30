import { useEffect, useState, type CSSProperties } from 'react';
import { CircleHelp, Minus, Plus, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { RelicSymbol, symbolNames } from './components/RelicSymbol';
import { useSlotGame } from './game/use-slot-game';
import type { Cell } from './game/engine';

const formatNumber = (value: number) => Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const roundBet = (value: number) => Math.round(value * 100) / 100;
const AUTO_COUNTS = [10, 20, 30, 50, null] as const;

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="11" stroke="currentColor" strokeWidth=".7" opacity=".7" />
      <path d="M20 2v9m0 18v9M2 20h9m18 0h9M20 10l3.4 6.6L30 20l-6.6 3.4L20 30l-3.4-6.6L10 20l6.6-3.4L20 10Z" stroke="currentColor" strokeWidth="1.3" fill="#c9ab75" fillOpacity=".32" />
      <circle cx="20" cy="20" r="2.2" fill="#e9d5a7" />
    </svg>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Kuralları kapat" data-testid="button-close-rules"><X /></button>
        <div className="eyebrow">OYUN REHBERİ / 01</div>
        <h2 id="rules-title">Göğün ritmini yakala.</h2>
        <p>Altı sütundaki mühürler aşağı düşer. Aynı sembolden ekranda herhangi bir yerde en az 8 tane görünürse bir kazanç oluşur; kazanan taşlar kaybolur ve yenileri yerlerine düşer.</p>
        <ul>
          <li>Her düşüşte yeni bir eşleşme olabilir. Zincir, eşleşme kalmayana kadar sürer.</li>
          <li>Çarpan mühürleri kazançlara güç katar. Etkin toplam çarpanı oyun alanının yanında görünür.</li>
          <li>Bir turda 4 veya daha fazla geçit sembolü, 15 ücretsiz tur başlatır.</li>
          <li>Tur bahsi en fazla 500 demo kredidir. Otomatik oynatma 10, 20, 30, 50 tur veya durdurulana kadar sürebilir; ücretsiz turlar da tur sayısına dahildir.</li>
          <li>Otomatik oynatma istenildiğinde durdurulabilir; devam eden tur tamamlanır. Bakiye yetersizse kendiliğinden durur.</li>
          <li>Turbo modu animasyonları hızlandırır. Ses düğmesi oyun seslerini açar veya kapatır.</li>
        </ul>
        <p className="modal-note">YALNIZCA DEMO · KREDİLERİN PARASAL DEĞERİ YOKTUR</p>
      </section>
    </div>
  );
}

function SlotGame() {
  const {
    board, phase, highlightIds, credits, bet, setBet, spin, muted, toggleMute,
    turbo, toggleTurbo, freeSpins, lastWin, totalMultiplier, cascades,
    statusText, history, resetDemo, isAutoPlaying, autoPlayRemaining,
    autoPlayPlayed, startAutoPlay, stopAutoPlay,
  } = useSlotGame();
  const [showHelp, setShowHelp] = useState(false);
  const [betDraft, setBetDraft] = useState<string | null>(null);
  const busy = phase !== 'idle';
  const canSpin = !busy && !isAutoPlaying && (credits >= bet || freeSpins > 0);
  const cells = board.flat() as Cell[];
  const highlighted = new Set(highlightIds);

  const adjustBet = (next: number) => setBet(roundBet(Math.max(0.2, Math.min(500, next))));
  const commitBet = () => {
    if (betDraft !== null && betDraft.trim() !== '') {
      const amount = Number(betDraft);
      if (Number.isFinite(amount)) adjustBet(amount);
    }
    setBetDraft(null);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand" aria-label="Astral Falls">
          <BrandMark />
          <span className="brand-word">ASTRAL <span>FALLS</span></span>
        </div>
        <div className="header-right">
          <span className="header-caption">GÖKSEL MÜHÜRLER KOLEKSİYONU</span>
          <span className="demo-pill">DEMO OYUNU</span>
          <button type="button" className="icon-button" onClick={() => setShowHelp(true)} aria-label="Oyun kurallarını aç" title="Nasıl oynanır?" data-testid="button-open-rules"><CircleHelp /></button>
          <button type="button" className="icon-button" onClick={toggleMute} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'} aria-pressed={!muted} title={muted ? 'Sesi aç' : 'Sesi kapat'} data-testid="button-toggle-sound">{muted ? <VolumeX /> : <Volume2 />}</button>
        </div>
      </header>

      <main className="main-stage">
        <div className="intro">
          <div>
            <div className="intro-kicker">BİR GÖKSEL DÜŞÜŞ HİKÂYESİ</div>
            <h1>Astral <em>Falls.</em></h1>
          </div>
          <p className="intro-copy">Gökyüzü kırıldığında, eski mühürler yeniden düşmeye başlar.</p>
        </div>

        <div className="experience">
          <section className="machine" aria-label="Astral Falls oyun alanı">
            <div className="machine-top">
              <span>GÖK HARİTASI / 06 × 05</span>
              <b>{freeSpins > 0 ? `ÜCRETSİZ TUR · ${freeSpins}` : `ZİNCİR · ${String(cascades).padStart(2, '0')}`}</b>
            </div>
            <div className="board-wrap">
              <div className="board" role="grid" aria-label="Altı sütun ve beş satırlı sembol alanı" aria-busy={busy} data-testid="grid-slot-board">
                {Array.from({ length: 30 }, (_, index) => <div className="board-slot" key={index} aria-hidden="true" />)}
                {cells.map((cell) => {
                  const multiplierValue = (cell as Cell & { value?: number }).value;
                  return (
                    <div
                      key={cell.id}
                      className="cell-position"
                      style={{ '--col': cell.col, '--row': cell.row } as CSSProperties}
                      role="gridcell"
                      aria-label={`${cell.row + 1}. satır, ${cell.col + 1}. sütun: ${symbolNames[cell.symbol]}${cell.symbol === 'multiplier' && multiplierValue ? ` ${multiplierValue} kat` : ''}`}
                      data-testid={`cell-${cell.id}`}
                    >
                      <div className={`symbol-tile${highlighted.has(cell.id) ? ' is-winning' : ''}${cell.symbol === 'scatter' ? ' is-scatter' : ''}${cell.symbol === 'multiplier' ? ' is-multiplier' : ''}`}>
                        <RelicSymbol symbol={cell.symbol} />
                        {cell.symbol === 'multiplier' && multiplierValue != null && <span className="multiplier-label">{multiplierValue}×</span>}
                      </div>
                    </div>
                  );
                })}
                <div className="board-vignette" aria-hidden="true" />
              </div>
            </div>
            <div className="machine-bottom">
              <div className="status" aria-live="polite" data-testid="status-game"><span className={`status-dot${busy ? ' active' : ''}`} />{statusText}</div>
               <span className="board-spec">8+ MÜHÜR · ZİNCİR DÜŞÜŞLER</span>
            </div>
          </section>

          <aside className="sidebar" aria-label="Oyun kontrolleri">
            <section className="panel balance-panel">
              <div className="panel-label">DEMO BAKİYESİ</div>
              <div className="balance-value" data-testid="text-credits">{formatNumber(credits)} <small>KREDİ</small></div>
               <button type="button" className="reset-link" onClick={resetDemo} disabled={busy || isAutoPlaying} data-testid="button-reset-demo"><RotateCcw size={12} /> Demo bakiyesini yenile</button>
              <div className="balance-line" />
              <div className="bet-header">
                <span className="panel-label">TUR BAHİSİ</span>
                 <label className="bet-value">
                   <input
                     className="bet-input"
                     type="number"
                     inputMode="decimal"
                     min="0.2"
                     max="500"
                     step="0.2"
                     value={betDraft ?? bet}
                     onFocus={() => setBetDraft(String(bet))}
                     onChange={(event) => setBetDraft(event.target.value)}
                     onBlur={commitBet}
                     onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                     disabled={busy || isAutoPlaying || freeSpins > 0}
                     aria-label="Tur bahsi, en fazla 500 demo kredi"
                     data-testid="input-bet"
                   />
                   <small>/ 500</small>
                 </label>
              </div>
              <div className="bet-controls" aria-label="Bahis ayarları">
                 <button type="button" className="adjust-btn half" onClick={() => adjustBet(bet / 2)} disabled={busy || isAutoPlaying || freeSpins > 0 || bet <= 0.2} aria-label="Bahsi yarıya indir" data-testid="button-half-bet">½</button>
                 <button type="button" className="adjust-btn" onClick={() => adjustBet(bet - 0.2)} disabled={busy || isAutoPlaying || freeSpins > 0 || bet <= 0.2} aria-label="Bahsi azalt" data-testid="button-decrease-bet"><Minus /></button>
                 <button type="button" className="adjust-btn" onClick={() => adjustBet(bet + 0.2)} disabled={busy || isAutoPlaying || freeSpins > 0 || bet >= 500} aria-label="Bahsi artır" data-testid="button-increase-bet"><Plus /></button>
                 <button type="button" className="adjust-btn double" onClick={() => adjustBet(bet * 2)} disabled={busy || isAutoPlaying || freeSpins > 0 || bet >= 500} aria-label="Bahsi iki katına çıkar" data-testid="button-double-bet">2×</button>
              </div>
            </section>

            <button type="button" className="spin-button" onClick={spin} disabled={!canSpin} data-testid="button-spin">
              <RotateCcw aria-hidden="true" />
              {busy ? 'DÜŞÜYOR...' : credits < bet && freeSpins === 0 ? 'KREDİ YETERSİZ' : freeSpins > 0 ? 'ÜCRETSİZ TURU OYNA' : 'DÖNDÜR'}
            </button>

             <section className="panel auto-panel" aria-label="Otomatik oynatma">
               <div className="auto-header">
                 <span className="panel-label">OTOMATİK OYNATMA</span>
                 {isAutoPlaying && <span className="auto-live" aria-live="polite">
                   {autoPlayRemaining === null ? `${autoPlayPlayed} tur oynandı · sürekli` : `${autoPlayRemaining} tur kaldı`}
                 </span>}
               </div>
               {isAutoPlaying ? (
                 <button type="button" className="auto-stop" onClick={stopAutoPlay} data-testid="button-stop-auto">
                   OTOMATİK OYNATMAYI DURDUR
                 </button>
               ) : (
                 <div className="auto-options">
                   {AUTO_COUNTS.map((count) => (
                     <button
                       type="button"
                       key={count ?? 'endless'}
                       onClick={() => startAutoPlay(count)}
                       disabled={busy || (credits < bet && freeSpins === 0)}
                       aria-label={count === null ? 'Durmadan otomatik oyna' : `${count} tur otomatik oyna`}
                       title={count === null ? 'Durdurulana veya bakiye bitene kadar' : `${count} tur`}
                       data-testid={`button-auto-${count ?? 'endless'}`}
                     >
                       {count ?? '∞'}
                     </button>
                   ))}
                 </div>
               )}
               <p className="auto-hint">10 · 20 · 30 · 50 · ∞ durmadan</p>
             </section>

            <section className="panel toggle-panel" aria-label="Oyun seçenekleri">
              <div className="toggle-row">
                <div><div className="toggle-title">Turbo mod</div><div className="toggle-sub">Hızlı düşüş</div></div>
                <button type="button" className={`switch${turbo ? ' on' : ''}`} onClick={toggleTurbo} disabled={busy} role="switch" aria-checked={turbo} aria-label="Turbo modu" data-testid="button-toggle-turbo" />
              </div>
              <div className="toggle-row">
                <div><div className="toggle-title">Oyun sesi</div><div className="toggle-sub">{muted ? 'Kapalı' : 'Açık'}</div></div>
                <button type="button" className={`switch${!muted ? ' on' : ''}`} onClick={toggleMute} role="switch" aria-checked={!muted} aria-label="Oyun sesini aç veya kapat" data-testid="button-toggle-sound-switch" />
              </div>
            </section>

            <section className="panel win-panel" aria-label="Tur sonuçları">
              <div className="panel-label">SON KAZANÇ</div>
              <div className="win-value" data-testid="text-last-win">{formatNumber(lastWin)} <span>KREDİ</span></div>
              <div className="result-row"><span>Toplam çarpan</span><b className={totalMultiplier > 1 ? 'positive' : ''} data-testid="text-multiplier">{formatNumber(totalMultiplier || 1)}×</b></div>
              <div className="result-row"><span>Ardışık düşüş</span><b data-testid="text-cascades">{String(cascades).padStart(2, '0')}</b></div>
              <div className="free-indicator"><span>ÜCRETSİZ TURLAR</span><strong data-testid="text-free-spins">{freeSpins}</strong></div>
            </section>
          </aside>
        </div>

        <div className="below-stage">
          <section className="rules-strip" aria-label="Kısa oyun kuralları">
            <div className="rule"><div className="rule-num">01 / EŞLEŞTİR</div><h3>Sekiz mühür.</h3><p>Aynı sembolden 8 veya fazlası, konum fark etmeksizin kazandırır.</p></div>
            <div className="rule"><div className="rule-num">02 / ZİNCİRLE</div><h3>Yeniden düşer.</h3><p>Kazananlar silinir, boşlukları yeni gök taşları doldurur.</p></div>
            <div className="rule"><div className="rule-num">03 / KEŞFET</div><h3>Geçidi aç.</h3><p>4 veya daha fazla geçit, 15 ücretsiz tur başlatır.</p></div>
          </section>
          <section className="history-panel" aria-label="Son tur kazançları">
            <div className="panel-label">SON TURLAR</div>
            {history.length ? <div className="history-list">{history.slice(0, 6).map((amount, index) => <span className={`history-chip${amount > 0 ? ' won' : ''}`} key={index} data-testid={`text-history-${index}`}>{formatNumber(amount)}</span>)}</div> : <p className="history-empty">İlk düşüşün burada görünecek.</p>}
          </section>
        </div>
      </main>

      <footer className="footer">
        <span>ASTRAL FALLS / BAĞIMSIZ TARAYICI DENEYİMİ</span>
        <span>YALNIZCA EĞLENCE AMAÇLI DEMO · GERÇEK PARA İÇERMEZ · 18+</span>
      </footer>
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function App() {
  return <SlotGame />;
}

export default App;