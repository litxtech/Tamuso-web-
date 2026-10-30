const fs = require('fs');
const path = require('path');
const os = require('os');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;

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
    account {
      byName(accountName: "mutaq") {
        appStoreConnectApiKeys {
          id
          keyIdentifier
          name
          roles
          issuerIdentifier
        }
        apps {
          byFullName(fullName: "@mutaq/muta") {
            id
            iosAppCredentialsList {
              id
              appleAppIdentifier {
                id
                bundleIdentifier
              }
              iosAppBuildCredentialsList {
                id
                iosDistributionType
                provisioningProfile {
                  id
                  developerPortalIdentifier
                  status
                }
                distributionCertificate {
                  serialNumber
                }
              }
            }
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
