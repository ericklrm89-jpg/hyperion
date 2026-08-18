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

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('whatsapp.com'));
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('WS open');
      await cdpCall(ws, 'Page.enable');

      // Scroll iterativo hacia arriba con pausas para forzar la carga de más historial
      console.log('↕️ Desplazando profundamente hacia arriba (3 fases)...');
      for (let i = 0; i < 3; i++) {
        await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const copyEl = document.querySelector('.copyable-area') || 
                            document.querySelector('div[role="region"]') || 
                            document.querySelector('#main div.x1y1aw1k');
            if (copyEl) {
              const scroller = copyEl.querySelector('div[style*="overflow-y: scroll"]') || 
                               copyEl.querySelector('div.x1y1aw1k') || 
                               copyEl;
              scroller.scrollTop = 0;
              scroller.scrollBy(0, -2500);
            }
          })()`
        });
        console.log(`   Fase ${i + 1} completada.`);
        await wait(2000); // Dar tiempo a que cargue
      }

      // Tomar captura
      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('whatsapp_fabro_chat_deep.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 whatsapp_fabro_chat_deep.png guardada.');

      // Extraer los últimos 50 mensajes cargados
      const messages = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const msgEls = Array.from(document.querySelectorAll('.copyable-text'));
          return msgEls.map(el => {
            const authorTime = el.getAttribute('data-pre-plain-text') || '';
            const txt = el.textContent || '';
            if (!txt) return null;
            return authorTime + ' ' + txt.trim().replace(/\\s+/g, ' ');
          }).filter(Boolean).slice(-45).join('\\n');
        })()`,
        returnByValue: true
      });

      console.log('\n💬 === HISTORIAL PROFUNDO CON FABRO ===');
      console.log(messages.result?.value);
      ws.close();
    });
  });
});
