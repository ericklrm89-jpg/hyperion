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
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com') && !t.url.includes('instagram'));
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a Facebook.');
      await cdpCall(ws, 'Page.enable');

      console.log('🧭 Navegando al perfil...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.facebook.com/profile.php?id=61590067290511'` });
      await wait(6500);

      // Clic en la foto de perfil en x: 615 + 84 = 699, y: 122 + 84 = 206
      console.log('👇 Haciendo clic en las acciones de la foto de perfil...');
      await mouseClick(ws, 699, 206);
      await wait(3000); // Esperar menú de foto de perfil

      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('fb_avatar_menu.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 fb_avatar_menu.png guardada.');

      // Listar opciones del menú de avatar
      const opts = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('span, div[role="menuitem"], div[role="listitem"]'));
          return els.map(el => {
            const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ');
            if (!txt || txt.length < 3) return null;
            const r = el.getBoundingClientRect();
            return JSON.stringify({
              text: txt.slice(0, 45),
              x: Math.round(r.left + r.width/2),
              y: Math.round(r.top + r.height/2)
            });
          }).filter(Boolean).slice(0, 30).join('\\n');
        })()`,
        returnByValue: true
      });
      console.log('Opciones de avatar encontradas:');
      console.log(opts.result?.value);

      ws.close();
    });
  });
});
