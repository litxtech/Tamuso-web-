/** Studio V2 sözleşmesi. Serbest metin buradan geçmeden runtime'a gitmez. */

export const SCHEMA_VERSION = 1;

const SLUG = /^[a-z][a-z0-9_]{1,39}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

export type Vec3 = [number, number, number];

export type GameSpecification = {
  schemaVersion: 1;
  game: {
    title: string;
    description: string;
    genre: string;
    dimension: '2d' | '3d';
    orientation: 'portrait' | 'landscape';
    visualStyle: string;
    targetSessionDuration: number;
  };
  world: {
    environment: string;
    sky: string;
    lighting: string;
    weather: string;
    terrain: string;
    background: string;
  };
  player: {
    type: string;
    model: string;
    controller: string;
    movement: string;
    camera: 'orbit' | 'chase' | 'fixed' | 'cinematic';
  };
  gameplay: {
    objective: string;
    rules: string[];
    winConditions: string[];
    loseConditions: string[];
    progression: string;
    startTestScore: number;
    outcomes: { id: string; label: string; delta: number }[];
  };
  entities: {
    id: string;
    name: string;
    role: string;
    assetId: string;
    count: number;
    testDelta: number | null;
    position: Vec3;
    rotation: Vec3;
    scale: Vec3;
    materialPreset: string;
  }[];
  mechanics: { id: string; name: string; summary: string }[];
  physics: {
    enabled: boolean;
    gravity: number;
    collisionLayers: string[];
  };
  ui: {
    hud: string[];
    menus: string[];
    controls: string[];
  };
  audio: {
    music: string[];
    ambience: string[];
    sfx: string[];
    voices: string[];
  };
  assets: string[];
  animations: string[];
  multiplayer: { enabled: boolean; minPlayers: number; maxPlayers: number };
  economy: { requestedCapabilities: string[] };
  algorithm: { events: { id: string; when: string; effect: string }[] };
  cascade: CascadeAyar | null;
};

export type CascadeAyar = {
  columns: number;
  rows: number;
  minCluster: number;
  stakes: number[];
  multipliers: number[];
  bigWinMultiple: number;
  gemScale: number;
  particleBurst: number;
  gridOffsetY: number;
  sky: string;
  robe: string;
};

export type GameDesign = {
  schemaVersion: 1;
  gameplay: string[];
  world: string[];
  player: string[];
  camera: string[];
  physics: string[];
  audio: string[];
  ui: string[];
};

export type AssetPlanItem = {
  assetId: string;
  type: 'model' | 'texture' | 'material' | 'animation' | 'audio' | 'image';
  source: 'meshy' | 'elevenlabs' | 'user' | 'runtime';
  generationPrompt: string;
  audioKind: 'sfx' | 'ambience' | 'music' | 'voice' | null;
  quality: 'mobile';
  lod: number;
  required: boolean;
  rig: boolean;
  actionId: number | null;
  instanceOf: string | null;
};

export type AssetPlan = { schemaVersion: 1; assets: AssetPlanItem[] };

export type StudioPaket = {
  specification: GameSpecification;
  design: GameDesign;
  assetPlan: AssetPlan;
};

const IZINLI_EKONOMI = new Set(['score', 'timer', 'inventory', 'test_balance']);

function obje(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function yazi(v: unknown, max: number): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function tam(v: unknown, yedek: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return yedek;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function kayan(v: unknown, yedek: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return yedek;
  return Math.min(max, Math.max(min, n));
}

function listeYazi(v: unknown, maxOge: number, maxUzun: number): string[] {
  let kaynak: unknown[] = [];
  if (typeof v === 'string') kaynak = v.split(/\n+|•/);
  else if (Array.isArray(v)) kaynak = v;
  else if (obje(v)) kaynak = Object.values(v);
  const out: string[] = [];
  for (const item of kaynak) {
    const row = obje(item);
    const t = row
      ? yazi(row.text ?? row.label ?? row.summary ?? row.name ?? row.title, maxUzun)
      : yazi(item, maxUzun);
    if (t) out.push(t);
    if (out.length >= maxOge) break;
  }
  return out;
}

function vec3(v: unknown, yedek: Vec3, limit: number): Vec3 {
  if (!Array.isArray(v) || v.length < 3) return yedek;
  return [
    kayan(v[0], yedek[0], -limit, limit),
    kayan(v[1], yedek[1], -limit, limit),
    kayan(v[2], yedek[2], -limit, limit),
  ];
}

function slug(v: unknown, yedek: string): string {
  const ham = yazi(v, 40).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  const s = ham.slice(0, 40);
  return SLUG.test(s) ? s : yedek;
}

const DEDE_CARPAN = new Set([2, 3, 5, 10, 15, 25, 50, 100]);
const DEDE_BAHIS = new Set([10, 25, 50, 100]);

export function cascadeOku(raw: unknown, mechanics: { id: string }[]): CascadeAyar | null {
  const row = obje(raw);
  const isteniyor = !!row || mechanics.some((m) => m.id === 'dede_cascade' || m.id === 'cascade_grid');
  if (!isteniyor) return null;
  const kaynak = row ?? {};
  const hamBahis = Array.isArray(kaynak.stakes) ? kaynak.stakes : [10, 25, 50, 100];
  const stakes = hamBahis.map((n) => tam(n, 10, 10, 100)).filter((n) => DEDE_BAHIS.has(n));
  const hamCarpan = Array.isArray(kaynak.multipliers) ? kaynak.multipliers : [2, 3, 5, 10, 15, 25, 50, 100];
  const multipliers = hamCarpan.map((n) => tam(n, 2, 2, 100)).filter((n) => DEDE_CARPAN.has(n));
  return {
    columns: 6,
    rows: 5,
    minCluster: 5,
    stakes: stakes.length ? stakes : [10, 25, 50, 100],
    multipliers: multipliers.length ? multipliers : [2, 3, 5, 10, 15, 25, 50, 100],
    bigWinMultiple: tam(kaynak.bigWinMultiple, 15, 5, 100),
    gemScale: kayan(kaynak.gemScale, 1, 0.6, 1.8),
    particleBurst: tam(kaynak.particleBurst, 14, 4, 36),
    gridOffsetY: kayan(kaynak.gridOffsetY, 0, -1.2, 1.2),
    sky: yazi(kaynak.sky, 24) || 'sunset',
    robe: renkHex(kaynak.robe) || '#6B2450',
  };
}

export function dogrulaPaket(raw: unknown): { ok: true; paket: StudioPaket } | { ok: false; errors: string[] } {
  const kok = obje(raw);
  if (!kok) return { ok: false, errors: ['ROOT'] };
  const specIn = obje(kok.specification) ?? obje(kok.spec) ?? (obje(kok.game) ? kok : null);
  const designIn = obje(kok.design) ?? {};
  const planHam = kok.assetPlan ?? kok.asset_plan ?? specIn?.assetPlan;
  const planIn = obje(planHam) ?? (Array.isArray(planHam) ? { assets: planHam } : {});
  if (!specIn) return { ok: false, errors: ['specification'] };

  const game = obje(specIn.game) ?? {};
  const world = obje(specIn.world) ?? {};
  const player = obje(specIn.player) ?? {};
  const gameplay = obje(specIn.gameplay) ?? {};
  const physics = obje(specIn.physics);
  const ui = obje(specIn.ui);
  const audio = obje(specIn.audio);
  const multi = obje(specIn.multiplayer);
  const economy = obje(specIn.economy);
  const algorithm = obje(specIn.algorithm);
  const titleHam = yazi(game.title, 80);
  const descriptionHam = yazi(game.description, 500);

  const dimension = game.dimension === '2d' ? '2d' : '3d';
  const cameraRaw = yazi(player.camera, 20);
  const camera = (['orbit', 'chase', 'fixed', 'cinematic'] as const).includes(cameraRaw as 'orbit')
    ? (cameraRaw as GameSpecification['player']['camera'])
    : 'fixed';

  const entitiesIn = Array.isArray(specIn.entities) ? specIn.entities.slice(0, 24) : [];
  const entities: GameSpecification['entities'] = [];
  const gorulen = new Set<string>();
  for (const item of entitiesIn) {
    const row = obje(item);
    if (!row) continue;
    let id = slug(row.id, '');
    if (!id) id = slug(row.role, `entity_${entities.length + 1}`);
    if (gorulen.has(id)) id = slug(`${id}_${entities.length + 1}`, `entity_${entities.length + 1}`);
    gorulen.add(id);
    const preset = yazi(row.materialPreset, 24) || 'default';
    entities.push({
      id,
      name: yazi(row.name, 60) || id,
      role: yazi(row.role, 32) || 'prop',
      assetId: slug(row.assetId ?? row.asset_id, id),
      count: tam(row.count, 1, 1, 12),
      testDelta: row.testDelta == null || row.testDelta === '' ? null : tam(row.testDelta, 0, -100000, 100000),
      position: vec3(row.position, [0, 0, 0], 80),
      rotation: vec3(row.rotation, [0, 0, 0], 360),
      scale: vec3(row.scale, [1, 1, 1], 20).map((n) => (n === 0 ? 1 : n)) as Vec3,
      materialPreset: preset,
    });
  }

  const outcomesIn = Array.isArray(gameplay.outcomes) ? gameplay.outcomes.slice(0, 12) : [];
  const outcomes: GameSpecification['gameplay']['outcomes'] = [];
  for (const item of outcomesIn) {
    const row = obje(item);
    if (!row) continue;
    const delta = tam(row.delta, 0, -100000, 100000);
    const id = slug(row.id, `outcome_${outcomes.length + 1}`);
    outcomes.push({ id, label: yazi(row.label, 40) || String(delta), delta });
  }

  const mechanicsIn = Array.isArray(specIn.mechanics) ? specIn.mechanics.slice(0, 12) : [];
  const mechanics: GameSpecification['mechanics'] = [];
  for (const item of mechanicsIn) {
    const row = obje(item);
    if (!row) continue;
    mechanics.push({
      id: slug(row.id, `mechanic_${mechanics.length + 1}`),
      name: yazi(row.name, 60) || 'mechanic',
      summary: yazi(row.summary, 240),
    });
  }

  const eventsIn = algorithm && Array.isArray(algorithm.events) ? algorithm.events.slice(0, 8) : [];
  const events: GameSpecification['algorithm']['events'] = [];
  for (const item of eventsIn) {
    const row = obje(item);
    if (!row) continue;
    events.push({
      id: slug(row.id, `event_${events.length + 1}`),
      when: yazi(row.when, 80),
      effect: yazi(row.effect, 120),
    });
  }

  const capsRaw = economy ? listeYazi(economy.requestedCapabilities, 6, 32) : [];
  const requestedCapabilities = capsRaw.map((c) => c.toLowerCase()).filter((c) => IZINLI_EKONOMI.has(c));

  const assets = Array.isArray(specIn.assets)
    ? specIn.assets.map((a) => slug(a, '')).filter(Boolean).slice(0, 12)
    : [];

  const title = titleHam.length >= 2 ? titleHam : 'Oyun';
  const description = descriptionHam.length >= 8 ? descriptionHam : `${title} mobil oyun.`;
  const anlamli = titleHam.length >= 2
    || entities.length > 0
    || outcomes.length > 0
    || yazi(world.environment, 80).length > 3
    || yazi(gameplay.objective, 80).length > 3;
  if (!anlamli) return { ok: false, errors: ['EMPTY'] };

  const specification: GameSpecification = {
    schemaVersion: 1,
    game: {
      title,
      description,
      genre: yazi(game.genre, 40) || 'arcade',
      dimension,
      orientation: game.orientation === 'landscape' ? 'landscape' : 'portrait',
      visualStyle: yazi(game.visualStyle, 80) || 'stylized',
      targetSessionDuration: tam(game.targetSessionDuration, 120, 15, 900),
    },
    world: {
      environment: yazi(world.environment, 160),
      sky: yazi(world.sky, 80),
      lighting: yazi(world.lighting, 80),
      weather: yazi(world.weather, 80),
      terrain: yazi(world.terrain, 80),
      background: yazi(world.background, 80),
    },
    player: {
      type: yazi(player.type, 40) || 'touch',
      model: yazi(player.model, 60),
      controller: yazi(player.controller, 40) || 'tap',
      movement: yazi(player.movement, 60),
      camera,
    },
    gameplay: {
      objective: yazi(gameplay.objective, 240),
      rules: listeYazi(gameplay.rules, 8, 180),
      winConditions: listeYazi(gameplay.winConditions, 4, 140),
      loseConditions: listeYazi(gameplay.loseConditions, 4, 140),
      progression: yazi(gameplay.progression, 180),
      startTestScore: tam(gameplay.startTestScore, 0, -1000000, 1000000),
      outcomes,
    },
    entities,
    mechanics,
    physics: {
      enabled: physics ? physics.enabled === true : dimension === '3d',
      gravity: kayan(physics?.gravity, -9.81, -40, 0),
      collisionLayers: physics ? listeYazi(physics.collisionLayers, 6, 24) : ['default'],
    },
    ui: {
      hud: ui ? listeYazi(ui.hud, 8, 40) : ['score'],
      menus: ui ? listeYazi(ui.menus, 4, 40) : [],
      controls: ui ? listeYazi(ui.controls, 6, 40) : ['tap'],
    },
    audio: {
      music: audio ? listeYazi(audio.music, 2, 80) : [],
      ambience: audio ? listeYazi(audio.ambience, 3, 80) : [],
      sfx: audio ? listeYazi(audio.sfx, 6, 80) : [],
      voices: audio ? listeYazi(audio.voices, 2, 80) : [],
    },
    assets,
    animations: listeYazi(specIn.animations, 6, 40),
    multiplayer: {
      enabled: multi ? multi.enabled === true : false,
      minPlayers: tam(multi?.minPlayers, 1, 1, 8),
      maxPlayers: tam(multi?.maxPlayers, 1, 1, 8),
    },
    economy: { requestedCapabilities },
    algorithm: { events },
    cascade: cascadeOku(specIn.cascade, mechanics),
  };

  const design: GameDesign = {
    schemaVersion: 1,
    gameplay: listeYazi(designIn.gameplay, 8, 180),
    world: listeYazi(designIn.world, 8, 180),
    player: listeYazi(designIn.player, 6, 140),
    camera: listeYazi(designIn.camera, 4, 140),
    physics: listeYazi(designIn.physics, 6, 140),
    audio: listeYazi(designIn.audio, 8, 140),
    ui: listeYazi(designIn.ui, 8, 80),
  };
  if (design.gameplay.length < 1) {
    design.gameplay = [specification.gameplay.objective || specification.game.description];
  }
  if (design.world.length < 1) {
    design.world = [specification.world.environment || specification.game.visualStyle || 'stylized arena'];
  }

  const planAssetsIn = Array.isArray(planIn.assets) ? planIn.assets.slice(0, 12) : [];
  const assetsPlan: AssetPlanItem[] = [];
  const planIds = new Set<string>();
  for (const item of planAssetsIn) {
    const row = obje(item);
    if (!row) continue;
    const assetId = slug(row.assetId ?? row.asset_id ?? row.id ?? row.name, '');
    if (!assetId || planIds.has(assetId)) continue;
    planIds.add(assetId);
    const typeRaw = yazi(row.type, 20);
    const type = (['model', 'texture', 'material', 'animation', 'audio', 'image'] as const).includes(typeRaw as 'model')
      ? (typeRaw as AssetPlanItem['type'])
      : 'model';
    const sourceRaw = yazi(row.source, 20);
    const source = (['meshy', 'elevenlabs', 'user', 'runtime'] as const).includes(sourceRaw as 'meshy')
      ? (sourceRaw as AssetPlanItem['source'])
      : type === 'audio' ? 'elevenlabs' : type === 'model' ? 'meshy' : 'runtime';
    const kindRaw = yazi(row.audioKind, 20);
    const audioKind = (['sfx', 'ambience', 'music', 'voice'] as const).includes(kindRaw as 'sfx')
      ? (kindRaw as AssetPlanItem['audioKind'])
      : null;
    assetsPlan.push({
      assetId,
      type,
      source,
      generationPrompt: yazi(row.generationPrompt ?? row.generation_prompt ?? row.prompt, 800),
      audioKind,
      quality: 'mobile',
      lod: 0,
      required: row.required !== false,
      rig: row.rig === true && type === 'model',
      actionId: row.actionId == null ? null : tam(row.actionId, 0, 1, 500),
      instanceOf: row.instanceOf ? slug(row.instanceOf, '') || null : null,
    });
  }
  for (const asset of assetsPlan) {
    if (asset.source !== 'runtime' && asset.generationPrompt.length < 8 && !asset.instanceOf) {
      asset.generationPrompt = `${asset.assetId.replace(/_/g, ' ')}, stylized mobile game asset, clear silhouette`;
    }
  }
  if (!assetsPlan.some((asset) => asset.type === 'model' && asset.source === 'meshy' && !asset.instanceOf)) {
    const kaynak = [...new Set(specification.entities.map((entity) => entity.assetId))].slice(0, 4);
    const ids = kaynak.length ? kaynak : ['hero_prop'];
    for (const assetId of ids) {
      if (assetsPlan.some((asset) => asset.assetId === assetId)) continue;
      const ad = assetId.replace(/_/g, ' ');
      assetsPlan.push({
        assetId,
        type: 'model',
        source: 'meshy',
        generationPrompt: `${ad}, ${specification.game.visualStyle} mobile game prop, clear silhouette, simple materials`,
        audioKind: null,
        quality: 'mobile',
        lod: 0,
        required: true,
        rig: false,
        actionId: null,
        instanceOf: null,
      });
    }
  }
  if (specification.entities.length < 1) {
    const assetId = assetsPlan.find((asset) => asset.type === 'model')?.assetId ?? 'hero_prop';
    specification.entities.push({
      id: 'hero',
      name: specification.game.title,
      role: outcomes.length >= 2 ? 'chest' : 'prop',
      assetId,
      count: 1,
      testDelta: null,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      materialPreset: 'default',
    });
  }
  return { ok: true, paket: { specification, design, assetPlan: { schemaVersion: 1, assets: assetsPlan } } };
}

export function guvenlikTara(paket: StudioPaket): string | null {
  const blob = JSON.stringify(paket).toLowerCase();
  if (blob.includes('<script') || blob.includes('javascript:') || blob.includes('data:text/html')) {
    return 'MARKUP';
  }
  const caps = paket.specification.economy.requestedCapabilities.join(' ');
  if (/wallet|ledger|service_role|coin_credit/.test(caps)) return 'ECONOMY';
  return null;
}

export function renkHex(v: unknown): string | null {
  const s = yazi(v, 7);
  return HEX.test(s) ? s : null;
}
