const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) {
          ws.removeListener('message', h);
          r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('instagram.com'));
    if (!tab) {
      console.log('❌ Instagram tab not found.');
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a Instagram.');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'Page.bringToFront');

      console.log('🧭 Navegando al perfil...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.instagram.com/fairdrawapp/'` });
      await wait(6000);

      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('ig_profile_status.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 ig_profile_status.png guardada.');

      ws.close();
    });
  });
});
