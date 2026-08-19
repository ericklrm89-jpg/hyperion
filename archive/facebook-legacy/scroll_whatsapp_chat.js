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

      // Hacer scroll hacia arriba en el panel de conversación
      console.log('↕️ Desplazando hacia arriba en el chat de Fabro...');
      const scrollRes = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          // El contenedor de los mensajes con scroll suele ser el padre de los copyable-text
          const copyEl = document.querySelector('.copyable-area') || 
                          document.querySelector('div[role="region"]') || 
                          document.querySelector('#main div.x1y1aw1k') || 
                          document.querySelector('#main .copyable-area');
          if (copyEl) {
            // Buscamos el div con scroll interno dentro del chat main
            const scrollContainer = copyEl.querySelector('div[style*="overflow-y: scroll"]') || 
                                     copyEl.querySelector('div.x1y1aw1k') || 
                                     copyEl;
            scrollContainer.scrollTop = 0;
            // Desplazar múltiples veces para forzar la carga
            for(let i=0; i<3; i++) {
              scrollContainer.scrollBy(0, -1500);
            }
            return 'scrolled';
          }
          // Intento alternativo buscando el primer div con scroll dentro de #main
          const main = document.querySelector('#main');
          if (main) {
            const divs = Array.from(main.querySelectorAll('div'));
            const scroller = divs.find(d => {
              const style = window.getComputedStyle(d);
              return style.overflowY === 'auto' || style.overflowY === 'scroll';
            });
            if (scroller) {
              scroller.scrollTop = 0;
              scroller.scrollBy(0, -3000);
              return 'scrolled_fallback';
            }
          }
          return 'no_scroller_found';
        })()`,
        returnByValue: true
      });

      console.log('Status de scroll:', scrollRes.result?.value);
      await wait(3000); // Esperar a que se carguen los mensajes

      // Tomar captura
      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('whatsapp_fabro_chat_older.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 whatsapp_fabro_chat_older.png guardada.');

      // Extraer mensajes más antiguos
      const messages = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const msgEls = Array.from(document.querySelectorAll('.copyable-text'));
          return msgEls.map(el => {
            const authorTime = el.getAttribute('data-pre-plain-text') || '';
            const txt = el.textContent || '';
            if (!txt) return null;
            return authorTime + ' ' + txt.trim().replace(/\\s+/g, ' ');
          }).filter(Boolean).slice(-30).join('\\n'); // Leer 30 mensajes
        })()`,
        returnByValue: true
      });

      console.log('\n💬 === HISTORIAL EXTENDIDO CON FABRO ===');
      console.log(messages.result?.value);
      ws.close();
    });
  });
});
