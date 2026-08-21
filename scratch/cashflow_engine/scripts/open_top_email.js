const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');

http.get('http://127.0.0.1:9001/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const gm = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
    const ws = new WebSocket(gm.webSocketDebuggerUrl);

    ws.on('open', async () => {
      const call = (m, p = {}) => new Promise((r) => {
        const id = Math.floor(Math.random() * 99999);
        const h = (msg) => {
          const j = JSON.parse(msg);
          if (j.id === id) {
            ws.removeListener('message', h);
            r(j.result);
          }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id, method: m, params: p }));
      });

      console.log('Haciendo clic en el asunto del correo...');
      await call('Runtime.evaluate', {
        expression: `(() => {
          const target = document.querySelector('span.bog') || document.querySelector('tr.zA td.xY');
          if (target) {
            target.click();
            return 'CLICKED';
          }
          return 'NOT_FOUND';
        })()`,
        returnByValue: true
      });

      await new Promise(r => setTimeout(r, 4000));

      console.log('Capturando pantalla del correo abierto...');
      const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
      if (snap && snap.data) {
        const out = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets\\live_gm_opened_proposal_verified.jpg';
        fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
        console.log('Saved:', out);
      }
      ws.close();
    });
  });
});
