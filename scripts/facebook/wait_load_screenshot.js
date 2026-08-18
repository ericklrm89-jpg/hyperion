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
    let loadFired = false;

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        // Track load events
        if (msg.method === 'Page.loadEventFired' || msg.method === 'Page.domContentEventFired') {
          console.log('Page event:', msg.method);
          loadFired = true;
        }
        if (q.has(msg.id)) {
          const { res, t } = q.get(msg.id);
          clearTimeout(t);
          q.delete(msg.id);
          res(msg.result || {});
        }
      } catch(e) {}
    });

    const send = (m, p) => new Promise((res, rej) => {
      const i = id++;
      const t = setTimeout(() => { q.delete(i); rej(new Error(m + ' timeout')); }, 20000);
      q.set(i, { res, t });
      ws.send(JSON.stringify({ id: i, method: m, params: p || {} }));
    });

    ws.on('open', async () => {
      try {
        console.log('Connected');

        // Enable Page events to track load
        await send('Page.enable');
        console.log('Page enabled');

        // Navigate to FairDraw profile
        console.log('Navigating to fairdrawapp...');
        // Don't await - navigation fires load event instead
        send('Page.navigate', { url: 'https://www.facebook.com/fairdrawapp/' }).catch(() => {});

        // Wait for load event or up to 20s
        console.log('Waiting for page load...');
        const deadline = Date.now() + 20000;
        while (!loadFired && Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 500));
        }
        console.log('Load status: loadFired =', loadFired, '— waiting 3s more...');
        await new Promise(r => setTimeout(r, 3000));

        // Screenshot
        console.log('Taking screenshot...');
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(
          'C:/Users/erick/.gemini/antigravity-ide/scratch/hyperion-web-agent/fb_PROFILE_LOADED.png',
          Buffer.from(ss.data, 'base64')
        );
        console.log('Saved fb_PROFILE_LOADED.png');

        // Scroll down
        await send('Runtime.evaluate', { expression: 'window.scrollBy(0, 500)' });
        await new Promise(r => setTimeout(r, 2000));
        const ss2 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(
          'C:/Users/erick/.gemini/antigravity-ide/scratch/hyperion-web-agent/fb_PROFILE_SCROLLED.png',
          Buffer.from(ss2.data, 'base64')
        );
        console.log('Saved fb_PROFILE_SCROLLED.png');

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
