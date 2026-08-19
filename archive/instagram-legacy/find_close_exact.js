const http = require('http');
const WebSocket = require('ws');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      const r = JSON.parse(data);
      if (r.id === id) { ws.off('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const res = await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const closeButtons = all.filter(e => {
        const a = (e.getAttribute('aria-label')||'').toLowerCase();
        const t = (e.textContent||'').toLowerCase();
        return (a === 'cerrar' || a === 'close' || t === 'cerrar' || t === 'close') && e.getBoundingClientRect().width > 0;
      });
      return JSON.stringify(closeButtons.map(b => ({
        tag: b.tagName,
        aria: b.getAttribute('aria-label'),
        rect: b.getBoundingClientRect()
      })));
    })()`, returnByValue: true
  });

  console.log('CLOSE BUTTONS:', res.result?.value);
  ws.close();
}

main().catch(console.error);
