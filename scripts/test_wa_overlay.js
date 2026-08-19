const WebSocket = require('ws');
const fs = require('fs');
const { OverlayPrimitive } = require('../dist/layers/overlay');

async function testWhatsAppOverlay() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/70061E917F97EF9FC2862358A553459A');
  await new Promise(r => ws.on('open', r));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          res.error ? reject(new Error(JSON.stringify(res.error))) : resolve(res.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const mockCxn = {
    call: (method, params) => cdpCall(method, params),
    evaluate: async (expr) => {
      const res = await cdpCall('Runtime.evaluate', { expression: expr, returnByValue: true });
      return res?.result || {};
    }
  };

  const overlay = new OverlayPrimitive(mockCxn);
  console.log('Killing previous overlay and injecting updated Capa Manus into WhatsApp Web...');
  await overlay.kill();
  await new Promise(r => setTimeout(r, 500));
  await overlay.inject({ intervalMs: 250 });

  await new Promise(r => setTimeout(r, 1500));

  const data = await overlay.getData();
  console.log(`Capa Manus Active: ${data.elements.length} elements detected.`);

  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\wa_live_v2.png', Buffer.from(ss.data, 'base64'));
  console.log('Screenshot saved to wa_live_v2.png');

  ws.close();
}

testWhatsAppOverlay().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
