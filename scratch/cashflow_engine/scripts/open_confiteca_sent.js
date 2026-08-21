const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

http.get('http://127.0.0.1:9001/json', res => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', async () => {
    const tabs = JSON.parse(d);
    const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
    if (gmTab) {
      const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
      ws.on('open', async () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const rows = Array.from(document.querySelectorAll('tr.zA'));
              if (rows.length > 0) rows[0].click();
            })()`
          }
        }));
        await new Promise(r => setTimeout(r, 3000));
        ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'jpeg', quality: 95 } }));
      });
      ws.on('message', data => {
        const r = JSON.parse(data);
        if (r.id === 2 && r.result?.data) {
          fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets\\live_gm_confiteca_opened_verified.jpg', Buffer.from(r.result.data, 'base64'));
          console.log('CAPTURA CONFITECA ABIERTO LISTA');
          process.exit(0);
        }
      });
    }
  });
});
