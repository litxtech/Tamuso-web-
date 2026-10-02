/**
 * iOS development build — mevcut EAS Push Key (252J3SUN7W) ile.
 * Apple login: No (session yok); credentials + push key Expo'da hazır.
 * app.config aps-environment + remote-notification korunur.
 */
const fs = require('fs');
const path = require('path');

function loadEnvFile(file) {
  const p = path.join(__dirname, '..', file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}
loadEnvFile('.env.expo.local');

const LOG = path.join(__dirname, '..', 'eas-ios-dev-push.log');
const logStream = fs.createWriteStream(LOG, { flags: 'w' });
const log = (s) => {
  process.stdout.write(s);
  logStream.write(s);
};

const pty = require('node-pty');
const env = { ...process.env };
for (const k of Object.keys(env)) {
  if (env[k] === '' || env[k] === undefined) delete env[k];
}
delete env.CI;
delete env.CONTINUOUS_INTEGRATION;

const cmd =
  'npx --yes eas-cli@24.8.0 build --profile development --platform ios --clear-cache';
log(`[pty] ${cmd}\nEXPO_TOKEN=${env.EXPO_TOKEN ? 'yes' : 'no'}\n`);

const term = pty.spawn(
  process.platform === 'win32' ? 'cmd.exe' : 'bash',
  process.platform === 'win32' ? ['/d', '/s', '/c', cmd] : ['-lc', cmd],
  {
    name: 'xterm-color',
    cols: 120,
    rows: 40,
    cwd: path.join(__dirname, '..'),
    env,
  },
);

let buf = '';
let appleLoginDone = false;
let pushDone = false;
let profileReuseDone = false;
let devicesPromptDone = false;

term.onData((data) => {
  log(data);
  buf += data;
  if (buf.length > 12000) buf = buf.slice(-6000);
  const lower = buf.toLowerCase();

  // Mevcut push key var — Apple login atla (şifre yok); Expo push key kullanılır
  if (!appleLoginDone && lower.includes('log in to your apple account')) {
    appleLoginDone = true;
    log('\n[auto] Apple login → No (EAS push key zaten kayıtlı)\n');
    term.write('n\r');
    return;
  }

  if (
    !pushDone &&
    (lower.includes('set up push notifications') ||
      lower.includes('setup push notifications'))
  ) {
    pushDone = true;
    log('\n[auto] Setup Push Notifications → Yes\n');
    term.write('y\r');
    return;
  }

  // Select list: reuse profile? default Yes — Enter
  if (
    !profileReuseDone &&
    lower.includes('would you like to reuse the profile')
  ) {
    profileReuseDone = true;
    log('\n[auto] Reuse provisioning profile → Yes (Enter)\n');
    term.write('\r');
    return;
  }

  if (
    !devicesPromptDone &&
    lower.includes('registered devices') &&
    lower.includes('(y/n)')
  ) {
    devicesPromptDone = true;
    log('\n[auto] devices prompt → Yes\n');
    term.write('y\r');
  }
});

term.onExit(({ exitCode }) => {
  log(
    `\n[exit] ${exitCode} apple=${appleLoginDone} push=${pushDone} profile=${profileReuseDone}\n`,
  );
  logStream.end();
  process.exit(exitCode ?? 1);
});
