const fs = require('fs');
const path = require('path');
const os = require('os');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;

const APP_ID = '36cb815b-2891-4075-a1a8-89902e491af5';
const ACCOUNT_TEAM_ID = '13dd157f-e0e2-4cac-85ae-e36ffbcef84c'; // Expo apple team uuid
const WIDGET_BUNDLE = 'com.litxtech.muta.ExpoWidgetsTarget';
const MAIN_BUNDLE = 'com.litxtech.muta';
const DIST_SERIAL = '21595E4CFFDAAF31A4ABEA2A76BE0CC4';
const PROFILE_PORTAL_ID = '6AQYN3Z9L4';
const PROFILE_PATH = path.join(__dirname, 'ExpoWidgetsTarget.mobileprovision');

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
  const acct = await gql(`{
    account {
      byName(accountName: "mutaq") {
        id
        appleAppIdentifiers {
          id
          bundleIdentifier
        }
        appleDistributionCertificates {
          id
          serialNumber
        }
      }
    }
  }`);
  const account = acct.account.byName;
  console.log('accountId', account.id);
  console.log(
    'identifiers',
    account.appleAppIdentifiers.map((i) => `${i.bundleIdentifier} ${i.id}`),
  );
  console.log(
    'certs',
    account.appleDistributionCertificates.map((c) => `${c.serialNumber} ${c.id}`),
  );

  const distCert = account.appleDistributionCertificates.find(
    (c) =>
      String(c.serialNumber).toUpperCase().replace(/^0+/, '') ===
        DIST_SERIAL.toUpperCase().replace(/^0+/, '') ||
      String(c.serialNumber).toUpperCase() === DIST_SERIAL.toUpperCase(),
  );
  if (!distCert) throw new Error('Distribution cert not found on Expo account');
  console.log('using dist cert', distCert.id);

  let mainIdent = account.appleAppIdentifiers.find(
    (i) => i.bundleIdentifier === MAIN_BUNDLE,
  );
  let widgetIdent = account.appleAppIdentifiers.find(
    (i) => i.bundleIdentifier === WIDGET_BUNDLE,
  );

  if (!widgetIdent) {
    const created = await gql(
      `mutation($accountId: ID!, $input: AppleAppIdentifierInput!) {
        appleAppIdentifier {
          createAppleAppIdentifier(accountId: $accountId, appleAppIdentifierInput: $input) {
            id
            bundleIdentifier
          }
        }
      }`,
      {
        accountId: account.id,
        input: {
          bundleIdentifier: WIDGET_BUNDLE,
          appleTeamId: ACCOUNT_TEAM_ID,
          parentAppleAppId: mainIdent?.id,
        },
      },
    );
    widgetIdent = created.appleAppIdentifier.createAppleAppIdentifier;
    console.log('created widget identifier', widgetIdent);
  } else {
    console.log('widget identifier exists', widgetIdent);
  }

  const profileB64 = fs.readFileSync(PROFILE_PATH).toString('base64');
  const profile = await gql(
    `mutation($accountId: ID!, $appleAppIdentifierId: ID!, $input: AppleProvisioningProfileInput!) {
      appleProvisioningProfile {
        createAppleProvisioningProfile(
          accountId: $accountId
          appleAppIdentifierId: $appleAppIdentifierId
          appleProvisioningProfileInput: $input
        ) {
          id
          developerPortalIdentifier
          status
          expiration
        }
      }
    }`,
    {
      accountId: account.id,
      appleAppIdentifierId: widgetIdent.id,
      input: {
        appleProvisioningProfile: profileB64,
        developerPortalIdentifier: PROFILE_PORTAL_ID,
      },
    },
  );
  const provisioningProfileId =
    profile.appleProvisioningProfile.createAppleProvisioningProfile.id;
  console.log(
    'provisioning profile',
    profile.appleProvisioningProfile.createAppleProvisioningProfile,
  );

  // Check existing ios app credentials for widget
  const appCreds = await gql(
    `query($appId: String!) {
      app {
        byId(appId: $appId) {
          id
          iosAppCredentialsList {
            id
            appleAppIdentifier { id bundleIdentifier }
            iosAppBuildCredentialsList {
              id
              iosDistributionType
              distributionCertificate { id serialNumber }
              provisioningProfile { id developerPortalIdentifier }
            }
          }
        }
      }
    }`,
    { appId: APP_ID },
  );
  console.log(
    'existing ios creds',
    JSON.stringify(appCreds.app.byId.iosAppCredentialsList, null, 2),
  );

  let iosAppCreds = appCreds.app.byId.iosAppCredentialsList.find(
    (c) => c.appleAppIdentifier?.bundleIdentifier === WIDGET_BUNDLE,
  );
  if (!iosAppCreds) {
    const createdCreds = await gql(
      `mutation($appId: ID!, $appleAppIdentifierId: ID!, $input: IosAppCredentialsInput!) {
        iosAppCredentials {
          createIosAppCredentials(
            appId: $appId
            appleAppIdentifierId: $appleAppIdentifierId
            iosAppCredentialsInput: $input
          ) {
            id
          }
        }
      }`,
      {
        appId: APP_ID,
        appleAppIdentifierId: widgetIdent.id,
        input: {
          appleTeamId: ACCOUNT_TEAM_ID,
          appStoreConnectApiKeyForBuildsId: '8abe967f-e09e-4f6b-beb2-b08f4a634277',
        },
      },
    );
    iosAppCreds = createdCreds.iosAppCredentials.createIosAppCredentials;
    console.log('created ios app credentials', iosAppCreds);
  } else {
    console.log('ios app credentials exist', iosAppCreds.id);
  }

  const existingBuild = (iosAppCreds.iosAppBuildCredentialsList || []).find(
    (b) => b.iosDistributionType === 'AD_HOC',
  );
  if (existingBuild) {
    console.log('AD_HOC build creds already exist', existingBuild.id);
  } else {
    const buildCreds = await gql(
      `mutation($iosAppCredentialsId: ID!, $input: IosAppBuildCredentialsInput!) {
        iosAppBuildCredentials {
          createIosAppBuildCredentials(
            iosAppCredentialsId: $iosAppCredentialsId
            iosAppBuildCredentialsInput: $input
          ) {
            id
            iosDistributionType
          }
        }
      }`,
      {
        iosAppCredentialsId: iosAppCreds.id,
        input: {
          iosDistributionType: 'AD_HOC',
          distributionCertificateId: distCert.id,
          provisioningProfileId,
        },
      },
    );
    console.log(
      'created build credentials',
      buildCreds.iosAppBuildCredentials.createIosAppBuildCredentials,
    );
  }

  console.log('DONE — widget credentials wired');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
