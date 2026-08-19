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
    if (!tab) {
      console.log('❌ Facebook tab not found.');
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a Facebook. Iniciando borrado en lote (5 posts)...');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'Page.bringToFront');

      for (let step = 1; step <= 5; step++) {
        console.log(`\n--- 🗑️ FB ITERACIÓN ${step}/5 ---`);
        
        console.log('🧭 Navegando al perfil...');
        await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.facebook.com/profile.php?id=61590067290511'` });
        await wait(6500);

        console.log('↕️ Desplazando biografía...');
        await cdpCall(ws, 'Runtime.evaluate', { expression: `window.scrollTo(0, 500);` });
        await wait(1500);

        // Buscar botón de opciones
        const btnCoords = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const btn = Array.from(document.querySelectorAll('[aria-label*="Acciones para"], [aria-label*="Actions for"], [aria-label="Acciones"], [aria-label="Actions"], [aria-label*="opciones para"]')).find(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && r.top > 200;
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
          console.log('ℹ️ No se encontraron más posts de la biografía para eliminar.');
          break;
        }

        const bc = JSON.parse(btnCoords.result.value);
        console.log(`👇 Click opciones del post @ (${bc.x}, ${bc.y})...`);
        await mouseClick(ws, bc.x, bc.y);
        await wait(3000); // Esperar menú

        // Clic nativo en la opción "Mover a la papelera" / "Move to trash"
        console.log('👇 Clickeando opción "Eliminar" en el menú...');
        const clickResult = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const items = Array.from(document.querySelectorAll('span, div[role="menuitem"], div[role="listitem"]'));
            const delOpt = items.find(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              return txt.includes('papelera') || txt.includes('trash') || txt.includes('eliminar') || txt.includes('delete');
            });
            if (delOpt) {
              delOpt.click();
              return 'clicked';
            }
            return 'none';
          })()`,
          returnByValue: true
        });

        console.log('Resultado del clic de menú:', clickResult.result?.value);
        if (clickResult.result?.value === 'none') {
          console.log('❌ No se encontró la opción de eliminar en el menú.');
          break;
        }
        await wait(4000); // Esperar modal de confirmación

        // Clic nativo en el botón de confirmación
        console.log('👇 Clickeando botón de confirmación en la modal...');
        const confirmResult = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const els = Array.from(document.querySelectorAll('button, div[role="button"]'));
            const confirm = els.find(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              return txt === 'mover' || txt === 'move' || txt === 'confirmar' || txt === 'confirm' || txt === 'eliminar' || txt === 'delete';
            });
            if (confirm) {
              confirm.click();
              return 'confirmed';
            }
            return 'none';
          })()`,
          returnByValue: true
        });

        console.log('Resultado confirmación:', confirmResult.result?.value);
        if (confirmResult.result?.value === 'none') {
          console.log('❌ No se encontró el botón de confirmación en la modal.');
          break;
        }

        await wait(6000); // Esperar que finalice
        console.log(`✅ Post ${step} eliminado con éxito de Facebook.`);
      }

      console.log('🎉 Lote de Facebook finalizado.');
      ws.close();
    });
  });
});
