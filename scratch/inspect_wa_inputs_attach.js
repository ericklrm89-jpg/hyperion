const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9001/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const wa = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
    if (!wa) return console.log('No WhatsApp page');

    const ws = new WebSocket(wa.webSocketDebuggerUrl);
    ws.on('open', async () => {
      const call = (method, params = {}) => new Promise((resolve) => {
        const id = Math.floor(Math.random() * 99999);
        const h = (d) => {
          const j = JSON.parse(d);
          if (j.id === id) {
            ws.removeListener('message', h);
            resolve(j.result);
          }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id, method, params }));
      });

      console.log('1. Abriendo menú de adjuntos (+)...');
      await call('Runtime.evaluate', {
        expression: `(() => {
          const plus = document.querySelector('span[data-icon="plus"]') || 
                       document.querySelector('span[data-icon="attach-menu-plus"]') ||
                       document.querySelector('div[title*="Adjuntar"]') ||
                       document.querySelector('button[aria-label*="Adjuntar"]');
          if (plus) plus.closest('button, div[role="button"]').click();
        })()`
      });

      await new Promise(r => setTimeout(r, 1000));

      const inputsRes = await call('Runtime.evaluate', {
        expression: `(() => {
          const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
          return inputs.map((inp, idx) => ({
            idx,
            accept: inp.getAttribute('accept'),
            multiple: inp.hasAttribute('multiple'),
            parentText: inp.parentElement ? inp.parentElement.innerText : '',
            outerHTML: inp.outerHTML
          }));
        })()`,
        returnByValue: true
      });

      console.log('=== INPUTS TRAS ABRIR EL MENU (+) ===');
      console.log(JSON.stringify(inputsRes.result.value, null, 2));

      ws.close();
    });
  });
});
