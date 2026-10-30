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
const WIDGET_BUNDLE_ID = 'SC934SCSZT';
// Matches main TamusoDev AdHoc cert from eas-ios-dev-1080.log
const DIST_CERT_ID = 'TMXTJ58M29';
const DEVICE_IDS = ['68KBRH35MH', 'LRTFA6VLLA'];

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
        id
        appStoreConnectApiKeys {
          id
          keyIdentifier
          issuerIdentifier
          keyP8
          appleTeam { id appleTeamIdentifier }
        }
        apps(offset: 0, limit: 50) {
          id
          fullName
          slug
        }
      }
    }
  }`);
  const account = keyData.account.byName;
  const key = (account.appStoreConnectApiKeys || []).find((k) => k.id === ASC_ID);
  if (!key?.keyP8) throw new Error('ASC keyP8 missing');
  fs.writeFileSync(KEY_PATH, key.keyP8, { encoding: 'utf8', mode: 0o600 });
  const token = makeAscJwt(key.keyIdentifier, key.issuerIdentifier, key.keyP8);

  const app = (account.apps || []).find(
    (a) => a.fullName === '@mutaq/muta' || a.slug === 'muta',
  );
  console.log('expo app', app);
  console.log('apple team', key.appleTeam);

  const profileName = `*[expo] ${WIDGET_BUNDLE} AdHoc ${Date.now()}`;
  console.log('Creating profile', profileName);

  const created = await asc(token, 'POST', '/v1/profiles', {
    data: {
      type: 'profiles',
      attributes: {
        name: profileName,
        profileType: 'IOS_APP_ADHOC',
      },
      relationships: {
        bundleId: {
          data: { type: 'bundleIds', id: WIDGET_BUNDLE_ID },
        },
        certificates: {
          data: [{ type: 'certificates', id: DIST_CERT_ID }],
        },
        devices: {
          data: DEVICE_IDS.map((id) => ({ type: 'devices', id })),
        },
      },
    },
  });

  const profileId = created.data.id;
  const profileContent = created.data.attributes?.profileContent;
  console.log('Created profile', profileId, 'bytes', profileContent?.length || 0);
  fs.writeFileSync(
    path.join(__dirname, 'ExpoWidgetsTarget.mobileprovision'),
    Buffer.from(profileContent, 'base64'),
  );

  // Introspect mutations related to credentials
  const t = await gql(`{
    __type(name: "AppleAppIdentifierMutation") {
      fields { name args { name type { name kind ofType { name kind ofType { name } } } } }
    }
  }`);
  console.log('AppleAppIdentifierMutation', JSON.stringify(t, null, 2));

  const t2 = await gql(`{
    __type(name: "IosAppCredentialsMutation") {
      fields { name args { name type { name kind ofType { name kind ofType { name } } } } }
    }
  }`);
  console.log('IosAppCredentialsMutation', JSON.stringify(t2, null, 2));

  const t3 = await gql(`{
    __type(name: "ProvisioningProfileMutation") {
      fields { name args { name type { name kind ofType { name kind ofType { name } } } } }
    }
  }`);
  console.log('ProvisioningProfileMutation', JSON.stringify(t3, null, 2));
})().catch((e) => {
  console.error(e.message);
  if (e.detail) console.error(JSON.stringify(e.detail, null, 2).slice(0, 4000));
  try {
    fs.unlinkSync(KEY_PATH);
  } catch {}
  process.exit(1);
});
