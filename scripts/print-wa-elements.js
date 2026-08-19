const WebSocket = require('ws');
const { OverlayPrimitive } = require('../dist/layers/overlay');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/70061E917F97EF9FC2862358A553459A');

ws.on('open', async () => {
  const cxn = {
    call: (method, params) => new Promise(resolve => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (msg) => {
        const d = JSON.parse(msg);
        if (d.id === id) { ws.off('message', handler); resolve(d.result); }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    }),
    evaluate: (expression) => new Promise(resolve => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (msg) => {
        const d = JSON.parse(msg);
        if (d.id === id) { ws.off('message', handler); resolve(d.result?.result); }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
    })
  };

  const overlay = new OverlayPrimitive(cxn);
  await overlay.inject({ intervalMs: 250 });
  const data = await overlay.getData();
  data.elements.forEach(e => {
    console.log(`[${e.sid}] <${e.tag}> "${e.text}" at (x: ${e.x}, y: ${e.y}) [${e.w}x${e.h}]`);
  });
  ws.close();
  process.exit(0);
});
