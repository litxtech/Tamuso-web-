const fs = require('fs');
const path = require('path');
const os = require('os');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;
const IOS_APP_CREDS_ID = '137ca5f8-cbd2-4d06-9dca-6a73c16b9b59';
const ASC_KEY_ID = '8abe967f-e09e-4f6b-beb2-b08f4a634277'; // 5F954566QM

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
  const updated = await gql(
    `mutation($id: ID!, $input: IosAppCredentialsInput!) {
      iosAppCredentials {
        updateIosAppCredentials(id: $id, iosAppCredentialsInput: $input) {
          id
          appStoreConnectApiKeyForBuilds {
            id
            keyIdentifier
            name
          }
          appStoreConnectApiKeyForSubmissions {
            id
            keyIdentifier
            name
          }
          iosAppBuildCredentialsList {
            id
            iosDistributionType
            distributionCertificate { serialNumber developerPortalIdentifier }
            provisioningProfile { id developerPortalIdentifier status expiration }
          }
        }
      }
    }`,
    {
      id: IOS_APP_CREDS_ID,
      input: {
        appStoreConnectApiKeyForBuildsId: ASC_KEY_ID,
      },
    },
  );
  console.log(JSON.stringify(updated, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
