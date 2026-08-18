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

async function main() {
  const tabsData = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const tab = tabsData.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('No se encontró tab de Gemini');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'DOM.enable');

  // Click the (+) button via CDP mouse at the [51] Subir badge position seen in screenshots
  // In the overlay screenshot [51] Subi is at approx x=616, y=662
  console.log('1. Clickeando el botón [51] (+) en posición (616, 662)...');
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: 616, y: 662 });
  await wait(100);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: 616, y: 662, button: 'left', clickCount: 1 });
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: 616, y: 662, button: 'left', clickCount: 1 });
  await wait(1500);

  // Capture screenshot showing the popup menu
  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('menu_inspect_after_plus.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Captura del menú popup guardada: menu_inspect_after_plus.png');

  // Now dump all visible elements to find the menu item
  const result = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const all = Array.from(document.querySelectorAll('*'));
        return JSON.stringify(all.filter(e => {
          const r = e.getBoundingClientRect();
          const t = (e.innerText || e.textContent || '').trim();
          return r.width > 0 && r.height > 0 && t.length > 1 && t.length < 50 && r.top > 400 && r.top < 700;
        }).map(e => ({
          tag: e.tagName,
          text: (e.innerText || e.textContent || '').trim().slice(0, 30),
          aria: e.getAttribute('aria-label'),
          role: e.getAttribute('role'),
          cls: (e.getAttribute('class') || '').slice(0, 40),
          rect: { x: Math.round(e.getBoundingClientRect().left), y: Math.round(e.getBoundingClientRect().top) }
        })));
      })()
    `,
    returnByValue: true
  });

  console.log('Elementos visibles en el área del menú popup:');
  const items = JSON.parse(result.result.value || '[]');
  console.dir(items, { depth: null });

  process.exit(0);
}

main().catch(err => console.error('Error:', err));
