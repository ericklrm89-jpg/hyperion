const http = require('http');
const WebSocket = require('ws');

http.get('http://localhost:9222/json', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const t = tabs.find(x => x.type === 'page' && x.url.includes('gemini.google.com') && !x.url.includes('RotateCookiesPage'));
    if (!t) return console.log('Tab no encontrada');

    const ws = new WebSocket(t.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (function() {
              function deepFind(root) {
                root = root || document;
                var res = [];
                var all = Array.from(root.querySelectorAll('*'));
                for (var i = 0; i < all.length; i++) {
                  var el = all[i];
                  if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.getAttribute('role') === 'button') {
                    var r = el.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                      res.push({
                        tag: el.tagName.toLowerCase(),
                        type: el.type || '',
                        aria: el.getAttribute('aria-label') || '',
                        text: (el.innerText || el.textContent || '').trim().slice(0, 30),
                        x: Math.round(r.left + r.width/2),
                        y: Math.round(r.top + r.height/2)
                      });
                    }
                  }
                  if (el.shadowRoot) {
                    res = res.concat(deepFind(el.shadowRoot));
                  }
                }
                return res;
              }
              return JSON.stringify(deepFind(document));
            })()
          `
        }
      }));
    });

    ws.on('message', msg => {
      const res = JSON.parse(msg);
      if (res.id === 1 && res.result) {
        console.log('--- ELEMENTOS INTERACTIVOS ENCONTRADOS EN SHADOW DOM ---');
        const items = JSON.parse(res.result.value || '[]');
        console.dir(items, { depth: null });
        process.exit(0);
      }
    });
  });
});
