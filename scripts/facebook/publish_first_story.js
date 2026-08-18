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

    // Buscar botón Share to story
    const shareCoords = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const divs = Array.from(document.querySelectorAll('div, button'));
        const btn = divs.find(d => {
          const t = (d.textContent||'').trim();
          const r = d.getBoundingClientRect();
          return (t === 'Share to story' || t === 'Compartir en historia') && r.width > 100 && r.left < 400;
        });
        if (btn) {
          const r = btn.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()`,
      returnByValue: true
    });

    if (!shareCoords.result?.value) {
      console.log('❌ Botón "Share to story" no encontrado');
      ws.close();
      return;
    }
    const pc = JSON.parse(shareCoords.result.value);
    console.log('Clic en Share to story:', pc);
    await mouseClick(ws, pc.x, pc.y);
    await wait(6000);

    // Tomar screenshot
    await cdpCall(ws, 'Page.enable');
    const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_story_first_published.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved fb_story_first_published.png');

    ws.close();
  });
});
