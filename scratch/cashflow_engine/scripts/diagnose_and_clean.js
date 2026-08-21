const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

async function main() {
  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (gmTab) {
    const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));
    const send = (m, p={}) => new Promise(res => {
      const id = Math.floor(Math.random()*99999);
      const h = msg => {
        const d = JSON.parse(msg);
        if (d.id === id) { ws.off('message', h); res(d.result); }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id, method: m, params: p }));
    });

    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const ok = btns.find(b => b.innerText.trim() === 'Aceptar' || b.innerText.trim() === 'OK');
        if (ok) { ok.click(); return 'Clicked OK'; }
        return 'No modal found';
      })()`
    });
    console.log('Gmail modal dismissal:', res);

    // Also close any extra compose window or inspect it
    const composeInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const composes = document.querySelectorAll('div[role="dialog"]');
        return { count: composes.length };
      })()`
    });
    console.log('Gmail compose dialogs:', composeInfo);
    ws.close();
  }

  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (waTab) {
    const ws = new WebSocket(waTab.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));
    const send = (m, p={}) => new Promise(res => {
      const id = Math.floor(Math.random()*99999);
      const h = msg => {
        const d = JSON.parse(msg);
        if (d.id === id) { ws.off('message', h); res(d.result); }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id, method: m, params: p }));
    });

    // Dismiss any popup like "Llamadas en la web" [Cerrar]
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"], span[data-icon="x"]'));
        const closeBtn = btns.find(b => b.innerText && (b.innerText.includes('Cerrar') || b.innerText.includes('Ahora no') || b.innerText.includes('OK')));
        if (closeBtn) { closeBtn.click(); return 'Dismissed popup'; }
        return 'No WA popup';
      })()`
    });
    console.log('WA popup dismissal:', res);
    ws.close();
  }
}
main();
