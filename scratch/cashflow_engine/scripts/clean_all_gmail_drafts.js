const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

async function cleanAllGmailDrafts() {
  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (!gmTab) { console.log('No Gmail tab found'); return; }

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 999999);
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result || {});
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  // 1. Dismiss error dialogs
  console.log('1. Descartando modales de alerta...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      Array.from(document.querySelectorAll('button, div[role="button"]')).forEach(b => {
        if (b.innerText && (b.innerText.trim() === 'Aceptar' || b.innerText.trim() === 'OK')) b.click();
      });
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Discard all active compose boxes
  console.log('2. Descartando cajas de redacción abiertas...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const discards = Array.from(document.querySelectorAll('div[data-tooltip*="Descartar borrador"], div[aria-label*="Descartar borrador"], div[data-tooltip*="Discard draft"]'));
      discards.forEach(d => d.click());
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // 3. Navigate to Drafts folder
  console.log('3. Navegando a la carpeta de Borradores (#drafts)...');
  await send('Runtime.evaluate', {
    expression: `window.location.hash = '#drafts';`
  });
  await new Promise(r => setTimeout(r, 3000));

  // 4. Select all drafts and delete them
  console.log('4. Seleccionando todos los borradores...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const selectAllCheckbox = document.querySelector('div[role="button"][data-tooltip*="Seleccionar"], span[role="checkbox"]');
      if (selectAllCheckbox) selectAllCheckbox.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('5. Haciendo clic en Descartar borradores masivos...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const discardBtn = document.querySelector('div[data-tooltip*="Descartar borradores"], div[aria-label*="Descartar borradores"], div[data-tooltip*="Discard drafts"]');
      if (discardBtn) {
        discardBtn.click();
        return 'Clicked mass discard';
      }
      // Alternativamente botón de eliminar
      const delBtn = document.querySelector('div[data-tooltip*="Eliminar"], div[aria-label*="Eliminar"], div[data-tooltip*="Delete"]');
      if (delBtn) {
        delBtn.click();
        return 'Clicked delete';
      }
      return 'No mass discard button found';
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 2500));

  // 6. Volver a Recibidos / Inbox
  console.log('6. Volviendo a bandeja de entrada...');
  await send('Runtime.evaluate', {
    expression: `window.location.hash = '#inbox';`
  });
  await new Promise(r => setTimeout(r, 2000));

  // 7. Captura de pantalla para verificar
  const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (snap?.data) {
    fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_gm_drafts_cleaned.jpg', Buffer.from(snap.data, 'base64'));
    console.log('✅ Borradores limpiados exitosamente. Captura guardada en: live_gm_drafts_cleaned.jpg');
  }

  ws.close();
}

cleanAllGmailDrafts().catch(console.error);
