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

async function deleteOnePost(ws) {
  // Navegar al perfil
  console.log('🧭 Navegando al perfil...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: 'window.location.href = "https://www.instagram.com/fairdrawapp/"' });
  await wait(5000);

  // Hacer clic en la primera publicación
  console.log('🖱️ Clickeando en la miniatura de la última publicación...');
  const thumbCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Buscar el primer enlace o div que apunte a un post (/p/ o /reel/)
      const thumb = document.querySelector('a[href*="/p/"], a[href*="/reel/"], div._aabd');
      if (thumb) {
        const r = thumb.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!thumbCoords.result?.value) {
    console.log('⚠️ No se encontraron publicaciones para borrar.');
    return false;
  }

  const tc = JSON.parse(thumbCoords.result.value);
  await mouseClick(ws, tc.x, tc.y);
  await wait(3000); // Esperar que se abra el modal del post

  // Clic en el botón "Más opciones" (los 3 puntos)
  console.log('🖱️ Clic en Más Opciones (3 puntos)...');
  const optCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('svg[aria-label="Más opciones"]') || 
                 document.querySelector('svg[aria-label="More options"]') ||
                 document.querySelector('[aria-label="Más opciones"]') ||
                 document.querySelector('[aria-label="More options"]');
      if (el) {
        const r = el.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!optCoords.result?.value) {
    console.log('❌ No se encontró el botón de 3 puntos.');
    return false;
  }

  const oc = JSON.parse(optCoords.result.value);
  await mouseClick(ws, oc.x, oc.y);
  await wait(2500); // Esperar el menú flotante

  // Clic en la opción "Eliminar" / "Delete"
  console.log('🖱️ Clic en Eliminar...');
  const delCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('button, span, div'));
      const del = els.find(e => {
        const t = (e.textContent || '').trim().toLowerCase();
        return t === 'eliminar' || t === 'delete';
      });
      if (del) {
        const r = del.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!delCoords.result?.value) {
    console.log('❌ No se encontró la opción Eliminar en el menú.');
    return false;
  }

  const dc = JSON.parse(delCoords.result.value);
  await mouseClick(ws, dc.x, dc.y);
  await wait(2000); // Esperar confirmación de eliminación

  // Confirmar eliminación clickeando el botón Eliminar definitivo
  console.log('🖱️ Confirmando eliminación definitiva...');
  const confCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const conf = els.find(e => {
        const t = (e.textContent || '').trim().toLowerCase();
        return (t === 'eliminar' || t === 'delete');
      });
      if (conf) {
        const r = conf.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!confCoords.result?.value) {
    console.log('❌ No se encontró el botón de confirmación de eliminación.');
    return false;
  }

  const cc = JSON.parse(confCoords.result.value);
  await mouseClick(ws, cc.x, cc.y);
  console.log('⏳ Procesando eliminación (6s)...');
  await wait(6000);
  return true;
}

async function main() {
  console.log('🚀 Iniciando script de limpieza de posts de Instagram...');
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

  // Eliminar el primer post
  console.log('\n--- ELIMINANDO POST 1 ---');
  await deleteOnePost(ws);

  // Eliminar el segundo post
  console.log('\n--- ELIMINANDO POST 2 ---');
  await deleteOnePost(ws);

  console.log('\n🎉 ¡Limpieza de posts completada!');
  ws.close();
}

main().catch(console.error);
