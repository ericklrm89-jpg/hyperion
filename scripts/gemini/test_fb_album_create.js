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
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(res => ws.on('open', res));
    console.log('WS open');

    // Clic en Create album
    const createAlbumCoords = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const elements = Array.from(document.querySelectorAll('a, div'));
        const target = elements.find(e => {
          const t = (e.textContent||'').trim().toLowerCase();
          return t === 'create album' && e.getBoundingClientRect().width > 0;
        });
        if (target) {
          const r = target.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()`,
      returnByValue: true
    });

    if (!createAlbumCoords.result?.value) {
      console.log('❌ Botón "Create album" no encontrado');
      ws.close();
      return;
    }
    const pc = JSON.parse(createAlbumCoords.result.value);
    console.log('Clic en Create album:', pc);
    await mouseClick(ws, pc.x, pc.y);
    await wait(5000);

    // Tomar screenshot
    await cdpCall(ws, 'Page.enable');
    const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_album_creation_view.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved fb_album_creation_view.png');

    // Listar inputs y elementos de creación de álbum
    const dump = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const els = Array.from(document.querySelectorAll('button, a, input, textarea, [role="button"], [role="link"], [role="tab"], [role="textbox"], div[contenteditable="true"]'));
        const visible = els.filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < 1500;
        }).map(e => {
          const r = e.getBoundingClientRect();
          return {
            tag: e.tagName,
            type: e.getAttribute('type'),
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
    console.log('\n=== ALBUM CREATION ELEMENTS ===');
    console.log(dump?.result?.value || '(none)');

    ws.close();
  });
});
