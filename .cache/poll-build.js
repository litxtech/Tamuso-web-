const fs = require('fs');
const path = require('path');
const os = require('os');

const BUILD_ID = process.argv[2] || 'bbdf25e9-1a80-49ec-a103-10ecc90a09ec';
const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;

async function getBuild() {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'expo-session': session,
    },
    body: JSON.stringify({
      query: `query($id: ID!) {
        builds {
          byId(buildId: $id) {
            id
            status
            platform
            error { errorCode message docsUrl }
            logFiles
            artifacts { buildUrl applicationArchiveUrl }
            appVersion
            appBuildVersion
          }
        }
      }`,
      variables: { id: BUILD_ID },
    }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.builds.byId;
}

async function tailLog(url, lines = 100) {
  if (!url) return '';
  const res = await fetch(url);
  const text = await res.text();
  const arr = text.split(/\r?\n/);
  return arr.slice(-lines).join('\n');
}

(async () => {
  const maxMs = Number(process.env.POLL_MS || 25 * 60 * 1000);
  const start = Date.now();
  let lastStatus = '';
  while (Date.now() - start < maxMs) {
    const b = await getBuild();
    if (b.status !== lastStatus) {
      console.log(`[${new Date().toISOString()}] status=${b.status}`);
      lastStatus = b.status;
    }
    if (['FINISHED', 'ERRORED', 'CANCELED'].includes(b.status)) {
      console.log(JSON.stringify(b, null, 2));
      if (b.logFiles?.[0]) {
        console.log('\n--- LOG TAIL ---\n');
        console.log(await tailLog(b.logFiles[0], 120));
      }
      process.exit(b.status === 'FINISHED' ? 0 : 2);
    }
    // intermediate log peek every ~3 min
    if ((Date.now() - start) % 180000 < 35000 && b.logFiles?.[0]) {
      const tail = await tailLog(b.logFiles[0], 30);
      if (tail) {
        console.log('\n--- progress ---\n' + tail.split('\n').slice(-15).join('\n'));
      }
    }
    await new Promise((r) => setTimeout(r, 30000));
  }
  const b = await getBuild();
  console.log('TIMEOUT', JSON.stringify(b, null, 2));
  if (b.logFiles?.[0]) console.log(await tailLog(b.logFiles[0], 80));
  process.exit(3);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
