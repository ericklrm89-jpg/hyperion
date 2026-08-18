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
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('instagram.com'));
    if (!tab) {
      console.log('❌ No active Instagram tab found.');
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a Instagram.');
      await cdpCall(ws, 'Page.enable');

      // Paso 1: Localizar el botón "More options" / "Más opciones" directamente por aria-label en la modal
      console.log('👇 Buscando el elemento con aria-label de opciones...');
      const optionsBtnCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const el = document.querySelector('[aria-label="Más opciones"]') || 
                     document.querySelector('[aria-label="More options"]') ||
                     document.querySelector('svg[aria-label="Más opciones"]') ||
                     document.querySelector('svg[aria-label="More options"]');
          if (el) {
            const r = el.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`,
        returnByValue: true
      });

      if (!optionsBtnCoords.result?.value) {
        console.log('❌ No se encontró el botón de 3 puntos de opciones.');
        ws.close();
        return;
      }

      const oc = JSON.parse(optionsBtnCoords.result.value);
      console.log(`👇 Click en botón de opciones @ (${oc.x}, ${oc.y})...`);
      await mouseClick(ws, oc.x, oc.y);
      await wait(3000); // Esperar menú

      // Tomar captura
      const ss3 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('ig_post_menu.png', Buffer.from(ss3.data, 'base64'));
      console.log('📸 ig_post_menu.png guardada.');

      // Paso 2: Clic en la opción "Eliminar" / "Delete"
      console.log('👇 Buscando opción "Eliminar"...');
      const deleteBtnCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('button, div[role="button"], span'));
          const del = els.find(e => {
            const txt = (e.textContent || '').trim().toLowerCase();
            return txt === 'eliminar' || txt === 'delete';
          });
          if (del) {
            const r = del.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`,
        returnByValue: true
      });

      if (!deleteBtnCoords.result?.value) {
        console.log('❌ No se encontró la opción "Eliminar" en el menú.');
        ws.close();
        return;
      }

      const dc = JSON.parse(deleteBtnCoords.result.value);
      console.log(`👇 Click en "Eliminar" @ (${dc.x}, ${dc.y})...`);
      await mouseClick(ws, dc.x, dc.y);
      await wait(2500); // Esperar confirmación

      // Tomar captura
      const ss4 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('ig_post_confirm.png', Buffer.from(ss4.data, 'base64'));
      console.log('📸 ig_post_confirm.png guardada.');

      // Paso 3: Clic en el botón rojo de confirmación
      console.log('👇 Confirmando eliminación en la modal emergente...');
      const confirmBtnCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('button, div[role="button"]'));
          const confirm = els.find(e => {
            const txt = (e.textContent || '').trim().toLowerCase();
            return (txt === 'eliminar' || txt === 'delete') && e.classList.contains('_a9-_');
          }) || els.find(e => {
            const txt = (e.textContent || '').trim().toLowerCase();
            return txt === 'eliminar' || txt === 'delete';
          });
          if (confirm) {
            const r = confirm.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`,
        returnByValue: true
      });

      if (!confirmBtnCoords.result?.value) {
        console.log('❌ No se encontró el botón rojo de confirmación.');
        ws.close();
        return;
      }

      const cc = JSON.parse(confirmBtnCoords.result.value);
      console.log(`👇 Click en botón de confirmación @ (${cc.x}, ${cc.y})...`);
      await mouseClick(ws, cc.x, cc.y);
      console.log('⏳ Esperando confirmación de eliminación (5s)...');
      await wait(5000);

      // Tomar captura final
      const ss5 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('ig_profile_deleted.png', Buffer.from(ss5.data, 'base64'));
      console.log('📸 ig_profile_deleted.png guardada.');

      ws.close();
    });
  });
});
