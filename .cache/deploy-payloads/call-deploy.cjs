// Reads MCP deploy JSON and prints args for verification only.
const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.error('usage: node call-deploy.cjs <payload.json>');
  process.exit(1);
}
const args = JSON.parse(fs.readFileSync(path, 'utf8'));
process.stdout.write(JSON.stringify(args));
