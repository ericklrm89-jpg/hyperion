const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

console.log('=======================================================');
console.log('🎬 GEMINI: Clickeando "Descargar vídeo"');
console.log('=======================================================');

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
  const tabsData = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const tab = tabsData.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('No tab');
  console.log('📍 Pestaña:', tab.url);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  await cdpCall(ws, 'Page.bringToFront');

  // Buscar el botón Descargar vídeo
  const downloadBtnPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const download = buttons.find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
          const txt = (b.innerText || b.textContent || '').toLowerCase().trim();
          return aria.includes('descargar') || aria.includes('download') || txt.includes('descargar') || txt.includes('download');
        });
        if (download) {
          const r = download.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), label: aria = (download.getAttribute('aria-label') || download.innerText) });
        }
        return null;
      })()
    `,
    returnByValue: true
  });

  if (downloadBtnPos.result && downloadBtnPos.result.value) {
    const pos = JSON.parse(downloadBtnPos.result.value);
    console.log(`✅ Botón Descargar encontrado en (${pos.x}, ${pos.y})`);
    
    // Clickeamos con el mouse real CDP
    await mouseClick(ws, pos.x, pos.y);
    console.log('   Click enviado!');
  } else {
    console.log('⚠️ No se detectó botón de descargar en el DOM. Usando fallback badge [32] (~508, 636)');
    await mouseClick(ws, 508, 636);
  }

  // Esperar a que se inicie la descarga
  console.log('   Esperando descarga...');
  await wait(5000);

  // Tomar captura final
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('download_clicked_result.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot guardado en download_clicked_result.png');

  ws.close();
}

main().catch(err => console.error('❌ Error:', err));
