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
      console.log('🔗 Conectado a Facebook.');
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'DOM.enable');

      console.log('🧭 Navegando al perfil...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.facebook.com/profile.php?id=61590067290511'` });
      await wait(6500);

      // Paso 1: Clic en el avatar
      console.log('👇 Haciendo clic en las acciones del avatar...');
      await mouseClick(ws, 699, 206);
      await wait(3000);

      // Paso 2: Clic nativo en "Choose profile picture"
      console.log('👇 Seleccionando "Choose profile picture" en el menú...');
      const chooseOptClick = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('span, div[role="menuitem"], div[role="listitem"]'));
          const choose = els.find(e => {
            const txt = (e.textContent || '').trim().toLowerCase();
            return txt.includes('choose profile') || txt.includes('elegir foto') || txt.includes('choose');
          });
          if (choose) {
            choose.click();
            return 'clicked';
          }
          return 'none';
        })()`,
        returnByValue: true
      });

      console.log('Resultado clic menú:', chooseOptClick.result?.value);
      if (chooseOptClick.result?.value === 'none') {
        console.log('❌ No se encontró la opción de elegir foto.');
        ws.close();
        return;
      }
      await wait(4500); // Esperar que abra la modal

      // Paso 3: Clic en el botón o input de subir foto en la modal
      console.log('🔍 Buscando input de archivo o botón de subir foto...');
      const uploadBtnResult = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          // Facebook en la modal tiene un input file
          const input = document.querySelector('input[type="file"]') || 
                        document.querySelector('div[role="dialog"] input[type="file"]');
          if (input) {
            return 'input_found';
          }
          
          // Buscar botón de subir foto "Upload photo"
          const els = Array.from(document.querySelectorAll('div[role="dialog"] span, div[role="dialog"] div[role="button"]'));
          const btn = els.find(e => {
            const txt = (e.textContent || '').trim().toLowerCase();
            return txt.includes('upload') || txt.includes('subir') || txt.includes('subir foto');
          });
          if (btn) {
            btn.click();
            return 'button_clicked';
          }
          return 'none';
        })()`,
        returnByValue: true
      });

      console.log('Upload target status:', uploadBtnResult.result?.value);
      await wait(2000);

      // Localizar el input file de la modal y asignarle el archivo
      const doc = await cdpCall(ws, 'DOM.getDocument');
      const node = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
      
      if (node && node.nodeId) {
        console.log('⬆️ Subiendo logo real de FairDraw...');
        await cdpCall(ws, 'DOM.setFileInputFiles', {
          nodeId: node.nodeId,
          files: ['C:\\FairDraw\\fairdraw-social\\assets\\logos\\logo_real.png']
        });
        console.log('⏳ Esperando procesamiento de imagen (8s)...');
        await wait(8000);

        // Paso 4: Clic en el botón Save / Guardar en la modal de recorte de Facebook
        console.log('👇 Clickeando en el botón Guardar/Save...');
        const saveResult = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const els = Array.from(document.querySelectorAll('button, div[role="button"]'));
            // El botón de guardado en la modal de recorte de foto de perfil suele decir "Save" o "Guardar"
            const save = els.find(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              return txt === 'save' || txt === 'guardar' || txt === 'save photo' || txt === 'guardar foto';
            });
            if (save) {
              save.click();
              return 'saved';
            }
            return 'none';
          })()`,
          returnByValue: true
        });

        console.log('Resultado click en Save:', saveResult.result?.value);
        console.log('⏳ Esperando confirmación y guardado completo (8s)...');
        await wait(8000);
      } else {
        console.log('❌ No se encontró ningún input de archivos en la modal.');
      }

      // Tomar captura de control
      console.log('🧭 Recargando perfil para verificar...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.reload()` });
      await wait(6000);

      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('fb_profile_new_logo.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 fb_profile_new_logo.png guardada.');

      ws.close();
    });
  });
});
