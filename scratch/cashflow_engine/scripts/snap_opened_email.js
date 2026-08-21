const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CDP_PORT = 9001;
const OUT_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets\\live_gm_opened_proposal_verified.jpg';

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
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
  if (!gmTab) return console.log('No GM tab');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl, { maxPayload: 50 * 1024 * 1024 });
  ws.on('open', async () => {
    const call = (method, params = {}) => new Promise((resolve) => {
      const id = Math.floor(Math.random() * 99999);
      const h = (d) => {
        const j = JSON.parse(d);
        if (j.id === id) {
          ws.removeListener('message', h);
          resolve(j.result);
        }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });

    console.log('Abriendo el correo enviado en la lista...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const row = document.querySelector('tr.zA');
        if (row) { row.click(); return 'CLICKED_ROW'; }
        return 'NO_ROW';
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 3500));

    console.log('Capturando pantalla del correo abierto...');
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.data) {
      fs.writeFileSync(OUT_FILE, Buffer.from(snap.data, 'base64'));
      console.log('✅ Captura del correo abierto guardada:', OUT_FILE);
    }
    ws.close();
  });
}

run();
