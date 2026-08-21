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

      // Abre menú
      await call('Runtime.evaluate', {
        expression: `(() => {
          const plus = document.querySelector('span[data-icon="plus"]') || 
                       document.querySelector('span[data-icon="attach-menu-plus"]');
          if (plus) plus.closest('button, div[role="button"]').click();
        })()`
      });
      await new Promise(r => setTimeout(r, 600));

      const menuItems = await call('Runtime.evaluate', {
        expression: `(() => {
          const items = Array.from(document.querySelectorAll('ul li, div[role="button"], span[data-icon]'));
          return items
            .map(el => ({
              text: el.innerText || el.getAttribute('aria-label') || el.getAttribute('data-icon') || '',
              tag: el.tagName,
              html: el.outerHTML.slice(0, 150)
            }))
            .filter(x => x.text && (x.text.includes('Foto') || x.text.includes('video') || x.text.includes('Documento') || x.text.includes('Sticker') || x.text.includes('Contacto')));
        })()`,
        returnByValue: true
      });

      console.log('=== ITEMS DEL MENU DE ADJUNTAR (+) ===');
      console.log(JSON.stringify(menuItems.result.value, null, 2));

      ws.close();
    });
  });
});
