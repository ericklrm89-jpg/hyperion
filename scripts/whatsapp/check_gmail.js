const WebSocket = require('ws');
const http = require('http');

async function getBrowserWs() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/version', (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        const v = JSON.parse(data);
        resolve(v.webSocketDebuggerUrl);
      });
    }).on('error', reject);
  });
}

async function getTabs() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

let _id = 1;
function cdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = _id++;
    const h = (data) => {
      const r = JSON.parse(data.toString());
      if (r.id === id) { ws.off('message', h); r.error ? reject(new Error(r.error.message)) : resolve(r.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browserWsUrl = await getBrowserWs();
  const bWs = new WebSocket(browserWsUrl);
  await new Promise((r, e) => { bWs.on('open', r); bWs.on('error', e); });

  // Crear nueva pestaña para Gmail
  const { targetId } = await cdp(bWs, 'Target.createTarget', { url: 'https://mail.google.com/' });
  console.log(`[HYPERION] Pestaña de Gmail creada con ID: ${targetId}`);
  bWs.close();

  await sleep(6000);

  const tabs = await getTabs();
  const gmailTab = tabs.find(t => t.id === targetId || (t.url && t.url.includes('google.com')));
  if (!gmailTab) {
    console.log('[WARN] Pestaña no encontrada en la lista');
    return;
  }

  const ws = new WebSocket(gmailTab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });

  const info = await cdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      return JSON.stringify({
        title: document.title,
        url: window.location.href,
        isLoginNeeded: window.location.href.includes('accounts.google.com') || window.location.href.includes('signin'),
        hasInbox: !!document.querySelector('[role="main"]') || !!document.querySelector('div[aria-label*="Bandeja"]')
      });
    })()`,
    returnByValue: true
  });

  console.log('[HYPERION GMAIL STATUS]:', info.result?.value);
  ws.close();
}

main().catch(console.error);
