const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  Auth,
  Session,
  AppGroup,
  BundleId,
  CapabilityType,
  CapabilityTypeOption,
  Profile,
  ProfileType,
  Certificate,
  Teams,
} = require('C:/Users/ilkse/AppData/Local/npm-cache/_npx/cdcf29a1293ceb8d/node_modules/@expo/apple-utils/build');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const sessionSecret = state.auth.sessionSecret;

const MAIN_BUNDLE = 'com.litxtech.muta';
const WIDGET_BUNDLE = 'com.litxtech.muta.ExpoWidgetsTarget';
const GROUP_ID = 'group.com.litxtech.muta';
const TEAM_ID = '9W6CR7KXM7';
const DIST_SERIAL = '21595E4CFFDAAF31A4ABEA2A76BE0CC4';
const DEVICE_IDS = ['68KBRH35MH', 'LRTFA6VLLA'];
const USERNAME = 'developerilksepet@gmail.com';

const ACCOUNT_ID = '52b5b6d4-93c4-482f-8f48-a8be33f288a1';
const MAIN_IDENT_EAS = '7e1f5caf-c314-499d-a56e-cb43a466c97b';
const WIDGET_IDENT_EAS = 'b0aaedff-ee8b-4f82-b6af-cce6e4245aa1';
const WIDGET_BUILD_CREDS = '1546cdc5-3adb-4be1-aab2-12a945ffcf9a';
const APP_ID = '36cb815b-2891-4075-a1a8-89902e491af5';

async function gql(query, variables) {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'expo-session': sessionSecret,
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
  console.log('Restoring Apple session for', USERNAME);
  let authState;
  try {
    authState = await Auth.tryRestoringAuthStateFromUserCredentialsAsync(
      { username: USERNAME },
      { teamId: TEAM_ID },
    );
  } catch (e) {
    console.log('restore failed', e.message);
  }

  if (!authState) {
    try {
      authState = await Auth.loginWithCookiesAsync({ username: USERNAME });
    } catch (e) {
      console.log('loginWithCookies failed', e.message);
      throw e;
    }
  }

  console.log('auth ok', {
    teamId: authState?.context?.teamId,
    providerId: authState?.context?.providerId,
    hasToken: !!authState?.context?.token,
  });

  const ctx = authState.context;
  // Ensure team selected
  if (Teams?.selectTeamAsync) {
    try {
      await Teams.selectTeamAsync({ teamId: TEAM_ID });
    } catch (e) {
      console.log('selectTeam', e.message);
    }
  }

  let groups = await AppGroup.getAsync(ctx, {
    query: { filter: { identifier: GROUP_ID } },
  });
  let group = groups[0];
  if (!group) {
    console.log('Creating AppGroup');
    group = await AppGroup.createAsync(ctx, {
      identifier: GROUP_ID,
      name: 'Tamuso',
    });
  }
  console.log('AppGroup', group.id, group.attributes);

  for (const bundleId of [MAIN_BUNDLE, WIDGET_BUNDLE]) {
    const bid = await BundleId.findAsync(ctx, { identifier: bundleId });
    if (!bid) throw new Error('Missing bundle ' + bundleId);
    console.log('Assign APP_GROUPS', bundleId);
    await bid.updateBundleIdCapabilityAsync({
      capabilityType: CapabilityType.APP_GROUP,
      option: CapabilityTypeOption.ON,
      relationships: { appGroups: [group.id] },
    });
    const info = await BundleId.infoAsync(ctx, {
      id: bid.id,
      query: {
        include: [
          'bundleIdCapabilities',
          'bundleIdCapabilities.appGroups',
        ],
      },
    });
    const caps = info.attributes?.bundleIdCapabilities || [];
    const ag = caps.find((c) => c.attributes?.capabilityType === 'APP_GROUPS');
    console.log(
      '  result',
      JSON.stringify({
        capabilityId: ag?.id,
        groups: (ag?.attributes?.appGroups || ag?.appGroups || []).map(
          (g) => g.attributes?.identifier || g.id,
        ),
      }),
    );
  }

  const certs = await Certificate.getAsync(ctx, {
    query: { filter: { certificateType: 'IOS_DISTRIBUTION' } },
  });
  const distCert = certs.find(
    (c) =>
      String(c.attributes.serialNumber).toUpperCase() === DIST_SERIAL.toUpperCase(),
  );
  if (!distCert) throw new Error('dist cert missing');

  const profiles = await Profile.getAsync(ctx, {
    query: { filter: { profileType: ProfileType.IOS_APP_ADHOC }, limit: 200 },
  });
  for (const p of profiles) {
    const name = p.attributes?.name || '';
    if (name.includes(MAIN_BUNDLE) || name.includes(WIDGET_BUNDLE)) {
      try {
        await Profile.deleteAsync(ctx, { id: p.id });
        console.log('Deleted', p.id, name);
      } catch (e) {
        console.log('delete fail', e.message);
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
    console.log('Created', profile.id, 'hasGroup=', profileHasGroup(content));
    return { id: profile.id, content };
  }

  const mainProfile = await makeProfile(MAIN_BUNDLE);
  const widgetProfile = await makeProfile(WIDGET_BUNDLE);
  if (!profileHasGroup(mainProfile.content) || !profileHasGroup(widgetProfile.content)) {
    throw new Error('Still missing group entitlement in profile');
  }

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
  const mainProvId =
    mainProv.appleProvisioningProfile.createAppleProvisioningProfile.id;
  const widgetProvId =
    widgetProv.appleProvisioningProfile.createAppleProvisioningProfile.id;

  const appData = await gql(
    `query($appId: String!) {
      app {
        byId(appId: $appId) {
          iosAppCredentials {
            id
            appleAppIdentifier { bundleIdentifier }
            iosAppBuildCredentialsList { id iosDistributionType }
          }
        }
      }
    }`,
    { appId: APP_ID },
  );
  const mainCreds = appData.app.byId.iosAppCredentials.find(
    (c) => c.appleAppIdentifier?.bundleIdentifier === MAIN_BUNDLE,
  );
  const mainAdHoc = mainCreds.iosAppBuildCredentialsList.find(
    (b) => b.iosDistributionType === 'AD_HOC',
  );

  await gql(
    `mutation($id: ID!, $provisioningProfileId: ID!) {
      iosAppBuildCredentials {
        setProvisioningProfile(id: $id, provisioningProfileId: $provisioningProfileId) {
          id provisioningProfile { id developerPortalIdentifier }
        }
      }
    }`,
    { id: mainAdHoc.id, provisioningProfileId: mainProvId },
  );
  await gql(
    `mutation($id: ID!, $provisioningProfileId: ID!) {
      iosAppBuildCredentials {
        setProvisioningProfile(id: $id, provisioningProfileId: $provisioningProfileId) {
          id provisioningProfile { id developerPortalIdentifier }
        }
      }
    }`,
    { id: WIDGET_BUILD_CREDS, provisioningProfileId: widgetProvId },
  );

  console.log('DONE — profiles with App Group assigned to EAS');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
