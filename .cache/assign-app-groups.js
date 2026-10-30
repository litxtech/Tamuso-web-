const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  Token,
  AppGroup,
  BundleId,
  CapabilityType,
  CapabilityTypeOption,
  Profile,
  ProfileType,
  Certificate,
} = require('C:/Users/ilkse/AppData/Local/npm-cache/_npx/cdcf29a1293ceb8d/node_modules/@expo/apple-utils/build');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;
const ASC_ID = '8abe967f-e09e-4f6b-beb2-b08f4a634277';
const KEY_PATH = path.join(__dirname, 'AuthKey_5F954566QM.p8');

const MAIN_BUNDLE = 'com.litxtech.muta';
const WIDGET_BUNDLE = 'com.litxtech.muta.ExpoWidgetsTarget';
const GROUP_ID = 'group.com.litxtech.muta';
const TEAM_ID = '9W6CR7KXM7';
const DIST_SERIAL = '21595E4CFFDAAF31A4ABEA2A76BE0CC4';
const DEVICE_IDS = ['68KBRH35MH', 'LRTFA6VLLA'];

const ACCOUNT_ID = '52b5b6d4-93c4-482f-8f48-a8be33f288a1';
const MAIN_IDENT_EAS = '7e1f5caf-c314-499d-a56e-cb43a466c97b';
const WIDGET_IDENT_EAS = 'b0aaedff-ee8b-4f82-b6af-cce6e4245aa1';
const DIST_CERT_EAS = 'a5be01ad-7ac9-4798-9a43-5d3063bdcc40';
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

function profileHasGroup(profileContentB64) {
  const buf = Buffer.from(profileContentB64, 'base64');
  const s = buf.toString('binary');
  const start = s.indexOf('<?xml');
  const end = s.indexOf('</plist>') + 8;
  const xml = Buffer.from(s.slice(start, end), 'binary').toString('utf8');
  return xml.includes(GROUP_ID);
}

(async () => {
  const keyData = await gql(`{
    account {
      byName(accountName: "mutaq") {
        appStoreConnectApiKeys {
          id keyIdentifier issuerIdentifier keyP8
        }
      }
    }
  }`);
  const key = keyData.account.byName.appStoreConnectApiKeys.find(
    (k) => k.id === ASC_ID,
  );
  if (!key?.keyP8) throw new Error('ASC key missing');
  fs.writeFileSync(KEY_PATH, key.keyP8, { mode: 0o600 });

  const token = new Token({
    key: key.keyP8,
    keyId: key.keyIdentifier,
    issuerId: key.issuerIdentifier,
  });
  const ctx = { token, teamId: TEAM_ID };

  // Ensure real App Group (not BundleId)
  let groups = await AppGroup.getAsync(ctx, {
    query: { filter: { identifier: GROUP_ID } },
  });
  let group = groups[0];
  if (!group) {
    console.log('Creating AppGroup', GROUP_ID);
    group = await AppGroup.createAsync(ctx, {
      identifier: GROUP_ID,
      name: 'Tamuso',
    });
  }
  console.log('AppGroup', group.id, group.attributes);

  for (const bundleId of [MAIN_BUNDLE, WIDGET_BUNDLE]) {
    const bid = await BundleId.findAsync(ctx, { identifier: bundleId });
    if (!bid) throw new Error('BundleId not found ' + bundleId);
    console.log('Updating APP_GROUPS on', bundleId, bid.id);
    await bid.updateBundleIdCapabilityAsync({
      capabilityType: CapabilityType.APP_GROUP,
      option: CapabilityTypeOption.ON,
      relationships: { appGroups: [group.id] },
    });
    const caps = await bid.getBundleIdCapabilitiesAsync();
    const ag = caps.find((c) => c.isType(CapabilityType.APP_GROUP));
    console.log(
      '  APP_GROUPS after',
      JSON.stringify({
        id: ag?.id,
        settings: ag?.attributes?.settings,
        appGroups: (ag?.attributes?.appGroups || []).map((g) => ({
          id: g.id,
          identifier: g.attributes?.identifier,
        })),
      }),
    );
  }

  // Recreate Ad Hoc profiles with group entitlement
  const certs = await Certificate.getAsync(ctx, {
    query: { filter: { certificateType: 'IOS_DISTRIBUTION' } },
  });
  const distCert = certs.find(
    (c) =>
      String(c.attributes.serialNumber).toUpperCase() === DIST_SERIAL.toUpperCase(),
  );
  if (!distCert) throw new Error('Dist cert not found');
  console.log('Using cert', distCert.id, distCert.attributes.serialNumber);

  // Delete recent expo adhoc profiles for these bundles
  const profiles = await Profile.getAsync(ctx, {
    query: { filter: { profileType: ProfileType.IOS_APP_ADHOC }, limit: 200 },
  });
  for (const p of profiles) {
    const name = p.attributes?.name || '';
    if (
      name.includes(MAIN_BUNDLE) ||
      name.includes(WIDGET_BUNDLE) ||
      name.includes('ExpoWidgetsTarget')
    ) {
      try {
        await Profile.deleteAsync(ctx, { id: p.id });
        console.log('Deleted profile', p.id, name);
      } catch (e) {
        console.log('Delete failed', p.id, e.message);
      }
    }
  }

  async function makeProfile(bundleIdentifier) {
    const bid = await BundleId.findAsync(ctx, { identifier: bundleIdentifier });
    const name = `*[expo] ${bundleIdentifier} AdHoc ${Date.now()}`;
    const profile = await Profile.createAsync(ctx, {
      profileType: ProfileType.IOS_APP_ADHOC,
      name,
      bundleId: bid.id,
      certificates: [distCert.id],
      devices: DEVICE_IDS,
    });
    const content = profile.attributes.profileContent;
    console.log(
      'Created',
      profile.id,
      name,
      'hasGroup=',
      profileHasGroup(content),
    );
    return { id: profile.id, content, name };
  }

  const mainProfile = await makeProfile(MAIN_BUNDLE);
  const widgetProfile = await makeProfile(WIDGET_BUNDLE);

  if (!profileHasGroup(mainProfile.content) || !profileHasGroup(widgetProfile.content)) {
    throw new Error('Profiles still missing App Group entitlement');
  }

  fs.writeFileSync(
    path.join(__dirname, 'main-adhoc.mobileprovision'),
    Buffer.from(mainProfile.content, 'base64'),
  );
  fs.writeFileSync(
    path.join(__dirname, 'widget-adhoc.mobileprovision'),
    Buffer.from(widgetProfile.content, 'base64'),
  );

  // Upload to EAS + assign to build credentials
  const mainProv = await gql(
    `mutation($accountId: ID!, $appleAppIdentifierId: ID!, $input: AppleProvisioningProfileInput!) {
      appleProvisioningProfile {
        createAppleProvisioningProfile(
          accountId: $accountId
          appleAppIdentifierId: $appleAppIdentifierId
          appleProvisioningProfileInput: $input
        ) { id developerPortalIdentifier }
      }
    }`,
    {
      accountId: ACCOUNT_ID,
      appleAppIdentifierId: MAIN_IDENT_EAS,
      input: {
        appleProvisioningProfile: mainProfile.content,
        developerPortalIdentifier: mainProfile.id,
      },
    },
  );
  const mainProvId =
    mainProv.appleProvisioningProfile.createAppleProvisioningProfile.id;

  const widgetProv = await gql(
    `mutation($accountId: ID!, $appleAppIdentifierId: ID!, $input: AppleProvisioningProfileInput!) {
      appleProvisioningProfile {
        createAppleProvisioningProfile(
          accountId: $accountId
          appleAppIdentifierId: $appleAppIdentifierId
          appleProvisioningProfileInput: $input
        ) { id developerPortalIdentifier }
      }
    }`,
    {
      accountId: ACCOUNT_ID,
      appleAppIdentifierId: WIDGET_IDENT_EAS,
      input: {
        appleProvisioningProfile: widgetProfile.content,
        developerPortalIdentifier: widgetProfile.id,
      },
    },
  );
  const widgetProvId =
    widgetProv.appleProvisioningProfile.createAppleProvisioningProfile.id;

  // Resolve main AD_HOC build credentials via app.iosAppCredentials
  const appData = await gql(
    `query($appId: String!) {
      app {
        byId(appId: $appId) {
          iosAppCredentials {
            id
            appleAppIdentifier { bundleIdentifier }
            iosAppBuildCredentialsList {
              id
              iosDistributionType
            }
          }
        }
      }
    }`,
    { appId: APP_ID },
  );
  console.log(
    'app creds',
    JSON.stringify(appData.app.byId.iosAppCredentials, null, 2),
  );

  const mainCreds = appData.app.byId.iosAppCredentials.find(
    (c) => c.appleAppIdentifier?.bundleIdentifier === MAIN_BUNDLE,
  );
  const mainAdHoc = mainCreds?.iosAppBuildCredentialsList?.find(
    (b) => b.iosDistributionType === 'AD_HOC',
  );
  if (!mainAdHoc) throw new Error('Main AD_HOC build credentials missing');

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
  console.log('Main profile assigned', mainProvId);

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
  console.log('Widget profile assigned', widgetProvId);

  try {
    fs.unlinkSync(KEY_PATH);
  } catch {}
  console.log('DONE');
})().catch((e) => {
  console.error(e);
  try {
    fs.unlinkSync(KEY_PATH);
  } catch {}
  process.exit(1);
});
