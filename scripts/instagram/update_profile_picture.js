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
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('instagram.com'));
    if (!tab) {
      console.log('❌ Instagram tab not found.');
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a Instagram.');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'DOM.enable');

      console.log('🧭 Navegando a la página de edición de perfil...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.instagram.com/accounts/edit/'` });
      await wait(7000);

      // Tomar captura inicial de la edición
      const ss1 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('ig_edit_profile_before.png', Buffer.from(ss1.data, 'base64'));

      // Intentar localizar el input de tipo file en el DOM
      console.log('🔍 Localizando el input file de la foto de perfil...');
      const fileInputInfo = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          // Instagram a veces tiene un input file oculto en la página de edición
          const input = document.querySelector('input[type="file"]');
          if (input) {
            return 'found_input';
          }
          return 'not_found';
        })()`,
        returnByValue: true
      });

      console.log('Input file status:', fileInputInfo.result?.value);

      if (fileInputInfo.result?.value === 'found_input') {
        // Obtener el NodeId del input file
        const doc = await cdpCall(ws, 'DOM.getDocument');
        const node = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
        
        console.log('⬆️ Subiendo la foto del logo real...');
        await cdpCall(ws, 'DOM.setFileInputFiles', {
          nodeId: node.nodeId,
          files: ['C:\\FairDraw\\fairdraw-social\\assets\\logos\\logo_real.png']
        });
        
        console.log('⏳ Esperando que cargue la imagen (8s)...');
        await wait(8000);
      } else {
        console.log('⚠️ No se encontró input file. Intentando hacer clic en el botón de cambiar foto...');
        // Buscar el botón o texto que dice "Change photo" o "Cambiar foto"
        const clickResult = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const els = Array.from(document.querySelectorAll('button, span, div[role="button"]'));
            const btn = els.find(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              return txt.includes('change photo') || txt.includes('cambiar foto') || txt.includes('cambiar foto de perfil') || txt.includes('change profile photo');
            });
            if (btn) {
              btn.click();
              return 'clicked';
            }
            return 'not_found';
          })()`,
          returnByValue: true
        });
        console.log('Clic en cambiar foto:', clickResult.result?.value);
        await wait(3000);

        // Volver a buscar el input file (a veces se crea dinámicamente al hacer clic)
        const doc = await cdpCall(ws, 'DOM.getDocument');
        const node = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
        if (node && node.nodeId) {
          console.log('⬆️ Subiendo la foto al input creado dinámicamente...');
          await cdpCall(ws, 'DOM.setFileInputFiles', {
            nodeId: node.nodeId,
            files: ['C:\\FairDraw\\fairdraw-social\\assets\\logos\\logo_real.png']
          });
          await wait(8000);
        } else {
          console.log('❌ No se encontró ningún input de archivos.');
        }
      }

      // Volver a navegar al perfil para verificar el logo nuevo
      console.log('🧭 Navegando al perfil para auditar...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.instagram.com/fairdrawapp/'` });
      await wait(6000);

      const ss2 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('ig_profile_new_logo.png', Buffer.from(ss2.data, 'base64'));
      console.log('📸 ig_profile_new_logo.png guardada.');

      ws.close();
    });
  });
});
