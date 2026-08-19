const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\Users\\erick\\Downloads\\Por_favor_anime_estas_ilust (1).mp4';

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

  await cdpCall('Page.setInterceptFileChooserDialog', { enabled: true });

  const fileChooserPromise = new Promise((resolve, reject) => {
    const h = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.method === 'Page.fileChooserOpened') {
        ws.off('message', h);
        console.log('   ✅ fileChooserOpened intercepted! backendNodeId:', msg.params.backendNodeId);
        resolve(msg.params.backendNodeId);
      }
    };
    ws.on('message', h);
    setTimeout(() => reject(new Error('Timeout 10s')), 10000);
  });

  console.log('Clicking "Intentar de nuevo" at x=494, y=633...');
  await cdpCall('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 494, y: 633 });
  await new Promise(r => setTimeout(r, 80));
  await cdpCall('Input.dispatchMouseEvent', { type: 'mousePressed', x: 494, y: 633, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 80));
  await cdpCall('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 494, y: 633, button: 'left', clickCount: 1 });

  const backendNodeId = await fileChooserPromise;
  console.log('Injecting file into intercepted file chooser backendNodeId:', backendNodeId);
  await cdpCall('DOM.setFileInputFiles', { backendNodeId, files: [VIDEO] });
  await cdpCall('Page.setInterceptFileChooserDialog', { enabled: false });

  console.log('Waiting 10s for video processing...');
  await new Promise(r => setTimeout(r, 10000));

  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_retry_intercept_test.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot saved: ig_retry_intercept_test.png');

  ws.close();
}

main().catch(console.error);
