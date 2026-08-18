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
              function deepQuery(root = document) {
                let list = Array.from(root.querySelectorAll('button, [role="button"], input[type="file"]'));
                let all = Array.from(root.querySelectorAll('*'));
                for (let el of all) {
                  if (el.shadowRoot) {
                    list = list.concat(deepQuery(el.shadowRoot));
                  }
                }
                return list;
              }

              const items = deepQuery(document);
              return items.map(el => ({
                tag: el.tagName,
                type: el.type || '',
                aria: el.getAttribute('aria-label') || '',
                title: el.getAttribute('title') || '',
                text: (el.innerText || el.textContent || '').trim().slice(0, 20),
                rect: el.getBoundingClientRect()
              })).filter(x => x.rect.width > 0 || x.type === 'file');
            })()
          `
        }
      }));
    });

    ws.on('message', msg => {
      const res = JSON.parse(msg);
      if (res.id === 1) {
        console.log('Botones e Inputs encontrados en Shadow DOM de Gemini:');
        console.dir(res.result.value, { depth: null });
        process.exit(0);
      }
    });
  });
});
