const http = require('http');
const WebSocket = require('ws');

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

    ws.on('open', async () => {
      await call('Console.enable');
      await call('Runtime.enable');
      console.log('Listening to console messages...');

      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.method === 'Console.messageAdded') {
            console.log('[Console]', msg.params.message.text);
          } else if (msg.method === 'Runtime.exceptionThrown') {
            console.log('[Exception]', msg.params.exceptionDetails.exception.description);
          }
        } catch(e) {}
      });

      // Keep connection open for 4 seconds to print logs
      setTimeout(() => {
        ws.close();
      }, 4000);
    });
  });
});
