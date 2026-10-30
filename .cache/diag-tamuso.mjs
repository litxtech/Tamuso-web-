const list = await (await fetch('http://127.0.0.1:9334/json/list')).json();
const page = list.find((t) => t.type === 'page');
if (!page) {
  console.error('no page', list.map((t) => t.url));
  process.exit(1);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const logs = [];
let seq = 0;
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) p.reject(msg.error);
    else p.resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    const frames = (d.stackTrace?.callFrames || [])
      .slice(0, 8)
      .map((f) => `${f.functionName} ${f.url}:${f.lineNumber}:${f.columnNumber}`)
      .join('\n');
    logs.push(`EXC ${d.exception?.description || d.text || ''}\n${frames}`);
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const args = (msg.params.args || [])
      .map((a) => a.description || (a.value != null ? String(a.value) : a.type))
      .join(' | ');
    if (msg.params.type === 'error' || msg.params.type === 'warning') {
      logs.push(`${msg.params.type.toUpperCase()}: ${args.slice(0, 3000)}`);
    }
  }
  if (msg.method === 'Log.entryAdded') {
    logs.push(`LOG ${msg.params.entry.level}: ${msg.params.entry.text}`);
  }
};
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Network.enable');
await send('Page.navigate', { url: 'https://www.tamuso.com/?v=1fafa460' });
await new Promise((r) => setTimeout(r, 9000));
const state = await send('Runtime.evaluate', {
  expression:
    "JSON.stringify({kids: document.getElementById('root') ? document.getElementById('root').childElementCount : -1, html: (document.getElementById('root') && document.getElementById('root').innerHTML || '').slice(0, 400), text: (document.body && document.body.innerText || '').slice(0, 400)})",
  returnByValue: true,
});
console.log('STATE', state.result.value);
console.log('---LOGS', logs.length, '---');
console.log(logs.slice(0, 50).join('\n\n====\n\n'));
ws.close();
process.exit(0);
