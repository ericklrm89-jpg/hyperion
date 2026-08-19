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
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('tiktok.com'));
    if (!tab) {
      console.log('❌ No active TikTok tab found.');
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a TikTok Studio.');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'Page.bringToFront');

      // 1. Clic físico en el primer botón de 3 puntos @ (1424 + 17, 232 + 17) = (1441, 249)
      console.log('👇 Clickeando en el botón de 3 puntos (opciones) de la primera publicación...');
      await mouseClick(ws, 1441, 249);
      await wait(3000); // Esperar menú flotante

      // Tomar captura
      const ss1 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('tiktok_post_menu.png', Buffer.from(ss1.data, 'base64'));
      console.log('📸 tiktok_post_menu.png guardada.');

      // Paso 2: Buscar y hacer clic en la opción "Eliminar" / "Delete"
      console.log('👇 Buscando opción "Eliminar" en el menú flotante...');
      const deleteOptCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('button, div[role="button"], li, span, a, p, div'));
          const del = els.find(e => {
            const txt = (e.textContent || '').trim().toLowerCase();
            const r = e.getBoundingClientRect();
            return (txt === 'eliminar' || txt === 'delete') && r.width > 0 && r.height > 0;
          });
          if (del) {
            const r = del.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`,
        returnByValue: true
      });

      if (!deleteOptCoords.result?.value) {
        console.log('❌ No se encontró la opción "Eliminar" en el menú flotante.');
        ws.close();
        return;
      }

      const dc = JSON.parse(deleteOptCoords.result.value);
      console.log(`👇 Click en "Eliminar" @ (${dc.x}, ${dc.y})...`);
      await mouseClick(ws, dc.x, dc.y);
      await wait(3000); // Esperar modal de confirmación

      // Tomar captura
      const ss2 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('tiktok_post_confirm.png', Buffer.from(ss2.data, 'base64'));
      console.log('📸 tiktok_post_confirm.png guardada.');

      // Paso 3: Confirmar en la modal final
      console.log('👇 Confirmando en la modal final de TikTok...');
      const confirmBtnCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
          const confirmBtn = btns.find(b => {
            const txt = b.textContent.trim().toLowerCase();
            return txt === 'eliminar' || txt === 'confirmar' || txt === 'delete' || txt === 'confirm';
          });
          if (confirmBtn) {
            const r = confirmBtn.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`,
        returnByValue: true
      });

      if (!confirmBtnCoords.result?.value) {
        console.log('❌ No se encontró el botón de confirmación final.');
        ws.close();
        return;
      }

      const cc = JSON.parse(confirmBtnCoords.result.value);
      console.log(`👇 Click en botón de confirmación @ (${cc.x}, ${cc.y})...`);
      await mouseClick(ws, cc.x, cc.y);
      console.log('⏳ Esperando confirmación de TikTok (5s)...');
      await wait(5000);

      // Tomar captura final
      const ss3 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('tiktok_profile_deleted.png', Buffer.from(ss3.data, 'base64'));
      console.log('📸 tiktok_profile_deleted.png guardada.');

      ws.close();
    });
  });
});
