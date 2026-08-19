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

async function deletePostAtProfileIndex(ws, index) {
  console.log(`🧭 Asegurando que estamos en el perfil...`);
  await cdpCall(ws, 'Runtime.evaluate', { expression: 'window.location.href = "https://www.instagram.com/fairdrawapp/"' });
  await wait(5000);

  // A. Desplazar página para centrar primer post
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.scrollTo(0, 450);" });
  await wait(1500);

  // B. Clic FÍSICO CDP en el primer post (índice 0) usando coordenadas calculadas
  console.log(`🖱️ Buscando la miniatura del post (índice ${index}) por coordenadas...`);
  const coords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
      if (links.length > 0) {
        const r = links[0].getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!coords.result?.value) {
    console.log(`⚠️ No se encontró publicación en el índice ${index} para borrar.`);
    return false;
  }

  const cc = JSON.parse(coords.result.value);
  console.log(`🎯 Clic físico en miniatura @ (${cc.x}, ${cc.y})...`);
  await mouseClick(ws, cc.x, cc.y);
  await wait(5000); // Esperar que cargue lightbox

  // C. Clic NATIVO DOM en el botón de opciones (3 puntos)
  console.log('🖱️ Clickeando en opciones (3 puntos) de forma nativa DOM...');
  const clickOpt = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('[aria-label="Más opciones"], [aria-label="More options"]') ||
                 document.querySelector('svg[aria-label="Más opciones"]') ||
                 document.querySelector('svg[aria-label="More options"]') ||
                 document.querySelector('div[role="button"] svg[aria-label*="option"]');
      if (el) {
        if (el.tagName === 'svg') {
          const parent = el.parentElement;
          if (parent && (parent.tagName === 'BUTTON' || parent.getAttribute('role') === 'button')) {
            parent.click();
            return 'clicked_parent';
          }
        }
        el.click();
        return 'clicked_direct';
      }
      // Fallback: botón pequeño en la parte superior derecha
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const btns = Array.from(dialog.querySelectorAll('button, div[role="button"]'));
        const optBtn = btns.find(b => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.width < 50 && r.height < 50 && r.left > 650;
        });
        if (optBtn) {
          optBtn.click();
          return 'clicked_fallback';
        }
      }
      return 'not_found';
    })()`,
    returnByValue: true
  });
  console.log('   Resultado clic opciones:', clickOpt.result?.value);
  await wait(3000); // Esperar menú

  // D. Seleccionar "Eliminar" en el menú con clic nativo DOM
  console.log('🖱️ Seleccionando opción "Eliminar" (clic nativo)...');
  const clickDel = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const del = Array.from(document.querySelectorAll('button, span')).find(e => {
        const txt = (e.textContent||'').trim().toLowerCase();
        return txt === 'eliminar' || txt === 'delete';
      });
      if (del) {
        del.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('   Resultado clic Eliminar:', clickDel.result?.value);
  await wait(3000); // Esperar diálogo de confirmación

  // E. Confirmar en el diálogo rojo con clase _a9-_ (clic nativo)
  console.log('🖱️ Confirmando eliminación (clic nativo)...');
  const clickConf = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const confirm = Array.from(document.querySelectorAll('button')).find(e => {
        const txt = (e.textContent||'').trim().toLowerCase();
        return (txt === 'eliminar' || txt === 'delete') && e.classList.contains('_a9-_');
      }) || Array.from(document.querySelectorAll('button')).find(e => {
        const txt = (e.textContent||'').trim().toLowerCase();
        return txt === 'eliminar' || txt === 'delete';
      });
      if (confirm) {
        confirm.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('   Resultado clic Confirmación:', clickConf.result?.value);
  console.log('⏳ Esperando que finalice el borrado (6s)...');
  await wait(6000);
  return true;
}

async function main() {
  console.log('🚀 Iniciando borrador de Reels de Instagram (Lógica Híbrida)...');
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('instagram.com'));
  if (!tab) throw new Error('No se encontró tab de Instagram');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // Borramos el primer Reel (índice 0)
  console.log('\n--- BORRANDO POST 1 ---');
  await deletePostAtProfileIndex(ws, 0);

  // Borramos el segundo Reel (que ahora queda en el índice 0)
  console.log('\n--- BORRANDO POST 2 ---');
  await deletePostAtProfileIndex(ws, 0);

  console.log('\n🎉 ¡Limpieza terminada con éxito!');
  ws.close();
}

main().catch(console.error);
