// Yerelde build eder, statik ciktiyi Vercel'deki tamuso-super-admin projesine gonderir.
// Vercel'de build/install calismaz (prebuilt statik deploy); boylece ust dizindeki
// paylasilan src/ ve node_modules'un Vercel'e yuklenmesi gerekmez.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const kok = dirname(fileURLToPath(import.meta.url));
const dist = join(kok, "dist");

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html yok. Once: npm run build");
  process.exit(1);
}

copyFileSync(join(kok, "vercel.json"), join(dist, "vercel.json"));

// dist kendi Vercel baglantisini tasir; yoksa tamuso-super-admin'e bagla.
if (!existsSync(join(dist, ".vercel", "project.json"))) {
  mkdirSync(join(dist, ".vercel"), { recursive: true });
  const baglanti = spawnSync("vercel", ["link", "--yes", "--project", "tamuso-super-admin"], {
    cwd: dist,
    stdio: "inherit",
    shell: true,
  });
  if (baglanti.status !== 0) process.exit(baglanti.status ?? 1);
}

// Onemli: dizin argumani VERILMEZ. `vercel deploy dist` CLI tarafindan proje adi
// sanilip yeni bir proje acabiliyor.
const deploy = spawnSync("vercel", ["deploy", "--prod", "--yes"], {
  cwd: dist,
  stdio: "inherit",
  shell: true,
});

process.exit(deploy.status ?? 1);
