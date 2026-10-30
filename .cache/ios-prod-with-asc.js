const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;
const ASC_ID = '8abe967f-e09e-4f6b-beb2-b08f4a634277';
const KEY_PATH = path.join(__dirname, 'AuthKey_5F954566QM.p8');

async function gql(query, variables) {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'expo-session': session,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error(JSON.stringify(json.errors, null, 2));
    throw new Error('graphql error');
  }
  return json.data;
}

(async () => {
  const data = await gql(`{
    account {
      byName(accountName: "mutaq") {
        appStoreConnectApiKeys {
          id
          keyIdentifier
          issuerIdentifier
          keyP8
          appleTeam { appleTeamIdentifier }
        }
      }
    }
  }`);
  const key = (data.account.byName.appStoreConnectApiKeys || []).find(
    (k) => k.id === ASC_ID,
  );
  if (!key?.keyP8) throw new Error('ASC keyP8 not available');

  fs.writeFileSync(KEY_PATH, key.keyP8, { encoding: 'utf8', mode: 0o600 });
  console.log('Wrote ASC key to', KEY_PATH, 'id=', key.keyIdentifier);

  const env = {
    ...process.env,
    EXPO_ASC_API_KEY_PATH: KEY_PATH,
    EXPO_ASC_KEY_ID: key.keyIdentifier,
    EXPO_ASC_ISSUER_ID: key.issuerIdentifier,
    EXPO_APPLE_TEAM_ID: key.appleTeam.appleTeamIdentifier,
    EXPO_APPLE_TEAM_TYPE: 'COMPANY_OR_ORGANIZATION',
  };
  // avoid CI force if any
  delete env.CI;
  delete env.CONTINUOUS_INTEGRATION;

  const args = [
    'eas-cli',
    'build',
    '--platform',
    'ios',
    '--profile',
    'production',
    '--auto-submit',
    '--non-interactive',
    '--no-wait',
  ];
  console.log('Running: npx', args.join(' '));

  await new Promise((resolve, reject) => {
    const child = spawn('npx', args, {
      cwd: path.join(__dirname, '..'),
      env,
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', (code) => {
      try {
        fs.unlinkSync(KEY_PATH);
      } catch {}
      if (code === 0) resolve();
      else reject(new Error(`eas build exit ${code}`));
    });
  });
})().catch((e) => {
  try {
    fs.unlinkSync(KEY_PATH);
  } catch {}
  console.error(e);
  process.exit(1);
});
