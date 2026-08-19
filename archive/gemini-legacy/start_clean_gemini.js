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

async function main() {
  console.log('🚀 Limpiando sesión de Gemini Web...');
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('gemini.google.com'));
  if (!tab) throw new Error('No se encontró la pestaña de Gemini Web');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // Clic nativo en "Nueva conversación"
  console.log('🖱️ Clickeando "Nueva conversación" de forma nativa...');
  const newChatClick = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button, a, div[role="button"]')).find(e => {
        const txt = (e.textContent||'').toLowerCase();
        const aria = (e.getAttribute('aria-label')||'').toLowerCase();
        return txt.includes('nueva conversa') || txt.includes('new chat') || aria.includes('nueva conversa') || aria.includes('new chat');
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('   Resultado clic Nueva conversación:', newChatClick.result?.value);
  await wait(4000);

  // Cerrar la barra lateral de la izquierda
  console.log('🖱️ Cerrando barra lateral para centrar la interfaz...');
  const closeSidebar = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(e => {
        const aria = (e.getAttribute('aria-label')||'').toLowerCase();
        return aria.includes('cerrar barra') || aria.includes('ocultar barra') || aria.includes('hide menu') || aria.includes('collapse menu') || aria.includes('ocultar menú');
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('   Resultado cerrar barra lateral:', closeSidebar.result?.value);
  await wait(2000);

  // Tomar captura
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\gemini_clean_ready.png', Buffer.from(ss.data, 'base64'));
  console.log('✅ gemini_clean_ready.png guardado con interfaz centrada.');

  ws.close();
}
main().catch(console.error);
