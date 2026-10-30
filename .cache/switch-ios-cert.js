const fs = require('fs');
const path = require('path');
const os = require('os');

const state = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'),
);
const session = state.auth.sessionSecret;

const APP_STORE_BUILD_CREDS_ID = '02c6e448-cb54-48af-b7cb-272d9412829c';
const GOOD_CERT_ID = 'a5be01ad-7ac9-4798-9a43-5d3063bdcc40'; // 21595E4C Oct 1

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
  // Also scan other accounts for a 3rd cert
  const accounts = [
    'mutaq',
    'luvolive',
    'mytrabzon',
    'uzungolapp',
    'valoriahotel',
    'voralive',
    'asinc',
    'sispersonel',
    'mivomuhasebe',
  ];
  for (const name of accounts) {
    try {
      const data = await gql(`{
        account {
          byName(accountName: "${name}") {
            name
            appleDistributionCertificates {
              id
              serialNumber
              validityNotAfter
              developerPortalIdentifier
            }
          }
        }
      }`);
      const certs = data.account?.byName?.appleDistributionCertificates || [];
      if (certs.length) {
        console.log(`\n[${name}] ${certs.length} cert(s)`);
        for (const c of certs) {
          console.log(
            `  ${c.serialNumber} portal=${c.developerPortalIdentifier} until=${c.validityNotAfter} id=${c.id}`,
          );
        }
      }
    } catch (e) {
      console.log(`[${name}] skip`);
    }
  }

  console.log('\n=== SWITCH APP_STORE cert to Oct 1 cert ===');
  const updated = await gql(
    `mutation($id: ID!, $distributionCertificateId: ID!) {
      iosAppBuildCredentials {
        setDistributionCertificate(id: $id, distributionCertificateId: $distributionCertificateId) {
          id
          iosDistributionType
          distributionCertificate {
            id
            serialNumber
            validityNotAfter
            developerPortalIdentifier
          }
          provisioningProfile {
            id
            developerPortalIdentifier
            status
            expiration
          }
        }
      }
    }`,
    {
      id: APP_STORE_BUILD_CREDS_ID,
      distributionCertificateId: GOOD_CERT_ID,
    },
  );
  console.log(JSON.stringify(updated, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
