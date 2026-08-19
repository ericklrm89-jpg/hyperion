const http = require('http');
const WebSocket = require('ws');

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
  await wait(60);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(60);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

http.get('http://localhost:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
    if (!tab) { console.log('No Facebook tab'); return; }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(res => ws.on('open', res));
    console.log('WS open');

    // Clic en Discard
    const discardCoords = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], div'));
        const disc = buttons.find(b => {
          const t = (b.textContent||'').trim().toLowerCase();
          return t === 'discard' || t === 'descartar';
        });
        if (disc) {
          const r = disc.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()`,
      returnByValue: true
    });

    if (discardCoords.result?.value) {
      const p = JSON.parse(discardCoords.result.value);
      console.log('Clic en Discard:', p);
      await mouseClick(ws, p.x, p.y);
      await wait(1500);

      // Confirmar descarte si aparece un diálogo
      const confirmCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const buttons = Array.from(document.querySelectorAll('button, [role="button"], div'));
          const conf = buttons.find(b => {
            const t = (b.textContent||'').trim().toLowerCase();
            return t === 'discard' || t === 'sí, descartar' || t === 'descartar' || t === 'confirmar';
          });
          if (conf) {
            const r = conf.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`,
        returnByValue: true
      });
      if (confirmCoords.result?.value) {
        const pc = JSON.parse(confirmCoords.result.value);
        console.log('Confirmando descarte:', pc);
        await mouseClick(ws, pc.x, pc.y);
      }
    }

    ws.close();
  });
});
