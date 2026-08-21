const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

async function cleanGmailNow() {
  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (!gmTab) { console.log('No Gmail tab'); return; }

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

  // 1. Clic en "Entendido" o "Aceptar" del modal
  console.log('1. Cerrando modal de Google Drive...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const btn = btns.find(b => b.innerText && (b.innerText.includes('Entendido') || b.innerText.includes('Aceptar') || b.innerText.includes('OK')));
      if (btn) {
        btn.click();
        return 'Clicked ' + btn.innerText;
      }
      return 'No modal button';
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Clic en todos los botones de "Descartar borrador"
  console.log('2. Descartando todas las ventanas de redacción abiertas...');
  for (let i = 0; i < 5; i++) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const discards = Array.from(document.querySelectorAll('div[data-tooltip*="Descartar borrador"], div[aria-label*="Descartar borrador"], div[data-tooltip*="Discard draft"]'));
        discards.forEach(d => d.click());
      })()`
    });
    await new Promise(r => setTimeout(r, 500));
  }

  // 3. Ir a la carpeta Borradores (#drafts)
  console.log('3. Navegando a #drafts...');
  await send('Runtime.evaluate', {
    expression: `window.location.hash = '#drafts';`
  });
  await new Promise(r => setTimeout(r, 2500));

  // 4. Seleccionar todos los borradores de la lista
  console.log('4. Seleccionando todos los borradores de la lista...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const selBox = document.querySelector('div[role="button"][data-tooltip*="Seleccionar"], span[role="checkbox"], div[aria-label*="Seleccionar"]');
      if (selBox) selBox.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // 5. Clic en Descartar borradores en la barra superior
  console.log('5. Descartando borradores masivos...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const discard = btns.find(b => {
        const tip = b.getAttribute('data-tooltip') || b.getAttribute('aria-label') || b.innerText || '';
        return tip.includes('Descartar borradores') || tip.includes('Eliminar') || tip.includes('Discard drafts');
      });
      if (discard) {
        discard.click();
        return 'Clicked mass discard';
      }
      return 'No discard button';
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 2500));

  // 6. Volver a Recibidos (#inbox)
  console.log('6. Volviendo a #inbox...');
  await send('Runtime.evaluate', {
    expression: `window.location.hash = '#inbox';`
  });
  await new Promise(r => setTimeout(r, 2000));

  // 7. Screenshot de verificación
  const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (snap?.data) {
    fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_gm_clean_final.jpg', Buffer.from(snap.data, 'base64'));
    console.log('✅ Borradores eliminados. Captura guardada en: live_gm_clean_final.jpg');
  }

  ws.close();
}

cleanGmailNow().catch(console.error);
