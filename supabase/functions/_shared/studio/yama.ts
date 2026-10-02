import type { GameSpecification } from './sozlesme.ts';
import { renkHex } from './sozlesme.ts';

const ISLEMLER = new Set([
  'UPDATE_MATERIAL',
  'UPDATE_TRANSFORM',
  'UPDATE_LIGHT',
  'UPDATE_CAMERA',
  'UPDATE_ASSET_PROMPT',
  'UPDATE_CASCADE',
]);

const PRESET = new Set(['gold', 'silver', 'wood', 'stone', 'dark', 'default']);

export type GamePatch = {
  schemaVersion: 1;
  summary: string;
  operations: {
    operation: string;
    targets: string[];
    properties: Record<string, unknown>;
  }[];
};

function obje(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function dogrulaYama(raw: unknown): { ok: true; patch: GamePatch } | { ok: false; errors: string[] } {
  const row = obje(raw);
  if (!row) return { ok: false, errors: ['ROOT'] };
  const opsIn = Array.isArray(row.operations) ? row.operations.slice(0, 8) : [];
  const operations: GamePatch['operations'] = [];
  const errors: string[] = [];
  for (const item of opsIn) {
    const op = obje(item);
    if (!op) continue;
    const operation = String(op.operation ?? '');
    if (!ISLEMLER.has(operation)) {
      errors.push('OPERATION');
      continue;
    }
    const targets = Array.isArray(op.targets)
      ? op.targets.map((t) => String(t ?? '').trim().slice(0, 48)).filter(Boolean).slice(0, 12)
      : [];
    if (!targets.length) errors.push('TARGETS');
    const properties = obje(op.properties) ?? {};
    operations.push({ operation, targets, properties });
  }
  if (!operations.length) errors.push('EMPTY');
  if (errors.length) return { ok: false, errors: [...new Set(errors)] };
  return {
    ok: true,
    patch: { schemaVersion: 1, summary: String(row.summary ?? '').slice(0, 160), operations },
  };
}

function eslesir(id: string, hedef: string): boolean {
  if (hedef.endsWith('*')) {
    const onek = hedef.slice(0, -1);
    return id.startsWith(onek) || id === onek.replace(/_$/, '');
  }
  return id === hedef;
}

function hedefler(ids: string[], targets: string[]): string[] {
  return ids.filter((id) => targets.some((t) => eslesir(id, t)));
}

export function yamaUygula(
  spec: GameSpecification,
  patch: GamePatch,
): { specification: GameSpecification; regenPrompts: { assetId: string; prompt: string }[] } {
  const next: GameSpecification = structuredClone(spec);
  const regenPrompts: { assetId: string; prompt: string }[] = [];
  const ids = next.entities.map((e) => e.id);
  for (const op of patch.operations) {
    const secilen = hedefler(ids, op.targets);
    if (op.operation === 'UPDATE_MATERIAL') {
      const preset = String(op.properties.materialPreset ?? '').slice(0, 24);
      const color = renkHex(op.properties.color);
      for (const entity of next.entities) {
        if (!secilen.includes(entity.id)) continue;
        if (PRESET.has(preset)) entity.materialPreset = preset;
        else if (preset) entity.materialPreset = preset.slice(0, 24);
        if (color) entity.materialPreset = color;
      }
    }
    if (op.operation === 'UPDATE_TRANSFORM') {
      for (const entity of next.entities) {
        if (!secilen.includes(entity.id)) continue;
        if (Array.isArray(op.properties.position) && op.properties.position.length >= 3) {
          entity.position = op.properties.position.slice(0, 3).map((n) => Number(n) || 0) as GameSpecification['entities'][0]['position'];
        }
        if (Array.isArray(op.properties.scale) && op.properties.scale.length >= 3) {
          entity.scale = op.properties.scale.slice(0, 3).map((n) => Number(n) || 1) as GameSpecification['entities'][0]['scale'];
        }
      }
    }
    if (op.operation === 'UPDATE_LIGHT') {
      next.world.lighting = String(op.properties.lighting ?? next.world.lighting).slice(0, 80);
    }
    if (op.operation === 'UPDATE_CAMERA') {
      const mode = String(op.properties.camera ?? '');
      if (mode === 'orbit' || mode === 'chase' || mode === 'fixed' || mode === 'cinematic') {
        next.player.camera = mode;
      }
    }
    if (op.operation === 'UPDATE_CASCADE' && next.cascade) {
      const sky = String(op.properties.sky ?? '');
      if (sky === 'night' || sky === 'sunset') next.cascade.sky = sky;
      const robe = renkHex(op.properties.robe);
      if (robe) next.cascade.robe = robe;
      if (op.properties.gemScale != null) {
        const scale = Number(op.properties.gemScale);
        if (Number.isFinite(scale)) next.cascade.gemScale = Math.min(1.8, Math.max(0.6, scale));
      }
      if (op.properties.particleBurst != null) {
        const n = Math.round(Number(op.properties.particleBurst));
        if (Number.isFinite(n)) next.cascade.particleBurst = Math.min(36, Math.max(4, n));
      }
      if (op.properties.gridOffsetY != null) {
        const y = Number(op.properties.gridOffsetY);
        if (Number.isFinite(y)) next.cascade.gridOffsetY = Math.min(1.2, Math.max(-1.2, y));
      }
    }
    if (op.operation === 'UPDATE_ASSET_PROMPT') {
      const prompt = String(op.properties.prompt ?? '').trim().slice(0, 800);
      const assetIds = op.targets.map((t) => t.replace(/\*$/, '')).filter(Boolean);
      for (const assetId of assetIds) {
        if (prompt.length >= 8) regenPrompts.push({ assetId, prompt });
      }
    }
  }
  return { specification: next, regenPrompts };
}
