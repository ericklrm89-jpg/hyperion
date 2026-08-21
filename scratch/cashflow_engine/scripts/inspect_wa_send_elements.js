const WebSocket = require('ws');
const http = require('http');

async function main() {
  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) return;

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const send = (m, p={}) => new Promise(res => {
    const id = Math.floor(Math.random()*99999);
    const h = msg => {
      const d = JSON.parse(msg);
      if (d.id === id) { ws.off('message', h); res(d.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });

  const dump = await send('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const matches = [];
      all.forEach(el => {
        const aria = el.getAttribute('aria-label') || '';
        const title = el.getAttribute('title') || '';
        const icon = el.getAttribute('data-icon') || '';
        const tag = el.tagName.toLowerCase();
        if (aria.toLowerCase().includes('enviar') || aria.toLowerCase().includes('send') || icon.toLowerCase().includes('send') || (el.innerText && el.innerText.trim().toLowerCase() === 'enviar')) {
          const rect = el.getBoundingClientRect();
          matches.push({ tag, aria, title, icon, text: el.innerText, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } });
        }
      });
      return matches;
    })()`,
    returnByValue: true
  });
  console.log('Matches for Enviar/Send:', JSON.stringify(dump.result?.value, null, 2));

  ws.close();
}
main();
