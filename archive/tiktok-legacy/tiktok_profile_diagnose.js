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
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a TikTok.');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'Page.bringToFront');

      console.log('🧭 Navegando al perfil público de TikTok...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.tiktok.com/@fairdrawapp'` });
      await wait(6000);

      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('tiktok_public_profile.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 tiktok_public_profile.png guardada.');

      // Dump de elementos interactivos
      const els = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const items = Array.from(document.querySelectorAll('button, div[role="button"], a'));
          return items.map(el => {
            const rc = el.getBoundingClientRect();
            return JSON.stringify({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 25),
              x: Math.round(rc.left),
              y: Math.round(rc.top),
              w: Math.round(rc.width),
              h: Math.round(rc.height)
            });
          }).filter(Boolean).slice(0, 50).join('\\n');
        })()`,
        returnByValue: true
      });
      console.log(els.result?.value);

      ws.close();
    });
  });
});
