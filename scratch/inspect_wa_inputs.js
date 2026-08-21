const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9001/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const wa = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
    if (!wa) {
      console.log('No active WhatsApp page found. Current pages:');
      tabs.forEach(t => console.log(' - ' + t.title + ' (' + t.url + ')'));
      return;
    }

    const ws = new WebSocket(wa.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
            return inputs.map((inp, idx) => ({
              idx,
              accept: inp.getAttribute('accept'),
              multiple: inp.hasAttribute('multiple'),
              outerHTML: inp.outerHTML
            }));
          })()`,
          returnByValue: true
        }
      }));
    });

    ws.on('message', (d) => {
      const msg = JSON.parse(d);
      if (msg.id === 1) {
        console.log('=== INPUTS DE ARCHIVO EN WHATSAPP WEB ===');
        console.log(JSON.stringify(msg.result.result.value, null, 2));
        ws.close();
      }
    });
  });
});
