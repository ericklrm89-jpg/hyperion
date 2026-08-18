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
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com') && !t.url.includes('instagram'));
    if (!tab) return;

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a Facebook.');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'Page.bringToFront');

      // Buscar el primer botón de opciones del post de Facebook
      console.log('🔍 Localizando el botón de opciones del post más reciente...');
      const scrollRes = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          // Los botones de 3 puntos en los posts de Facebook suelen tener aria-label "Acciones para esta publicación" o "Actions for this post"
          const btn = Array.from(document.querySelectorAll('[aria-label*="Acciones para"], [aria-label*="Actions for"], [aria-label="Acciones"], [aria-label="Actions"], [aria-label*="opciones para"]')).find(el => {
            const r = el.getBoundingClientRect();
            // Evitar los botones de opciones del perfil de usuario (que están arriba en y < 350)
            return r.width > 0 && r.height > 0 && r.top > 350;
          });
          if (btn) {
            btn.scrollIntoView({ block: 'center' });
            return 'scrolled';
          }
          return 'not_found';
        })()`,
        returnByValue: true
      });

      console.log('Scroll del botón:', scrollRes.result?.value);
      await wait(1500);

      // Recalcular coordenadas del botón centrado
      const btnCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll('[aria-label*="Acciones para"], [aria-label*="Actions for"], [aria-label="Acciones"], [aria-label="Actions"], [aria-label*="opciones para"]')).find(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.top > 200; // y > 200 tras el scroll
          });
          if (btn) {
            const r = btn.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`,
        returnByValue: true
      });

      if (!btnCoords.result?.value) {
        console.log('❌ No se pudo localizar el botón de opciones del post.');
        ws.close();
        return;
      }

      const bc = JSON.parse(btnCoords.result.value);
      console.log(`👇 Click en botón de opciones del post @ (${bc.x}, ${bc.y})...`);
      await mouseClick(ws, bc.x, bc.y);
      await wait(3000); // Esperar menú desplegable

      // Tomar captura
      const ss1 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('fb_post_menu.png', Buffer.from(ss1.data, 'base64'));
      console.log('📸 fb_post_menu.png guardada.');

      // Paso 2: Clic en la opción "Mover a la papelera" / "Move to trash" (o "Eliminar" / "Delete")
      console.log('👇 Buscando opción de eliminación en el menú...');
      const deleteOptCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const items = Array.from(document.querySelectorAll('span, div[role="menuitem"], div[role="listitem"]'));
          const delOpt = items.find(e => {
            const txt = (e.textContent || '').trim().toLowerCase();
            return txt.includes('papelera') || txt.includes('trash') || txt.includes('eliminar') || txt.includes('delete');
          });
          if (delOpt) {
            const r = delOpt.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`,
        returnByValue: true
      });

      if (!deleteOptCoords.result?.value) {
        console.log('❌ No se encontró la opción de eliminar en el menú de Facebook.');
        ws.close();
        return;
      }

      const dc = JSON.parse(deleteOptCoords.result.value);
      console.log(`👇 Click en opción de eliminar @ (${dc.x}, ${dc.y})...`);
      await mouseClick(ws, dc.x, dc.y);
      await wait(3000); // Esperar modal de confirmación

      // Tomar captura
      const ss2 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('fb_post_confirm.png', Buffer.from(ss2.data, 'base64'));
      console.log('📸 fb_post_confirm.png guardada.');

      // Paso 3: Confirmar la eliminación (hacer clic en "Mover" / "Move" o "Confirmar" / "Confirm")
      console.log('👇 Confirmando en la modal emergente...');
      const confirmBtnCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('button, div[role="button"]'));
          // Buscar el botón azul principal de confirmación de Facebook
          const confirm = els.find(e => {
            const txt = (e.textContent || '').trim().toLowerCase();
            return txt === 'mover' || txt === 'move' || txt === 'confirmar' || txt === 'confirm' || txt === 'eliminar' || txt === 'delete';
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
        console.log('❌ No se encontró el botón de confirmación en Facebook.');
        ws.close();
        return;
      }

      const cc = JSON.parse(confirmBtnCoords.result.value);
      console.log(`👇 Click en botón de confirmación @ (${cc.x}, ${cc.y})...`);
      await mouseClick(ws, cc.x, cc.y);
      console.log('⏳ Esperando confirmación de Facebook (5s)...');
      await wait(5000);

      // Tomar captura final de la biografía de Facebook
      const ss3 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('fb_profile_deleted.png', Buffer.from(ss3.data, 'base64'));
      console.log('📸 fb_profile_deleted.png guardada.');

      ws.close();
    });
  });
});
