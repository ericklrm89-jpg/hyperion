const http = require('http');
const WebSocket = require('ws');

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

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('tiktok.com'));
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('WS open');
      const els = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const items = Array.from(document.querySelectorAll('button, div[role="button"], [class*="action"], [class*="more"]'));
          return items.map(el => {
            const rc = el.getBoundingClientRect();
            const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ');
            if (rc.width < 5 || rc.height < 5) return null;
            return JSON.stringify({
              tag: el.tagName,
              className: el.className,
              text: txt.slice(0, 30),
              x: Math.round(rc.left),
              y: Math.round(rc.top),
              w: Math.round(rc.width),
              h: Math.round(rc.height)
            });
          }).filter(Boolean).slice(0, 80).join('\\n');
        })()`,
        returnByValue: true
      });
      console.log('\n=== TIKTOK ELEMENTS ===');
      console.log(els.result?.value);
      ws.close();
    });
  });
});
