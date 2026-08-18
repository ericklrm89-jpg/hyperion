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
      console.log('❌ Instagram tab not found.');
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a Instagram. Iniciando borrado completo a 0 posts...');
      await cdpCall(ws, 'Page.enable');

      for (let step = 1; step <= 15; step++) {
        console.log(`\n--- 🗑️ IG BORRADO COMPLETO ${step}/15 ---`);
        
        console.log('🧭 Navegando al perfil...');
        await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.instagram.com/fairdrawapp/'` });
        await wait(6000);

        await cdpCall(ws, 'Runtime.evaluate', { expression: `window.scrollTo(0, 450);` });
        await wait(1500);

        // Intentar hacer clic en el primer post visible
        const clickResult = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const links = Array.from(document.querySelectorAll('a')).filter(a => {
              const href = a.getAttribute('href') || '';
              return href.includes('/p/') || href.includes('/reel/');
            });
            const first = links.find(a => {
              const r = a.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            });
            if (first) {
              first.click();
              return 'clicked';
            }
            return 'none';
          })()`,
          returnByValue: true
        });

        console.log('Resultado clic DOM:', clickResult.result?.value);
        if (clickResult.result?.value === 'none') {
          console.log('🎉 ¡Grilla completamente limpia de posts!');
          break;
        }
        await wait(5000); // Esperar lightbox

        // Clic en 3 puntos
        const optionsBtn = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const header = document.querySelector('article header') || 
                           document.querySelector('div[role="dialog"] header') ||
                           document.querySelector('header');
            if (header) {
              const buttons = Array.from(header.querySelectorAll('button'));
              const threeDots = buttons.find(b => b.querySelector('svg') || (b.textContent || '').includes('…'));
              if (threeDots) {
                const r = threeDots.getBoundingClientRect();
                return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
              }
            }
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

        if (!optionsBtn.result?.value) {
          console.log('❌ No se encontró opciones.');
          break;
        }

        const oc = JSON.parse(optionsBtn.result.value);
        console.log(`👇 Click opciones @ (${oc.x}, ${oc.y})...`);
        await mouseClick(ws, oc.x, oc.y);
        await wait(3000);

        // Clic en Eliminar
        const deleteBtn = await cdpCall(ws, 'Runtime.evaluate', {
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

        if (!deleteBtn.result?.value) {
          console.log('❌ No se encontró Eliminar.');
          break;
        }

        const dc = JSON.parse(deleteBtn.result.value);
        console.log(`👇 Click Eliminar @ (${dc.x}, ${dc.y})...`);
        await mouseClick(ws, dc.x, dc.y);
        await wait(3000);

        // Confirmar eliminación
        const confirmBtn = await cdpCall(ws, 'Runtime.evaluate', {
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

        if (!confirmBtn.result?.value) {
          console.log('❌ No se encontró botón rojo.');
          break;
        }

        const cc = JSON.parse(confirmBtn.result.value);
        console.log(`👇 Confirmando @ (${cc.x}, ${cc.y})...`);
        await mouseClick(ws, cc.x, cc.y);
        await wait(6000);
        console.log(`✅ Post ${step} eliminado.`);
      }

      console.log('🎉 Instagram borrado por completo.');
      
      // Tomar captura
      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('ig_profile_empty.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 ig_profile_empty.png guardada.');

      ws.close();
    });
  });
});
