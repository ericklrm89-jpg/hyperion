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
      console.log('🔗 Conectado a WhatsApp Web.');
      await cdpCall(ws, 'Page.enable');

      // Paso 1: Intentar buscar y abrir el chat de Fabro directamente en el DOM visible
      const directClick = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          // Buscar cualquier elemento que contenga "Fabro"
          const spans = Array.from(document.querySelectorAll('span, div'));
          const fabro = spans.find(s => {
            const t = (s.textContent || '').trim();
            // Evitar coincidir con textos largos que solo mencionen "Fabro"
            return (t === 'Fabro' || t.startsWith('Fabro ')) && t.length < 20;
          });
          if (fabro) {
            fabro.click();
            fabro.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            fabro.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            fabro.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return 'clicked_direct';
          }
          return 'not_found';
        })()`,
        returnByValue: true
      });

      console.log('Resultado búsqueda directa:', directClick.result?.value);

      // Paso 2: Si no se abrió directamente, usar el cuadro de búsqueda principal de WhatsApp
      if (directClick.result?.value === 'not_found') {
        console.log('🔍 Chat no visible en el viewport inicial. Enfocando y buscando en la barra de búsqueda...');
        const searchRes = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            // En WhatsApp Web, el buscador es un div contenteditable o un input con rol textbox
            const searchBox = document.querySelector('div[contenteditable="true"][data-tab="3"]') ||
                              document.querySelector('div[contenteditable="true"]') ||
                              document.querySelector('input[placeholder*="Buscar"]') ||
                              document.querySelector('input[placeholder*="Search"]');
            if (searchBox) {
              searchBox.focus();
              // Limpiar
              document.execCommand('selectAll', false, null);
              document.execCommand('delete', false, null);
              // Tipear "Fabro"
              document.execCommand('insertText', false, 'Fabro');
              searchBox.dispatchEvent(new Event('input', { bubbles: true }));
              searchBox.dispatchEvent(new Event('change', { bubbles: true }));
              return 'typed_in_search';
            }
            return 'search_box_not_found';
          })()`,
          returnByValue: true
        });

        console.log('Resultado escritura en buscador:', searchRes.result?.value);
        await wait(3000); // Esperar filtrado

        // Hacer clic en el primer resultado que coincida con Fabro en la lista filtrada
        const clickFiltered = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const spans = Array.from(document.querySelectorAll('span, div'));
            const fabro = spans.find(s => {
              const t = (s.textContent || '').trim();
              return (t === 'Fabro' || t.startsWith('Fabro ')) && t.length < 20;
            });
            if (fabro) {
              fabro.click();
              fabro.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              fabro.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              fabro.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return 'clicked_filtered';
            }
            return 'filtered_not_found';
          })()`,
          returnByValue: true
        });
        console.log('Resultado clic en filtrado:', clickFiltered.result?.value);
      }

      await wait(3000); // Esperar a que se carguen los mensajes del chat

      // Tomar screenshot de la conversación
      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('whatsapp_fabro_chat.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 whatsapp_fabro_chat.png guardada.');

      // Leer los mensajes del panel de la derecha
      const messages = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          // Los mensajes en WhatsApp Web suelen tener la clase message-in y message-out
          const msgEls = Array.from(document.querySelectorAll('.message-in, .message-out'));
          return msgEls.map(el => {
            const isIncoming = el.classList.contains('message-in');
            // Extraer el texto del mensaje y la hora
            const textEl = el.querySelector('.copyable-text');
            const txt = textEl ? textEl.textContent : el.textContent;
            return (isIncoming ? '👨‍💼 [Fabro]: ' : '🍀 [Tú]: ') + txt.trim().replace(/\\s+/g, ' ');
          }).slice(-15).join('\\n'); // Leer los últimos 15 mensajes
        })()`,
        returnByValue: true
      });

      console.log('\n💬 === ÚLTIMOS MENSAJES CON FABRO ===');
      console.log(messages?.result?.value || '(No se pudieron leer los mensajes o el chat no está abierto)');

      ws.close();
    });
  });
});
