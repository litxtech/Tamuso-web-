const fs = require('fs');
const path = require('path');

const home = process.env.USERPROFILE || process.env.HOME;
const state = JSON.parse(fs.readFileSync(path.join(home, '.expo', 'state.json'), 'utf8'));
const sessionSecret = state.auth.sessionSecret;
const VERSION = process.argv[2] || '1.2.5';
const APP_ID = '36cb815b-2891-4075-a1a8-89902e491af5';

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
  const input = await gql(`{
    __type(name: "AppVersionInput") {
      inputFields { name type { name kind ofType { name kind ofType { name } } } }
    }
  }`);
  console.log('AppVersionInput', JSON.stringify(input, null, 2));

  async function setVersion(platform, applicationIdentifier, storeVersion, buildVersion) {
    const data = await gql(
      `mutation($input: AppVersionInput!) {
        appVersion {
          createAppVersion(appVersionInput: $input) {
            id
            platform
            storeVersion
            buildVersion
          }
        }
      }`,
      {
        input: {
          appId: APP_ID,
          platform,
          applicationIdentifier,
          storeVersion,
          buildVersion,
        },
      },
    );
    console.log('set', platform, JSON.stringify(data, null, 2));
  }

  // Keep current build versions; bump store version. autoIncrement will +1 on build.
  await setVersion('IOS', 'com.litxtech.muta', VERSION, '26');
  await setVersion('ANDROID', 'com.litxtech.muta', VERSION, '120');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
