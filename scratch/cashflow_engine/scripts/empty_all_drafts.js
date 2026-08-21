const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

async function emptyAllDrafts() {
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

  // 1. Marcar el checkbox principal de selección
  console.log('1. Marcando checkbox principal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const chk = document.querySelector('div[role="button"][data-tooltip*="Seleccionar"], span[role="checkbox"]');
      if (chk) chk.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Clic en el botón "Descartar borradores" de la barra de herramientas
  console.log('2. Haciendo clic en Descartar borradores...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const discard = btns.find(b => {
        const tip = b.getAttribute('data-tooltip') || b.getAttribute('aria-label') || b.innerText || '';
        return tip.includes('Descartar borradores') || tip.includes('Discard drafts');
      });
      if (discard) {
        discard.click();
        return 'Clicked discard button';
      }
      return 'Discard button not found';
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 2500));

  // 3. Volver a la bandeja principal (#inbox)
  await send('Runtime.evaluate', { expression: `window.location.hash = '#inbox';` });
  await new Promise(r => setTimeout(r, 2000));

  // 4. Captura final
  const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (snap?.data) {
    fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_gm_absolute_zero_drafts.jpg', Buffer.from(snap.data, 'base64'));
    console.log('✅ Borradores eliminados por completo.');
  }

  ws.close();
}

emptyAllDrafts().catch(console.error);
