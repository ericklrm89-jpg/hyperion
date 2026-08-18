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
      console.log('❌ TikTok tab not found.');
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a TikTok Studio. Iniciando borrado en lote (5 videos)...');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'Page.bringToFront');

      for (let step = 1; step <= 5; step++) {
        console.log(`\n--- 🗑️ TIKTOK ITERACIÓN ${step}/5 ---`);
        
        console.log('🧭 Recargando panel de contenidos para actualizar tabla...');
        await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.tiktok.com/tiktokstudio/content'` });
        await wait(6000);

        // Remover unload protection
        await cdpCall(ws, 'Runtime.evaluate', { expression: `window.onbeforeunload = null;` });

        // Encontrar coordenadas del primer botón de opciones de la primera fila
        const optionsBtn = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('button')).filter(b => {
              const r = b.getBoundingClientRect();
              // El botón de 3 puntos de opciones en la tabla está en la columna derecha (left > 1300) y tiene un alto pequeño
              return r.width > 0 && r.height > 0 && r.left > 1300 && r.top > 200;
            });
            if (btns.length > 0) {
              const first = btns[0];
              const r = first.getBoundingClientRect();
              return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
            }
            return null;
          })()`,
          returnByValue: true
        });

        if (!optionsBtn.result?.value) {
          console.log('ℹ️ No se encontraron más botones de opciones de videos.');
          break;
        }

        const oc = JSON.parse(optionsBtn.result.value);
        console.log(`👇 Click opciones de fila 1 @ (${oc.x}, ${oc.y})...`);
        await mouseClick(ws, oc.x, oc.y);
        await wait(2500); // Esperar menú flotante

        // Buscar opción "Eliminar" / "Delete"
        const deleteOpt = await cdpCall(ws, 'Runtime.evaluate', {
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

        if (!deleteOpt.result?.value) {
          console.log('❌ No se encontró la opción Eliminar en el menú flotante.');
          break;
        }

        const dc = JSON.parse(deleteOpt.result.value);
        console.log(`👇 Click Eliminar @ (${dc.x}, ${dc.y})...`);
        await mouseClick(ws, dc.x, dc.y);
        await wait(2500); // Esperar diálogo modal de confirmación

        // Buscar botón de confirmación
        const confirmBtn = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
            const confirm = btns.find(b => {
              const txt = b.textContent.trim().toLowerCase();
              return txt === 'eliminar' || txt === 'confirmar' || txt === 'delete' || txt === 'confirm';
            });
            if (confirm) {
              const r = confirm.getBoundingClientRect();
              return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
            }
            return null;
          })()`,
          returnByValue: true
        });

        if (!confirmBtn.result?.value) {
          console.log('❌ No se encontró el botón de confirmación final.');
          break;
        }

        const cc = JSON.parse(confirmBtn.result.value);
        console.log(`👇 Confirmando en la modal @ (${cc.x}, ${cc.y})...`);
        await mouseClick(ws, cc.x, cc.y);
        await wait(5000);
        console.log(`✅ Video ${step} eliminado con éxito de TikTok.`);
      }

      console.log('🎉 Lote de TikTok completado.');
      ws.close();
    });
  });
});
