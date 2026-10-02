/** Write I18N_SCREEN_INVENTORY.md + I18N_AUDIT.md from scan JSON */
import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('docs/_i18n_inventory_raw.json', 'utf8'));
const cats = JSON.parse(fs.readFileSync('docs/_i18n_categorized.json', 'utf8'));

function statusLine(r) {
  const bits = [`- \`${r.path}\` — **${r.status}**`];
  if (r.hasI18n) bits.push('(useCeviri)');
  if (r.trLiteral) bits.push(`· TR literals≈${r.trLiteral}`);
  return bits.join(' ');
}

const order = [
  'AUTH',
  'HOME',
  'PROFILE',
  'MESSAGING',
  'VOICE',
  'LIVE',
  'CALLS',
  'PEOPLE',
  'WALLET',
  'AI_MUSIC',
  'AGENCY',
  'CITY',
  'GAMES',
  'SETTINGS',
  'MODERATION',
  'IDEAS',
  'HOST_KYC',
  'SHARE_PLATFORM',
  'OTHER_USER',
  'ADMIN',
];

const inv = [];
inv.push('# I18N_SCREEN_INVENTORY');
inv.push('');
inv.push(`> Generated: ${raw.generatedAt}`);
inv.push(
  '> Source: live repository scan (`scripts/i18n-inventory.mjs`). Not guessed.',
);
inv.push('');
inv.push('## Summary');
inv.push('');
inv.push('| Metric | Count |');
inv.push('|--------|------:|');
inv.push(`| App route screens (tsx excl layouts) | ${raw.totals.appRouteScreens} |`);
inv.push(`| User-facing screens | ${raw.totals.userScreens} |`);
inv.push(`| Admin screens | ${raw.totals.adminScreens} |`);
inv.push(`| Tabs | ${raw.totals.tabs} |`);
inv.push(
  `| Named Sheet/Modal/Overlay files (src) | ${raw.totals.sheetModalNamedFiles} |`,
);
inv.push(
  `| Panel/Sheet-like components | ${raw.totals.panelSheetLikeFiles} |`,
);
inv.push(`| \`<Modal\` JSX hits (non-admin src) | ${raw.totals.modalJsxHits} |`);
inv.push(`| \`Alert.alert\` calls (all) | ${raw.totals.alertAlertCalls} |`);
inv.push(`| \`Alert.alert\` non-admin | ${raw.totals.alertUser} |`);
inv.push(`| \`Alert.alert\` admin | ${raw.totals.alertAdmin} |`);
inv.push('');
inv.push('### Translation status (heuristic)');
inv.push('');
inv.push('| Status | User | Admin |');
inv.push('|--------|-----:|------:|');
inv.push(
  `| NOT_TRANSLATED | ${raw.userStatus.NOT_TRANSLATED} | ${raw.adminStatus.NOT_TRANSLATED} |`,
);
inv.push(
  `| PARTIAL (useCeviri but TR literals remain) | ${raw.userStatus.PARTIAL} | ${raw.adminStatus.PARTIAL} |`,
);
inv.push(
  `| LIKELY_TRANSLATED | ${raw.userStatus.LIKELY_TRANSLATED} | ${raw.adminStatus.LIKELY_TRANSLATED} |`,
);
inv.push('');
inv.push(
  '**Status meaning:** `LIKELY_TRANSLATED` = file imports `useCeviri` and has few/no Turkish string literals. Does **not** prove EN/ES/AR completeness or that child module components are translated. Most PARTIAL screens only wired titles/headers.',
);
inv.push('');
inv.push('## Tabs');
inv.push('');
for (const t of raw.tabs) inv.push(`- \`${t}\``);
inv.push('');

for (const c of order) {
  const list = cats[c] || [];
  inv.push(`## ${c} (${list.length})`);
  inv.push('');
  for (const r of list) inv.push(statusLine(r));
  inv.push('');
}

inv.push('## Overlays / Sheets / Modals (named files under src)');
inv.push('');
inv.push('### Sheet / Modal / Overlay / Portal / Dialog');
inv.push('');
for (const f of raw.sheetFiles) inv.push(`- \`${f}\``);
inv.push('');
inv.push('### Panel / Lightbox / Sheet-like');
inv.push('');
for (const f of raw.panelFiles) inv.push(`- \`${f}\``);
inv.push('');
inv.push('## Global floating / overlay (root layout)');
inv.push('');
inv.push('- `YuzenTabBar` — bottom tabs');
inv.push('- `AktifSesOdasiMiniBar` / `AktifSesOdasiPipKart` — voice room floating');
inv.push('- `GorusmeGlobalKatman` / `GorusmeGelenSaglayici` — call overlay');
inv.push('- `OyunKazancBalonuSaglayici` — game win bubble');
inv.push('- `CocukKorumaOnayKarti` — child-safety consent card');
inv.push('- `TamusoModal` — shared modal shell');
inv.push('');
inv.push('## Full route audit');
inv.push('');
inv.push('| route_name | file_path | translation_status |');
inv.push('|------------|-----------|--------------------|');
for (const r of [...raw.userRoutes, ...raw.adminRoutes]) {
  const name = r.path.replace(/^app\//, '').replace(/\.tsx$/, '');
  inv.push(`| ${name} | \`${r.path}\` | ${r.status} |`);
}
inv.push('');

fs.writeFileSync('I18N_SCREEN_INVENTORY.md', inv.join('\n'), 'utf8');

// ---------- AUDIT ----------
const audit = [];
audit.push('# I18N_AUDIT');
audit.push('');
audit.push(`> Generated: ${raw.generatedAt}`);
audit.push('> Phase 1 only — inventory / gap analysis. **No claim of translation completion.**');
audit.push('');
audit.push('## === TAMUSO i18n AUDIT ===');
audit.push('');
audit.push(`| Field | Value |`);
audit.push(`|-------|-------|`);
audit.push(`| Toplam Screen (app routes) | **${raw.totals.appRouteScreens}** |`);
audit.push(`| Toplam User Screen | **${raw.totals.userScreens}** |`);
audit.push(`| Toplam Admin Screen | **${raw.totals.adminScreens}** |`);
audit.push(`| Toplam Route (same as screens in Expo Router) | **${raw.totals.appRouteScreens}** |`);
audit.push(`| Toplam Tab | **${raw.totals.tabs}** |`);
audit.push(
  `| Toplam Modal (\`<Modal\` JSX non-admin) | **${raw.totals.modalJsxHits}** |`,
);
audit.push(
  `| Toplam Bottom Sheet / named Sheet-Modal files | **${raw.totals.sheetModalNamedFiles}** |`,
);
audit.push(
  `| Panel/Sheet-like components | **${raw.totals.panelSheetLikeFiles}** |`,
);
audit.push(`| Toplam Alert/Dialog (\`Alert.alert\`) | **${raw.totals.alertAlertCalls}** |`);
audit.push(`| Alert non-admin | ${raw.totals.alertUser} |`);
audit.push(`| Alert admin | ${raw.totals.alertAdmin} |`);
audit.push(
  `| Hard-coded user-visible string (heuristic props+Alert) | **${raw.totals.hardcodedHeuristicHits}** in **${raw.totals.hardcodedFiles}** files |`,
);
audit.push(
  `| Mevcut translation key (approx leaf strings in tr.ts) | **${raw.totals.translationKeysApprox}** |`,
);
audit.push(
  `| Çevrilmiş ekran (LIKELY_TRANSLATED user) | **${raw.userStatus.LIKELY_TRANSLATED}** |`,
);
audit.push(
  `| Kısmi ekran (PARTIAL user) | **${raw.userStatus.PARTIAL}** |`,
);
audit.push(
  `| Eksik ekran (NOT_TRANSLATED user) | **${raw.userStatus.NOT_TRANSLATED}** |`,
);
audit.push(
  `| Admin NOT_TRANSLATED | **${raw.adminStatus.NOT_TRANSLATED}** / ${raw.totals.adminScreens} |`,
);
audit.push('');
audit.push('## Mevcut localization sistemi');
audit.push('');
audit.push('- Libraries: `i18next`, `react-i18next`, `expo-localization` (installed)');
audit.push('- Provider: `src/i18n/DilSaglayici.tsx` wired in `app/_layout.tsx`');
audit.push('- Hook: `src/i18n/useCeviri.ts`');
audit.push('- Locales today: **tr / en / es** as monolithic TS objects under `src/i18n/locales/`');
audit.push('- **ar locale: MISSING**');
audit.push('- Domain JSON namespaces (`locales/tr/common.json` etc.): **NOT YET**');
audit.push(
  '- Persistence: AsyncStorage `ayarlar.dil` + best-effort `profiles.language`',
);
audit.push('');
audit.push('## Mevcut desteklenen diller (code)');
audit.push('');
audit.push(`- Code: \`${raw.totals.supportedLocalesInCode.join(', ')}\``);
audit.push(`- Runtime fallback in code: **\`${raw.totals.fallbackInCode}\`** (WRONG vs plan — plan requires **en**)`);
audit.push('- Default language in code: **tr** (plan wants device detect → unsupported → **en**)');
audit.push('- SYSTEM / MANUAL language_mode: **NOT IMPLEMENTED**');
audit.push('- Device locale auto-detect via expo-localization: **NOT WIRED**');
audit.push('- Arabic RTL / I18nManager: **NOT IMPLEMENTED**');
audit.push('- `check:i18n` CI script: **NOT IMPLEMENTED** (inventory script exists only)');
audit.push('');
audit.push('## Eksik localization alanları (priority gaps)');
audit.push('');
audit.push('1. **Architecture gaps vs master plan**');
audit.push('   - Fallback language must switch TR → **EN**');
audit.push('   - Add **ar** + RTL');
audit.push('   - Split monolothic locale TS → domain JSON namespaces');
audit.push('   - SYSTEM vs MANUAL language mode + Settings redesign');
audit.push('   - Startup: no language flash; resolve before main UI');
audit.push('   - Completeness script + missing-key logging');
audit.push('');
audit.push('2. **Coverage gaps**');
audit.push(
  `   - ${raw.userStatus.NOT_TRANSLATED} user routes with zero i18n hook`,
);
audit.push(
  `   - ${raw.userStatus.PARTIAL} user routes partial (mostly titles only)`,
);
audit.push(
  `   - ${raw.adminStatus.NOT_TRANSLATED} admin routes untouched (plan now includes admin static UI)`,
);
audit.push(
  `   - ~${raw.totals.hardcodedHeuristicHits} remaining hard-coded UI strings (heuristic; undercount vs full AST)`,
);
audit.push(
  `   - ${raw.totals.alertUser} non-admin Alert.alert call sites still mostly hard-coded`,
);
audit.push('   - Overlay/sheet/panel bodies largely untranslated');
audit.push('   - Module UI under `src/moduller/**` still Turkish-first');
audit.push('');
audit.push('3. **Country system gaps**');
audit.push('   - `geo_countries` seeded with few countries; profile_enabled historically TR-centric');
audit.push('   - No ISO world country dataset + Intl.DisplayNames localization yet');
audit.push('   - Country picker / search-by-localized-name not production-ready for all countries');
audit.push('');
audit.push('4. **Native / push**');
audit.push('   - iOS `CFBundleLocalizations` currently tr/en/es — ar missing');
audit.push('   - Permission strings in `app.config.ts` English-only');
audit.push('   - Push notification localization server-side: not audited in this phase');
audit.push('');
audit.push('## Category gap table');
audit.push('');
audit.push('| Category | Screens | NOT_TRANSLATED | PARTIAL | LIKELY |');
audit.push('|----------|--------:|---------------:|--------:|-------:|');
for (const c of order) {
  const list = cats[c] || [];
  const n = list.filter((r) => r.status === 'NOT_TRANSLATED').length;
  const p = list.filter((r) => r.status === 'PARTIAL').length;
  const l = list.filter((r) => r.status === 'LIKELY_TRANSLATED').length;
  audit.push(`| ${c} | ${list.length} | ${n} | ${p} | ${l} |`);
}
audit.push('');
audit.push('## Top hard-coded files (heuristic)');
audit.push('');
audit.push('| Hits | File |');
audit.push('|-----:|------|');
for (const row of raw.topHardcodedFiles) {
  audit.push(`| ${row.count} | \`${row.file}\` |`);
}
audit.push('');
audit.push('## Current i18n namespaces (monolithic tr.ts)');
audit.push('');
for (const ns of raw.totals.i18nNamespaces) audit.push(`- \`${ns}\``);
audit.push('');
audit.push('## Next phase order (per master plan §131)');
audit.push('');
audit.push('1. ~~ENVANTER~~ ← this document');
audit.push('2. i18n MİMARİSİ (en fallback, ar+RTL, SYSTEM/MANUAL, domain namespaces, no flash)');
audit.push('3. ÇEVİRİ (all screens/modals/alerts — stop claiming done early)');
audit.push('4. RTL');
audit.push('5. ÜLKE SİSTEMİ');
audit.push('6. HARD-CODE SWEEP');
audit.push('7. TEST + `check:i18n`');
audit.push('8. FINAL RAPOR');
audit.push('');
audit.push('## Honesty notes');
audit.push('');
audit.push('- Prior piecemeal translation (title-only `t()` wiring) is **PARTIAL**, not complete.');
audit.push('- Hard-coded scanner is regex heuristic — will undercount dynamic strings and overcount some technical strings. Final phase needs AST/CI scanner.');
audit.push('- No screen marked TESTED — no device QA in this phase.');
audit.push('- Toast/Snackbar library usage: none found; toasts appear as custom Views in games.');
audit.push('');

fs.writeFileSync('I18N_AUDIT.md', audit.join('\n'), 'utf8');
console.log('wrote I18N_SCREEN_INVENTORY.md + I18N_AUDIT.md');
