import { derleOyun } from '../supabase/functions/_shared/studio/derleyici.ts';
import { dogrulaPaket, guvenlikTara } from '../supabase/functions/_shared/studio/sozlesme.ts';
import { glbDogrula } from '../supabase/functions/_shared/studio/dosya.ts';
import { dogrulaYama, yamaUygula } from '../supabase/functions/_shared/studio/yama.ts';

const paket = dogrulaPaket({
  specification: {
    game: {
      title: 'Yedi Sandık',
      description: 'Karanlık bir salonda yedi gizemli sandıktan birini seç.',
      genre: 'arcade',
      dimension: '3d',
      orientation: 'portrait',
      visualStyle: 'dark fantasy',
      targetSessionDuration: 90,
    },
    world: { environment: 'stone hall', sky: 'night', lighting: 'warm', weather: 'still', terrain: 'platform', background: 'void' },
    player: { type: 'touch', model: '', controller: 'tap', movement: 'none', camera: 'fixed' },
    gameplay: {
      objective: 'Bir sandık seç',
      rules: ['Tek seçim'],
      winConditions: [],
      loseConditions: [],
      progression: 'round',
      startTestScore: 0,
      outcomes: [
        { id: 'a', label: '-100', delta: -100 },
        { id: 'b', label: '-200', delta: -200 },
        { id: 'c', label: '-300', delta: -300 },
        { id: 'd', label: '-400', delta: -400 },
        { id: 'e', label: '+100', delta: 100 },
        { id: 'f', label: '+200', delta: 200 },
        { id: 'g', label: '+300', delta: 300 },
      ],
    },
    entities: [{
      id: 'chest',
      name: 'Chest',
      role: 'chest',
      assetId: 'treasure_chest',
      count: 1,
      testDelta: null,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      materialPreset: 'wood',
    }],
    mechanics: [{ id: 'mystery_select', name: 'Seç', summary: 'Sandık seçilir' }],
    physics: { enabled: true, gravity: -9.81, collisionLayers: ['default'] },
    ui: { hud: ['score'], menus: [], controls: ['tap'] },
    audio: { music: [], ambience: ['hall'], sfx: ['chest_open', 'reward', 'negative'], voices: [] },
    assets: ['treasure_chest'],
    animations: ['open'],
    multiplayer: { enabled: false, minPlayers: 1, maxPlayers: 1 },
    economy: { requestedCapabilities: ['test_balance', 'wallet'] },
    algorithm: { events: [] },
  },
  design: {
    gameplay: ['7 sandık', 'seçim', 'açılış', 'sonuç', 'tur'],
    world: ['karanlık salon', 'platform'],
    player: ['dokunuş'],
    camera: ['sabit perspective'],
    physics: ['yerçekimi'],
    audio: ['açılış', 'ödül', 'kayıp'],
    ui: ['skor'],
  },
  assetPlan: {
    assets: [
      { assetId: 'treasure_chest', type: 'model', source: 'meshy', generationPrompt: 'stylized treasure chest with metal hinges', required: true, rig: false },
      { assetId: 'chest_open', type: 'audio', source: 'elevenlabs', generationPrompt: 'heavy wooden treasure chest opening', audioKind: 'sfx', required: true },
    ],
  },
});

if (!paket.ok) {
  console.error(paket.errors);
  process.exit(1);
}
if (paket.paket.specification.economy.requestedCapabilities.includes('wallet')) {
  console.error('wallet capability leaked');
  process.exit(1);
}
if (guvenlikTara(paket.paket)) process.exit(1);

const manifest = derleOyun({
  gameId: '00000000-0000-0000-0000-000000000000',
  version: 1,
  specification: paket.paket.specification,
  design: paket.paket.design,
  readyAssets: [{ assetId: 'treasure_chest', r2Key: 'games/x/versions/1/models/treasure_chest.glb', type: 'model', mime: 'model/gltf-binary' }],
});
const sandik = manifest.scene.entities.filter((e) => e.role === 'chest');
if (sandik.length !== 7) {
  console.error('chest count', sandik.length);
  process.exit(1);
}
const aksiyonlar = manifest.gameplay.nodes.map((n) => n.action);
for (const gerekli of ['GAME_START', 'ENABLE_SELECTION', 'PLAY_OPEN_ANIMATION', 'RESOLVE_TEST_RESULT', 'RESET_ROUND']) {
  if (!aksiyonlar.includes(gerekli)) {
    console.error('missing', gerekli);
    process.exit(1);
  }
}
if (manifest.economy.mode !== 'TEST_BALANCE') process.exit(1);
if (manifest.runtime !== 'playcanvas-engine') process.exit(1);

const yama = dogrulaYama({
  schemaVersion: 1,
  summary: 'altın',
  operations: [{ operation: 'UPDATE_MATERIAL', targets: ['chest_*'], properties: { materialPreset: 'gold' } }],
});
if (!yama.ok) process.exit(1);
const uygulanan = yamaUygula(paket.paket.specification, yama.patch);
const gold = derleOyun({
  gameId: '00000000-0000-0000-0000-000000000000',
  version: 1,
  specification: uygulanan.specification,
  design: paket.paket.design,
  readyAssets: [{ assetId: 'treasure_chest', r2Key: 'k', type: 'model', mime: 'model/gltf-binary' }],
});
const malzeme = gold.scene.entities.find((e) => e.id === 'chest_1')?.components.find((c) => c.kind === 'material');
if (malzeme?.props.preset !== 'gold') {
  console.error('patch', malzeme);
  process.exit(1);
}

const kotu = new Uint8Array([1, 2, 3, 4]);
if (glbDogrula(kotu).ok) process.exit(1);
const sahte = dogrulaPaket({ title: 'x', items: [] });
if (sahte.ok) process.exit(1);

console.log('studio-v2-contract-ok');
process.exit(0);
