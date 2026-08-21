const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

async function clearDraftsFolder() {
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

  // Click on Borradores link in left menu
  await send('Runtime.evaluate', {
    expression: `(() => {
      const draftLink = document.querySelector('a[href*="#drafts"]');
      if (draftLink) {
        draftLink.click();
        return 'Clicked drafts link';
      }
      return 'Draft link not found';
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 2500));

  // Select all
  await send('Runtime.evaluate', {
    expression: `(() => {
      const chk = document.querySelector('div[role="button"][data-tooltip*="Seleccionar"], span[role="checkbox"], div[aria-label*="Seleccionar"]');
      if (chk) chk.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // Click discard drafts
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const discard = btns.find(b => {
        const tip = b.getAttribute('data-tooltip') || b.getAttribute('aria-label') || b.innerText || '';
        return tip.includes('Descartar') || tip.includes('Eliminar') || tip.includes('Discard');
      });
      if (discard) discard.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (snap?.data) fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_gm_drafts_zero_confirmed.jpg', Buffer.from(snap.data, 'base64'));

  ws.close();
}

clearDraftsFolder().catch(console.error);
