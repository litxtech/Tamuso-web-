const fs = require('fs');
const path = require('path');
const os = require('os');

const session = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
).auth.sessionSecret;

async function gql(query) {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'expo-session': session },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

(async () => {
  const j = await gql(`{
    app {
      byId(appId: "36cb815b-2891-4075-a1a8-89902e491af5") {
        submissions(limit: 5, offset: 0, filter: {}) {
          id
          status
          createdAt
          updatedAt
          completedAt
          archiveUrl
          error { message errorCode }
          submittedBuild { id status appBuildVersion }
        }
      }
    }
  }`);
  console.log(JSON.stringify(j, null, 2));
})();
