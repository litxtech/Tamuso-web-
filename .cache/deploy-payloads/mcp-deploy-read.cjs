/** Prints deploy_edge_function arguments JSON (UTF-8) for MCP. Usage: node mcp-deploy-read.cjs <payload.mcp.json> */
const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.error('usage: node mcp-deploy-read.cjs <payload.mcp.json>');
  process.exit(1);
}
const p = JSON.parse(fs.readFileSync(path, 'utf8'));
const args = {
  project_id: p.project_id,
  name: p.name,
  entrypoint_path: p.entrypoint_path,
  verify_jwt: p.verify_jwt,
  files: p.files,
};
process.stdout.write(JSON.stringify(args));
