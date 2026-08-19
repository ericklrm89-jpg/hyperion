const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const VIDEO_PATH = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fabro-video-fixed.mp4';
if (!fs.existsSync(VIDEO_PATH)) throw new Error('Video no encontrado');

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) {
          ws.removeListener('message', h);
          r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(60);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(60);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

http.get('http://localhost:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
    if (!tab) { console.log('No Facebook tab'); return; }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(res => ws.on('open', res));
    console.log('WS open');

    // Habilitar Page y el interceptor
    await cdpCall(ws, 'Page.enable');
    await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

    // Escuchar el evento del file chooser
    const fileChooserPromise = new Promise((resolve, reject) => {
      const h = (raw) => {
        try {
          const msg = JSON.parse(raw);
          if (msg.method === 'Page.fileChooserOpened') {
            ws.removeListener('message', h);
            console.log('🎯 File chooser interceptado!');
            resolve(msg.params.backendNodeId);
          }
        } catch(e) { reject(e); }
      };
      ws.on('message', h);
      setTimeout(() => { ws.removeListener('message', h); reject(new Error('Timeout fileChooser')); }, 10000);
    });

    // Encontrar coordenadas dinámicas del botón de subida
    const uploadCoords = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        // Buscar el div que contiene exactamente el texto
        const elements = Array.from(document.querySelectorAll('div, button'));
        const target = elements.find(e => {
          const t = (e.textContent||'').trim().toLowerCase();
          return t.includes('add video') && t.includes('drag and drop') && e.getBoundingClientRect().width < 400;
        });
        if (target) {
          const r = target.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()`,
      returnByValue: true
    });

    if (!uploadCoords.result?.value) {
      console.log('❌ No se encontró el botón de subir video');
      ws.close();
      return;
    }
    const pc = JSON.parse(uploadCoords.result.value);
    console.log('Clic en coordenadas de subida:', pc);

    // Clic para disparar el diálogo
    await mouseClick(ws, pc.x, pc.y);

    // Esperar interceptación e inyectar el video
    const backendNodeId = await fileChooserPromise;
    console.log('Inyectando video...');
    await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [VIDEO_PATH] });
    console.log('✅ Video inyectado.');

    // Deshabilitar interceptador temporalmente
    await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: false });

    // Esperar a que se procese e inicie la pantalla siguiente
    console.log('Esperando procesamiento de video...');
    await wait(8000);

    // Tomar screenshot
    const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_reels_uploaded.png', Buffer.from(ss.data, 'base64'));
    console.log('Screenshot guardado en fb_reels_uploaded.png');

    // Volcar elementos de la pantalla posterior
    const dump = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const els = Array.from(document.querySelectorAll('button, a, input, [role="button"], [role="link"], [role="textbox"], div[contenteditable="true"]'));
        const visible = els.filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < 1500;
        }).map(e => {
          const r = e.getBoundingClientRect();
          return {
            tag: e.tagName,
            text: (e.textContent||'').trim().replace(/\\s+/g, ' ').slice(0, 40),
            aria: e.getAttribute('aria-label'),
            x: Math.round(r.left + r.width/2),
            y: Math.round(r.top + r.height/2),
            w: Math.round(r.width),
            h: Math.round(r.height)
          };
        });
        return visible.map(e => JSON.stringify(e)).join('\\n');
      })()`,
      returnByValue: true
    });
    console.log('\n=== REELS POST-UPLOAD ELEMENTS ===');
    console.log(dump?.result?.value || '(none)');

    ws.close();
  });
});
