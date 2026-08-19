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

    // Encontrar coordenadas del botón Next
    const nextBtnCoords = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], div'));
        const next = buttons.find(b => {
          const t = (b.textContent||'').trim().toLowerCase();
          const a = (b.getAttribute('aria-label')||'').toLowerCase();
          return (t === 'next' || a === 'next' || t === 'siguiente' || a === 'siguiente') && b.getBoundingClientRect().width > 0;
        });
        if (next) {
          const r = next.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()`,
      returnByValue: true
    });

    if (!nextBtnCoords.result?.value) {
      console.log('❌ Botón "Next" no encontrado');
      ws.close();
      return;
    }
    const pc = JSON.parse(nextBtnCoords.result.value);
    console.log('Haciendo clic en Next (Paso 2):', pc);

    await mouseClick(ws, pc.x, pc.y);
    await wait(2500);

    // Tomar screenshot de la pantalla 3 (descripción/publicar)
    await cdpCall(ws, 'Page.enable');
    const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_reels_step3.png', Buffer.from(ss.data, 'base64'));
    console.log('Screenshot saved to fb_reels_step3.png');

    // Volcar elementos de la pantalla posterior
    const dump = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const els = Array.from(document.querySelectorAll('button, a, input, textarea, [role="button"], [role="link"], [role="textbox"], div[contenteditable="true"]'));
        const visible = els.filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < 1500;
        }).map(e => {
          const r = e.getBoundingClientRect();
          return {
            tag: e.tagName,
            text: (e.textContent||'').trim().replace(/\\s+/g, ' ').slice(0, 40),
            aria: e.getAttribute('aria-label'),
            placeholder: e.getAttribute('placeholder'),
            x: Math.round(r.left + r.width/2),
            y: Math.round(r.top + r.height/2),
            w: Math.round(r.width),
            h: Math.round(r.height)
          };
        });
        return visible.map(e => JSON.stringify(e)).join('\\n');
      })()`,
      returnByValue: true
    });
    console.log('\n=== REELS STEP 3 ELEMENTS ===');
    console.log(dump?.result?.value || '(none)');

    ws.close();
  });
});
