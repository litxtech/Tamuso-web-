import fs from 'fs';
import path from 'path';
import os from 'os';

const argsPath = process.argv[2];
if (!argsPath) {
  console.error('usage: node deploy-http.mjs <deploy-args.json>');
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(argsPath, 'utf8'));
const tokenPath = path.join(os.homedir(), '.supabase', 'access-token');
const token = fs.readFileSync(tokenPath, 'utf8').trim();

const boundary = '----supabaseDeploy' + Date.now();
const metadata = {
  name: args.name,
  entrypoint_path: args.entrypoint_path,
  verify_jwt: args.verify_jwt,
};
if (args.import_map_path) metadata.import_map_path = args.import_map_path;

const parts = [];
parts.push(
  `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="metadata"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    JSON.stringify(metadata) +
    '\r\n',
);

for (const file of args.files) {
  parts.push(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n` +
      `Content-Type: application/typescript\r\n\r\n` +
      file.content +
      '\r\n',
  );
}
parts.push(`--${boundary}--\r\n`);
const body = parts.join('');

const url = `https://api.supabase.com/v1/projects/${args.project_id}/functions/deploy?slug=${encodeURIComponent(args.name)}`;
const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  },
  body,
});

const text = await res.text();
if (!res.ok) {
  console.error('deploy failed', res.status, text.slice(0, 500));
  process.exit(1);
}
console.log(text);
