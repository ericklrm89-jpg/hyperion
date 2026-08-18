/**
 * HYPERION — CDP File Chooser Interceptor for Meta Business Suite
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\FairDraw\\fairdraw-social\\output\\fairdraw_promo_final.mp4';

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) { ws.removeListener('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!fbTab) throw new Error('No FB tab');

  const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'DOM.enable');

  // STEP 1: Enable Intercept File Chooser Dialog
  console.log('1. Enabling CDP Page.setInterceptFileChooserDialog...');
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.method === 'Page.fileChooserOpened') {
        console.log('🎉 EVENT DETECTED: Page.fileChooserOpened!', msg.params);
        if (msg.params.backendNodeId) {
          await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: msg.params.backendNodeId, files: [VIDEO] });
        } else {
          await cdpCall(ws, 'DOM.setFileInputFiles', { files: [VIDEO] });
        }
        console.log('   ✅ Video file injected into File Chooser!');
      }
    } catch(e) {}
  });

  // STEP 2: Click Add photo/video
  console.log('2. Clicking Add photo/video button at x=135, y=510...');
  await mouseClick(ws, 135, 510);
  await wait(5000);

  console.log('Waiting 15s for video upload processing...');
  await wait(15000);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_FILE_CHOOSER_INTERCEPTED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_FILE_CHOOSER_INTERCEPTED.png');

  // STEP 3: Click Publish button
  console.log('3. Clicking Publish button at x=480, y=925...');
  await mouseClick(ws, 480, 925);
  await wait(15000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_FILE_CHOOSER_POSTED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_FILE_CHOOSER_POSTED.png');

  ws.close();
}

main().catch(console.error);
