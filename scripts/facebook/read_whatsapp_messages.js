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
      const messages = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const msgEls = Array.from(document.querySelectorAll('.copyable-text'));
          return msgEls.map(el => {
            const authorTime = el.getAttribute('data-pre-plain-text') || '';
            const txt = el.textContent || '';
            if (!txt) return null;
            return authorTime + ' ' + txt.trim().replace(/\\s+/g, ' ');
          }).filter(Boolean).slice(-15).join('\\n');
        })()`,
        returnByValue: true
      });
      console.log('\n💬 === MENSAJES EXTRAÍDOS CON SUCESS ===');
      console.log(messages.result?.value);
      ws.close();
    });
  });
});
