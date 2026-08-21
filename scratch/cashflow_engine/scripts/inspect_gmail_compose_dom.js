const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

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
  if (!gmTab) return console.log('No GM tab');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
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

    const res = await call('Runtime.evaluate', {
      expression: `(() => {
        const editors = Array.from(document.querySelectorAll('div[contenteditable="true"]'));
        return editors.map((e, idx) => ({
          idx,
          role: e.getAttribute('role'),
          ariaLabel: e.getAttribute('aria-label'),
          className: e.className,
          offsetWidth: e.offsetWidth,
          offsetHeight: e.offsetHeight,
          currentHtml: e.innerHTML.slice(0, 150),
          plainTextMode: !!document.querySelector('div[aria-label="Modo de texto sin formato"] input[checked]')
        }));
      })()`,
      returnByValue: true
    });

    console.log('EDITORES DETECTADOS:', JSON.stringify(res.result?.value, null, 2));
    ws.close();
  });
}

run();
