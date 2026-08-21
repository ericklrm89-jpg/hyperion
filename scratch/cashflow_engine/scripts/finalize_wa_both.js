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
  if (!waTab) return console.log('No WA tab');

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

    console.log('Enviando medio en modal de WhatsApp...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const sendMedia = document.querySelector('span[data-icon="send"]') || 
                          document.querySelector('div[aria-label="Enviar"]') ||
                          Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.getAttribute('aria-label') === 'Enviar');
        if (sendMedia) sendMedia.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));

    // Inyectar Capa Manus
    await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
    await new Promise(r => setTimeout(r, 1000));

    // Captura final del chat completo
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.result && snap.result.data) {
      const out = path.join(ASSETS_DIR, 'live_wa_both_messages_sent.jpg');
      fs.writeFileSync(out, Buffer.from(snap.result.data, 'base64'));
      console.log('✅ CAPTURA WHATSAPP COMPLETA GUARDADA:', out);
    }

    ws.close();
  });
}

run();
