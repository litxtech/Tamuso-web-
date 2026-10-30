const fs = require('fs');
const path = require('path');
const os = require('os');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;

async function gql(query) {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'expo-session': session,
    },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

(async () => {
  const mut = await gql(`{
    __type(name: "Mutation") {
      fields { name }
    }
  }`);
  const names = (mut.data?.__type?.fields || [])
    .map((f) => f.name)
    .filter((n) => /device|Device|Apple/i.test(n));
  console.log('Mutation matches:', names);

  for (const typeName of [
    'AppleDeviceMutation',
    'AppleDeviceMutations',
    'RootMutation',
  ]) {
    const t = await gql(`{
      __type(name: "${typeName}") {
        name
        fields { name args { name type { name kind ofType { name } } } }
      }
    }`);
    if (t.data?.__type) {
      console.log(typeName, JSON.stringify(t.data.__type, null, 2));
    }
  }

  // account apple teams + try nested appleDevice
  const acc = await gql(`{
    account {
      byName(accountName: "mutaq") {
        appleTeams { id appleTeamIdentifier appleTeamName }
      }
    }
  }`);
  console.log('teams', JSON.stringify(acc.data?.account?.byName?.appleTeams, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
