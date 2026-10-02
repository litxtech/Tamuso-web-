import { deepseekChat } from '../deepseek/helpers.ts';
import { dogrulaPaket, type StudioPaket } from './sozlesme.ts';
import { dogrulaYama, type GamePatch } from './yama.ts';

const SISTEM = `You are Tamuso Studio's game director.
Return one JSON object with specification, design, and assetPlan.
This is a game design, not a card UI and not React Native.
Do not output kind, hidden_pick, items, or delta lists as the game.
Copy every numeric outcome in the user prompt onto gameplay.outcomes and onto chest entity testDelta values.
Repeated props use ONE model asset and many entities. Never request one Meshy job per copy.
3D games need real model prompts (shape, material, style) in English, max 800 chars.
Mobile budget: at most 6 Meshy models and 6 audio assets.
schemaVersion is 1.
specification fields:
game {title, description, genre, dimension 2d|3d, orientation portrait|landscape, visualStyle, targetSessionDuration}
world {environment, sky, lighting, weather, terrain, background}
player {type, model, controller, movement, camera orbit|chase|fixed|cinematic}
gameplay {objective, rules[], winConditions[], loseConditions[], progression, startTestScore, outcomes[{id, label, delta}]}
entities[{id, name, role, assetId, count, testDelta, position[3], rotation[3], scale[3], materialPreset}]
mechanics[{id, name, summary}]
physics {enabled, gravity, collisionLayers[]}
ui {hud[], menus[], controls[]}
audio {music[], ambience[], sfx[], voices[]}
assets[], animations[]
multiplayer {enabled, minPlayers, maxPlayers}
economy.requestedCapabilities only from: score, timer, inventory, test_balance
If the prompt is a 6x5 cascade named DEDE, set mechanics to [{id:"dede_cascade", name:"Cascade", summary:"6x5 tumble"}] and cascade {columns:6, rows:5, minCluster:5, stakes:[10,25,50,100], multipliers:[2,3,5,10,15,25,50,100], bigWinMultiple:15, gemScale:1, particleBurst:14, gridOffsetY:0, sky:"sunset", robe:"#6B2450"}. Keep economy on test_balance only.
algorithm.events[{id, when, effect}]
design lists: gameplay, world, player, camera, physics, audio, ui. Each is a short string array, not a title-only document.
assetPlan.assets[{assetId, type model|texture|material|animation|audio|image, source meshy|elevenlabs|user|runtime, generationPrompt, audioKind sfx|ambience|music|voice|null, required, rig, actionId|null, instanceOf|null}]
rig true only for humanoid characters.
Ids are snake_case.
No code, URLs, secrets, or wallet writes.
Display strings use the requested language. generationPrompt stays English.
Keep the JSON compact: at most 4 models and 3 audio assets, short lists, no essays.`;

export async function yonetmenCagir(input: {
  apiKey: string;
  prompt: string;
  language: string;
  options: unknown;
}): Promise<{ ok: true; paket: StudioPaket } | { ok: false; code: string; detail?: string }> {
  const user = JSON.stringify({
    prompt: input.prompt.slice(0, 8000),
    language: input.language.slice(0, 8),
    hints: input.options ?? {},
  });
  let lastErrors = 'none';
  for (let deneme = 0; deneme < 2; deneme += 1) {
    const ai = await deepseekChat({
      apiKey: input.apiKey,
      temperature: 0.3,
      maxTokens: 4500,
      jsonMode: true,
      system: SISTEM,
      user: deneme === 0 ? user : `${user}\nFix these schema errors and return the full JSON again: ${lastErrors}`,
    });
    if (!ai.ok) return { ok: false, code: ai.code };
    let parsed: unknown;
    try {
      parsed = JSON.parse(ai.content);
    } catch {
      lastErrors = 'JSON';
      continue;
    }
    const sonuc = dogrulaPaket(parsed);
    if (sonuc.ok) return { ok: true, paket: sonuc.paket };
    lastErrors = sonuc.errors.join(',');
  }
  return { ok: false, code: 'BAD_SPEC', detail: lastErrors.slice(0, 180) };
}

export async function yamaCagir(input: {
  apiKey: string;
  request: string;
  language: string;
  entityIds: string[];
  assetIds: string[];
}): Promise<{ ok: true; patch: GamePatch } | { ok: false; code: string }> {
  const ai = await deepseekChat({
    apiKey: input.apiKey,
    temperature: 0.1,
    maxTokens: 700,
    jsonMode: true,
    system:
      'Return a GamePatch JSON only. Do not rebuild the game. schemaVersion 1. summary string. operations array. operation is UPDATE_MATERIAL, UPDATE_TRANSFORM, UPDATE_LIGHT, UPDATE_CAMERA, UPDATE_ASSET_PROMPT, or UPDATE_CASCADE. UPDATE_CASCADE targets ["cascade"] and may set sky night|sunset, robe hex, gemScale, particleBurst, gridOffsetY. Use it for small visual edits. Do not rebuild the game. targets are ids or prefixes with *. properties hold only the changed fields. materialPreset may be gold, silver, wood, stone, dark. No code.',
    user: JSON.stringify({
      request: input.request.slice(0, 500),
      language: input.language,
      entityIds: input.entityIds.slice(0, 24),
      assetIds: input.assetIds.slice(0, 12),
    }),
  });
  if (!ai.ok) return { ok: false, code: ai.code };
  try {
    const sonuc = dogrulaYama(JSON.parse(ai.content));
    if (!sonuc.ok) return { ok: false, code: 'BAD_PATCH' };
    return { ok: true, patch: sonuc.patch };
  } catch {
    return { ok: false, code: 'BAD_PATCH' };
  }
}
