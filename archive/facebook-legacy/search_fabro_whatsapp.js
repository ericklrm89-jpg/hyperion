const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

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

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('whatsapp.com'));
    if (!tab) return;

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a WhatsApp Web.');
      await cdpCall(ws, 'Page.enable');

      // 1. Clic en el input de búsqueda de chats (coordenadas x: 208, y: 116)
      console.log('🖱️ Clickeando en cuadro de búsqueda...');
      await mouseClick(ws, 208, 116);
      await wait(1000);

      // 2. Escribir "Fabro"
      console.log('✍️ Escribiendo "Fabro"...');
      await cdpCall(ws, 'Input.insertText', { text: 'Fabro' });
      await wait(3000);

      // 3. Tomar captura del resultado de la búsqueda
      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('whatsapp_search_result.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 whatsapp_search_result.png guardada.');

      // Dump de la lista filtrada de chats
      const dump = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('span, div, [role="gridcell"]'));
          return els.filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.left < 400 && r.top < 1500;
          }).map(el => {
            const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ');
            if (!txt || txt.length < 2) return null;
            return JSON.stringify({
              text: txt.slice(0, 50),
              x: Math.round(el.getBoundingClientRect().left),
              y: Math.round(el.getBoundingClientRect().top),
              w: Math.round(el.getBoundingClientRect().width),
              h: Math.round(el.getBoundingClientRect().height)
            });
          }).filter(Boolean).slice(0, 50).join('\\n');
        })()`,
        returnByValue: true
      });
      console.log('\n=== FILTERED CHATS DUMP ===');
      console.log(dump?.result?.value);

      ws.close();
    });
  });
});
