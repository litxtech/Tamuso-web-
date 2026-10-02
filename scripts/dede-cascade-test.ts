import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { derleOyun } from '../supabase/functions/_shared/studio/derleyici.ts';
import { dogrulaPaket, guvenlikTara } from '../supabase/functions/_shared/studio/sozlesme.ts';
import { dogrulaYama, yamaUygula } from '../supabase/functions/_shared/studio/yama.ts';
import { DEDE_MOTOR_SOURCE } from '../src/moduller/studio/v2/runtime/dede/motorKaynak.ts';
import { DEDE_SAHNE_SOURCE } from '../src/moduller/studio/v2/runtime/dede/sahneKaynak.ts';
import { dedeYamaMetni } from '../src/moduller/studio/v2/runtime/dede/onizleme.ts';

function motor() {
  const fn = new Function(`${DEDE_MOTOR_SOURCE}\nreturn createDedeMotor();`);
  return fn() as {
    quoteRound: (opts: { seed: string; stake: number; nonce?: number; force?: Record<string, boolean> }) => {
      totalWin: number;
      cascadeIndex: number;
      totalMultiplier: number;
      baseWin: number;
      steps: { phase: string }[];
      grid: { id: string }[][];
    };
    createSession: (b: number) => {
      testBalance: number;
      testStake: number;
      gameState: string;
      seed: string;
      force: Record<string, boolean>;
    };
    startRound: (s: ReturnType<ReturnType<typeof motor>['createSession']>) => { totalWin: number; steps: { phase: string }[] } | null;
    commit: (s: { testBalance: number; gameState: string }, r: { totalWin: number }) => void;
    createPresenter: (r: { steps: { phase: string }[]; totalWin: number }) => { tick: (dt: number) => { gameState: string; done: boolean; cells: unknown[] } };
  };
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const m = motor();
const a = m.quoteRound({ seed: 'DEDE_TEST_001', stake: 10, nonce: 1 });
const b = m.quoteRound({ seed: 'DEDE_TEST_001', stake: 10, nonce: 1 });
if (a.totalWin !== b.totalWin || a.cascadeIndex !== b.cascadeIndex || JSON.stringify(a.grid) !== JSON.stringify(b.grid)) {
  fail('seed DEDE_TEST_001 is not stable');
}
const c = m.quoteRound({ seed: 'DEDE_TEST_001', stake: 10, nonce: 2 });
if (JSON.stringify(a.grid) === JSON.stringify(c.grid) && a.totalWin === c.totalWin) {
  fail('nonce did not change the round');
}

const zorla = m.quoteRound({ seed: 'DEDE_TEST_001', stake: 10, nonce: 1, force: { cascade: true } });
if (!zorla.steps.some((s) => s.phase === 'CASCADE')) fail('forced cascade missing');
if (zorla.steps[0]?.phase !== 'POPULATE_GRID') fail('outcome starts late');
const gorunen = new Set<string>();
const oynatici = m.createPresenter(zorla);
let hucre = 0;
for (let i = 0; i < 900; i++) {
  const kare = oynatici.tick(0.2);
  gorunen.add(kare.gameState);
  if (kare.cells.length > hucre) hucre = kare.cells.length;
  if (kare.done) break;
}
if (hucre !== 30) fail(`symbol count ${hucre}`);
for (const faz of ['POPULATE_GRID', 'WIN', 'REMOVE_WINNERS', 'CASCADE', 'READY']) {
  if (!gorunen.has(faz)) fail(`presenter skipped ${faz}`);
}
if (![...gorunen].includes('READY')) fail('round did not finish');

const buyuk = m.quoteRound({ seed: 'DEDE_TEST_001', stake: 10, force: { bigWin: true } });
if (!buyuk.steps.some((s) => s.phase === 'BIG_WIN')) fail('big win missing');
if (buyuk.totalMultiplier < 2) fail('big win multiplier missing');
const carpanli = m.quoteRound({ seed: 'DEDE_TEST_001', stake: 25, force: { multiplier: true, cascade: true } });
if (!carpanli.steps.some((s) => s.phase === 'MULTIPLIER')) fail('multiplier step missing');

const oturum = m.createSession(10000);
oturum.seed = 'DEDE_TEST_001';
oturum.force = { cascade: true };
const tur = m.startRound(oturum);
if (!tur) fail('round did not start');
if (oturum.testBalance !== 9990) fail(`stake not taken: ${oturum.testBalance}`);
const ikinci = m.startRound(oturum);
if (ikinci) fail('second start while round open');
m.commit(oturum, tur);
const beklenen = 9990 + tur.totalWin;
if (oturum.testBalance !== beklenen) fail(`balance ${oturum.testBalance} != ${beklenen}`);
if (oturum.gameState !== 'READY') fail(oturum.gameState);
if (oturum.testBalance === 10000 && tur.totalWin !== 10) fail('balance ignored the round');

const kaynak = [
  'src/moduller/studio/v2/runtime/dede/motorKaynak.ts',
  'src/moduller/studio/v2/runtime/dede/sahneKaynak.ts',
  'src/moduller/studio/v2/runtime/dede/onizleme.ts',
  'app/studio/dede.tsx',
].map((p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')).join('\n');
if (/wallets|zeus_settle|coin_credit|agency_balance/.test(kaynak)) fail('production wallet reference');

const paket = dogrulaPaket({
  specification: {
    game: {
      title: 'DEDE',
      description: 'Dedenin gök konağında 6x5 düşen taşlar.',
      genre: 'cascade',
      dimension: '3d',
      orientation: 'portrait',
      visualStyle: 'fantasy mansion',
      targetSessionDuration: 180,
    },
    world: { environment: 'mansion above clouds', sky: 'lavender sunset', lighting: 'warm sun', weather: 'mist', terrain: 'marble', background: 'towers' },
    player: { type: 'touch', model: 'dede', controller: 'tap', movement: 'none', camera: 'fixed' },
    gameplay: {
      objective: 'Test kredisinde kümeleri düşür',
      rules: ['5 aynı taş'],
      winConditions: ['küme'],
      loseConditions: [],
      progression: 'cascade',
      startTestScore: 10000,
      outcomes: [],
    },
    entities: [
      { id: 'dede', name: 'Dede', role: 'character', assetId: 'dede_character', count: 1, position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1], materialPreset: 'default' },
    ],
    mechanics: [{ id: 'dede_cascade', name: 'Cascade', summary: '6x5 tumble' }],
    physics: { enabled: false, gravity: -9.81, collisionLayers: [] },
    ui: { hud: ['win', 'test'], menus: ['settings'], controls: ['play'] },
    audio: { music: ['mansion'], ambience: ['wind'], sfx: ['symbol_win'], voices: ['haydi'] },
    assets: ['dede_character'],
    animations: ['idle'],
    multiplayer: { enabled: false, minPlayers: 1, maxPlayers: 1 },
    economy: { requestedCapabilities: ['test_balance'] },
    algorithm: { events: [] },
    cascade: { columns: 6, rows: 5, stakes: [10, 25, 50, 100], multipliers: [2, 3, 5, 10, 15, 25, 50, 100], sky: 'sunset', robe: '#6B2450' },
  },
  design: { gameplay: ['cascade'], world: ['mansion'], player: ['dede'], camera: ['portrait'], physics: [], audio: ['voice'], ui: ['play'] },
  assetPlan: { assets: [] },
});
if (!paket.ok) fail(paket.errors.join(','));
if (guvenlikTara(paket.paket)) fail('security');
if (paket.paket.specification.economy.requestedCapabilities.includes('wallet')) fail('wallet cap');
const manifest = derleOyun({
  gameId: 'dede',
  version: 1,
  specification: paket.paket.specification,
  design: paket.paket.design,
  readyAssets: [],
});
if (manifest.economy.mode !== 'TEST_BALANCE' || manifest.economy.currency !== 'TEST') fail('economy');
if (manifest.economy.testBalance !== 10000) fail('test balance');
if (!manifest.cascade || manifest.cascade.columns !== 6 || manifest.cascade.rows !== 5) fail('grid');
if (manifest.gameplay.nodes[0]?.action !== 'CASCADE_BOOT') fail('graph');
if (manifest.runtime !== 'playcanvas-engine') fail('runtime');

const yerel = dedeYamaMetni('Arka planı gece yap.');
if (!yerel || yerel.operations[0]?.properties.sky !== 'night') fail('local patch');
const yama = dogrulaYama({
  schemaVersion: 1,
  summary: 'gece',
  operations: [{ operation: 'UPDATE_CASCADE', targets: ['cascade'], properties: { sky: 'night', particleBurst: 28 } }],
});
if (!yama.ok) fail('patch');
const uygulanan = yamaUygula(paket.paket.specification, yama.patch);
if (uygulanan.specification.cascade?.sky !== 'night') fail('sky');
if (uygulanan.specification.cascade?.particleBurst !== 28) fail('particles');

mkdirSync(new URL('../.cache', import.meta.url), { recursive: true });
const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><style>html,body{margin:0;height:100%;background:#120818;overflow:hidden}#c{width:100%;height:100%;display:block}</style></head><body><canvas id="c"></canvas><script src="/playcanvas.js"></script><script>
${DEDE_MOTOR_SOURCE}
${DEDE_SAHNE_SOURCE}
var state = { paused: false, safeTop: 18, safeBottom: 18, dede: null };
function post(msg){ console.log('DEDE', JSON.stringify(msg)); }
var canvas = document.getElementById('c');
var app = new pc.Application(canvas, { mouse: new pc.Mouse(canvas), keyboard: new pc.Keyboard(window) });
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
var cam = new pc.Entity('camera');
cam.addComponent('camera', { clearColor: new pc.Color(0.12,0.06,0.2), fov: 30, nearClip: 0.1, farClip: 80 });
cam.setPosition(0, 0.35, 7.15);
cam.lookAt(0, 0.2, 0);
app.root.addChild(cam);
var manifest = { runtime: 'playcanvas-engine', runtimeVersion: '1.73.4', economy: { mode: 'TEST_BALANCE', testBalance: 10000, currency: 'TEST' }, cascade: { sky: 'sunset', robe: '#6B2450', gemScale: 1, particleBurst: 14, gridOffsetY: 0 } };
dedeKur(state, app, cam, manifest, post);
app.start();
app.on('update', function (dt) { if (state.dede) state.dede.tick(dt); });
window.__DEDE_OYNAT = function () {
  var btn = document.getElementById('dede-oyna');
  if (btn) btn.click();
};
</script></body></html>`;
writeFileSync(new URL('../.cache/dede-onizleme.html', import.meta.url), html);
console.log('DEDE_OK', JSON.stringify({
  seedWin: a.totalWin,
  cascades: a.cascadeIndex,
  forcedCascades: zorla.cascadeIndex,
  balance: oturum.testBalance,
  phases: [...gorunen],
}));
