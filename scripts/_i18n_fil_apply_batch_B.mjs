#!/usr/bin/env node
/**
 * Atomically apply batch B Taglish translations to fil.json + value cache.
 * node scripts/_i18n_fil_apply_batch_B.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = path.join(ROOT, 'src', 'i18n', 'locales');
const filPath = path.join(L, 'fil.json');
const cachePath = path.join(L, '_fil_value_cache.json');
const batchPath = path.join(ROOT, 'scripts', '_i18n_fil_batch_B.json');

function setDeep(obj, keyPath, val) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

/** key \u2192 Filipino (Taglish). Middot = \\u00b7, emdash = \\u2014 */
const DOT = '\u00b7';
const MDASH = '\u2014';

const FIL = {
  'odaTema.neon_auroraAlt': `Rosas ${DOT} magenta aurora`,
  'odaTema.cosmic_voidAlt': 'Malalim na indigo void',
  'odaTema.arctic_mistAlt': 'Ice-blue na hamog',
  'odaTema.cherry_noirAlt': 'Madilim na pulang eksena',
  'odaTema.emerald_hazeAlt': 'Berdeng-gubat na hamog',
  'odaTema.electric_lilacAlt': 'Neon lilac na liwanag',
  'odaTema.ocean_depthAlt': 'Malalim na teal na alon',
  'odaTema.velvet_roseAlt': 'Malambot na rose na eksena',
  'odaTema.obsidian_noirAlt': 'Matte black na luho',
  'odaTema.amethyst_duskAlt': 'Lilang hiyas na kislap',
  'odaTema.noir_sapphireAlt': 'Malalim na asul na hiyas',
  'odaTema.graphite_smokeAlt': 'Malambot na anthracite na hamog',
  'odaTema.indigo_velvetAlt': 'Malalim na indigo na tela',
  'odaTema.plasma_pinkAlt': 'Neon plasma na liwanag',
  'odaTema.laser_violetAlt': 'Matulis na violet na sinag',
  'odaTema.hologram_tealAlt': 'Futuristikong teal na salamin',
  'odaTema.neon_citrusAlt': 'Acid lemon na accent',
  'odaTema.synthwave_duskAlt': '80s retro na alon',
  'odaTema.volt_blueAlt': 'Electric blue na pulse',
  'odaTema.champagne_suiteAlt': 'Gintong VIP lounge',
  'odaTema.platinum_loungeAlt': 'Malamig na metalikong luho',
  'odaTema.amber_throneAlt': 'Mainit na amber VIP',
  'odaTema.ruby_vipAlt': 'Pulang hiyas na entablado',
  'odaTema.jade_palaceAlt': 'Elegante jade na kislap',
  'odaTema.forest_whisperAlt': 'Malalim na berdeng katahimikan',
  'odaTema.lagoon_breezeAlt': 'Turquoise na texture ng tubig',
  'odaTema.moss_templeAlt': 'Natural na berdeng bato',
  'odaTema.glacier_peakAlt': 'Ice crystal na asul',
  'odaTema.desert_mirageAlt': 'Mainit na ginto ng buhangin',
  'odaTema.tropical_nightAlt': `Karagatan sa gabi ${DOT} coral`,
  'odaTema.blush_satinAlt': 'Malambot na pink na satin',
  'odaTema.crimson_silkAlt': 'Velvet na pulang seda',
  'odaTema.peach_glowAlt': 'Mainit na peach glow',
  'odaTema.lavender_dreamAlt': 'Pastel lavender na hamog',
  'odaTema.bordeaux_nightAlt': 'Wine-red na gabi',
  'odaTema.nebula_roseAlt': 'Rosas na kosmikong ulap',
  'odaTema.starlight_indigoAlt': 'Indigo ng gabing langit',
  'odaTema.galaxy_tealAlt': 'Berdeng-kalawakan na spiral',
  'odaTema.pulsar_purpleAlt': 'Pumupulsang lilang bituin',
  'odaTema.comet_trailAlt': 'Ice-blue na bakas',
  'odaTema.void_emberAlt': `Madilim na kalawakan ${DOT} ember`,
  'odaTema.chrome_frostAlt': 'Malamig na metal na salamin',
  'odaTema.copper_wireAlt': 'Mainit na tansong kislap',
  'odaTema.titanium_edgeAlt': 'Matulis na abuhing metal',
  'odaTema.bronze_mirrorAlt': 'Naka-salaming bronze na ibabaw',
  'odaTema.mercury_glassAlt': 'Liquid metal na salamin',
  'odaTema.steel_neonAlt': 'Metal + asul na neon',
  'odaTema.spaces_skyAlt': `Langit sa gabi ${DOT} asul na accent`,
  'odaTema.party_neonAlt': `Live party ${DOT} pink neon`,
  'odaTema.greenroom_darkAlt': `Itim na entablado ${DOT} berdeng accent`,
  'odaTema.salon_warmAlt': `Open cream ${DOT} orange na accent`,

  'odaDuzen.floating_glassAlt': `Salaming grid ${DOT} soft halo`,
  'odaDuzen.orbitAlt': `Gitnang podium ${DOT} arc seats`,
  'odaDuzen.podium_eliteAlt': 'Premium podium na entablado',
  'odaDuzen.crystal_gridAlt': 'Crystal glass na layout',
  'odaDuzen.premium_tilesAlt': 'VIP tile grid',
  'odaDuzen.hex_pulseAlt': '5-column pulse na layout',
  'odaDuzen.planet_orbitAlt': 'Orbital mic ring',
  'odaDuzen.star_wheelAlt': 'Star wheel na layout',
  'odaDuzen.comet_arcAlt': 'Bumabagsak na comet arc',
  'odaDuzen.champagne_barAlt': 'Lounge bar na layout',
  'odaDuzen.nightclub_boothAlt': 'Club booth na upuan',
  'odaDuzen.vip_railAlt': 'Pahalang na VIP mic rail',
  'odaDuzen.glass_cascadeAlt': 'Bumabagsak na salaming rows',
  'odaDuzen.diamond_cutAlt': 'Diamond row na layout',
  'odaDuzen.prism_stackAlt': 'Prism diamond na layers',
  'odaDuzen.halo_frameAlt': 'Halo orbit na frame',
  'odaDuzen.mini_clusterAlt': 'Compact cluster grid',
  'odaDuzen.intimate_duoAlt': `Dating ${DOT} malapit na duo`,
  'odaDuzen.focus_pairAlt': 'Focus para sa dalawa',
  'odaDuzen.tight_hexAlt': 'Siksik na compact hex',
  'odaDuzen.spaces_stripAlt': 'Host + pahalang na speaker strip',
  'odaDuzen.dropin_tiles': 'Drop-in tiles',
  'odaDuzen.greenroom_barAlt': `Host strip ${DOT} compact na audience`,

  'gorunum.sampanyaAlt': 'VIP gold noir',
  'gorunum.zumrutAlt': 'VIP lounge ng gubat',
  'gorunum.obsidyenAlt': 'Matte black na luho',
  'gorunum.neon_sehirAlt': `Cyber pink ${DOT} mint`,
  'gorunum.inciAlt': 'Light rose na perlas',
  'gorunum.mint_sabahAlt': 'Light emerald na umaga',

  'sesOda.istegiReddet': 'Tanggihan ang request ni {{ad}}',
  'sesOda.istegiOnayla': 'Aprubahan ang request ni {{ad}}',
  'sesOda.saDk': '{{sa}} oras {{dk}} min',
  'sesOda.demoCanliOda': 'Demo live room',

  'odaMuzik.aiStudio': 'AI Music Studio',
  'odaMuzik.sesBilgi': `Audio: {{ext}} ${DOT} {{path}}`,

  'olusturTab.sesOdasiAlt': `Mga mic seat ${DOT} chat ${DOT} gifts`,
  'olusturTab.canliYayinAlt': `Sumabak sa stage gamit ang camera ${DOT} audience`,
  'olusturTab.durumAlt': `Maikling sandali ${DOT} mag-share ng larawan o text`,
  'olusturTab.odaOnerisi': 'Kwarto ni {{ad}}',
  'olusturTab.girisGerekli': 'Kailangan mag-sign in',
  'olusturTab.baslikGerekliBody': 'Maglagay ng maikling pamagat para sa kwarto.',
  'olusturTab.odaAcilamaz': 'Hindi mabuksan ang kwarto',
  'olusturTab.odaYasakBody':
    'Naka-ban ka sa pagbubukas ng voice room. Subukan ulit kapag nag-expire o tinanggal ang ban.',
  'olusturTab.odanizVar': 'May voice room ka',
  'olusturTab.odanizVarBody':
    '"{{baslik}}" ay bukas pa.\n\nKung magpapatuloy ka, magsasara ang dating kwarto at magbubukas ang bagong voice room.',
  'olusturTab.odanizVarBodyKisa':
    'Kung magpapatuloy ka, magsasara ang dating kwarto at magbubukas ang bagong voice room.',
  'olusturTab.odamaGit': 'Pumunta sa aking kwarto',
  'olusturTab.odaKapatilamadi': 'Hindi maisara ang dating kwarto',
  'olusturTab.odaAcilamadi': 'Hindi mabuksan ang kwarto',
  'olusturTab.odaAcilamadiYasak':
    'Baka naka-ban ka sa pagbubukas ng voice room, walang permiso, o may bukas nang kwarto.',
  'olusturTab.migrationHint': 'Siguraduhing na-run na ang Supabase migration.',
  'olusturTab.kapakEkle': 'Magdagdag ng cover photo',
  'olusturTab.kapakYoksa': 'Kung wala, gagamitin ang {{tema}} theme',
  'olusturTab.odaKapakResmi': 'Cover image ng kwarto',
  'olusturTab.temaYedek': `May larawan ${MDASH} theme bilang fallback ({{tema}})`,
  'olusturTab.temaSahne': `{{tema}} ${DOT} full-screen stage sa kwarto`,
  'olusturTab.boyutAlt': 'Capacity ng upuan at tagapakinig',
  'olusturTab.dinleyiciBin': '{{adet}}k na tagapakinig',
};

const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const fil = JSON.parse(fs.readFileSync(filPath, 'utf8'));
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

let patched = 0;
const missing = [];

for (const item of batch) {
  const { key, en } = item;
  const filVal = FIL[key];
  if (!filVal) {
    missing.push(key);
    continue;
  }
  setDeep(fil, key, filVal);
  if (en) cache[en] = filVal;
  patched++;
}

if (missing.length) {
  console.error('Missing translations:', missing);
  process.exit(1);
}

fs.writeFileSync(filPath, JSON.stringify(fil, null, 2) + '\n', 'utf8');
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log(`Patched ${patched} keys (batch B)`);
