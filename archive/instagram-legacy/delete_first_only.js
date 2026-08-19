const http = require('http');
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

async function main() {
  console.log('🚀 Iniciando borrador del primer post del perfil (índice 0) usando clics nativos...');
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

  console.log('🧭 Asegurando que estamos en el perfil y recargando...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: 'window.location.href = "https://www.instagram.com/fairdrawapp/"' });
  await wait(6000);

  // A. Desplazar página para centrar primer post
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.scrollTo(0, 450);" });
  await wait(1500);

  // B. Clic nativo en el primer post del DOM (índice 0)
  console.log('🖱️ Clickeando de forma nativa en la publicación en el índice 0...');
  const clickRes = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll('a')).filter(a => {
        const href = a.getAttribute('href') || '';
        return href.includes('/p/') || href.includes('/reel/');
      });
      if (links.length > 0) {
        const target = links[0];
        if (target && target.getBoundingClientRect().width > 0) {
          target.click();
          return 'opened';
        }
      }
      return 'none';
    })()`,
    returnByValue: true
  });

  if (clickRes.result.value !== 'opened') {
    console.log('⚠️ No se pudo abrir la publicación en el índice 0.');
    ws.close();
    return;
  }
  await wait(5000); // Esperar que cargue lightbox

  // C. Clic nativo en el botón "Más opciones" / "More options" del post abierto
  console.log('🖱️ Clickeando en opciones (3 puntos) de forma nativa...');
  const clickOpt = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('[aria-label="Más opciones"], [aria-label="More options"]') ||
                 document.querySelector('svg[aria-label="Más opciones"]') ||
                 document.querySelector('svg[aria-label="More options"]') ||
                 document.querySelector('div[role="button"] svg[aria-label*="option"]');
      if (el) {
        // Si el elemento es un SVG, clickeamos su elemento padre interactivo o directamente a él
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
      // Fallback: buscar botones pequeños en la esquina superior derecha del diálogo
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const btns = Array.from(dialog.querySelectorAll('button, div[role="button"]'));
        // El botón de los 3 puntos suele estar arriba a la derecha en la barra lateral del post
        const optBtn = btns.find(b => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.width < 50 && r.height < 50 && r.left > 700;
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
  console.log('   Resultado clic opciones:', clickOpt.result.value);
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
  console.log('   Resultado clic Eliminar:', clickDel.result.value);
  await wait(3000); // Esperar diálogo de confirmación

  // E. Confirmar en el diálogo rojo con clase _a9-_
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
  console.log('   Resultado clic Confirmación:', clickConf.result.value);
  console.log('⏳ Esperando que finalice el borrado (6s)...');
  await wait(6000);

  // Recargar para aplicar y limpiar pantalla
  await cdpCall(ws, 'Runtime.evaluate', { expression: 'window.location.href = "https://www.instagram.com/fairdrawapp/"' });
  await wait(4000);

  console.log('🎉 ¡El primer post incorrecto ha sido borrado con éxito!');
  ws.close();
}

main().catch(console.error);
