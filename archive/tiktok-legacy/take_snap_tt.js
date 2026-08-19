const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('tiktok.com') && t.type === 'page');
    if (!tab) { console.log('No TikTok tab'); return; }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let id = 1;
    const call = (m, p = {}) => new Promise((res, rej) => {
      const i = id++;
      const h = data => { const r = JSON.parse(data); if (r.id === i) { ws.off('message', h); r.error ? rej(r.error) : res(r.result); } };
      ws.on('message', h);
      ws.send(JSON.stringify({ id: i, method: m, params: p }));
    });
    const wait = ms => new Promise(r => setTimeout(r, ms));

    ws.on('open', async () => {
      await call('Page.bringToFront');
      await wait(5000);

      // Screenshot actual
      const ss = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_wait_snap.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 Screenshot saved.');

      ws.close();
    });
  });
});
