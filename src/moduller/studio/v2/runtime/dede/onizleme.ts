export const DEDE_VARSAYILAN = {
  columns: 6,
  rows: 5,
  minCluster: 5,
  stakes: [10, 25, 50, 100],
  multipliers: [2, 3, 5, 10, 15, 25, 50, 100],
  bigWinMultiple: 15,
  gemScale: 1,
  particleBurst: 14,
  gridOffsetY: 0,
  sky: 'sunset',
  robe: '#6B2450',
};

export type DedeCascade = typeof DEDE_VARSAYILAN & { portrait?: string; assetFailure?: boolean };

/** Studio önizlemesi. Cüzdan, coin ve ajans bakiyesine dokunmaz. */
export function dedeManifest(over: Partial<DedeCascade> = {}) {
  const cascade: DedeCascade = { ...DEDE_VARSAYILAN, ...over };
  return {
    schemaVersion: 1 as const,
    runtime: 'playcanvas-engine' as const,
    runtimeVersion: '1.73.4' as const,
    mode: 'PREVIEW' as const,
    gameId: 'dede',
    version: 1,
    economy: { mode: 'TEST_BALANCE' as const, testBalance: 10000, currency: 'TEST' as const },
    cascade,
    scene: {
      schemaVersion: 1 as const,
      id: 'main',
      name: 'DEDE',
      entities: [
        { id: 'environment', name: 'Gök Konağı', parentId: null, role: 'environment' },
        { id: 'dede', name: 'Dede', parentId: 'environment', role: 'character' },
        { id: 'grid', name: '6x5', parentId: 'environment', role: 'grid' },
        { id: 'camera', name: 'Kamera', parentId: null, role: 'camera' },
      ],
    },
    gameplay: {
      schemaVersion: 1 as const,
      entry: 'boot',
      nodes: [{ id: 'boot', category: 'EVENT', action: 'CASCADE_BOOT', params: {}, next: [] }],
    },
    assets: [] as { assetId: string; r2Key: string; type: string; mime: string }[],
    issues: [] as string[],
    physics: { enabled: false, gravity: -9.81, collisionLayers: ['default'] },
  };
}

export const DEDE_VARLIKLAR = [
  { id: 'dede_character', klasor: 'models', dosya: 'dede_character.glb', source: 'runtime' },
  { id: 'mansion', klasor: 'textures', dosya: 'mansion.png', source: 'runtime' },
  { id: 'columns', klasor: 'models', dosya: 'columns.glb', source: 'runtime' },
  { id: 'grid_frame', klasor: 'models', dosya: 'grid_frame.glb', source: 'runtime' },
  { id: 'sym_amethyst', klasor: 'models', dosya: 'sym_amethyst.glb', source: 'runtime' },
  { id: 'sym_emerald', klasor: 'models', dosya: 'sym_emerald.glb', source: 'runtime' },
  { id: 'sym_ruby', klasor: 'models', dosya: 'sym_ruby.glb', source: 'runtime' },
  { id: 'sym_sapphire', klasor: 'models', dosya: 'sym_sapphire.glb', source: 'runtime' },
  { id: 'sym_topaz', klasor: 'models', dosya: 'sym_topaz.glb', source: 'runtime' },
  { id: 'sym_watch', klasor: 'models', dosya: 'sym_watch.glb', source: 'runtime' },
  { id: 'sym_lantern', klasor: 'models', dosya: 'sym_lantern.glb', source: 'runtime' },
  { id: 'sym_key', klasor: 'models', dosya: 'sym_key.glb', source: 'runtime' },
  { id: 'sym_ring', klasor: 'models', dosya: 'sym_ring.glb', source: 'runtime' },
  { id: 'sym_crown', klasor: 'models', dosya: 'sym_crown.glb', source: 'runtime' },
  { id: 'dede_medallion', klasor: 'models', dosya: 'dede_medallion.glb', source: 'runtime' },
  { id: 'logo', klasor: 'ui', dosya: 'logo.png', source: 'runtime' },
  { id: 'cover', klasor: 'ui', dosya: 'cover.jpg', source: 'generated' },
  { id: 'icon', klasor: 'ui', dosya: 'icon.jpg', source: 'generated' },
] as const;

export function dedeAnahtar(id: string, version = 1) {
  const row = DEDE_VARLIKLAR.find((v) => v.id === id);
  if (!row) return '';
  return `games/dede/versions/${version}/${row.klasor}/${row.dosya}`;
}

export type DedeYama = {
  schemaVersion: 1;
  summary: string;
  operations: { operation: string; targets: string[]; properties: Record<string, unknown> }[];
};

/** Küçük görsel istekleri bütün oyunu yeniden kurmadan yamaya çevirir. */
export function dedeYamaMetni(yazi: string): DedeYama | null {
  const s = yazi.toLocaleLowerCase('tr-TR');
  const ops: DedeYama['operations'] = [];
  if (s.includes('gece')) ops.push({ operation: 'UPDATE_CASCADE', targets: ['cascade'], properties: { sky: 'night' } });
  if (s.includes('kristal') && (s.includes('büyüt') || s.includes('buyut'))) {
    ops.push({ operation: 'UPDATE_CASCADE', targets: ['cascade'], properties: { gemScale: 1.35 } });
  }
  if (s.includes('bordo')) ops.push({ operation: 'UPDATE_CASCADE', targets: ['cascade'], properties: { robe: '#6B1D3A' } });
  if (s.includes('parçacık') || s.includes('parcacik')) {
    ops.push({ operation: 'UPDATE_CASCADE', targets: ['cascade'], properties: { particleBurst: 28 } });
  }
  if (s.includes('grid') && (s.includes('yukarı') || s.includes('yukari'))) {
    ops.push({ operation: 'UPDATE_CASCADE', targets: ['cascade'], properties: { gridOffsetY: 0.28 } });
  }
  if (!ops.length) return null;
  return { schemaVersion: 1, summary: yazi.slice(0, 160), operations: ops.slice(0, 8) };
}

export function dedeYamaUygula(cascade: DedeCascade, yama: DedeYama): DedeCascade {
  const next = { ...cascade };
  for (const op of yama.operations) {
    if (op.operation !== 'UPDATE_CASCADE') continue;
    const p = op.properties;
    if (p.sky === 'night' || p.sky === 'sunset') next.sky = p.sky;
    if (typeof p.robe === 'string' && /^#[0-9a-fA-F]{6}$/.test(p.robe)) next.robe = p.robe;
    if (typeof p.gemScale === 'number') next.gemScale = p.gemScale;
    if (typeof p.particleBurst === 'number') next.particleBurst = p.particleBurst;
    if (typeof p.gridOffsetY === 'number') next.gridOffsetY = p.gridOffsetY;
  }
  return next;
}
