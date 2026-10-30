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

async function showInput(name) {
  const t = await gql(`{
    __type(name: "${name}") {
      name
      inputFields { name type { name kind ofType { name kind ofType { name } } } }
      fields { name args { name type { name kind ofType { name kind ofType { name } } } } }
    }
  }`);
  console.log('\n===', name, '===');
  console.log(JSON.stringify(t, null, 2));
}

(async () => {
  for (const name of [
    'AppleAppIdentifierInput',
    'IosAppCredentialsInput',
    'IosAppBuildCredentialsMutation',
    'IosAppBuildCredentialsInput',
    'AppleProvisioningProfileMutation',
    'AppleProvisioningProfileInput',
    'AppleDistributionCertificateMutation',
  ]) {
    await showInput(name);
  }

  // List account apple app identifiers
  const data = await gql(`{
    account {
      byName(accountName: "mutaq") {
        id
        appleAppIdentifiers(offset: 0, limit: 50) {
          id
          bundleIdentifier
        }
        appleDistributionCertificates(offset: 0, limit: 20) {
          id
          serialNumber
          validityNotAfter
        }
      }
    }
  }`);
  console.log('\n=== account identifiers/certs ===');
  console.log(JSON.stringify(data, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
