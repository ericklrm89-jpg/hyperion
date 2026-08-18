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
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('instagram.com'));
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('WS open');
      const els = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          // Obtener todos los elementos interactivos dentro de la modal del post
          const dialog = document.querySelector('div[role="dialog"]') || document.querySelector('article') || document;
          const items = Array.from(dialog.querySelectorAll('svg, button, div[role="button"], [aria-label]'));
          return items.map(el => {
            const rc = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              aria: el.getAttribute('aria-label'),
              text: el.textContent ? el.textContent.trim().slice(0, 30) : '',
              className: el.className,
              x: Math.round(rc.left),
              y: Math.round(rc.top),
              w: Math.round(rc.width),
              h: Math.round(rc.height)
            };
          }).filter(e => e.w > 0 && e.h > 0).slice(0, 100);
        })()`,
        returnByValue: true
      });
      console.log('Elementos interactivos encontrados:', JSON.stringify(els.result?.value, null, 2));
      ws.close();
    });
  });
});
