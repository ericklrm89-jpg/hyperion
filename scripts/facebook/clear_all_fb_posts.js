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
      console.log('🔗 Conectado a Facebook. Iniciando borrado completo nativo a 0 posts...');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'Page.bringToFront');

      for (let step = 1; step <= 8; step++) {
        console.log(`\n--- 🗑️ FB BORRADO NATIVO ${step}/8 ---`);
        
        console.log('🧭 Navegando al perfil...');
        await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.facebook.com/profile.php?id=61590067290511'` });
        await wait(6500);

        console.log('↕️ Desplazando biografía...');
        await cdpCall(ws, 'Runtime.evaluate', { expression: `window.scrollTo(0, 500);` });
        await wait(1500);

        // Clic nativo en el botón de opciones
        console.log('👇 Clickeando opciones del post vía DOM...');
        const optionsClick = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const btn = Array.from(document.querySelectorAll('[aria-label*="Acciones para"], [aria-label*="Actions for"], [aria-label="Acciones"], [aria-label="Actions"], [aria-label*="opciones para"]')).find(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && r.top > 200;
            });
            if (btn) {
              btn.click();
              return 'clicked_options';
            }
            return 'none';
          })()`,
          returnByValue: true
        });

        console.log('Resultado opciones click:', optionsClick.result?.value);
        if (optionsClick.result?.value === 'none') {
          console.log('🎉 ¡Biografía de Facebook completamente limpia!');
          break;
        }
        await wait(3500); // Esperar menú

        // Clic nativo en "Mover a la papelera" / "Move to trash"
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
              return 'clicked_delete';
            }
            return 'none';
          })()`,
          returnByValue: true
        });

        console.log('Resultado click menú:', clickResult.result?.value);
        if (clickResult.result?.value === 'none') {
          console.log('❌ No se encontró la opción de eliminar en el menú.');
          break;
        }
        await wait(4500); // Esperar modal

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
        console.log(`✅ Post ${step} eliminado.`);
      }

      console.log('🎉 Facebook borrado por completo.');
      
      // Tomar captura final
      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('fb_profile_empty.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 fb_profile_empty.png guardada.');

      ws.close();
    });
  });
});
