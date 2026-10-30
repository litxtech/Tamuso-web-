import { readFileSync } from "fs";
const path = process.argv[2];
const p = JSON.parse(readFileSync(path, "utf8"));
const args = { project_id: p.project_id, name: p.name, entrypoint_path: p.entrypoint_path, verify_jwt: p.verify_jwt, files: p.files };
process.stdout.write(JSON.stringify(args));
