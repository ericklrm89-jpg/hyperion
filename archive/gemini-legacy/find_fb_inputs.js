const http = require('http');
const WebSocket = require('ws');

http.get('http://localhost:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
    if (!tab) { console.log('No Facebook tab'); return; }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let msgId = 0;
    const send = (method, params = {}) => new Promise(res => {
      const id = ++msgId;
      ws.send(JSON.stringify({ id, method, params }));
      const h = raw => {
        const m = JSON.parse(raw);
        if (m.id === id) { ws.removeListener('message', h); res(m.result || m.error); }
      };
      ws.on('message', h);
    });

    await new Promise(res => ws.on('open', res));
    console.log('WS open');

    // List all inputs including hidden ones
    const dump = await send('Runtime.evaluate', {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.map(e => {
          const r = e.getBoundingClientRect();
          return JSON.stringify({
            tag: e.tagName,
            type: e.getAttribute('type'),
            accept: e.getAttribute('accept'),
            id: e.getAttribute('id'),
            class: e.getAttribute('class'),
            x: Math.round(r.left + r.width/2),
            y: Math.round(r.top + r.height/2),
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top)
          });
        }).join('\\n');
      })()`,
      returnByValue: true
    });

    console.log('\n=== ALL INPUT ELEMENTS ===');
    console.log(dump?.result?.value || '(none)');

    ws.close();
  });
});
