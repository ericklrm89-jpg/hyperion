const WebSocket = require('ws');
const http = require('http');

http.get('http://127.0.0.1:9001/json', res => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', async () => {
    const tabs = JSON.parse(d);
    const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
    if (waTab) {
      const ws = new WebSocket(waTab.webSocketDebuggerUrl);
      ws.on('open', async () => {
        // Clic en + para abrir menú de adjuntos
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const plusBtn = document.querySelector('span[data-icon="plus"]') ||
                              document.querySelector('span[data-icon="attach-menu-plus"]') ||
                              document.querySelector('div[title="Adjuntar"]');
              if (plusBtn) plusBtn.closest('button, div[role="button"]').click();
              return true;
            })()`,
            returnByValue: true
          }
        }));
        await new Promise(r => setTimeout(r, 1500));

        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
              return inputs.map((inp, i) => ({
                index: i,
                accept: inp.getAttribute('accept'),
                name: inp.getAttribute('name'),
                outerHTML: inp.outerHTML
              }));
            })()`,
            returnByValue: true
          }
        }));
      });
      ws.on('message', data => {
        const r = JSON.parse(data);
        if (r.id === 2) {
          console.log('INPUTS TRAS ABRIR MENU:', JSON.stringify(r.result?.result?.value, null, 2));
          process.exit(0);
        }
      });
    }
  });
});
