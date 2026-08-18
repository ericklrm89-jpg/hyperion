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
  if (!tab) throw new Error('Tab not found');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  console.log('Searching for "Descargar vídeo" button...');
  const dlResult = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(b => {
          const aria = (b.getAttribute('aria-label') || '').trim();
          const txt  = (b.innerText || b.textContent || '').toLowerCase().trim();
          return aria === 'Descargar vídeo' || aria === 'Download video' || txt.includes('descargar') || txt.includes('download');
        });
        if (btn) {
          const r = btn.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), aria: btn.getAttribute('aria-label') });
        }
        return null;
      })()
    `,
    returnByValue: true
  });

  if (dlResult.result && dlResult.result.value) {
    const pos = JSON.parse(dlResult.result.value);
    console.log(`Clicking download button at (${pos.x}, ${pos.y}) with aria="${pos.aria}"`);
    await mouseClick(ws, pos.x, pos.y);
    await wait(3000);
    // Tomar screenshot de éxito
    const id = Math.floor(Math.random() * 999999);
    ws.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    ws.on('message', data => {
      const res = JSON.parse(data);
      if (res.id === id) {
        fs.writeFileSync('c10_download_clicked.png', Buffer.from(res.result.data, 'base64'));
        console.log('Saved c10_download_clicked.png');
        ws.close();
      }
    });
  } else {
    console.log('Download button not found in DOM.');
    ws.close();
  }
}

main().catch(console.error);
