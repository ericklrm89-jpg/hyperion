const WebSocket = require('ws');
const http = require('http');

async function getTab() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        const tabs = JSON.parse(data);
        const waTab = tabs.find(t => t.url && t.url.includes('whatsapp.com')) || tabs.find(t => t.type === 'page');
        if (!waTab) reject(new Error('No WhatsApp tab found'));
        else resolve(waTab);
      });
    }).on('error', reject);
  });
}

let _id = 1;
function cdp(ws, method, params = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const id = _id++;
    const timer = setTimeout(() => { ws.off('message', h); reject(new Error(`Timeout: ${method}`)); }, timeoutMs);
    const h = (data) => {
      const r = JSON.parse(data.toString());
      if (r.id === id) { clearTimeout(timer); ws.off('message', h); r.error ? reject(new Error(r.error.message)) : resolve(r.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const tab = await getTab();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });

  const pageInfo = await cdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body ? document.body.innerText.slice(0, 500) : '';
      const hasQR = !!document.querySelector('canvas');
      const hasChats = !!document.querySelector('#pane-side') || !!document.querySelector('[data-testid="chat-list"]');
      const qrCanvas = document.querySelector('canvas');
      const qrData = qrCanvas ? 'Canvas Presente' : 'Sin Canvas';
      return JSON.stringify({
        title: document.title,
        textPreview: text.replace(/\\n+/g, ' | '),
        hasQR,
        hasChats,
        qrData
      });
    })()`,
    returnByValue: true
  });

  console.log('[HYPERION WA STATUS]:', pageInfo.result?.value);
  ws.close();
}

main().catch(console.error);
