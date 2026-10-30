const fs = require('fs');
const path = require('path');
const home = process.env.USERPROFILE || process.env.HOME;
const state = JSON.parse(fs.readFileSync(path.join(home, '.expo', 'state.json'), 'utf8'));
const sessionSecret = state.auth.sessionSecret;
const buildId = process.argv[2];

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

(async () => {
  const t = await gql(`{ __type(name: "BuildMutation") { fields { name args { name } } } }`);
  console.log(JSON.stringify(t, null, 2));
  const data = await gql(
    `mutation($buildId: ID!) {
      build { cancelBuild(buildId: $buildId) { id status } }
    }`,
    { buildId },
  );
  console.log(JSON.stringify(data, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
