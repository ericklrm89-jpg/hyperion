const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9001/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const wa = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
    if (!wa) return;

    const ws = new WebSocket(wa.webSocketDebuggerUrl);
    ws.on('open', async () => {
      const call = (method, params = {}) => new Promise((resolve) => {
        const id = Math.floor(Math.random() * 99999);
        const h = (d) => {
          const j = JSON.parse(d);
          if (j.id === id) {
            ws.removeListener('message', h);
            resolve(j.result);
          }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id, method, params }));
      });

      const inspectRes = await call('Runtime.evaluate', {
        expression: `(() => {
          // Look for all buttons in footer and attach area
          const btns = Array.from(document.querySelectorAll('footer button, footer [role="button"], span[data-icon]'));
          return btns.map(b => ({
            tag: b.tagName,
            aria: b.getAttribute('aria-label') || b.getAttribute('title') || '',
            icon: b.getAttribute('data-icon') || (b.querySelector('span[data-icon]') ? b.querySelector('span[data-icon]').getAttribute('data-icon') : ''),
            text: b.innerText || '',
            html: b.outerHTML.slice(0, 120)
          })).filter(x => x.aria || x.icon || x.text);
        })()`,
        returnByValue: true
      });

      console.log('=== ELEMENTOS DEL FOOTER WHATSAPP ===');
      console.log(JSON.stringify(inspectRes.result.value, null, 2));

      ws.close();
    });
  });
});
