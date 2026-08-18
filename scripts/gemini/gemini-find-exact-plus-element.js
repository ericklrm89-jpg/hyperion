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
              function deepSearch(root = document) {
                let list = [];
                let all = Array.from(root.querySelectorAll('*'));
                for (let el of all) {
                  const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                  const title = (el.getAttribute('title') || '').toLowerCase();
                  const cls = (el.getAttribute('class') || '').toLowerCase();
                  const text = (el.innerText || el.textContent || '').trim().toLowerCase();

                  if (aria.includes('subir') || title.includes('subir') || cls.includes('upload') || text.includes('subir') || aria.includes('añadir') || aria.includes('add')) {
                    var r = el.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                      list.push({
                        tag: el.tagName,
                        aria: el.getAttribute('aria-label'),
                        title: el.getAttribute('title'),
                        cls: el.getAttribute('class'),
                        text: text.slice(0, 20),
                        rect: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }
                      });
                    }
                  }
                  if (el.shadowRoot) {
                    list = list.concat(deepSearch(el.shadowRoot));
                  }
                }
                return list;
              }
              return JSON.stringify(deepSearch(document));
            })()
          `
        }
      }));
    });

    ws.on('message', msg => {
      const res = JSON.parse(msg);
      if (res.id === 1 && res.result) {
        console.log('--- ELEMENTOS EXACTOS DEL BOTÓN (+) ENCONTRADOS ---');
        const items = JSON.parse(res.result.value || '[]');
        console.dir(items, { depth: null });
        process.exit(0);
      }
    });
  });
});
