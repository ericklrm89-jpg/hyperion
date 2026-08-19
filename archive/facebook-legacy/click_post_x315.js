const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const OUT = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\';

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    const fb = tabs.find(t => t.type === 'page' && t.url.includes('facebook'));
    const ws = new WebSocket(fb.webSocketDebuggerUrl);
    let id = 1; const q = new Map();

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        if (q.has(msg.id)) { const { res, t } = q.get(msg.id); clearTimeout(t); q.delete(msg.id); res(msg.result || {}); }
      } catch(e) {}
    });

    const call = (m, p, ms) => new Promise((res, rej) => {
      const i = id++;
      const t = setTimeout(() => { q.delete(i); rej(new Error(m + ' timeout')); }, ms || 10000);
      q.set(i, { res, t });
      ws.send(JSON.stringify({ id: i, method: m, params: p || {} }));
    });

    ws.on('open', async () => {
      try {
        await call('Page.enable');

        // Click the blue POST button at x=315, y=716
        console.log('Clicking POST button at x=315, y=716 (blue button)...');
        await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 315, y: 716 });
        await new Promise(r => setTimeout(r, 100));
        await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 315, y: 716, button: 'left', clickCount: 1 });
        await new Promise(r => setTimeout(r, 100));
        await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 315, y: 716, button: 'left', clickCount: 1 });

        console.log('Waiting 18s for Facebook Reel publication...');
        await new Promise(r => setTimeout(r, 18000));

        const ss = await call('Page.captureScreenshot', { format: 'png' }, 10000);
        fs.writeFileSync(OUT + 'fb_REEL_POST_CLICK_X315.png', Buffer.from(ss.data, 'base64'));
        console.log('Saved fb_REEL_POST_CLICK_X315.png');

        ws.close();
        process.exit(0);
      } catch(e) {
        console.error('ERR:', e.message);
        process.exit(1);
      }
    });
    ws.on('error', e => { console.error(e.message); process.exit(1); });
  });
});
