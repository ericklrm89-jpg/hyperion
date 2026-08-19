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
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('whatsapp.com'));
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('WS open');
      const inputs = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('*'));
          return els.filter(el => {
            return el.getAttribute('contenteditable') === 'true' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.getAttribute('role') === 'textbox';
          }).map(el => {
            return {
              tag: el.tagName,
              id: el.id,
              className: el.className,
              role: el.getAttribute('role'),
              placeholder: el.getAttribute('placeholder'),
              dataTab: el.getAttribute('data-tab'),
              text: el.textContent
            };
          });
        })()`,
        returnByValue: true
      });
      console.log('Inputs encontrados:', JSON.stringify(inputs.result?.value, null, 2));
      ws.close();
    });
  });
});
