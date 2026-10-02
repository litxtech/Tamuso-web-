/** i18n inventory helper — run: node scripts/i18n-inventory.mjs */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      walk(p, acc);
    } else acc.push(p);
  }
  return acc;
}

function rel(p) {
  return p.replace(root + path.sep, '').replace(/\\/g, '/');
}

const appTsx = walk(path.join(root, 'app')).filter(
  (p) => p.endsWith('.tsx') && !path.basename(p).startsWith('_'),
);

const routes = appTsx.map((p) => {
  const r = rel(p);
  const admin = r.includes('/admin/');
  const src = fs.readFileSync(p, 'utf8');
  const hasI18n = /useCeviri|useTranslation/.test(src);
  const trLiteral =
    (src.match(/['"`][^'"`]*[çğıöşüÇĞİÖŞÜ][^'"`]*['"`]/g) || []).length;
  let status = 'NOT_TRANSLATED';
  if (hasI18n && trLiteral > 3) status = 'PARTIAL';
  else if (hasI18n && trLiteral > 0) status = 'PARTIAL';
  else if (hasI18n) status = 'LIKELY_TRANSLATED';
  return { path: r, admin, status, trLiteral, hasI18n };
});

const user = routes.filter((r) => !r.admin);
const admin = routes.filter((r) => r.admin);

const srcAll = walk(path.join(root, 'src')).filter(
  (p) => p.endsWith('.tsx') || p.endsWith('.ts'),
);

function countMatches(files, re) {
  let n = 0;
  const filesHit = new Set();
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const m = t.match(re);
    if (m) {
      n += m.length;
      filesHit.add(rel(f));
    }
  }
  return { count: n, files: [...filesHit].sort() };
}

const nonAdminSrc = srcAll.filter((p) => !rel(p).includes('/admin/'));
const allAppSrc = [...appTsx, ...srcAll];

const alertAll = countMatches(allAppSrc, /Alert\.alert\(/g);
const alertUser = countMatches(
  allAppSrc.filter((p) => !rel(p).includes('/admin/')),
  /Alert\.alert\(/g,
);
const alertAdmin = countMatches(
  allAppSrc.filter((p) => rel(p).includes('/admin/')),
  /Alert\.alert\(/g,
);

const modalComp = countMatches(nonAdminSrc, /<Modal[\s>]/g);
const sheetFiles = nonAdminSrc
  .filter((p) => /Sheet|Modal|Overlay|Lightbox|Toast|Portal|Drawer|Dialog/i.test(path.basename(p)))
  .map(rel);

const panelFiles = nonAdminSrc
  .filter((p) => /Paneli|Sheet|Modal|Overlay|Lightbox|Buyutucu/.test(path.basename(p)))
  .map(rel);

// heuristic hardcoded UI props
const hardRe =
  /(?:title|label|placeholder|subtitle|description|message|headerTitle|tabBarLabel|accessibilityLabel|accessibilityHint)\s*=\s*['"`]([^'"`]{2,120})['"`]|Alert\.alert\(\s*['"`]([^'"`]+)['"`]/g;
let hardHits = 0;
const hardByFile = {};
for (const f of allAppSrc.filter((p) => !rel(p).includes('/admin/') && !rel(p).includes('/i18n/locales/'))) {
  const t = fs.readFileSync(f, 'utf8');
  let m;
  const re = new RegExp(hardRe.source, 'g');
  while ((m = re.exec(t))) {
    const val = m[1] || m[2];
    if (!val) continue;
    if (/^(https?:|#|[0-9]+$)/.test(val)) continue;
    if (/^[a-z0-9_./-]+$/i.test(val) && !/\s/.test(val)) continue;
    hardHits++;
    const r = rel(f);
    hardByFile[r] = (hardByFile[r] || 0) + 1;
  }
}

// i18n keys
let keyCount = 0;
let namespaces = [];
try {
  const trPath = path.join(root, 'src/i18n/locales/tr.ts');
  const trSrc = fs.readFileSync(trPath, 'utf8');
  // count leaf string values roughly
  keyCount = (trSrc.match(/^\s+\w+:\s*['"`]/gm) || []).length;
  const ns = trSrc.match(/^\s{2}(\w+):\s*\{/gm) || [];
  namespaces = ns.map((x) => x.match(/(\w+):/)[1]);
} catch {
  keyCount = 0;
}

const tabs = walk(path.join(root, 'app/(tabs)'))
  .filter((p) => p.endsWith('.tsx') && !path.basename(p).startsWith('_'))
  .map(rel);

const out = {
  generatedAt: new Date().toISOString(),
  totals: {
    appRouteScreens: routes.length,
    userScreens: user.length,
    adminScreens: admin.length,
    tabs: tabs.length,
    alertAlertCalls: alertAll.count,
    alertUser: alertUser.count,
    alertAdmin: alertAdmin.count,
    modalJsxHits: modalComp.count,
    sheetModalNamedFiles: sheetFiles.length,
    panelSheetLikeFiles: panelFiles.length,
    hardcodedHeuristicHits: hardHits,
    hardcodedFiles: Object.keys(hardByFile).length,
    translationKeysApprox: keyCount,
    i18nNamespaces: namespaces,
    arLocaleExists: fs.existsSync(path.join(root, 'src/i18n/locales/ar.ts')),
    supportedLocalesInCode: ['tr', 'en', 'es'],
    fallbackInCode: 'tr', // current — plan wants en
  },
  userStatus: {
    NOT_TRANSLATED: user.filter((r) => r.status === 'NOT_TRANSLATED').length,
    PARTIAL: user.filter((r) => r.status === 'PARTIAL').length,
    LIKELY_TRANSLATED: user.filter((r) => r.status === 'LIKELY_TRANSLATED').length,
  },
  adminStatus: {
    NOT_TRANSLATED: admin.filter((r) => r.status === 'NOT_TRANSLATED').length,
    PARTIAL: admin.filter((r) => r.status === 'PARTIAL').length,
    LIKELY_TRANSLATED: admin.filter((r) => r.status === 'LIKELY_TRANSLATED').length,
  },
  tabs,
  sheetFiles,
  panelFiles,
  userRoutes: user.sort((a, b) => a.path.localeCompare(b.path)),
  adminRoutes: admin.sort((a, b) => a.path.localeCompare(b.path)),
  topHardcodedFiles: Object.entries(hardByFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([file, count]) => ({ file, count })),
};

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'docs/_i18n_inventory_raw.json'),
  JSON.stringify(out, null, 2),
  'utf8',
);
console.log(JSON.stringify(out.totals, null, 2));
console.log('userStatus', out.userStatus);
console.log('adminStatus', out.adminStatus);
console.log('wrote docs/_i18n_inventory_raw.json');
