const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      const r = JSON.parse(data);
      if (r.id === id) { ws.off('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

  console.log('Clicking "Intentar de nuevo" at x=494, y=633...');
  await cdpCall('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 494, y: 633 });
  await new Promise(r => setTimeout(r, 80));
  await cdpCall('Input.dispatchMouseEvent', { type: 'mousePressed', x: 494, y: 633, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 80));
  await cdpCall('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 494, y: 633, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 8000));

  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_retry_clicked.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot saved: ig_retry_clicked.png');

  ws.close();
}

main().catch(console.error);
