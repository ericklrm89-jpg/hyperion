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
    const click = async (x, y) => {
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await wait(80);
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await wait(80);
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    };

    ws.on('open', async () => {
      await call('Page.bringToFront');
      await wait(500);

      // Find Everyone option by checking all elements
      const everyoneCoords = await call('Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('*'));
          const everyone = els.find(o => {
            const t = (o.innerText || o.textContent || '').trim().toLowerCase();
            const r = o.getBoundingClientRect();
            // check width > 0, height > 0, and that it contains only 'everyone' or is the leaf element
            return t === 'everyone' && r.width > 0 && r.height > 0 && o.children.length === 0;
          });
          if (everyone) {
            const r = everyone.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          // Try without leaf constraint
          const fallback = els.find(o => {
            const t = (o.innerText || o.textContent || '').trim().toLowerCase();
            const r = o.getBoundingClientRect();
            return t === 'everyone' && r.width > 0 && r.height > 0;
          });
          if (fallback) {
            const r = fallback.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`, returnByValue: true
      });

      console.log('Everyone coords:', everyoneCoords.result?.value);
      if (everyoneCoords.result?.value) {
        const ep = JSON.parse(everyoneCoords.result.value);
        console.log(`🖱️ Clicking Everyone at x=${ep.x}, y=${ep.y}`);
        await click(ep.x, ep.y);
        await wait(4000);

        // Save screenshot
        const ss = await call('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_privacy_set.png', Buffer.from(ss.data, 'base64'));
        console.log('📸 Screenshot saved: tiktok_privacy_set.png');
      } else {
        console.log('Everyone option not found!');
      }

      ws.close();
    });
  });
});
