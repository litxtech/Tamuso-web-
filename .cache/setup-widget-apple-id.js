const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;
const ASC_ID = '8abe967f-e09e-4f6b-beb2-b08f4a634277';
const KEY_PATH = path.join(__dirname, 'AuthKey_5F954566QM.p8');
const WIDGET_BUNDLE = 'com.litxtech.muta.ExpoWidgetsTarget';
const MAIN_BUNDLE = 'com.litxtech.muta';

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

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeAscJwt(keyId, issuerId, p8) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 20 * 60,
      aud: 'appstoreconnect-v1',
    }),
  );
  const data = `${header}.${payload}`;
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  const sig = sign
    .sign({ key: p8, dsaEncoding: 'ieee-p1363' })
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${sig}`;
}

async function asc(token, method, urlPath, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`ASC ${method} ${urlPath} → ${res.status}`);
    err.detail = json;
    throw err;
  }
  return json;
}

(async () => {
  const keyData = await gql(`{
    account {
      byName(accountName: "mutaq") {
        appStoreConnectApiKeys {
          id
          keyIdentifier
          issuerIdentifier
          keyP8
          roles
          appleTeam { appleTeamIdentifier }
        }
      }
    }
  }`);
  const key = (keyData.account.byName.appStoreConnectApiKeys || []).find(
    (k) => k.id === ASC_ID,
  );
  if (!key?.keyP8) throw new Error('ASC keyP8 missing');
  console.log('ASC roles', key.roles, 'kid', key.keyIdentifier);

  fs.writeFileSync(KEY_PATH, key.keyP8, { encoding: 'utf8', mode: 0o600 });
  const token = makeAscJwt(key.keyIdentifier, key.issuerIdentifier, key.keyP8);

  // List existing bundle IDs matching muta
  const bundles = await asc(
    token,
    'GET',
    `/v1/bundleIds?filter[identifier]=${encodeURIComponent(WIDGET_BUNDLE)}&limit=5`,
  );
  console.log(
    'widget bundle search',
    (bundles.data || []).map((b) => ({
      id: b.id,
      identifier: b.attributes?.identifier,
      name: b.attributes?.name,
    })),
  );

  let widgetBundleId = bundles.data?.[0]?.id;
  if (!widgetBundleId) {
    console.log('Creating widget App ID...');
    const created = await asc(token, 'POST', '/v1/bundleIds', {
      data: {
        type: 'bundleIds',
        attributes: {
          identifier: WIDGET_BUNDLE,
          name: 'Tamuso ExpoWidgetsTarget',
          platform: 'IOS',
        },
      },
    });
    widgetBundleId = created.data.id;
    console.log('Created bundleId', widgetBundleId);
  } else {
    console.log('Widget App ID exists', widgetBundleId);
  }

  // Also check main
  const main = await asc(
    token,
    'GET',
    `/v1/bundleIds?filter[identifier]=${encodeURIComponent(MAIN_BUNDLE)}&limit=5`,
  );
  console.log(
    'main bundle',
    (main.data || []).map((b) => ({
      id: b.id,
      identifier: b.attributes?.identifier,
    })),
  );

  // List certificates (DISTRIBUTION)
  const certs = await asc(
    token,
    'GET',
    '/v1/certificates?filter[certificateType]=IOS_DISTRIBUTION&limit=10',
  );
  console.log(
    'dist certs',
    (certs.data || []).map((c) => ({
      id: c.id,
      name: c.attributes?.name,
      serial: c.attributes?.serialNumber,
      exp: c.attributes?.expirationDate,
    })),
  );

  // Devices
  const devices = await asc(token, 'GET', '/v1/devices?filter[platform]=IOS&limit=50');
  console.log(
    'devices',
    (devices.data || []).map((d) => ({
      id: d.id,
      name: d.attributes?.name,
      udid: d.attributes?.udid,
      status: d.attributes?.status,
    })),
  );

  // Existing profiles for widget
  const profiles = await asc(
    token,
    'GET',
    `/v1/profiles?filter[profileType]=IOS_APP_ADHOC&limit=50`,
  );
  const widgetProfiles = (profiles.data || []).filter((p) =>
    String(p.attributes?.name || '').includes('ExpoWidgets') ||
    String(p.attributes?.name || '').includes(WIDGET_BUNDLE),
  );
  console.log(
    'existing adhoc profiles (filtered)',
    widgetProfiles.map((p) => ({
      id: p.id,
      name: p.attributes?.name,
      state: p.attributes?.profileState,
    })),
  );
  console.log(
    'all adhoc names',
    (profiles.data || []).map((p) => p.attributes?.name).slice(0, 30),
  );
})().catch((e) => {
  console.error(e.message);
  if (e.detail) console.error(JSON.stringify(e.detail, null, 2).slice(0, 3000));
  try {
    fs.unlinkSync(KEY_PATH);
  } catch {}
  process.exit(1);
});
