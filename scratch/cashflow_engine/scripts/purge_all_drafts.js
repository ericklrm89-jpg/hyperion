const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

async function purgeAllDraftsAndModals() {
  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (!gmTab) return;

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

  console.log('1. Forzando clic en botón Entendido / Cancelar del diálogo...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const dialogs = document.querySelectorAll('div[role="dialog"]');
      let clicked = [];
      dialogs.forEach(d => {
        const btns = d.querySelectorAll('button, div[role="button"]');
        btns.forEach(b => {
          if (b.innerText && (b.innerText.includes('Entendido') || b.innerText.includes('Aceptar') || b.innerText.includes('Cancelar') || b.innerText.includes('OK'))) {
            b.click();
            clicked.push(b.innerText);
          }
        });
      });
      return clicked;
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('2. Descartando todas las ventanas de composición abiertas...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const discards = Array.from(document.querySelectorAll('div[data-tooltip*="Descartar borrador"], div[aria-label*="Descartar borrador"], div[data-tooltip*="Discard draft"]'));
      discards.forEach(d => d.click());
      return discards.length;
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('3. Navegando directamente a #drafts...');
  await send('Runtime.evaluate', { expression: `window.location.hash = '#drafts';` });
  await new Promise(r => setTimeout(r, 2500));

  console.log('4. Marcando checkbox Seleccionar Todos...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const chk = document.querySelector('div[role="button"][data-tooltip*="Seleccionar"], span[role="checkbox"], div[aria-label*="Seleccionar"]');
      if (chk) chk.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  console.log('5. Clic en botón de Descartar borradores en la barra superior...');
  const resDiscard = await send('Runtime.evaluate', {
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
  console.log(resDiscard);
  await new Promise(r => setTimeout(r, 3000));

  console.log('6. Volviendo a #inbox...');
  await send('Runtime.evaluate', { expression: `window.location.hash = '#inbox';` });
  await new Promise(r => setTimeout(r, 2000));

  const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (snap?.data) {
    fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_gm_purged_proof.jpg', Buffer.from(snap.data, 'base64'));
    console.log('✅ Purga completada. Captura guardada en: live_gm_purged_proof.jpg');
  }

  ws.close();
}

purgeAllDraftsAndModals().catch(console.error);
