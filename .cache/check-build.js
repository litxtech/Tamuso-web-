const fs = require('fs');
const path = require('path');
const os = require('os');

const BUILD_ID = process.argv[2] || 'bbdf25e9-1a80-49ec-a103-10ecc90a09ec';
const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;

(async () => {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'expo-session': session,
    },
    body: JSON.stringify({
      query: `query($id: ID!) {
        builds {
          byId(buildId: $id) {
            id
            status
            platform
            error { errorCode message docsUrl }
            logFiles
            artifacts { buildUrl applicationArchiveUrl }
            createdAt
            completedAt
            expirationDate
            appVersion
            appBuildVersion
            metrics { buildWaitTime buildQueueTime buildDuration }
          }
        }
      }`,
      variables: { id: BUILD_ID },
    }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(json.data.builds.byId, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
