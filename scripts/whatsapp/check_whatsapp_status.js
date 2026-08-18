const WebSocket = require('ws');
const http = require('http');

async function getTab() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        const tabs = JSON.parse(data);
        const pageTab = tabs.find(t => t.type === 'page');
        if (!pageTab) reject(new Error('No page tab found'));
        else resolve(pageTab);
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('[HYPERION] Conectando a Chrome CDP...');
  const tab = await getTab();
  console.log(`[HYPERION] Pestaña activa: ${tab.title} (${tab.url})`);
  
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });
  
  // Navegar a WhatsApp Web
  console.log('[HYPERION] Navegando a WhatsApp Web...');
  await cdp(ws, 'Page.navigate', { url: 'https://web.whatsapp.com' });
  
  // Esperar a que cargue
  await sleep(6000);
  
  // Evaluar estado
  const pageState = await cdp(ws, 'Runtime.evaluate', { 
    expression: `JSON.stringify({
      title: document.title,
      url: window.location.href,
      hasQRCode: !!document.querySelector('canvas[aria-label="Scan me!"]'),
      isLoggedIn: !!document.querySelector('#side') || !!document.querySelector('[data-icon="chat"]') || !!document.querySelector('[aria-label="Chat list"]')
    })`,
    returnByValue: true
  });
  
  console.log('[HYPERION] Estado de WhatsApp Web:', pageState.result?.value);
  ws.close();
}

main().catch(err => console.error('[ERROR]', err));
