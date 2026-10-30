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

const MAIN_BUNDLE = 'com.litxtech.muta';
const WIDGET_BUNDLE = 'com.litxtech.muta.ExpoWidgetsTarget';
const GROUP_ID = 'group.com.litxtech.muta';
const MAIN_BUNDLE_ID = 'D5W6WVT98L';
const WIDGET_BUNDLE_ID = 'SC934SCSZT';
const DIST_CERT_ID = 'TMXTJ58M29';
const DEVICE_IDS = ['68KBRH35MH', 'LRTFA6VLLA'];

const ACCOUNT_TEAM_ID = '13dd157f-e0e2-4cac-85ae-e36ffbcef84c';
const DIST_CERT_EAS_ID = 'a5be01ad-7ac9-4798-9a43-5d3063bdcc40';
const WIDGET_IDENT_EAS = 'b0aaedff-ee8b-4f82-b6af-cce6e4245aa1';
const MAIN_IDENT_EAS = '7e1f5caf-c314-499d-a56e-cb43a466c97b';
const WIDGET_IOS_CREDS = '9b896298-1705-4e04-b9e4-95838f98338d';
const WIDGET_BUILD_CREDS = '1546cdc5-3adb-4be1-aab2-12a945ffcf9a';
const MAIN_IOS_CREDS = '137ca5f8-cbd2-4d06-9dca-6a73c16b9b59';
const APP_ID = '36cb815b-2891-4075-a1a8-89902e491af5';

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

async function enableAppGroups(token, bundleId, label) {
  const caps = await asc(
    token,
    'GET',
    `/v1/bundleIds/${bundleId}/bundleIdCapabilities`,
  );
  const existing = (caps.data || []).find(
    (c) => c.attributes?.capabilityType === 'APP_GROUPS',
  );
  console.log(
    label,
    'existing caps',
    (caps.data || []).map((c) => c.attributes?.capabilityType),
  );

  if (existing) {
    console.log(label, 'APP_GROUPS already enabled', existing.id);
    // Try update settings to include our group
    try {
      await asc(token, 'PATCH', `/v1/bundleIdCapabilities/${existing.id}`, {
        data: {
          type: 'bundleIdCapabilities',
          id: existing.id,
          attributes: {
            settings: [
              {
                key: 'APP_GROUP_IDENTIFIERS',
                options: [{ key: GROUP_ID, enabled: true }],
              },
            ],
          },
        },
      });
      console.log(label, 'APP_GROUPS settings patched');
    } catch (e) {
      console.log(label, 'patch settings failed (ok if already set):', e.message);
      if (e.detail) console.log(JSON.stringify(e.detail).slice(0, 500));
    }
    return existing.id;
  }

  try {
    const created = await asc(token, 'POST', '/v1/bundleIdCapabilities', {
      data: {
        type: 'bundleIdCapabilities',
        attributes: {
          capabilityType: 'APP_GROUPS',
          settings: [
            {
              key: 'APP_GROUP_IDENTIFIERS',
              options: [{ key: GROUP_ID, enabled: true }],
            },
          ],
        },
        relationships: {
          bundleId: { data: { type: 'bundleIds', id: bundleId } },
        },
      },
    });
    console.log(label, 'APP_GROUPS enabled', created.data.id);
    return created.data.id;
  } catch (e) {
    console.log(label, 'enable with settings failed, retry bare:', e.message);
    if (e.detail) console.log(JSON.stringify(e.detail).slice(0, 800));
    const created = await asc(token, 'POST', '/v1/bundleIdCapabilities', {
      data: {
        type: 'bundleIdCapabilities',
        attributes: { capabilityType: 'APP_GROUPS' },
        relationships: {
          bundleId: { data: { type: 'bundleIds', id: bundleId } },
        },
      },
    });
    console.log(label, 'APP_GROUPS enabled bare', created.data.id);
    return created.data.id;
  }
}

async function ensureAppGroup(token) {
  // Search existing identifiers that look like app groups
  try {
    const found = await asc(
      token,
      'GET',
      `/v1/bundleIds?filter[identifier]=${encodeURIComponent(GROUP_ID)}&limit=5`,
    );
    if (found.data?.length) {
      console.log('App Group exists as bundleId', found.data[0].id);
      return found.data[0].id;
    }
  } catch (e) {
    console.log('group search failed', e.message);
  }

  try {
    const created = await asc(token, 'POST', '/v1/bundleIds', {
      data: {
        type: 'bundleIds',
        attributes: {
          identifier: GROUP_ID,
          name: 'Tamuso App Group',
          platform: 'IOS',
        },
      },
    });
    console.log('Created App Group identifier', created.data.id);
    return created.data.id;
  } catch (e) {
    console.log('Create App Group failed (may already exist elsewhere):', e.message);
    if (e.detail) console.log(JSON.stringify(e.detail).slice(0, 1000));
    return null;
  }
}

async function recreateAdHocProfile(token, bundleId, nameHint) {
  // Delete old adhoc profiles for this bundle if possible
  const profiles = await asc(
    token,
    'GET',
    `/v1/profiles?filter[profileType]=IOS_APP_ADHOC&limit=200`,
  );
  const related = (profiles.data || []).filter((p) =>
    String(p.attributes?.name || '').includes(nameHint),
  );
  for (const p of related.slice(0, 5)) {
    try {
      await asc(token, 'DELETE', `/v1/profiles/${p.id}`);
      console.log('Deleted old profile', p.id, p.attributes?.name);
    } catch (e) {
      console.log('Delete profile failed', p.id, e.message);
    }
  }

  const profileName = `*[expo] ${nameHint} AdHoc ${Date.now()}`;
  const created = await asc(token, 'POST', '/v1/profiles', {
    data: {
      type: 'profiles',
      attributes: {
        name: profileName,
        profileType: 'IOS_APP_ADHOC',
      },
      relationships: {
        bundleId: { data: { type: 'bundleIds', id: bundleId } },
        certificates: {
          data: [{ type: 'certificates', id: DIST_CERT_ID }],
        },
        devices: {
          data: DEVICE_IDS.map((id) => ({ type: 'devices', id })),
        },
      },
    },
  });
  console.log('Created profile', created.data.id, profileName);
  return {
    id: created.data.id,
    content: created.data.attributes.profileContent,
    name: profileName,
  };
}

(async () => {
  const keyData = await gql(`{
    account {
      byName(accountName: "mutaq") {
        id
        appStoreConnectApiKeys {
          id keyIdentifier issuerIdentifier keyP8
          appleTeam { id appleTeamIdentifier }
        }
      }
    }
  }`);
  const account = keyData.account.byName;
  const key = account.appStoreConnectApiKeys.find((k) => k.id === ASC_ID);
  if (!key?.keyP8) throw new Error('ASC key missing');
  fs.writeFileSync(KEY_PATH, key.keyP8, { mode: 0o600 });
  const token = makeAscJwt(key.keyIdentifier, key.issuerIdentifier, key.keyP8);

  await ensureAppGroup(token);
  await enableAppGroups(token, MAIN_BUNDLE_ID, 'MAIN');
  await enableAppGroups(token, WIDGET_BUNDLE_ID, 'WIDGET');

  // Verify capabilities after
  for (const [id, label] of [
    [MAIN_BUNDLE_ID, 'MAIN'],
    [WIDGET_BUNDLE_ID, 'WIDGET'],
  ]) {
    const caps = await asc(
      token,
      'GET',
      `/v1/bundleIds/${id}/bundleIdCapabilities`,
    );
    const ag = (caps.data || []).find(
      (c) => c.attributes?.capabilityType === 'APP_GROUPS',
    );
    console.log(label, 'APP_GROUPS detail', JSON.stringify(ag?.attributes || null).slice(0, 800));
  }

  const mainProfile = await recreateAdHocProfile(token, MAIN_BUNDLE_ID, MAIN_BUNDLE);
  const widgetProfile = await recreateAdHocProfile(
    token,
    WIDGET_BUNDLE_ID,
    WIDGET_BUNDLE,
  );

  fs.writeFileSync(
    path.join(__dirname, 'main-adhoc.mobileprovision'),
    Buffer.from(mainProfile.content, 'base64'),
  );
  fs.writeFileSync(
    path.join(__dirname, 'widget-adhoc.mobileprovision'),
    Buffer.from(widgetProfile.content, 'base64'),
  );

  // Update / create EAS provisioning profiles
  const mainProv = await gql(
    `mutation($accountId: ID!, $appleAppIdentifierId: ID!, $input: AppleProvisioningProfileInput!) {
      appleProvisioningProfile {
        createAppleProvisioningProfile(
          accountId: $accountId
          appleAppIdentifierId: $appleAppIdentifierId
          appleProvisioningProfileInput: $input
        ) { id developerPortalIdentifier status }
      }
    }`,
    {
      accountId: account.id,
      appleAppIdentifierId: MAIN_IDENT_EAS,
      input: {
        appleProvisioningProfile: mainProfile.content,
        developerPortalIdentifier: mainProfile.id,
      },
    },
  );
  const mainProvId =
    mainProv.appleProvisioningProfile.createAppleProvisioningProfile.id;
  console.log('EAS main profile', mainProv.appleProvisioningProfile.createAppleProvisioningProfile);

  const widgetProv = await gql(
    `mutation($accountId: ID!, $appleAppIdentifierId: ID!, $input: AppleProvisioningProfileInput!) {
      appleProvisioningProfile {
        createAppleProvisioningProfile(
          accountId: $accountId
          appleAppIdentifierId: $appleAppIdentifierId
          appleProvisioningProfileInput: $input
        ) { id developerPortalIdentifier status }
      }
    }`,
    {
      accountId: account.id,
      appleAppIdentifierId: WIDGET_IDENT_EAS,
      input: {
        appleProvisioningProfile: widgetProfile.content,
        developerPortalIdentifier: widgetProfile.id,
      },
    },
  );
  const widgetProvId =
    widgetProv.appleProvisioningProfile.createAppleProvisioningProfile.id;
  console.log(
    'EAS widget profile',
    widgetProv.appleProvisioningProfile.createAppleProvisioningProfile,
  );

  // Find main AD_HOC build credentials and set profile
  const mainBuild = await gql(
    `query($id: ID!) {
      iosAppCredentials { byId(id: $id) {
        id
        iosAppBuildCredentialsList {
          id iosDistributionType
          provisioningProfile { id developerPortalIdentifier }
        }
      }}
    }`,
    { id: MAIN_IOS_CREDS },
  );
  console.log(
    'main build creds',
    JSON.stringify(mainBuild.iosAppCredentials.byId.iosAppBuildCredentialsList, null, 2),
  );
  const mainAdHoc = mainBuild.iosAppCredentials.byId.iosAppBuildCredentialsList.find(
    (b) => b.iosDistributionType === 'AD_HOC',
  );
  if (mainAdHoc) {
    await gql(
      `mutation($id: ID!, $provisioningProfileId: ID!) {
        iosAppBuildCredentials {
          setProvisioningProfile(id: $id, provisioningProfileId: $provisioningProfileId) {
            id
            provisioningProfile { id developerPortalIdentifier }
          }
        }
      }`,
      { id: mainAdHoc.id, provisioningProfileId: mainProvId },
    );
    console.log('Updated main AD_HOC profile');
  }

  await gql(
    `mutation($id: ID!, $provisioningProfileId: ID!) {
      iosAppBuildCredentials {
        setProvisioningProfile(id: $id, provisioningProfileId: $provisioningProfileId) {
          id
          provisioningProfile { id developerPortalIdentifier }
        }
      }
    }`,
    { id: WIDGET_BUILD_CREDS, provisioningProfileId: widgetProvId },
  );
  console.log('Updated widget AD_HOC profile');

  try {
    fs.unlinkSync(KEY_PATH);
  } catch {}
  console.log('DONE');
})().catch((e) => {
  console.error(e.message);
  if (e.detail) console.error(JSON.stringify(e.detail, null, 2).slice(0, 3000));
  try {
    fs.unlinkSync(KEY_PATH);
  } catch {}
  process.exit(1);
});
