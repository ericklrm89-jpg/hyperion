const WebSocket = require('ws');
const fs = require('fs');

async function checkAndFinish() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/8DCE7D7DE1D3A719A57FB399CF446F4A');
  await new Promise(r => ws.on('open', r));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const handler = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) {
          ws.removeListener('message', handler);
          if (r.error) reject(new Error(JSON.stringify(r.error)));
          else resolve(r.result || {});
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  console.log('Clicking Cancelar button on discard modal...');
  await cdpCall('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const cancel = btns.find(b => (b.textContent || '').trim().toLowerCase() === 'cancelar');
        if (cancel) cancel.click();
      })()
    `
  });

  console.log('Waiting 10s for upload to finish...');
  await new Promise(r => setTimeout(r, 10000));

  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\ig_live_done.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved ig_live_done.png');

  ws.close();
}

checkAndFinish().catch(console.error);
