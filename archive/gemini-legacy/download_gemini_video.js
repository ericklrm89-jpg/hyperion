const http = require('http');
const fs   = require('fs');
const WebSocket = require('ws');

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
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function main() {
  console.log('🚀 Iniciando script de descarga del video generado...');
  
  const tabs = await new Promise((res, reject) => {
    http.get('http://localhost:9222/json', r => {
      let d='';
      r.on('data',c=>d+=c);
      r.on('end',()=>{ try { res(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error',reject);
  });
  
  const tab = tabs.find(t => t.type==='page' && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('No se encontró la pestaña de Gemini Web');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res) => ws.on('open', res));

  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'Page.enable');

  // Configurar comportamiento de descarga automática para evitar diálogos de Windows
  console.log('📁 Configurando ruta de descargas automática...');
  await cdpCall(ws, 'Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: 'C:\\Users\\erick\\Downloads'
  });

  // Buscar el botón "Descargar vídeo" en el DOM
  console.log('👇 Buscando coordenadas de "Descargar vídeo" en el DOM...');
  const dlBtnPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const download = buttons.find(b => {
        const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
        const txt = (b.innerText || b.textContent || '').toLowerCase().trim();
        return aria === 'descargar vídeo' || aria === 'download video' || aria.includes('descargar') || txt.includes('descargar') || txt.includes('download');
      });
      if (download) {
        download.scrollIntoView({ block: 'center' });
        const r = download.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!dlBtnPos.result?.value) {
    throw new Error('No se encontró el botón "Descargar vídeo" en la respuesta.');
  }

  const pos = JSON.parse(dlBtnPos.result.value);
  console.log(`🎯 Coordenadas del botón de descarga: x=${pos.x}, y=${pos.y}. Clickeando...`);
  await mouseClick(ws, pos.x, pos.y);

  console.log('⏳ Esperando 5 segundos a que se complete la descarga física en disco...');
  await wait(5000);
  
  console.log('🎉 Descarga finalizada en C:\\Users\\erick\\Downloads\\');
  ws.close();
}
main().catch(err => console.error('❌ Error:', err.message));
