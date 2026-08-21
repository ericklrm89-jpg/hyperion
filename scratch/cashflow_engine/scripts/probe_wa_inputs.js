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
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
              return inputs.map((inp, i) => ({
                index: i,
                accept: inp.getAttribute('accept'),
                multiple: inp.hasAttribute('multiple'),
                outerHTML: inp.outerHTML
              }));
            })()`,
            returnByValue: true
          }
        }));
      });
      ws.on('message', data => {
        const r = JSON.parse(data);
        if (r.id === 1) {
          console.log('INPUTS DE ARCHIVO ENCONTRADOS:', JSON.stringify(r.result.value, null, 2));
          process.exit(0);
        }
      });
    }
  });
});
