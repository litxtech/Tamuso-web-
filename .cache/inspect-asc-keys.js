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
  const t = await gql(`{
    __type(name: "AppStoreConnectApiKey") {
      fields { name type { name kind ofType { name } } }
    }
  }`);
  console.log(JSON.stringify(t, null, 2));

  const data = await gql(`{
    account {
      byName(accountName: "mutaq") {
        appStoreConnectApiKeys {
          id
          keyIdentifier
          name
          issuerIdentifier
          roles
          createdAt
          updatedAt
          appleTeam { appleTeamIdentifier }
        }
      }
    }
  }`);
  console.log(JSON.stringify(data, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
