const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROBUST_MANUS_ENGINE } = require('./hyperion_robust_manus_overlay');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  const ws = new WebSocket(waTab.webSocketDebuggerUrl);

  ws.on('open', async () => {
    const call = (method, params = {}) => new Promise((resolve) => {
      const id = Math.floor(Math.random() * 99999);
      const h = (d) => {
        const j = JSON.parse(d);
        if (j.id === id) {
          ws.removeListener('message', h);
          resolve(j);
        }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });

    console.log('Obteniendo coordenadas exactas del botón Enviar...');
    const pos = await call('Runtime.evaluate', {
      expression: `(() => {
        const sendBtn = document.querySelector('span[data-icon="send"]') || 
                        document.querySelector('div[aria-label="Enviar"]') ||
                        document.querySelector('span[data-icon="send-light"]');
        if (sendBtn) {
          const btn = sendBtn.closest('button, div[role="button"]') || sendBtn;
          const r = btn.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        }
        return null;
      })()`,
      returnByValue: true
    });

    console.log('Coordenadas detectadas:', pos.result?.value);

    if (pos.result?.value) {
      const { x, y } = pos.result.value;
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      await new Promise(r => setTimeout(r, 2500));
    }

    // Inyectar Capa Manus
    await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
    await new Promise(r => setTimeout(r, 1000));

    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.result && snap.result.data) {
      const out = path.join(ASSETS_DIR, 'live_wa_both_messages_sent.jpg');
      fs.writeFileSync(out, Buffer.from(snap.result.data, 'base64'));
      console.log('✅ CAPTURA FINAL WHATSAPP:', out);
    }

    ws.close();
    process.exit(0);
  });
}

run();
