const fs = require('fs');
const path = require('path');
const os = require('os');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;
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

(async () => {
  const data = await gql(`{
    app {
      byId(appId: "${APP_ID}") {
        iosAppCredentials {
          id
          appleAppIdentifier { id bundleIdentifier }
          appStoreConnectApiKeyForSubmissions {
            id
            keyIdentifier
            name
            issuerIdentifier
            roles
            updatedAt
          }
          appStoreConnectApiKeyForBuilds {
            id
            keyIdentifier
            name
            issuerIdentifier
            roles
            updatedAt
          }
          iosAppBuildCredentialsList {
            id
            iosDistributionType
            distributionCertificate { serialNumber developerPortalIdentifier }
            provisioningProfile { id developerPortalIdentifier status expiration }
          }
        }
      }
    }
  }`);
  console.log(JSON.stringify(data, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
