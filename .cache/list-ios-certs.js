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
  const accountCerts = await gql(`{
    account {
      byName(accountName: "mutaq") {
        id
        name
        appleDistributionCertificates {
          id
          serialNumber
          validityNotBefore
          validityNotAfter
          developerPortalIdentifier
          createdAt
          updatedAt
          appleTeam { appleTeamIdentifier }
        }
      }
    }
  }`);
  console.log('=== ACCOUNT CERTS ===');
  console.log(JSON.stringify(accountCerts, null, 2));

  const appCreds = await gql(`{
    app {
      byId(appId: "${APP_ID}") {
        id
        fullName
        iosAppCredentialsList {
          id
          appleAppIdentifier { id bundleIdentifier }
          iosAppBuildCredentialsList {
            id
            iosDistributionType
            distributionCertificate {
              id
              serialNumber
              validityNotBefore
              validityNotAfter
              developerPortalIdentifier
              createdAt
              updatedAt
            }
            provisioningProfile {
              id
              expiration
              status
              developerPortalIdentifier
            }
          }
        }
      }
    }
  }`);
  console.log('=== APP BUILD CREDS ===');
  console.log(JSON.stringify(appCreds, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
