const http = require('http');
const WebSocket = require('ws');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const tab = tabs.find(t => t.url.includes('gemini.google.com') && t.type === 'page');
  if (!tab) throw new Error('No Gemini tab');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

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
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => {
        const a = (b.getAttribute('aria-label')||'').toLowerCase();
        return a.includes('carga') || a.includes('subida') || a.includes('upload') || a.includes('añadir') || a.includes('adjuntar');
      });
      if (target) {
        const r = target.getBoundingClientRect();
        return JSON.stringify({
          ariaLabel: target.getAttribute('aria-label'),
          x: Math.round(r.left + r.width/2),
          y: Math.round(r.top + r.height/2),
          w: Math.round(r.width),
          h: Math.round(r.height)
        });
      }
      return null;
    })()`, returnByValue: true
  });

  console.log('PLUS BUTTON INFO:', res.result?.value);
  ws.close();
}

main().catch(console.error);
