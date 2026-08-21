const WebSocket = require('ws');
const http = require('http');

async function main() {
  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

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

    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const cancelBtn = btns.find(b => b.innerText && (b.innerText.includes('Cancelar') || b.innerText.includes('OK') || b.innerText.includes('Aceptar')));
        if (cancelBtn) {
          const txt = cancelBtn.innerText;
          cancelBtn.click();
          return 'Clicked: ' + txt;
        }
        return 'No modal button';
      })()`,
      returnByValue: true
    });
    console.log('Modal action:', res);
    ws.close();
  }
}
main();
