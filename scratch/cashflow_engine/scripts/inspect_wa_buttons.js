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

    const info = await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('*')).filter(el => {
          const t = el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || '';
          return (t.includes('Enviar') || t.includes('Send')) && el.offsetWidth > 0;
        });
        return btns.map(b => {
          const r = b.getBoundingClientRect();
          return { tag: b.tagName, aria: b.getAttribute('aria-label'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
        });
      })()`,
      returnByValue: true
    });

    console.log('Botones encontrados:', JSON.stringify(info.result?.result?.value || info.result?.value, null, 2));
    ws.close();
    process.exit(0);
  });
}

run();
