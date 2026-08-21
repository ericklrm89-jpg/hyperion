const WebSocket = require('ws');
const http = require('http');

const CDP_PORT = 9001;

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
  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);

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

    const testExpr = `(() => {
      const el = document.querySelector('div[aria-label="Cuerpo del mensaje"]');
      if (el) {
        el.innerHTML = '<h2>TEST NANOAI OK</h2>';
        return 'SUCCESS';
      }
      return 'NO_ELEMENT';
    })()`;

    const raw = await call('Runtime.evaluate', { expression: testExpr, returnByValue: true });
    console.log('RESPUESTA RAW CDP:', JSON.stringify(raw, null, 2));

    ws.close();
  });
}

run();
