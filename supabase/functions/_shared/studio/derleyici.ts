import type { AssetPlan, CascadeAyar, GameDesign, GameSpecification, Vec3 } from './sozlesme.ts';

export type SceneComponent = {
  kind: string;
  props: Record<string, unknown>;
};

export type SceneEntity = {
  id: string;
  name: string;
  parentId: string | null;
  role: string;
  transform: { position: Vec3; rotation: Vec3; scale: Vec3 };
  components: SceneComponent[];
};

export type SceneGraph = {
  schemaVersion: 1;
  id: string;
  name: string;
  entities: SceneEntity[];
};

export type LogicNode = {
  id: string;
  category: 'EVENT' | 'CONDITION' | 'ACTION' | 'VARIABLE' | 'TIMER' | 'GAME_STATE' | 'ANIMATION' | 'AUDIO' | 'PHYSICS' | 'UI';
  action: string;
  params: Record<string, unknown>;
  next: string[];
};

export type GameplayGraph = {
  schemaVersion: 1;
  entry: string;
  nodes: LogicNode[];
};

export type GameManifest = {
  schemaVersion: 1;
  runtime: 'playcanvas-engine';
  runtimeVersion: '1.73.4';
  mode: 'PREVIEW';
  gameId: string;
  version: number;
  economy: { mode: 'TEST_BALANCE'; testBalance: number; currency: 'TEST' };
  scene: SceneGraph;
  gameplay: GameplayGraph;
  assets: { assetId: string; r2Key: string; type: string; mime: string }[];
  issues: string[];
  physics: GameSpecification['physics'];
  cascade: CascadeAyar | null;
};

type Hazir = { assetId: string; r2Key: string; type: string; mime: string };

function dugum(
  id: string,
  category: LogicNode['category'],
  action: string,
  next: string[],
  params: Record<string, unknown> = {},
): LogicNode {
  return { id, category, action, params, next };
}

function gokyuzu(style: string): [number, number, number] {
  const s = style.toLowerCase();
  if (s.includes('storm') || s.includes('fırt') || s.includes('firt')) return [0.05, 0.06, 0.1];
  if (s.includes('fantasy') || s.includes('dark') || s.includes('koyu')) return [0.04, 0.03, 0.07];
  if (s.includes('olympus') || s.includes('zeus') || s.includes('olimpos')) return [0.07, 0.08, 0.16];
  return [0.06, 0.05, 0.09];
}

function yarimDaire(index: number, total: number): Vec3 {
  const t = total <= 1 ? 0.5 : index / (total - 1);
  const a = Math.PI * (0.18 + 0.64 * t);
  return [Math.cos(a) * 3.1, 0.55, Math.sin(a) * 1.35];
}

function sandikMi(role: string): boolean {
  const r = role.toLowerCase();
  return r === 'chest' || r === 'prize' || r === 'crate' || r.includes('sandik') || r.includes('chest') || r.includes('hediye');
}

export function derleOyun(input: {
  gameId: string;
  version: number;
  specification: GameSpecification;
  design: GameDesign;
  readyAssets: Hazir[];
}): GameManifest {
  const spec = input.specification;
  if (spec.cascade) return cascadeManifest(input, spec.cascade);
  const hazir = new Map(input.readyAssets.map((a) => [a.assetId, a]));
  const issues: string[] = [];
  const entities: SceneEntity[] = [];

  entities.push({
    id: 'environment',
    name: 'Environment',
    parentId: null,
    role: 'environment',
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    components: [
      { kind: 'sky', props: { color: gokyuzu(`${spec.game.visualStyle} ${spec.world.sky} ${spec.world.weather}`) } },
      { kind: 'light', props: { lightType: 'ambient', intensity: 0.35, color: [0.55, 0.5, 0.7] } },
    ],
  });
  entities.push({
    id: 'sun',
    name: 'Key Light',
    parentId: 'environment',
    role: 'light',
    transform: { position: [4, 8, 3], rotation: [50, 30, 0], scale: [1, 1, 1] },
    components: [{ kind: 'light', props: { lightType: 'directional', intensity: 1.15, color: [1, 0.95, 0.88], castShadows: false } }],
  });
  entities.push({
    id: 'platform',
    name: 'Platform',
    parentId: 'environment',
    role: 'terrain',
    transform: { position: [0, 0, 0.4], rotation: [0, 0, 0], scale: [8, 0.25, 4.2] },
    components: [
      { kind: 'primitive', props: { shape: 'box' } },
      { kind: 'material', props: { preset: 'stone' } },
      { kind: 'collision', props: { shape: 'box', static: true } },
    ],
  });

  const kaynak = spec.entities.map((e) => ({ ...e }));
  const sandiklar = kaynak.filter((e) => sandikMi(e.role));
  const sonuclar = spec.gameplay.outcomes;
  let oyunVarliklari = kaynak.filter((e) => !sandikMi(e.role));
  if (sonuclar.length >= 2 && sandiklar.length < sonuclar.length) {
    const kalip = sandiklar[0];
    const assetId = kalip?.assetId || 'treasure_chest';
    oyunVarliklari = oyunVarliklari.concat(
      sonuclar.map((o, i) => ({
        id: `chest_${i + 1}`,
        name: o.label || `Chest ${i + 1}`,
        role: 'chest',
        assetId,
        count: 1,
        testDelta: o.delta,
        position: yarimDaire(i, sonuclar.length),
        rotation: [0, 180, 0] as Vec3,
        scale: (kalip?.scale ?? [1, 1, 1]) as Vec3,
        materialPreset: kalip?.materialPreset ?? 'wood',
      })),
    );
  } else {
    oyunVarliklari = oyunVarliklari.concat(
      sandiklar.map((e, i) => ({
        ...e,
        position: e.position[0] === 0 && e.position[2] === 0 ? yarimDaire(i, sandiklar.length) : e.position,
        testDelta: e.testDelta ?? sonuclar[i]?.delta ?? null,
      })),
    );
  }

  const secilebilir: string[] = [];
  for (const e of oyunVarliklari) {
    const tekrar = Math.min(e.count, 8);
    for (let n = 0; n < tekrar; n += 1) {
      const id = tekrar > 1 ? `${e.id}_${n + 1}` : e.id;
      const asset = hazir.get(e.assetId);
      const components: SceneComponent[] = [];
      const modelVar = !!asset && (asset.type === 'model' || asset.mime.includes('gltf'));
      if (modelVar) {
        components.push({ kind: 'model', props: { assetId: e.assetId } });
      } else if (e.role !== 'player') {
        const kod = `ASSET_MISSING:${e.assetId}`;
        if (!issues.includes(kod)) issues.push(kod);
        continue;
      }
      components.push({ kind: 'material', props: { preset: e.materialPreset } });
      if (sandikMi(e.role)) {
        components.push({ kind: 'collision', props: { shape: 'box', trigger: true } });
        components.push({ kind: 'gameplay', props: { selectable: true, testDelta: e.testDelta, assetId: e.assetId } });
        components.push({ kind: 'light', props: { lightType: 'point', intensity: 0.35, color: [0.85, 0.7, 0.35], range: 2.2 } });
        secilebilir.push(id);
      }
      const pos = tekrar > 1 ? yarimDaire(n, tekrar) : e.position;
      entities.push({
        id,
        name: e.name,
        parentId: sandikMi(e.role) ? 'platform' : 'environment',
        role: e.role,
        transform: { position: pos, rotation: e.rotation, scale: e.scale },
        components,
      });
    }
  }

  entities.push({
    id: 'camera',
    name: 'Camera',
    parentId: null,
    role: 'camera',
    transform: { position: [0, 2.4, 7.2], rotation: [-12, 0, 0], scale: [1, 1, 1] },
    components: [{
      kind: 'camera',
      props: { mode: spec.player.camera, fov: spec.player.camera === 'cinematic' ? 38 : 48, clearColor: gokyuzu(spec.game.visualStyle) },
    }],
  });

  const sesler = input.readyAssets.filter((a) => a.type === 'audio').map((a) => a.assetId);
  if (sesler.length) {
    entities.push({
      id: 'audio_bus',
      name: 'Audio',
      parentId: null,
      role: 'audio',
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      components: [{ kind: 'audio', props: { assetIds: sesler } }],
    });
  }

  entities.push({
    id: 'hud',
    name: 'HUD',
    parentId: null,
    role: 'ui',
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    components: [{ kind: 'ui', props: { hud: spec.ui.hud, testBalance: spec.gameplay.startTestScore } }],
  });

  const graph = secilebilir.length >= 2 ? sandikGrafigi(secilebilir) : genelGraf(spec, input.design);
  const scene: SceneGraph = {
    schemaVersion: 1,
    id: 'main',
    name: spec.game.title,
    entities,
  };

  return {
    schemaVersion: 1,
    runtime: 'playcanvas-engine',
    runtimeVersion: '1.73.4',
    mode: 'PREVIEW',
    gameId: input.gameId,
    version: input.version,
    economy: {
      mode: 'TEST_BALANCE',
      testBalance: spec.gameplay.startTestScore,
      currency: 'TEST',
    },
    scene,
    gameplay: graph,
    assets: input.readyAssets.map((a) => ({ assetId: a.assetId, r2Key: a.r2Key, type: a.type, mime: a.mime })),
    issues: [...new Set(issues)],
    physics: spec.physics,
    cascade: null,
  };
}

function cascadeManifest(input: {
  gameId: string;
  version: number;
  specification: GameSpecification;
  readyAssets: Hazir[];
}, cascade: CascadeAyar): GameManifest {
  const spec = input.specification;
  const scene: SceneGraph = {
    schemaVersion: 1,
    id: 'main',
    name: spec.game.title || 'DEDE',
    entities: [
      {
        id: 'environment',
        name: 'Gök Konağı',
        parentId: null,
        role: 'environment',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        components: [{ kind: 'sky', props: { color: gokyuzu(`${spec.world.sky} ${cascade.sky}`) } }],
      },
      {
        id: 'dede',
        name: 'Dede',
        parentId: 'environment',
        role: 'character',
        transform: { position: [0.15, 1.55, 0.15], rotation: [0, 0, 0], scale: [1, 1, 1] },
        components: [{ kind: 'runtime', props: { assetId: 'dede_character' } }],
      },
      {
        id: 'grid',
        name: '6x5',
        parentId: 'environment',
        role: 'grid',
        transform: { position: [0, -0.12 + cascade.gridOffsetY, 0], rotation: [0, 0, 0], scale: [2.85, 2.35, 0.06] },
        components: [{ kind: 'grid', props: { columns: cascade.columns, rows: cascade.rows } }],
      },
      {
        id: 'camera',
        name: 'Camera',
        parentId: null,
        role: 'camera',
        transform: { position: [0, 0.35, 7.15], rotation: [-8, 0, 0], scale: [1, 1, 1] },
        components: [{ kind: 'camera', props: { mode: 'fixed', fov: 30, clearColor: [0.18, 0.1, 0.28] } }],
      },
    ],
  };
  return {
    schemaVersion: 1,
    runtime: 'playcanvas-engine',
    runtimeVersion: '1.73.4',
    mode: 'PREVIEW',
    gameId: input.gameId,
    version: input.version,
    economy: { mode: 'TEST_BALANCE', testBalance: spec.gameplay.startTestScore || 10000, currency: 'TEST' },
    scene,
    gameplay: {
      schemaVersion: 1,
      entry: 'boot',
      nodes: [dugum('boot', 'EVENT', 'CASCADE_BOOT', [], { columns: cascade.columns, rows: cascade.rows })],
    },
    assets: input.readyAssets.map((a) => ({ assetId: a.assetId, r2Key: a.r2Key, type: a.type, mime: a.mime })),
    issues: [],
    physics: spec.physics,
    cascade,
  };
}

function sandikGrafigi(chests: string[]): GameplayGraph {
  const nodes: LogicNode[] = [
    dugum('game_start', 'EVENT', 'GAME_START', ['enable_select']),
    dugum('enable_select', 'ACTION', 'ENABLE_SELECTION', ['wait_pick'], { targets: chests }),
    dugum('wait_pick', 'EVENT', 'WAIT_CHEST_SELECTED', ['lock_input']),
    dugum('lock_input', 'ACTION', 'DISABLE_INPUT', ['camera_focus']),
    dugum('camera_focus', 'ACTION', 'CAMERA_FOCUS', ['play_anim']),
    dugum('play_anim', 'ANIMATION', 'PLAY_OPEN_ANIMATION', ['play_sfx']),
    dugum('play_sfx', 'AUDIO', 'PLAY_SFX', ['resolve'], { cue: 'open' }),
    dugum('resolve', 'GAME_STATE', 'RESOLVE_TEST_RESULT', ['result_fx']),
    dugum('result_fx', 'ACTION', 'PLAY_RESULT_EFFECT', ['show_result']),
    dugum('show_result', 'UI', 'SHOW_RESULT', ['wait_reset']),
    dugum('wait_reset', 'TIMER', 'WAIT', ['reset_round'], { seconds: 1.4 }),
    dugum('reset_round', 'ACTION', 'RESET_ROUND', ['enable_select']),
  ];
  return { schemaVersion: 1, entry: 'game_start', nodes };
}

function genelGraf(spec: GameSpecification, design: GameDesign): GameplayGraph {
  const combo = spec.mechanics.some((m) => m.id.includes('combo')) || design.gameplay.some((g) => /combo/i.test(g));
  const nodes: LogicNode[] = [
    dugum('game_start', 'EVENT', 'GAME_START', ['spawn']),
    dugum('spawn', 'ACTION', 'SPAWN_SCENE', ['enable']),
    dugum('enable', 'ACTION', 'ENABLE_CONTROL', combo ? ['combo'] : ['loop']),
  ];
  if (combo) nodes.push(dugum('combo', 'GAME_STATE', 'TRACK_COMBO', ['loop']));
  nodes.push(dugum('loop', 'EVENT', 'WAIT_INPUT', ['check']));
  nodes.push(dugum('check', 'CONDITION', 'CHECK_SESSION', ['loop']));
  return { schemaVersion: 1, entry: 'game_start', nodes };
}
