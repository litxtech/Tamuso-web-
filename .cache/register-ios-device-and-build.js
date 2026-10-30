/**
 * Yeni iOS UDID kaydet (Apple + EAS) + development build.
 * Usage: node .cache/register-ios-device-and-build.js <UDID> [deviceName]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const UDID = (process.argv[2] || '').trim().toUpperCase();
const DEVICE_NAME = (process.argv[3] || 'iPhone yeni').trim();
const ASC_ID = '8abe967f-e09e-4f6b-beb2-b08f4a634277';
const KEY_PATH = path.join(__dirname, 'AuthKey_5F954566QM.p8');
const TEAM_ID = '9W6CR7KXM7';
const ACCOUNT_ID = '52b5b6d4-93c4-482f-8f48-a8be33f288a1';
const APPLE_TEAM_EAS_ID = '13dd157f-e0e2-4cac-85ae-e36ffbcef84c';

if (!UDID || UDID.length < 25) {
  console.error('Usage: node register-ios-device-and-build.js <UDID> [name]');
  process.exit(1);
}

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;
if (!session) {
  console.error('Expo session yok — eas login gerekir');
  process.exit(1);
}

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

function ascJwt(keyId, issuerId, p8) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 20 * 60,
      aud: 'appstoreconnect-v1',
    }),
  ).toString('base64url');
  const data = `${header}.${payload}`;
  const key = crypto.createPrivateKey(p8);
  const sig = crypto.sign('sha256', Buffer.from(data), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  return `${data}.${sig.toString('base64url')}`;
}

async function listAppleDevices(token) {
  const res = await fetch(
    'https://api.appstoreconnect.apple.com/v1/devices?limit=200',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`ASC list devices: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.data || [];
}

async function registerAppleDevice(token, udid, name) {
  const res = await fetch('https://api.appstoreconnect.apple.com/v1/devices', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'devices',
        attributes: {
          name,
          udid,
          platform: 'IOS',
        },
      },
    }),
  });
  const json = await res.json();
  const body = JSON.stringify(json);
  if (
    res.status === 409 ||
    /DUPLICATE|already exists|ENTITY_ERROR\.ATTRIBUTE\.INVALID\.DUPLICATE/i.test(
      body,
    )
  ) {
    console.log('Apple: cihaz zaten kayıtlı');
    return null;
  }
  if (!res.ok) {
    throw new Error(`ASC register: ${res.status} ${body}`);
  }
  console.log('Apple: cihaz kaydedildi', json.data?.id);
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
        }
      }
    }
  }`);
  const key = (data.account.byName.appStoreConnectApiKeys || []).find(
    (k) => k.id === ASC_ID,
  );
  if (!key?.keyP8) throw new Error('ASC keyP8 yok');

  fs.writeFileSync(KEY_PATH, key.keyP8, { encoding: 'utf8', mode: 0o600 });
  console.log('ASC', key.keyIdentifier, 'team', TEAM_ID);
  console.log('UDID', UDID, 'name', DEVICE_NAME);

  const token = ascJwt(key.keyIdentifier, key.issuerIdentifier, key.keyP8);
  const devices = await listAppleDevices(token);
  const onApple = devices.find(
    (d) => (d.attributes?.udid || '').toUpperCase() === UDID,
  );
  if (onApple) {
    console.log('Apple: zaten var', onApple.id, onApple.attributes?.name);
  } else {
    await registerAppleDevice(token, UDID, DEVICE_NAME);
  }

  // EAS'e kaydet
  try {
    const created = await gql(
      `mutation($accountId: ID!, $appleDeviceInput: AppleDeviceInput!) {
        appleDevice {
          createAppleDevice(accountId: $accountId, appleDeviceInput: $appleDeviceInput) {
            id
            identifier
            name
            enabled
          }
        }
      }`,
      {
        accountId: ACCOUNT_ID,
        appleDeviceInput: {
          appleTeamId: APPLE_TEAM_EAS_ID,
          identifier: UDID,
          name: DEVICE_NAME,
          deviceClass: 'IPHONE',
          enabled: true,
        },
      },
    );
    console.log(
      'EAS create:',
      JSON.stringify(created?.appleDevice?.createAppleDevice, null, 2),
    );
  } catch (e) {
    console.warn('EAS createAppleDevice:', e.message);
  }

  const list = spawnSync(
    'npx',
    [
      'eas-cli',
      'device:list',
      '--apple-team-id',
      TEAM_ID,
      '--non-interactive',
      '--json',
    ],
    { cwd: path.join(__dirname, '..'), encoding: 'utf8', shell: true },
  );
  const out = (list.stdout || '') + (list.stderr || '');
  const match = out.match(/\[[\s\S]*\]/);
  if (match) {
    const arr = JSON.parse(match[0]);
    const found = arr.find(
      (d) => (d.identifier || '').toUpperCase() === UDID,
    );
    console.log(
      found
        ? `EAS listede OK: ${found.id}`
        : 'UYARI: EAS listesinde yok',
    );
  }

  const env = {
    ...process.env,
    EXPO_ASC_API_KEY_PATH: KEY_PATH,
    EXPO_ASC_KEY_ID: key.keyIdentifier,
    EXPO_ASC_ISSUER_ID: key.issuerIdentifier,
    EXPO_APPLE_TEAM_ID: TEAM_ID,
    EXPO_APPLE_TEAM_TYPE: 'COMPANY_OR_ORGANIZATION',
    EAS_SKIP_AUTO_FINGERPRINT: '1',
  };
  delete env.CI;
  delete env.CONTINUOUS_INTEGRATION;

  const args = [
    '--yes',
    'eas-cli@25.2.0',
    'build',
    '--platform',
    'ios',
    '--profile',
    'development',
    '--non-interactive',
    '--no-wait',
    '--refresh-ad-hoc-provisioning-profile',
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
      } catch {
        /* ignore */
      }
      if (code === 0) resolve();
      else reject(new Error(`eas build exit ${code}`));
    });
  });
})().catch((e) => {
  try {
    fs.unlinkSync(KEY_PATH);
  } catch {
    /* ignore */
  }
  console.error(e);
  process.exit(1);
});
