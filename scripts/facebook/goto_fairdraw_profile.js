const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

http.get('http://127.0.0.1:9222/json', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const tabs = JSON.parse(d);
    const fb = tabs.find(t => t.type === 'page' && t.url.includes('facebook'));
    if (!fb) return console.log('no fb tab');

    const ws = new WebSocket(fb.webSocketDebuggerUrl);
    let id = 1;
    const q = new Map();

    ws.on('message', raw => {
      try {
        const r = JSON.parse(raw);
        if (q.has(r.id)) {
          const { res, t } = q.get(r.id);
          clearTimeout(t);
          q.delete(r.id);
          res(r.result || {});
        }
      } catch(e) {}
    });

    const call = (m, p, ms) => new Promise((res, rej) => {
      const i = id++;
      const to = ms || 15000;
      const t = setTimeout(() => { q.delete(i); rej(new Error(m + ' timeout')); }, to);
      q.set(i, { res, t });
      ws.send(JSON.stringify({ id: i, method: m, params: p || {} }));
    });

    ws.on('open', async () => {
      try {
        console.log('Connected to FB tab');
        // Use Runtime.evaluate to navigate (fire-and-forget, no response wait)
        const navId = id++;
        ws.send(JSON.stringify({
          id: navId,
          method: 'Runtime.evaluate',
          params: { expression: 'window.location.assign("https://www.facebook.com/fairdrawapp/")' }
        }));
        console.log('Navigation fired, waiting 10s...');
        await new Promise(r => setTimeout(r, 10000));

        console.log('Taking screenshot...');
        const ss = await call('Page.captureScreenshot', { format: 'png' }, 12000);
        const outPath = 'C:/Users/erick/.gemini/antigravity-ide/scratch/hyperion-web-agent/fb_PROFILE_CLEAN.png';
        fs.writeFileSync(outPath, Buffer.from(ss.data, 'base64'));
        console.log('Saved:', outPath);

        ws.close();
        process.exit(0);
      } catch(e) {
        console.error('ERR:', e.message);
        process.exit(1);
      }
    });

    ws.on('error', e => { console.error('WS err:', e.message); process.exit(1); });
  });
});
