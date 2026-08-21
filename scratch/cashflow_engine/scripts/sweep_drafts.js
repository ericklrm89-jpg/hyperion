const WebSocket = require('ws');
const http = require('http');

async function sweepDrafts() {
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

  // Navigate to #drafts
  await send('Runtime.evaluate', { expression: `window.location.hash = '#drafts';` });
  await new Promise(r => setTimeout(r, 2000));

  // Select all drafts
  await send('Runtime.evaluate', {
    expression: `(() => {
      const chk = document.querySelector('div[role="button"][data-tooltip*="Seleccionar"], span[role="checkbox"], div[aria-label*="Seleccionar"]');
      if (chk) chk.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click discard drafts
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const discard = btns.find(b => {
        const tip = b.getAttribute('data-tooltip') || b.getAttribute('aria-label') || b.innerText || '';
        return tip.includes('Descartar borradores') || tip.includes('Eliminar') || tip.includes('Discard drafts');
      });
      if (discard) discard.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Return to #inbox
  await send('Runtime.evaluate', { expression: `window.location.hash = '#inbox';` });
  await new Promise(r => setTimeout(r, 1500));

  console.log('✅ Borradores eliminados.');
  ws.close();
}

sweepDrafts().catch(console.error);
