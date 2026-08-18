/**
 * HYPERION — Fix TikTok Privacy Live
 */
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

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('tiktok.com'));
  if (!tab) throw new Error('No se encontró la pestaña de TikTok.');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  console.log('✅ Conexión WebSocket establecida.');

  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'Page.enable');
  await wait(1000);

  // 1. Hacer clic en el dropdown "Only me" de la primera fila
  console.log('👇 Abriendo dropdown de privacidad de la primera fila...');
  const clickedDropdown = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Buscar elementos de tipo div o botón que contengan "Only me" o "Solo yo"
      const elements = Array.from(document.querySelectorAll('div, span, button'));
      const onlyMeDropdown = elements.find(el => {
        const t = (el.innerText || el.textContent || '').trim();
        const r = el.getBoundingClientRect();
        return (t === 'Only me' || t === 'Solo yo') && r.width > 0 && r.top < 350;
      });
      if (onlyMeDropdown) {
        onlyMeDropdown.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });

  console.log('Dropdown click result:', clickedDropdown.result?.value);
  await wait(2000);

  // 2. Hacer clic en la opción "Everyone" (Público) en el dropdown que se abrió
  console.log('👇 Seleccionando "Everyone" en el dropdown...');
  const clickedEveryone = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const options = Array.from(document.querySelectorAll('li, div, span, button'));
      const everyoneOpt = options.find(o => {
        const t = (o.innerText || o.textContent || '').trim().toLowerCase();
        return (t === 'everyone' || t === 'público' || t === 'public') && o.getBoundingClientRect().width > 0;
      });
      if (everyoneOpt) {
        everyoneOpt.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });

  console.log('Everyone click result:', clickedEveryone.result?.value);
  await wait(5000); // Esperar que guarde y procese

  // 3. Borrar el video duplicado ("fairdraw_v2_promo") que no tiene copy
  console.log('🗑️ Buscando el video duplicado sin copy para eliminarlo...');
  const clickedThreeDots = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Buscamos todas las filas
      const rows = Array.from(document.querySelectorAll('tr, [role="row"]'));
      const duplicateRow = rows.find(r => (r.textContent || '').includes('fairdraw_v2_promo') && !(r.textContent || '').includes('Animate your giveaway'));
      if (duplicateRow) {
        // Encontrar el botón de tres puntos (...) en esa fila
        const btns = Array.from(duplicateRow.querySelectorAll('button'));
        const threeDots = btns.find(b => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.left > 1200;
        });
        if (threeDots) {
          threeDots.click();
          return 'three_dots_clicked';
        }
      }
      return 'none';
    })()`,
    returnByValue: true
  });

  console.log('Three dots click result:', clickedThreeDots.result?.value);
  await wait(2000);

  if (clickedThreeDots.result?.value === 'three_dots_clicked') {
    // Clic en "Eliminar" en el menú flotante
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const items = Array.from(document.querySelectorAll('button, div[role="button"], li, span, p, a'));
        const delItem = items.find(i => i.textContent.trim() === 'Eliminar' || i.textContent.trim() === 'Delete');
        if (delItem) { delItem.click(); return true; }
        return false;
      })()`
    });
    await wait(2000);

    // Confirmar en el modal
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const confirmBtn = btns.find(b => b.textContent.trim() === 'Eliminar' || b.textContent.trim() === 'Confirmar' || b.textContent.trim() === 'Delete' || b.textContent.trim() === 'Confirm');
        if (confirmBtn) { confirmBtn.click(); return true; }
        return false;
      })()`
    });
    await wait(5000);
    console.log('✅ Video duplicado borrado.');
  }

  // Captura de confirmación final
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_fixed_final.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Captura de control guardada en tiktok_fixed_final.png');

  ws.close();
}

main().catch(console.error);
