/** Usage: node load-deploy-args.cjs <path-to-args.json> — prints JSON for deploy_edge_function */
const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.error('usage: node load-deploy-args.cjs <args.json>');
  process.exit(1);
}
const args = JSON.parse(fs.readFileSync(path, 'utf8'));
process.stdout.write(JSON.stringify(args));
