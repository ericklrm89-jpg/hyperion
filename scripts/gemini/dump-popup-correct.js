const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 999999);
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  console.log('Navigating...');
  await cdpCall(ws, 'Page.navigate', { url: 'https://gemini.google.com/u/1/app?hl=es' });
  await wait(4000);

  // 1. Clic en (+) con la coordenada REAL correcta
  console.log('Clicking (+) at (612, 365)...');
  await mouseClick(ws, 612, 365);
  await wait(2000);

  // 2. Dump del DOM buscando elementos con "subir"
  const dump = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        function getDeepText(root = document) {
          let items = [];
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) {
            const txt = (el.innerText || el.textContent || '').trim();
            const tag = el.tagName.toLowerCase();
            const aria = el.getAttribute('aria-label') || '';
            const r = el.getBoundingClientRect();
            if (r.width > 0 && txt && (tag === 'button' || tag === 'a' || tag === 'span' || tag === 'div' || aria)) {
              items.push({
                tag,
                aria,
                text: txt.slice(0, 40),
                rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
              });
            }
            if (el.shadowRoot) {
              items = items.concat(getDeepText(el.shadowRoot));
            }
          }
          return items;
        }
        return JSON.stringify(getDeepText());
      })()
    `,
    returnByValue: true
  });

  const parsed = JSON.parse(dump.result.value);
  console.log('DUMP WITH CORRECT COORDINATES:');
  const filtered = parsed.filter(item => 
    item.text.toLowerCase().includes('subir') && !item.text.toLowerCase().includes('video')
  );
  console.log(JSON.stringify(filtered, null, 2));

  // Tomar screenshot del menú abierto
  const id = Math.floor(Math.random() * 999999);
  ws.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
  ws.on('message', data => {
    const res = JSON.parse(data);
    if (res.id === id) {
      fs.writeFileSync('c10_correct_menu_check.png', Buffer.from(res.result.data, 'base64'));
      console.log('Saved c10_correct_menu_check.png');
      ws.close();
    }
  });
}

main().catch(console.error);
