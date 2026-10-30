const fs = require('fs');
const path = require('path');
const os = require('os');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;
const APP_ID = '36cb815b-2891-4075-a1a8-89902e491af5';
const ACCOUNT_TEAM_ID = '13dd157f-e0e2-4cac-85ae-e36ffbcef84c';
const WIDGET_IDENT_ID = 'b0aaedff-ee8b-4f82-b6af-cce6e4245aa1';
const DIST_CERT_ID = 'a5be01ad-7ac9-4798-9a43-5d3063bdcc40';
const PROVISIONING_PROFILE_ID = '5114f4ee-83bc-4d8f-a604-31a6ff5e37b3';
const ASC_KEY_ID = '8abe967f-e09e-4f6b-beb2-b08f4a634277';

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
  const t = await gql(`{
    __type(name: "App") {
      fields { name }
    }
  }`);
  console.log(
    'App fields with ios/cred',
    t.__type.fields.map((f) => f.name).filter((n) => /ios|cred|apple/i.test(n)),
  );

  // create ios app credentials for widget
  const createdCreds = await gql(
    `mutation($appId: ID!, $appleAppIdentifierId: ID!, $input: IosAppCredentialsInput!) {
      iosAppCredentials {
        createIosAppCredentials(
          appId: $appId
          appleAppIdentifierId: $appleAppIdentifierId
          iosAppCredentialsInput: $input
        ) {
          id
          appleAppIdentifier { bundleIdentifier }
        }
      }
    }`,
    {
      appId: APP_ID,
      appleAppIdentifierId: WIDGET_IDENT_ID,
      input: {
        appleTeamId: ACCOUNT_TEAM_ID,
        appStoreConnectApiKeyForBuildsId: ASC_KEY_ID,
      },
    },
  );
  const iosAppCredsId = createdCreds.iosAppCredentials.createIosAppCredentials.id;
  console.log('iosAppCredentials', createdCreds.iosAppCredentials.createIosAppCredentials);

  const buildCreds = await gql(
    `mutation($iosAppCredentialsId: ID!, $input: IosAppBuildCredentialsInput!) {
      iosAppBuildCredentials {
        createIosAppBuildCredentials(
          iosAppCredentialsId: $iosAppCredentialsId
          iosAppBuildCredentialsInput: $input
        ) {
          id
          iosDistributionType
          distributionCertificate { id serialNumber }
          provisioningProfile { id developerPortalIdentifier status }
        }
      }
    }`,
    {
      iosAppCredentialsId: iosAppCredsId,
      input: {
        iosDistributionType: 'AD_HOC',
        distributionCertificateId: DIST_CERT_ID,
        provisioningProfileId: PROVISIONING_PROFILE_ID,
      },
    },
  );
  console.log(
    'buildCreds',
    JSON.stringify(buildCreds.iosAppBuildCredentials.createIosAppBuildCredentials, null, 2),
  );
  console.log('DONE');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
