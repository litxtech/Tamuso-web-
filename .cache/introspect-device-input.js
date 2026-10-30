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
  return res.json();
}

function printFields(typeObj, indent = 0) {
  if (!typeObj?.fields && !typeObj?.inputFields) return;
  const fields = typeObj.fields || typeObj.inputFields;
  for (const f of fields) {
    const t = f.type;
    const name =
      t.name ||
      t.ofType?.name ||
      t.ofType?.ofType?.name ||
      t.ofType?.ofType?.ofType?.name;
    console.log(`${'  '.repeat(indent)}${f.name}: ${t.kind} ${name || ''}`);
  }
}

(async () => {
  for (const name of [
    'AppleDeviceInput',
    'AppleDeviceClass',
    'AppleDevice',
  ]) {
    const t = await gql(`{
      __type(name: "${name}") {
        name kind
        enumValues { name }
        inputFields { name type { name kind ofType { name kind ofType { name } } } }
        fields { name type { name kind ofType { name } } }
      }
    }`);
    console.log('\n===', name, '===');
    console.log(JSON.stringify(t.data?.__type, null, 2));
  }

  const acc = await gql(`{
    account {
      byName(accountName: "mutaq") {
        id
        name
      }
    }
  }`);
  console.log('\naccount', JSON.stringify(acc.data?.account?.byName, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
