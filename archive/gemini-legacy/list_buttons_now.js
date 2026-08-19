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
      const btns = Array.from(document.querySelectorAll('button, a'));
      return JSON.stringify(btns.map(b => ({
        aria: b.getAttribute('aria-label') || '',
        txt: (b.innerText || b.textContent || '').trim(),
        x: Math.round(b.getBoundingClientRect().left + b.getBoundingClientRect().width/2),
        y: Math.round(b.getBoundingClientRect().top + b.getBoundingClientRect().height/2)
      })).filter(b => b.aria || b.txt));
    })()`, returnByValue: true
  });

  console.log('BUTTONS LIST:');
  const items = JSON.parse(res.result?.value || '[]');
  items.forEach((item, i) => {
    console.log(`[${i+1}] aria="${item.aria}" | txt="${item.txt}" | x=${item.x}, y=${item.y}`);
  });

  ws.close();
}

main().catch(console.error);
