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
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('tiktok.com'));
    if (!tab) {
      console.log('No TikTok tab open');
      return;
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a TikTok.');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'Page.bringToFront');
      
      console.log('🔄 Recargando la página para limpiar errores...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: 'window.onbeforeunload = null;' });
      await cdpCall(ws, 'Page.reload');
      await wait(8000);

      // capture screenshot
      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_upload_reloaded.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 Screenshot guardado.');
      
      ws.close();
    });
  });
});
