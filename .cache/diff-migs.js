const fs = require('fs');

const remoteJson = fs.readFileSync('.cache/remote_migrations_raw.json', 'utf8');
const remote = JSON.parse(remoteJson);
const remoteVersions = new Set(remote.map((m) => String(m.version)));

const files = fs.readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql'));
const locals = files
  .map((f) => {
    const m = f.match(/^(\d+)_(.+)\.sql$/);
    return m ? { version: m[1], name: m[2], file: f } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.version.localeCompare(b.version));

const missing = locals.filter((l) => !remoteVersions.has(l.version));
console.log('local', locals.length, 'remote', remoteVersions.size, 'missing', missing.length);
for (const m of missing) {
  const size = fs.statSync(`supabase/migrations/${m.file}`).size;
  console.log(`${m.file}\t${size}`);
}
